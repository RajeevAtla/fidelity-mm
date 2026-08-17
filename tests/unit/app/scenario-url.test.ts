import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SCENARIO,
  SCENARIO_QUERY_KEYS,
  parseScenarioUrl,
  serializeScenarioUrl,
  type Scenario,
} from "../../../src/app/scenario-url";

describe("scenario URL", () => {
  test("uses current defaults when the URL has no scenario", () => {
    expect(parseScenarioUrl("")).toEqual(DEFAULT_SCENARIO);
  });

  test("round-trips every supported scenario field", () => {
    const scenario: Scenario = {
      state: "ny",
      fi: 4,
      ni: 2,
      category: "ca",
      balance: 1_234_567.89,
      expanded: true,
    };

    const params = serializeScenarioUrl(scenario);

    expect([...params.keys()]).toEqual([...SCENARIO_QUERY_KEYS]);
    expect(parseScenarioUrl(params)).toEqual(scenario);
  });

  test("falls back safely for invalid values and state-specific bracket bounds", () => {
    expect(parseScenarioUrl("state=not-a-state&fi=-1&ni=999&category=invalid&balance=-5&expanded=maybe")).toEqual(
      DEFAULT_SCENARIO,
    );
    expect(parseScenarioUrl("state=tx&ni=999")).toMatchObject({ state: "tx", ni: 0 });
    expect(parseScenarioUrl("balance=Infinity").balance).toBe(DEFAULT_SCENARIO.balance);
  });
});
