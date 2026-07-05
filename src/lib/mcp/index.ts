import { defineMcp } from "@lovable.dev/mcp-js";
import searchDrugsTool from "./tools/search-drugs";
import clinicalLookupTool from "./tools/clinical-lookup";

export default defineMcp({
  name: "ward-navigator-mcp",
  title: "Ward Navigator MCP",
  version: "0.1.0",
  instructions:
    "Tools from the LUMHS Ward Navigator: search the Pakistan brand-name drug reference and query the clinical reference assistant used inside the app.",
  tools: [searchDrugsTool, clinicalLookupTool],
});
