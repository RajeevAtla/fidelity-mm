import { DATA_PATHS } from "../data-sources";
import { APP_CONFIG } from "../app-config";

type RateFund = {
  symbol?: string | null;
  sevenDayYield?: number | null;
  expenseRatioNet?: number | null;
  expenseRatioGross?: number | null;
};
type MinimumRule = {
  minimumInvestment?: number | null;
  minimumLabel?: string;
  sourceUrl?: string;
  scrapedAt?: string;
  status?: "verified" | "fallback";
};
type TaxRule = {
  c?: string;
  njExemptPct?: number;
  sourceUrl?: string;
  scrapedAt?: string;
};
type RateData = { funds?: RateFund[] };
type MinimumData = { funds?: Record<string, MinimumRule> };
type TaxData = { taxYear?: number | null; funds?: Record<string, TaxRule> };

const rateData = await readJson<RateData>(DATA_PATHS.rateSheet);
const minimumData = await readJson<MinimumData>(DATA_PATHS.minimums);
const taxData = await readJson<TaxData>(DATA_PATHS.taxRules);
const errors: string[] = [];
const warnings: string[] = [];

const rateFunds = rateData.funds ?? [];
const symbols = rateFunds.map((fund) => fund.symbol).filter((symbol): symbol is string => Boolean(symbol));
const duplicateSymbols = symbols.filter((symbol, index) => symbols.indexOf(symbol) !== index);
if (duplicateSymbols.length) errors.push("Duplicate rate-sheet symbols: " + [...new Set(duplicateSymbols)].join(", "));

const requiredSymbols = [...new Set(rateFunds
  .filter((fund) => fund.symbol && fund.sevenDayYield !== null && fund.sevenDayYield !== undefined)
  .map((fund) => fund.symbol as string))];

for (const symbol of requiredSymbols) {
  const rate = rateFunds.find((fund) => fund.symbol === symbol);
  const minimum = minimumData.funds?.[symbol];
  const tax = taxData.funds?.[symbol];
  if (!minimum) errors.push(symbol + ": missing minimum rule");
  if (!tax) errors.push(symbol + ": missing tax rule");
  if (rate && !finiteOrNull(rate.sevenDayYield)) errors.push(symbol + ": invalid seven-day yield");
  if (rate && !finiteOrNull(rate.expenseRatioNet) && !finiteOrNull(rate.expenseRatioGross)) {
    errors.push(symbol + ": missing expense ratio");
  }
  if (minimum) {
    if (minimum.minimumInvestment !== null && !finite(minimum.minimumInvestment)) errors.push(symbol + ": invalid minimum investment");
    if (!minimum.minimumLabel) errors.push(symbol + ": missing minimum label");
    if (!minimum.sourceUrl || !minimum.scrapedAt) errors.push(symbol + ": incomplete minimum provenance");
    if (minimum.status === "fallback") warnings.push(symbol + ": minimum is using a checked-in fallback");
  }
  if (tax) {
    if (!APP_CONFIG.categories.order.includes(tax.c as (typeof APP_CONFIG.categories.order)[number])) errors.push(symbol + ": unsupported category " + tax.c);
    if (!finite(tax.njExemptPct) || tax.njExemptPct < 0 || tax.njExemptPct > 100) errors.push(symbol + ": invalid NJ exemption percentage");
    if (!tax.sourceUrl || !tax.scrapedAt) errors.push(symbol + ": incomplete tax provenance");
  }
}

if (!Number.isInteger(taxData.taxYear) || (taxData.taxYear as number) < 2020) {
  errors.push("Tax data is missing a valid tax year");
}

console.log("Validated " + requiredSymbols.length + " funds, " + (minimumData.funds ? Object.keys(minimumData.funds).length : 0) + " minimum rules, and " + (taxData.funds ? Object.keys(taxData.funds).length : 0) + " tax rules.");
for (const warning of warnings) console.warn("Warning: " + warning);
if (errors.length) throw new Error("Data validation failed:\n" + errors.join("\n"));

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function finiteOrNull(value: unknown): boolean {
  return value === null || value === undefined || finite(value);
}
async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await Bun.file(path).text()) as T;
}
