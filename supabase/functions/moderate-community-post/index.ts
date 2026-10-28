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
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !supabaseKey) return jsonResponse({ error: "Authentication service is not configured" }, 503);
  if (!openAiKey) return jsonResponse({ error: "Moderation service is not configured" }, 503);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonResponse({ error: "Authentication required" }, 401);

  let text = "";
  let imageDataUrl: string | null = null;
  try {
    const payload = await req.json();
    text = typeof payload.text === "string" ? payload.text.trim() : "";
    imageDataUrl = typeof payload.imageDataUrl === "string" ? payload.imageDataUrl : null;
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  if (text.length > 1000) return jsonResponse({ error: "Text is too long" }, 400);
  if (!text && !imageDataUrl) return jsonResponse({ error: "A text or photo is required" }, 400);

  if (imageDataUrl) {
    // Only accept inline data URLs for the supported formats and enforce a payload ceiling.
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)) {
      return jsonResponse({ error: "Unsupported image format" }, 400);
    }
    if (imageDataUrl.length > 12_000_000) return jsonResponse({ error: "Image is too large to moderate" }, 413);
  }

  const input: Array<Record<string, unknown>> = [];
  if (text) input.push({ type: "text", text });
  else input.push({ type: "text", text: "A user submitted an image to a community about beverage cans." });
  if (imageDataUrl) input.push({ type: "image_url", image_url: { url: imageDataUrl } });

  try {
    const moderationResponse = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
    });

    if (!moderationResponse.ok) {
      // Fail closed: never let a failed moderation request publish unreviewed content.
      console.error("OpenAI moderation request failed", moderationResponse.status);
      return jsonResponse({ error: "Safety check unavailable" }, 503);
    }

    const moderation = await moderationResponse.json();
    const result = moderation?.results?.[0];
    if (!result || typeof result.flagged !== "boolean") {
      console.error("OpenAI moderation response was missing expected fields");
      return jsonResponse({ error: "Safety check unavailable" }, 503);
    }

    if (result.flagged) {
      return jsonResponse({
        allowed: false,
        message: "Le contrôle automatique a signalé un contenu potentiellement inapproprié. Modifie ton texte ou ta photo puis réessaie.",
      });
    }

    return jsonResponse({ allowed: true });
  } catch (error) {
    console.error("Moderation request error", error);
    return jsonResponse({ error: "Safety check unavailable" }, 503);
  }
});
