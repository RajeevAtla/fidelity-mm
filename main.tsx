import "./tailwind.generated.css";
import { render } from "preact";
import App, { applyThemeToDocument, getStoredThemeMode, resolveThemeMode } from "./index";

type ModelContextDocument = Document & {
  modelContext?: {
    registerTool: (tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      execute: (input: Record<string, unknown>) => Promise<string>;
    }) => Promise<unknown>;
  };
};

async function registerAgentTools() {
  const modelContext = (document as ModelContextDocument).modelContext;
  if (!modelContext) return;

  await modelContext.registerTool({
    name: "get_fidelity_money_market_context",
    description: "Read the current page's tax year, fund count, and current selection context for Fidelity money market after-tax yield comparisons.",
    inputSchema: { type: "object", properties: {} },
    execute: async () =>
      "Active tax year: 2026. This page compares Fidelity money market fund seven-day yields using federal and New Jersey single-filer tax selections.",
  });
}

const initialThemeMode = getStoredThemeMode();
applyThemeToDocument(resolveThemeMode(initialThemeMode));

render(<App initialThemeMode={initialThemeMode} />, document.getElementById("root")!);
void registerAgentTools();
