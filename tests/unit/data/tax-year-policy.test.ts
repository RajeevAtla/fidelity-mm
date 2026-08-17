import { describe, expect, test } from "bun:test";
import { ACTIVE_TAX_YEAR } from "../../../src/domain/tax-brackets";
import { isSupportedTaxAllocationYear } from "../../../src/data/tax-year-policy";

describe("tax allocation year policy", () => {
  test("accepts only the active and prior years", () => {
    expect(isSupportedTaxAllocationYear(ACTIVE_TAX_YEAR)).toBe(true);
    expect(isSupportedTaxAllocationYear(ACTIVE_TAX_YEAR - 1)).toBe(true);
    expect(isSupportedTaxAllocationYear(ACTIVE_TAX_YEAR + 1)).toBe(false);
    expect(isSupportedTaxAllocationYear(ACTIVE_TAX_YEAR - 2)).toBe(false);
    expect(isSupportedTaxAllocationYear(String(ACTIVE_TAX_YEAR))).toBe(false);
  });
});
