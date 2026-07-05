import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "clinical_lookup",
  title: "Ask clinical reference assistant",
  description:
    "Ask the Ward Navigator's clinical reference assistant a concise, evidence-based question (differentials, red flags, investigations, management). Backed by the same AI used inside the app.",
  inputSchema: {
    question: z
      .string()
      .trim()
      .min(3)
      .describe("The clinical question, e.g. 'management of acute cholangitis in an adult'."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ question }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "AI is not configured on this server." }],
        isError: true,
      };
    }

    const systemPrompt =
      "You are a careful clinical reference assistant for hospital physicians in Pakistan. Provide concise, evidence-based answers using standard guidelines (NICE / WHO / IDSA / Sanford / SAGES / Tokyo / BNF). Always include: differential considerations, red flags, suggested investigations, and management options with doses where applicable. Add a short safety caveat: 'Verify against local protocols & patient factors — final decision rests with the treating physician.' Keep answers structured with short headings & bullet points. Never invent facts. If unsure, say so.";

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
        }),
      });
      if (!r.ok) {
        const detail = await r.text();
        return {
          content: [{ type: "text", text: `AI gateway error ${r.status}: ${detail.slice(0, 300)}` }],
          isError: true,
        };
      }
      const data = (await r.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = data?.choices?.[0]?.message?.content ?? "";
      return { content: [{ type: "text", text: reply || "No response from AI." }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Network error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
});
