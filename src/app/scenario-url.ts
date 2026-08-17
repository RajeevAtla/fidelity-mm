import { APP_CONFIG, SUPPORTED_STATE_CODES, type StateCode } from "../config/app-config";
import { isCategoryCode, type CategoryCode } from "../domain/categories";
import { ACTIVE_TAX_CONFIG } from "../domain/tax-brackets";

export type ScenarioCategory = CategoryCode | "all";

export type Scenario = {
  state: StateCode;
  fi: number;
  ni: number;
  category: ScenarioCategory;
  balance: number;
  expanded: boolean;
};

export const SCENARIO_QUERY_KEYS = ["state", "fi", "ni", "category", "balance", "expanded"] as const;

const stateCodes = new Set<string>(SUPPORTED_STATE_CODES);

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(0, index), Math.max(0, length - 1));
}

function parseIndex(value: string | null, length: number, fallback: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const index = Number(value);
  return Number.isSafeInteger(index) && index < length ? index : fallback;
}

function parseBalance(value: string | null, fallback: number) {
  if (!value || value.trim() === "") return fallback;
  const balance = Number(value);
  return Number.isFinite(balance) && balance >= 0 ? balance : fallback;
}

function parseExpanded(value: string | null, fallback: boolean) {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

const defaultState = APP_CONFIG.defaults.state;

export const DEFAULT_SCENARIO: Scenario = {
  state: defaultState,
  fi: clampIndex(APP_CONFIG.defaults.federalBracketIndex, ACTIVE_TAX_CONFIG.federal.length),
  ni: clampIndex(APP_CONFIG.defaults.stateBracketIndex, ACTIVE_TAX_CONFIG.states[defaultState].brackets.length),
  category: "all",
  balance: APP_CONFIG.display.annualBalance,
  expanded: false,
};

export function parseScenarioUrl(search: string | URLSearchParams): Scenario {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const stateValue = params.get("state");
  const state = stateValue && stateCodes.has(stateValue) ? stateValue as StateCode : defaultState;
  const categoryValue = params.get("category");
  const category: ScenarioCategory = categoryValue === "all" || isCategoryCode(categoryValue) ? categoryValue : "all";

  return {
    state,
    fi: parseIndex(params.get("fi"), ACTIVE_TAX_CONFIG.federal.length, DEFAULT_SCENARIO.fi),
    ni: parseIndex(
      params.get("ni"),
      ACTIVE_TAX_CONFIG.states[state].brackets.length,
      clampIndex(APP_CONFIG.defaults.stateBracketIndex, ACTIVE_TAX_CONFIG.states[state].brackets.length),
    ),
    category,
    balance: parseBalance(params.get("balance"), DEFAULT_SCENARIO.balance),
    expanded: parseExpanded(params.get("expanded"), DEFAULT_SCENARIO.expanded),
  };
}

export function serializeScenarioUrl(scenario: Scenario): URLSearchParams {
  const params = new URLSearchParams();
  params.set("state", scenario.state);
  params.set("fi", String(scenario.fi));
  params.set("ni", String(scenario.ni));
  params.set("category", scenario.category);
  params.set("balance", String(scenario.balance));
  params.set("expanded", String(scenario.expanded));
  return params;
}
