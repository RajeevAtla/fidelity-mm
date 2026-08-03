import { describe, expect, test } from "bun:test";
import {
  formatMinimum,
  initialInvestmentFromOverview,
  parseMinimum,
  tradingSymbolFromOverview,
} from "./fidelity-minimum-utils";

describe("Fidelity minimum parsing", () => {
  test("reads initial investment feature code 3", () => {
    expect(
      initialInvestmentFromOverview({
        overview: {
          featureInformation: [
            { featureCode: "4", featureValue: "1" },
            { featureCode: "3", featureValue: "1,000,000" },
          ],
        },
      }),
    ).toBe(1_000_000);
  });

  test("rejects responses without the expected feature", () => {
    expect(initialInvestmentFromOverview({ overview: { featureInformation: [] } })).toBeNull();
    expect(initialInvestmentFromOverview(null)).toBeNull();
  });

  test("uses the dedicated overview field and reads the returned symbol", () => {
    const overview = {
      overview: { minimumInitialInvestment: "25,000", tradingSymbol: "fzexx" },
    };
    expect(initialInvestmentFromOverview(overview)).toBe(25_000);
    expect(tradingSymbolFromOverview(overview)).toBe("FZEXX");
    expect(tradingSymbolFromOverview({ overview: {} })).toBeNull();
  });

  test("parses and formats supported amounts", () => {
    expect(parseMinimum("10,000,000")).toBe(10_000_000);
    expect(parseMinimum("Minimum initial investment: $25 thousand")).toBe(25_000);
    expect(formatMinimum(10_000_000)).toBe("10M");
    expect(formatMinimum(100_000)).toBe("$100K");
    expect(formatMinimum(0)).toBe("$0");
  });
});
