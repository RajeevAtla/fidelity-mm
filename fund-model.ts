import { calculateAfterTaxYield } from "./calculations";
import type { CategoryCode } from "./categories";
import type { MinimumRule, RateSheetData, RateSheetFund, TaxRule } from "./data-contracts";

export type CategoryFilter = CategoryCode | "all";

export type Fund = {
  t: string;
  n: string;
  y: number;
  er: number;
  c: CategoryCode;
  se: number;
  mn: string;
};

export type FundResult = Fund & { a: number };

export type FundBracket = {
  r: number;
  l: string;
};

export type Winner = Pick<FundResult, "t" | "a" | "c">;

export type WinnerMatrixRow = {
  fb: FundBracket;
  cols: Winner[];
};

export function buildFunds(
  rateSheet: RateSheetData,
  taxRules: Record<string, TaxRule>,
  minimums: Record<string, MinimumRule>,
): Fund[] {
  return rateSheet.funds
    .filter((fund) => fund.symbol && fund.sevenDayYield !== null)
    .map((fund) => {
      const symbol = fund.symbol ?? "";
      const rule = taxRules[symbol];
      const minimum = minimums[symbol];
      if (!rule) {
        throw new Error(`Missing fund rule for ${symbol || "unknown symbol"}`);
      }
      if (!minimum) {
        throw new Error(`Missing minimum investment for ${symbol || "unknown symbol"}`);
      }

      return {
        t: symbol,
        n: displayName(fund),
        y: fund.sevenDayYield ?? 0,
        er: fund.expenseRatioNet ?? fund.expenseRatioGross ?? 0,
        c: rule.c,
        se: rule.njExemptPct,
        mn: minimum.minimumLabel,
      };
    });
}

export function displayName(fund: RateSheetFund): string {
  const sectionParts = (fund.section ?? "").split(":");
  const classLabel = cleanLabel(sectionParts[sectionParts.length - 1] ?? "");
  const name = cleanLabel(fund.name);
  return classLabel && !name.toLowerCase().includes(classLabel.toLowerCase())
    ? `${name} - ${classLabel}`
    : name;
}

export function cleanLabel(value: string): string {
  return value
    .replace(/\s*\d+(?:,\d+)*,?\*?$/g, "")
    .replace(/\s*\*+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateAfterTaxResults(funds: Fund[], federalRate: number, stateRate: number): FundResult[] {
  return funds.map((fund) => ({
    ...fund,
    a: calculateAfterTaxYield({
      grossYield: fund.y,
      federalRate,
      stateRate,
      stateExemptPct: fund.se,
      category: fund.c,
    }),
  }));
}

export function filterAndSortFunds(results: FundResult[], category: CategoryFilter): FundResult[] {
  const filtered = category === "all" ? results.slice() : results.filter((fund) => fund.c === category);
  return filtered.sort((a, b) => b.a - a.a);
}

export function getWidthRange(results: FundResult[]): { min: number; max: number } {
  if (results.length === 0) {
    return { min: 0, max: 0 };
  }

  return results.reduce(
    (range, fund) => ({
      min: Math.min(range.min, fund.a),
      max: Math.max(range.max, fund.a),
    }),
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );
}

export function countFundsByCategory(funds: Fund[]): Partial<Record<CategoryCode, number>> {
  return funds.reduce<Partial<Record<CategoryCode, number>>>((counts, fund) => {
    counts[fund.c] = (counts[fund.c] ?? 0) + 1;
    return counts;
  }, {});
}

export function getWinnerMatrix(
  funds: Fund[],
  federalBrackets: readonly FundBracket[],
  stateBrackets: readonly FundBracket[],
): WinnerMatrixRow[] {
  if (funds.length === 0) return [];

  return federalBrackets.map((fb) => ({
    fb,
    cols: stateBrackets.map((nb) => {
      const best = calculateAfterTaxResults(funds, fb.r, nb.r)
        .map(({ t, a, c }) => ({ t, a, c }))
        .sort((a, b) => b.a - a.a)[0];
      return best!;
    }),
  }));
}
