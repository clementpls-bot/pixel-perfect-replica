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
  let imageDataUrl: string | null = null;
  try {
    const payload = await req.json();
    canId = typeof payload.canId === "string" ? payload.canId : "";
    parentId = typeof payload.parentId === "string" && payload.parentId ? payload.parentId : null;
    text = typeof payload.text === "string" ? payload.text.trim() : "";
    imageDataUrl = typeof payload.imageDataUrl === "string" ? payload.imageDataUrl : null;
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(canId) || (parentId && !uuidPattern.test(parentId))) {
    return jsonResponse({ error: "Invalid can or reply identifier" }, 400);
  }
  if (text.length > 1000) return jsonResponse({ error: "Text is too long" }, 400);
  if (!text && !imageDataUrl) return jsonResponse({ error: "A text or photo is required" }, 400);

  let imageMime: string | null = null;
  let imageBytes: Uint8Array | null = null;
  if (imageDataUrl) {
    const match = imageDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return jsonResponse({ error: "Unsupported image format" }, 400);
    if (imageDataUrl.length > 12_000_000) return jsonResponse({ error: "Image is too large to moderate" }, 413);
    imageMime = match[1];
    try {
      imageBytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    } catch {
      return jsonResponse({ error: "Invalid image data" }, 400);
    }
    if (imageBytes.byteLength > 8 * 1024 * 1024) return jsonResponse({ error: "Image exceeds the 8 MB limit" }, 413);
  }

  const moderationInput: Array<Record<string, unknown>> = [{
    type: "text",
    text: text || "A user submitted an image to a community about beverage cans.",
  }];
  if (imageDataUrl) moderationInput.push({ type: "image_url", image_url: { url: imageDataUrl } });

  try {
    const moderationResponse = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: moderationInput }),
    });
    if (!moderationResponse.ok) {
      console.error("OpenAI moderation request failed", moderationResponse.status);
      return jsonResponse({ error: "Safety check unavailable. Nothing was published." }, 503);
    }
    const moderation = await moderationResponse.json();
    const result = moderation?.results?.[0];
    if (!result || typeof result.flagged !== "boolean") {
      console.error("OpenAI moderation response was missing expected fields");
      return jsonResponse({ error: "Safety check unavailable. Nothing was published." }, 503);
    }
    if (result.flagged) {
      return jsonResponse({
        published: false,
        allowed: false,
        message: "Le contrôle automatique a signalé un contenu potentiellement inapproprié. Modifie ton texte ou ta photo puis réessaie.",
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let imageUrl: string | null = null;
    let storagePath: string | null = null;
    if (imageBytes && imageMime) {
      const extension = imageMime === "image/jpeg" ? "jpg" : imageMime === "image/png" ? "png" : "webp";
      storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage.from("community-posts").upload(storagePath, imageBytes, {
        contentType: imageMime,
        upsert: false,
      });
      if (uploadError) {
        console.error("Community image upload failed", uploadError.message);
        return jsonResponse({ error: "La photo n’a pas pu être enregistrée. Rien n’a été publié." }, 500);
      }
      imageUrl = admin.storage.from("community-posts").getPublicUrl(storagePath).data.publicUrl;
    }

    const { data: comment, error: insertError } = await admin.from("comments").insert({
      can_id: canId,
      user_id: user.id,
      body: text || null,
      image_url: imageUrl,
      parent_id: parentId,
    }).select("id").single();

    if (insertError) {
      if (storagePath) await admin.storage.from("community-posts").remove([storagePath]);
      console.error("Community post insert failed", insertError.message);
      return jsonResponse({ error: "La publication n’a pas pu être enregistrée." }, 500);
    }

    return jsonResponse({ published: true, allowed: true, commentId: comment.id });
  } catch (error) {
    console.error("Community publishing error", error);
    return jsonResponse({ error: "Le contrôle de sécurité a échoué. Rien n’a été publié." }, 503);
  }
});
