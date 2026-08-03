import { DATA_PATHS } from "../data-sources";
import { APP_CONFIG } from "../app-config";
import { categoryFor } from "./fidelity-tax-utils";

type RateFund = {
  symbol?: string | null;
  name?: string;
  sevenDayYield?: number | null;
  expenseRatioNet?: number | null;
  expenseRatioGross?: number | null;
};
type MinimumRule = {
  minimumInvestment?: number | null;
  minimumLabel?: string;
  sourceUrl?: string;
  status?: "verified";
};
type TaxRule = {
  c?: string;
  njExemptPct?: number;
  sourceUrl?: string;
};
type RateData = { checkedAt?: string; count?: number; funds?: RateFund[] };
type MinimumData = { checkedAt?: string; count?: number; funds?: Record<string, MinimumRule> };
type TaxData = { checkedAt?: string; count?: number; taxYear?: number | null; funds?: Record<string, TaxRule> };

const rateData = await readJson<RateData>(DATA_PATHS.rateSheet);
const minimumData = await readJson<MinimumData>(DATA_PATHS.minimums);
const taxData = await readJson<TaxData>(DATA_PATHS.taxRules);
const errors: string[] = [];

for (const [label, value] of [
  ["rate sheet", rateData.checkedAt],
  ["minimum data", minimumData.checkedAt],
  ["tax data", taxData.checkedAt],
] as const) {
  if (!validIsoTimestamp(value)) errors.push(`${label}: missing or invalid top-level checkedAt`);
}

const rateFunds = rateData.funds ?? [];
const symbols = rateFunds.map((fund) => fund.symbol).filter((symbol): symbol is string => Boolean(symbol));
const minimumSymbols = Object.keys(minimumData.funds ?? {});
const taxSymbols = Object.keys(taxData.funds ?? {});
if (rateData.count !== rateFunds.length) errors.push("Rate-sheet count does not match its fund records");
if (minimumData.count !== minimumSymbols.length) errors.push("Minimum count does not match its fund records");
if (taxData.count !== taxSymbols.length) errors.push("Tax count does not match its fund records");
const duplicateSymbols = symbols.filter((symbol, index) => symbols.indexOf(symbol) !== index);
if (duplicateSymbols.length) errors.push("Duplicate rate-sheet symbols: " + [...new Set(duplicateSymbols)].join(", "));
const rateSymbolSet = new Set(symbols);
const unexpectedMinimums = minimumSymbols.filter((symbol) => !rateSymbolSet.has(symbol));
const unexpectedTaxRules = taxSymbols.filter((symbol) => !rateSymbolSet.has(symbol));
if (unexpectedMinimums.length) errors.push("Unexpected minimum symbols: " + unexpectedMinimums.join(", "));
if (unexpectedTaxRules.length) errors.push("Unexpected tax symbols: " + unexpectedTaxRules.join(", "));

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
    if (!finite(minimum.minimumInvestment) || minimum.minimumInvestment < 0) errors.push(symbol + ": invalid minimum investment");
    if (!minimum.minimumLabel) errors.push(symbol + ": missing minimum label");
    if (!minimum.sourceUrl || minimum.status !== "verified") errors.push(symbol + ": minimum is not verified");
    if ("scrapedAt" in minimum) errors.push(symbol + ": minimum has a legacy per-fund scrapedAt");
  }
  if (tax) {
    if (!APP_CONFIG.categories.order.includes(tax.c as (typeof APP_CONFIG.categories.order)[number])) errors.push(symbol + ": unsupported category " + tax.c);
    if (rate?.name && tax.c !== categoryFor(rate.name)) {
      errors.push(symbol + ": category " + tax.c + " does not match fund name (expected " + categoryFor(rate.name) + ")");
    }
    if (!finite(tax.njExemptPct) || tax.njExemptPct < 0 || tax.njExemptPct > 100) errors.push(symbol + ": invalid NJ exemption percentage");
    if (!tax.sourceUrl) errors.push(symbol + ": incomplete tax provenance");
    if ("scrapedAt" in tax) errors.push(symbol + ": tax rule has a legacy per-fund scrapedAt");
  }
}

if (!Number.isInteger(taxData.taxYear) || (taxData.taxYear as number) < 2020) {
  errors.push("Tax data is missing a valid tax year");
}

console.log("Validated " + requiredSymbols.length + " funds, " + (minimumData.funds ? Object.keys(minimumData.funds).length : 0) + " minimum rules, and " + (taxData.funds ? Object.keys(taxData.funds).length : 0) + " tax rules.");
if (errors.length) throw new Error("Data validation failed:\n" + errors.join("\n"));

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function finiteOrNull(value: unknown): boolean {
  return value === null || value === undefined || finite(value);
}
function validIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await Bun.file(path).text()) as T;
}
