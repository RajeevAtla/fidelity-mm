import { describe, expect, test } from "bun:test";
import { APP_CONFIG, SUPPORTED_STATE_CODES } from "./app-config";
import { ACTIVE_TAX_CONFIG, ACTIVE_TAX_YEAR } from "./tax-brackets";

describe("state tax profiles", () => {
  test("cover every supported resident state", () => {
    expect(SUPPORTED_STATE_CODES).toHaveLength(50);
    for (const state of SUPPORTED_STATE_CODES) {
      const profile = ACTIVE_TAX_CONFIG.states[state];
      expect(profile.source).toContain("state-income-tax-rates-2026");
      expect(profile.brackets.length).toBeGreaterThan(0);
      expect(APP_CONFIG.states[state].abbreviation).toHaveLength(2);
    }
  });

  test("uses the active year and keeps bracket rates ordered", () => {
    expect(ACTIVE_TAX_YEAR).toBe(2026);
    for (const state of SUPPORTED_STATE_CODES) {
      const rates = ACTIVE_TAX_CONFIG.states[state].brackets.map((bracket) => bracket.rate);
      expect(rates.every((rate) => Number.isFinite(rate) && rate >= 0)).toBeTrue();
      expect(rates).toEqual([...rates].sort((a, b) => a - b));
    }
  });

  test("keeps Washington capital gains separate from ordinary income", () => {
    const washington = ACTIVE_TAX_CONFIG.states.wa;
    expect(washington.brackets).toEqual([{ rate: 0, label: "0% · Ordinary income not taxed" }]);
    expect(washington.capitalGains?.map(({ rate }) => rate)).toEqual([7, 9]);
    expect(washington.note).toContain("not applied to money-market yield income");
  });

  test("captures current 2026 representative state schedules", () => {
    expect(ACTIVE_TAX_CONFIG.states.ar.brackets.map(({ rate }) => rate)).toEqual([0, 2, 3, 3.4, 3.9]);
    expect(ACTIVE_TAX_CONFIG.states.ar.note).toContain("lower-income tax-table schedule");
    expect(ACTIVE_TAX_CONFIG.states.de.brackets[0]?.rate).toBe(0);
    expect(ACTIVE_TAX_CONFIG.states.id.brackets[0]?.rate).toBe(0);
    expect(ACTIVE_TAX_CONFIG.states.ms.brackets[0]?.rate).toBe(0);
    expect(ACTIVE_TAX_CONFIG.states.mo.brackets[0]?.rate).toBe(0);
    expect(ACTIVE_TAX_CONFIG.states.nd.brackets[0]?.rate).toBe(0);
    expect(ACTIVE_TAX_CONFIG.states.oh.brackets[0]?.rate).toBe(0);
    expect(ACTIVE_TAX_CONFIG.states.ok.brackets[0]?.rate).toBe(0);
    expect(ACTIVE_TAX_CONFIG.states.nj.brackets[ACTIVE_TAX_CONFIG.states.nj.brackets.length - 1]?.rate).toBe(10.75);
    expect(ACTIVE_TAX_CONFIG.states.ok.brackets.map(({ rate }) => rate)).toEqual([0, 2.5, 3.5, 4.5]);
    expect(ACTIVE_TAX_CONFIG.states.oh.brackets[1].rate).toBe(2.75);
    expect(ACTIVE_TAX_CONFIG.states.sc.brackets[ACTIVE_TAX_CONFIG.states.sc.brackets.length - 1]?.rate).toBe(6.2);
    expect(ACTIVE_TAX_CONFIG.states.sc.note).toContain("after June 30");
  });

  test("represents every zero ordinary-income-tax state", () => {
    for (const state of ["ak", "fl", "nv", "nh", "sd", "tn", "tx", "wy"] as const) {
      expect(ACTIVE_TAX_CONFIG.states[state].brackets).toEqual([
        { rate: 0, label: "0% · No ordinary income tax" },
      ]);
    }
  });
});
