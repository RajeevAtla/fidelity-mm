import { describe, expect, test } from "bun:test";
import { categoryFor } from "../../../../src/scripts/fidelity/fidelity-tax-utils";

describe("Fidelity tax category classification", () => {
  test.each([
    ["Tax Exempt Money Market Fund", "nm"],
    ["Tax-Exempt Money Market Fund", "nm"],
    ["New Jersey Municipal Money Market Fund", "nj"],
    ["New York Municipal Money Market Fund", "ny"],
    ["California Municipal Money Market Fund", "ca"],
    ["Massachusetts Municipal Money Market Fund", "ma"],
    ["Treasury Only Portfolio", "t"],
    ["Government Portfolio", "g"],
    ["Money Market Portfolio", "p"],
  ] as const)("classifies %s as %s", (name, expected) => {
    expect(categoryFor(name)).toBe(expected);
  });

  test("rejects an unknown fund name", () => {
    expect(() => categoryFor("Unrecognized Portfolio")).toThrow("Unknown Fidelity tax fund category");
  });
});
