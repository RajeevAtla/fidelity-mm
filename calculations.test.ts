import { describe, expect, test } from "bun:test";
import { calculateAfterTaxYield, calculateAnnualValue, calculateBarWidth } from "./calculations";

describe("after-tax yield calculations", () => {
  test("applies federal and state tax to taxable income", () => {
    expect(calculateAfterTaxYield({
      grossYield: 5,
      federalRate: 24,
      stateRate: 6,
      stateExemptPct: 0,
      category: "g",
    })).toBeCloseTo(3.5, 8);
  });

  test("does not apply federal tax to municipal income", () => {
    expect(calculateAfterTaxYield({
      grossYield: 4,
      federalRate: 37,
      stateRate: 6,
      stateExemptPct: 0,
      category: "nm",
    })).toBeCloseTo(3.76, 8);
  });

  test("fully state-exempt municipal income remains untaxed by the state", () => {
    expect(calculateAfterTaxYield({
      grossYield: 3,
      federalRate: 24,
      stateRate: 8,
      stateExemptPct: 100,
      category: "nj",
    })).toBe(3);
  });

  test("converts yield into annual dollars", () => {
    expect(calculateAnnualValue(4.25, 10_000)).toBe(425);
  });

  test("keeps a meaningful width when all values are equal", () => {
    expect(calculateBarWidth(3, 3, 3)).toBe(100);
  });
});
