import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface VisionBody {
  imageBase64?: string;
  mimeType?: string;
  prompt?: string;
  modality?: string;
  patientContext?: string;
}

export const Route = createFileRoute("/api/ai/vision")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "AI not configured (missing key)" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
        let body: VisionBody;
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
        const { imageBase64, mimeType, modality, patientContext, prompt } = body;
        if (!imageBase64 || typeof imageBase64 !== "string") {
          return new Response(
            JSON.stringify({ error: "imageBase64 required" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
        // Cap at ~8 MB base64 (~6 MB binary)
        if (imageBase64.length > 8 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: "Image too large (max ~6MB)" }),
            { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const mt = (mimeType || "image/jpeg").replace(/[^a-z0-9/+.-]/gi, "");
        const dataUrl = imageBase64.startsWith("data:")
          ? imageBase64
          : `data:${mt};base64,${imageBase64}`;

        const userText = [
          `Modality: ${modality || "Unspecified radiograph"}`,
          patientContext ? `Patient context: ${patientContext}` : "",
          prompt
            ? `Specific question: ${prompt}`
            : "Provide a structured radiology read.",
          "",
          "Respond ONLY in this exact format:",
          "1. **Image quality** (positioning, exposure, view).",
          "2. **Systematic findings** (bones, soft tissue, lung fields / abdomen / brain — whichever applies).",
          "3. **Positive findings** (clearly enumerated).",
          "4. **Differential diagnosis** (most likely → less likely).",
          "5. **Recommended next steps** (further imaging, labs, clinical correlation).",
          "6. **Red flags / urgent findings**.",
          "End with: 'AI-assisted preliminary read — formal radiology reporting and clinical correlation required.'",
        ].join("\n");

        const systemPrompt =
          "You are a board-style radiology assistant supporting hospital physicians. Read uploaded X-ray, CT, MRI or ultrasound images carefully. Describe only what is visible — never fabricate findings. If the image is unreadable or not a medical image, say so explicitly. Always finish with the required safety caveat.";

        const payload = {
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        };

        try {
          const r = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
              "X-Lovable-AIG-SDK": "raw-fetch",
            },
            body: JSON.stringify(payload),
          });
          const text = await r.text();
          if (!r.ok) {
            return new Response(
              JSON.stringify({ error: `AI gateway error ${r.status}`, detail: text.slice(0, 500) }),
              { status: r.status, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }
          const data = JSON.parse(text);
          const reply: string =
            data?.choices?.[0]?.message?.content ?? "";
          return new Response(JSON.stringify({ reply }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Network error reaching AI" }),
            { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      },
    },
  },
});
