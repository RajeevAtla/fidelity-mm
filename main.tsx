import "./tailwind.generated.css";
import { Component, type ComponentChildren, render } from "preact";
import App from "./index";
import { ACTIVE_TAX_YEAR } from "./tax-brackets";
import { APP_CONFIG, type StateCode } from "./app-config";
import { applyThemeToDocument, getSystemThemePreference, readStoredThemeMode } from "./theme-browser";
import { resolveThemeMode } from "./theme";

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

let activeResidentState: StateCode = APP_CONFIG.defaults.state;

function describeModelContext(state: StateCode): string {
  const currentState = APP_CONFIG.states[state];
  return `Active tax year: ${ACTIVE_TAX_YEAR}. This page compares Fidelity money market fund seven-day yields using federal and selectable state single-filer tax selections. Active resident state: ${currentState.name} (${currentState.abbreviation}). Washington capital-gains tax is not applied to money-market yield income.`;
}

async function registerAgentTools() {
  const modelContext = (document as ModelContextDocument).modelContext;
  if (!modelContext) return;

  await modelContext.registerTool({
    name: "get_fidelity_money_market_context",
    description: "Read the current page's tax year, fund count, and resident-state tax context for Fidelity money market after-tax yield comparisons.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => describeModelContext(activeResidentState),
  });
}

const initialThemeMode = readStoredThemeMode(APP_CONFIG.theme.storageKey);
applyThemeToDocument(
  resolveThemeMode(initialThemeMode, getSystemThemePreference()),
  APP_CONFIG.theme.metaColors,
);

render(
  <ErrorBoundary>
    <App
      initialThemeMode={initialThemeMode}
      onResidentStateChange={(state) => {
        activeResidentState = state;
      }}
    />
  </ErrorBoundary>,
  document.getElementById("root")!,
);
void registerAgentTools();
