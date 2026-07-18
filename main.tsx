import "./tailwind.generated.css";
import { Component, type ComponentChildren, render } from "preact";
import App, { applyThemeToDocument, getStoredThemeMode, resolveThemeMode } from "./index";
import { ACTIVE_TAX_YEAR } from "./tax-brackets";
import { APP_CONFIG } from "./app-config";

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

class ErrorBoundary extends Component<{ children: ComponentChildren }, { error: Error | null }> {
  state = { error: null as Error | null };

  componentDidCatch(error: Error) {
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return (
        <main role="main" style="padding: 2rem; font-family: system-ui, sans-serif;">
          <h1>Fidelity data is temporarily unavailable</h1>
          <p>The page could not load its generated fund data. Please refresh later.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

async function registerAgentTools() {
  const modelContext = (document as ModelContextDocument).modelContext;
  if (!modelContext) return;

  await modelContext.registerTool({
    name: "get_fidelity_money_market_context",
    description: "Read the current page's tax year, fund count, and current selection context for Fidelity money market after-tax yield comparisons.",
    inputSchema: { type: "object", properties: {} },
    execute: async () =>
      `Active tax year: ${ACTIVE_TAX_YEAR}. This page compares Fidelity money market fund seven-day yields using federal and ${APP_CONFIG.states[APP_CONFIG.defaults.state].name} single-filer tax selections.`,
  });
}

const initialThemeMode = getStoredThemeMode();
applyThemeToDocument(resolveThemeMode(initialThemeMode));

render(<ErrorBoundary><App initialThemeMode={initialThemeMode} /></ErrorBoundary>, document.getElementById("root")!);
void registerAgentTools();
