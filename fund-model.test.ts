import { describe, expect, test } from "bun:test";
import {
  buildFunds,
  calculateAfterTaxResults,
  countFundsByCategory,
  filterAndSortFunds,
  getWidthRange,
  getWinnerMatrix,
  type Fund,
  type FundResult,
} from "./fund-model";
import type { MinimumRule, RateSheetData, RateSheetFund, TaxRule } from "./data-contracts";

const makeRateFund = (overrides: Partial<RateSheetFund> = {}): RateSheetFund => ({
  fundNo: "1",
  symbol: "AAA",
  name: "Money Market",
  section: "Funds:Institutional Class 2",
  date: null,
  nav: null,
  oneDayYield: null,
  sevenDayYield: 4,
  thirtyDayYield: null,
  dailyMilRate: null,
  portfolioNetAssets: null,
  portfolioNetAssetsDate: null,
  weightedAverageMaturityDays: null,
  weightedAverageMaturityDate: null,
  expenseRatioGross: 0.2,
  expenseRatioNet: 0.1,
  monthEndSevenDayYield: null,
  monthEndSevenDayYieldWithoutReimbursement: null,
  monthEndDate: null,
  ...overrides,
});

const makeRateSheet = (funds: RateSheetFund[]): RateSheetData => ({
  sourceUrl: "source",
  apiUrl: "api",
  tab: "allClass",
  groupSystemName: "all",
  sheetTitle: null,
  dateType: null,
  complete: true,
  requestedPriceDate: null,
  checkedAt: "checked",
  count: funds.length,
  funds,
});

const rule = (c: TaxRule["c"] = "g"): TaxRule => ({ c, njExemptPct: 0, sourceUrl: "source" });
const minimum = (minimumLabel = "1M"): MinimumRule => ({
  minimumInvestment: 1,
  minimumLabel,
  sourceUrl: "source",
  status: "verified",
});

const fund = (t: string, c: Fund["c"], y: number, se = 0): Fund => ({
  t,
  n: t,
  y,
  er: 0,
  c,
  se,
  mn: "1M",
});

const result = (t: string, c: Fund["c"], a: number): FundResult => ({
  ...fund(t, c, a),
  a,
});

describe("fund model", () => {
  test("maps valid rate-sheet funds and cleans display names", () => {
    const funds = buildFunds(
      makeRateSheet([
        makeRateFund({
          symbol: "AAA",
          name: "Money   Market 123*",
          section: "Funds:Institutional Class 2",
          sevenDayYield: 4.25,
          expenseRatioNet: null,
          expenseRatioGross: 0.3,
        }),
        makeRateFund({ symbol: null }),
        makeRateFund({ symbol: "SKIP", sevenDayYield: null }),
      ]),
      { AAA: rule("g") },
      { AAA: minimum("$1M") },
    );

    expect(funds).toEqual([
      {
        t: "AAA",
        n: "Money Market - Institutional Class",
        y: 4.25,
        er: 0.3,
        c: "g",
        se: 0,
        mn: "$1M",
      },
    ]);
  });

  test("throws when a valid fund has no tax rule", () => {
    expect(() => buildFunds(makeRateSheet([makeRateFund({ symbol: "AAA" })]), {}, { AAA: minimum() })).toThrow(
      "Missing fund rule for AAA",
    );
  });

  test("throws when a valid fund has no minimum", () => {
    expect(() => buildFunds(makeRateSheet([makeRateFund({ symbol: "AAA" })]), { AAA: rule() }, {})).toThrow(
      "Missing minimum investment for AAA",
    );
  });

  test("calculates, filters, and sorts results without changing input order", () => {
    const funds = [fund("AAA", "g", 5), fund("BBB", "nm", 4.5), fund("CCC", "g", 4)];
    const results = calculateAfterTaxResults(funds, 20, 5);
    const before = structuredClone(results);

    expect(results.map(({ t, a }) => [t, a])).toEqual([
      ["AAA", 3.75],
      ["BBB", 4.275],
      ["CCC", 3],
    ]);
    expect(filterAndSortFunds(results, "g").map((item) => item.t)).toEqual(["AAA", "CCC"]);
    expect(filterAndSortFunds(results, "all").map((item) => item.t)).toEqual(["BBB", "AAA", "CCC"]);
    expect(results).toEqual(before);
    expect(funds.map((item) => item.t)).toEqual(["AAA", "BBB", "CCC"]);
  });

  test("returns equal width ranges instead of collapsing them", () => {
    expect(getWidthRange([result("AAA", "g", 3), result("BBB", "g", 3)])).toEqual({ min: 3, max: 3 });
    expect(getWidthRange([])).toEqual({ min: 0, max: 0 });
  });

  test("counts categories", () => {
    expect(countFundsByCategory([fund("AAA", "g", 4), fund("BBB", "g", 3), fund("CCC", "nm", 2)])).toEqual({
      g: 2,
      nm: 1,
    });
  });

  test("selects the winner for every federal and state bracket pair", () => {
    const funds = [fund("GOV", "g", 5), fund("MUNI", "nm", 4.4)];
    const federalBrackets = [
      { r: 0, l: "0%" },
      { r: 30, l: "30%" },
    ] as const;
    const stateBrackets = [{ r: 0, l: "0%" }] as const;

    expect(getWinnerMatrix(funds, federalBrackets, stateBrackets)).toEqual([
      { fb: federalBrackets[0], cols: [{ t: "GOV", a: 5, c: "g" }] },
      { fb: federalBrackets[1], cols: [{ t: "MUNI", a: 4.4, c: "nm" }] },
    ]);
  });

  test("returns no winner rows when no funds are available", () => {
    expect(getWinnerMatrix([], [{ r: 30, l: "30%" }], [{ r: 6, l: "6%" }])).toEqual([]);
  });

  test("does not mutate inputs while building or deriving the model", () => {
    const rateFund = makeRateFund({ symbol: "AAA" });
    const rateSheet = makeRateSheet([rateFund]);
    const beforeRateSheet = structuredClone(rateSheet);
    const funds = buildFunds(rateSheet, { AAA: rule() }, { AAA: minimum() });
    const beforeFunds = structuredClone(funds);

    getWinnerMatrix(funds, [{ r: 10, l: "10%" }], [{ r: 5, l: "5%" }]);
    filterAndSortFunds(calculateAfterTaxResults(funds, 10, 5), "all");

    expect(rateSheet).toEqual(beforeRateSheet);
    expect(funds).toEqual(beforeFunds);
  });
});
