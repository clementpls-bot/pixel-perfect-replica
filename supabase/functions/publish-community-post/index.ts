import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return jsonResponse({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !publicKey || !serviceRoleKey) {
    return jsonResponse({ error: "Publishing service is not configured" }, 503);
  }
  if (!openAiKey) return jsonResponse({ error: "Moderation service is not configured" }, 503);

  const authClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: "Authentication required" }, 401);

  let canId = "";
  let parentId: string | null = null;
  let text = "";
  let tempImagePath: string | null = null;
  try {
    const payload = await req.json();
    canId = typeof payload.canId === "string" ? payload.canId : "";
    parentId = typeof payload.parentId === "string" && payload.parentId ? payload.parentId : null;
    text = typeof payload.text === "string" ? payload.text.trim() : "";
    tempImagePath = typeof payload.tempImagePath === "string" ? payload.tempImagePath : null;
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(canId) || (parentId && !uuidPattern.test(parentId))) {
    return jsonResponse({ error: "Invalid can or reply identifier" }, 400);
  }
  if (text.length > 1000) return jsonResponse({ error: "Text is too long" }, 400);
  if (!text && !tempImagePath) return jsonResponse({ error: "A text or photo is required" }, 400);
  if (tempImagePath && (!tempImagePath.startsWith(`${user.id}/`) || tempImagePath.length > 300)) {
    return jsonResponse({ error: "Invalid temporary image path" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let temporarySignedUrl: string | null = null;
  if (tempImagePath) {
    const { data: signed, error: signedError } = await admin.storage
      .from("community-moderation-temp").createSignedUrl(tempImagePath, 90);
    if (signedError || !signed?.signedUrl) {
      return jsonResponse({ error: "La photo temporaire est introuvable. Rien n’a été publié." }, 400);
    }
    temporarySignedUrl = signed.signedUrl;
  }

  const moderationInput: Array<Record<string, unknown>> = [{
    type: "text",
    text: text || "A user submitted an image to a community about beverage cans.",
  }];
  if (temporarySignedUrl) {
    moderationInput.push({ type: "image_url", image_url: { url: temporarySignedUrl } });
  }

  try {
    const moderationResponse = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: moderationInput }),
    });
    if (!moderationResponse.ok) {
      console.error("OpenAI moderation request failed", moderationResponse.status);
      if (tempImagePath) await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
      return jsonResponse({ error: "Le contrôle de sécurité est indisponible. Rien n’a été publié." }, 503);
    }
    const moderation = await moderationResponse.json();
    const result = moderation?.results?.[0];
    if (!result || typeof result.flagged !== "boolean") {
      console.error("OpenAI moderation response was missing expected fields");
      if (tempImagePath) await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
      return jsonResponse({ error: "Le contrôle de sécurité est indisponible. Rien n’a été publié." }, 503);
    }
    if (result.flagged) {
      if (tempImagePath) await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
      return jsonResponse({
        published: false,
        allowed: false,
        message: "Le contrôle automatique a signalé un contenu potentiellement inapproprié. Modifie ton texte ou ta photo puis réessaie.",
      });
    }

    let imageUrl: string | null = null;
    let publicImagePath: string | null = null;
    if (tempImagePath) {
      const { data: file, error: downloadError } = await admin.storage
        .from("community-moderation-temp").download(tempImagePath);
      if (downloadError || !file) {
        await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
        return jsonResponse({ error: "La photo n’a pas pu être récupérée après le contrôle." }, 500);
      }
      const mime = file.type.toLowerCase();
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime) || file.size > 8 * 1024 * 1024) {
        await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
        return jsonResponse({ error: "Format de photo non autorisé." }, 400);
      }
      const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
      publicImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage.from("community-posts").upload(publicImagePath, bytes, {
        contentType: mime,
        upsert: false,
      });
      if (uploadError) {
        await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
        console.error("Approved community image upload failed", uploadError.message);
        return jsonResponse({ error: "La photo approuvée n’a pas pu être enregistrée." }, 500);
      }
      imageUrl = admin.storage.from("community-posts").getPublicUrl(publicImagePath).data.publicUrl;
      await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
    }

    const { data: comment, error: insertError } = await admin.from("comments").insert({
      can_id: canId,
      user_id: user.id,
      body: text || null,
      image_url: imageUrl,
      parent_id: parentId,
    }).select("id").single();

    if (insertError) {
      if (publicImagePath) await admin.storage.from("community-posts").remove([publicImagePath]);
      console.error("Community post insert failed", insertError.message);
      return jsonResponse({ error: "La publication n’a pas pu être enregistrée." }, 500);
    }

    return jsonResponse({ published: true, allowed: true, commentId: comment.id });
  } catch (error) {
    if (tempImagePath) await admin.storage.from("community-moderation-temp").remove([tempImagePath]);
    console.error("Community publishing error", error);
    return jsonResponse({ error: "Le contrôle de sécurité a échoué. Rien n’a été publié." }, 503);
  }
});
