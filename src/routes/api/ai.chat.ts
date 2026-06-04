import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/ai/chat")({
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
        let body: { messages?: unknown; system?: string };
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!messages.length) {
          return new Response(
            JSON.stringify({ error: "No messages provided" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const systemPrompt =
          body.system ||
          "You are a careful clinical reference assistant for hospital physicians in Pakistan. Provide concise, evidence-based answers using standard guidelines (NICE / WHO / IDSA / Sanford / SAGES / Tokyo / BNF). Always include: differential considerations, red flags, suggested investigations, and management options with doses where applicable. Add a short safety caveat: 'Verify against local protocols & patient factors — final decision rests with the treating physician.' Keep answers structured with short headings & bullet points. Never invent facts. If unsure, say so.";

        const payload = {
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
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
