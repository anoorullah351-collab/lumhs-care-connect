import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Curated subset of the in-app PK_DRUGS list (public/ward.html). Kept small
// and static so the tool has no runtime I/O and stays import-safe.
const PK_DRUGS: Array<{
  brand: string;
  generic: string;
  class: string;
  uses: string;
  adultDose: string;
}> = [
  { brand: "Tanzo", generic: "Piperacillin/Tazobactam", class: "Beta-lactam + BLI", uses: "Intra-abdominal, HAP, sepsis", adultDose: "4.5 g IV q8h" },
  { brand: "Rocephin", generic: "Ceftriaxone", class: "3rd-gen cephalosporin", uses: "CAP, meningitis, UTI, typhoid", adultDose: "1–2 g IV/IM q24h" },
  { brand: "Flagyl", generic: "Metronidazole", class: "Nitroimidazole", uses: "Anaerobes, C. difficile, amoebiasis", adultDose: "500 mg IV/PO q8h" },
  { brand: "Meronem", generic: "Meropenem", class: "Carbapenem", uses: "Severe/MDR gram-neg sepsis", adultDose: "1 g IV q8h" },
  { brand: "Augmentin", generic: "Amoxicillin/Clavulanate", class: "Beta-lactam + BLI", uses: "RTI, skin, dental, UTI", adultDose: "1 g PO q12h" },
  { brand: "Klaricid", generic: "Clarithromycin", class: "Macrolide", uses: "CAP, H. pylori", adultDose: "500 mg PO q12h" },
  { brand: "Panadol", generic: "Paracetamol", class: "Analgesic/antipyretic", uses: "Pain, fever", adultDose: "1 g PO/IV q6h (max 4 g/24h)" },
  { brand: "Brufen", generic: "Ibuprofen", class: "NSAID", uses: "Pain, inflammation", adultDose: "400 mg PO q6–8h" },
  { brand: "Tramal", generic: "Tramadol", class: "Opioid (weak)", uses: "Moderate pain", adultDose: "50–100 mg IV/PO q6h" },
  { brand: "Nexum", generic: "Esomeprazole", class: "PPI", uses: "GERD, ulcer prophylaxis", adultDose: "40 mg IV/PO q24h" },
  { brand: "Zantac", generic: "Ranitidine", class: "H2 blocker", uses: "GERD, stress ulcer", adultDose: "50 mg IV q8h" },
  { brand: "Lasix", generic: "Furosemide", class: "Loop diuretic", uses: "Fluid overload, CHF", adultDose: "20–40 mg IV" },
  { brand: "Clexane", generic: "Enoxaparin", class: "LMWH", uses: "DVT prophylaxis/treatment", adultDose: "40 mg SC q24h (prophylaxis)" },
  { brand: "Perinorm", generic: "Metoclopramide", class: "Prokinetic/antiemetic", uses: "Nausea, gastroparesis", adultDose: "10 mg IV/PO q8h" },
  { brand: "Zofran", generic: "Ondansetron", class: "5-HT3 antagonist", uses: "Nausea/vomiting", adultDose: "4–8 mg IV q8h" },
  { brand: "Solu-Medrol", generic: "Methylprednisolone", class: "Corticosteroid", uses: "Severe inflammation, anaphylaxis", adultDose: "40–125 mg IV" },
  { brand: "Hydrocort", generic: "Hydrocortisone", class: "Corticosteroid", uses: "Adrenal insufficiency, shock", adultDose: "100 mg IV q6–8h" },
  { brand: "Adrenaline", generic: "Epinephrine", class: "Sympathomimetic", uses: "Anaphylaxis, cardiac arrest", adultDose: "0.5 mg IM (anaphylaxis)" },
  { brand: "Insulin R", generic: "Regular insulin", class: "Short-acting insulin", uses: "DKA, hyperglycemia", adultDose: "0.1 U/kg/h IV (DKA)" },
  { brand: "Heparin", generic: "Unfractionated heparin", class: "Anticoagulant", uses: "ACS, DVT, PE", adultDose: "80 U/kg IV bolus then 18 U/kg/h" },
];

export default defineTool({
  name: "search_drugs",
  title: "Search Pakistan drug reference",
  description:
    "Search the LUMHS Ward Navigator's Pakistan brand-name drug reference by brand, generic, class, or indication keyword. Returns dosing summaries for common inpatient drugs.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .min(1)
      .describe("Search term: brand name, generic name, class, or clinical use (case-insensitive)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Maximum number of results to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const q = query.toLowerCase();
    const results = PK_DRUGS.filter(
      (d) =>
        d.brand.toLowerCase().includes(q) ||
        d.generic.toLowerCase().includes(q) ||
        d.class.toLowerCase().includes(q) ||
        d.uses.toLowerCase().includes(q),
    ).slice(0, limit ?? 10);

    if (!results.length) {
      return { content: [{ type: "text", text: `No drugs matched "${query}".` }] };
    }

    const text = results
      .map(
        (d) =>
          `• ${d.brand} (${d.generic}) — ${d.class}\n  Uses: ${d.uses}\n  Adult dose: ${d.adultDose}`,
      )
      .join("\n\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: { results },
    };
  },
});
