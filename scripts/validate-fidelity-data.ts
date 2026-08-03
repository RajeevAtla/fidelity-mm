import { DATA_PATHS } from "../data-sources";
import { APP_CONFIG } from "../app-config";
import { categoryFor } from "./fidelity-tax-utils";

type RateFund = {
  fundNo?: string;
  symbol?: string | null;
  name?: string;
  date?: string;
  nav?: number | null;
  oneDayYield?: number | null;
  sevenDayYield?: number | null;
  thirtyDayYield?: number | null;
  portfolioNetAssets?: number | null;
  weightedAverageMaturityDays?: number | null;
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
type RateData = {
  checkedAt?: string;
  complete?: boolean;
  requestedPriceDate?: string;
  count?: number;
  funds?: RateFund[];
};
type MinimumData = { checkedAt?: string; count?: number; funds?: Record<string, MinimumRule> };
type TaxData = { checkedAt?: string; count?: number; taxYear?: number | null; funds?: Record<string, TaxRule> };

const rateData = await readJson<RateData>(DATA_PATHS.rateSheet);
const minimumData = await readJson<MinimumData>(DATA_PATHS.minimums);
const taxData = await readJson<TaxData>(DATA_PATHS.taxRules);
const errors: string[] = [];
const EXPECTED_SYMBOLS = new Set([
  "FNSXX", "FRGXX", "FRBXX", "FRSXX", "FMPXX", "FIGXX", "FISXX", "FSIXX", "FTCXX", "FMYXX",
  "FGEXX", "FTUXX", "FTYXX", "FSXXX", "FCIXX", "FCVXX", "FCEXX", "FOXXX", "FEXXX", "FCOXX",
  "FCGXX", "FCSXX", "FOIXX", "FETXX", "FTVXX", "FOPXX", "FZDXX", "FZCXX", "FZEXX", "FZBXX",
  "FDUXX", "FDEXX", "FZAXX", "FSRXX", "FERXX", "FSBXX", "FMAXX", "FSKXX", "FNKXX", "FZGXX",
]);

for (const [label, value] of [
  ["rate sheet", rateData.checkedAt],
  ["minimum data", minimumData.checkedAt],
  ["tax data", taxData.checkedAt],
] as const) {
  if (!validIsoTimestamp(value)) errors.push(`${label}: missing or invalid top-level checkedAt`);
}
if (validIsoTimestamp(rateData.checkedAt)) {
  const checkedAge = ageInDays(new Date(rateData.checkedAt));
  if (checkedAge < -1) errors.push("Rate sheet: checkedAt is in the future");
  if (checkedAge > 5) errors.push("Rate sheet: checkedAt is more than five days old");
}
if (rateData.complete !== true) errors.push("Rate sheet is not marked complete");
const requestedPriceDate = parseMarketDate(rateData.requestedPriceDate);
if (!requestedPriceDate) {
  errors.push("Rate sheet: missing or invalid requestedPriceDate");
} else {
  const age = ageInDays(requestedPriceDate);
  if (age < -1) errors.push("Rate sheet: requestedPriceDate is in the future");
  if (age > 5) errors.push("Rate sheet: requestedPriceDate is more than five days old");
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
checkSymbolSet("rate sheet", symbols);
checkSymbolSet("minimum data", minimumSymbols);
checkSymbolSet("tax data", taxSymbols);

const requiredSymbols = [...EXPECTED_SYMBOLS];

for (const symbol of requiredSymbols) {
  const rate = rateFunds.find((fund) => fund.symbol === symbol);
  const minimum = minimumData.funds?.[symbol];
  const tax = taxData.funds?.[symbol];
  if (!rate) errors.push(symbol + ": missing rate record");
  if (!minimum) errors.push(symbol + ": missing minimum rule");
  if (!tax) errors.push(symbol + ": missing tax rule");
  if (rate) {
    if (!nonEmpty(rate.fundNo)) errors.push(symbol + ": missing fundNo");
    if (!nonEmpty(rate.symbol) || !nonEmpty(rate.name)) errors.push(symbol + ": missing symbol or name");
    if (!parseMarketDate(rate.date)) errors.push(symbol + ": missing or invalid date");
    else if (rate.date !== rateData.requestedPriceDate) errors.push(symbol + ": date differs from requestedPriceDate");
    checkRange(symbol, "NAV", rate.nav, 0.01, 1_000);
    checkRange(symbol, "one-day yield", rate.oneDayYield, -10, 100);
    checkRange(symbol, "seven-day yield", rate.sevenDayYield, -10, 100);
    checkRange(symbol, "thirty-day yield", rate.thirtyDayYield, -10, 100);
    checkRange(symbol, "portfolio net assets", rate.portfolioNetAssets, 0, 1e15);
    checkRange(symbol, "weighted average maturity", rate.weightedAverageMaturityDays, 0, 400);
    if (!inRange(rate.expenseRatioNet, 0, 20) && !inRange(rate.expenseRatioGross, 0, 20)) {
      errors.push(symbol + ": missing or out-of-range expense ratio");
    }
  }
  if (minimum) {
    if (!inRange(minimum.minimumInvestment, 0, 1e9)) errors.push(symbol + ": invalid minimum investment");
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
function inRange(value: unknown, min: number, max: number): value is number {
  return finite(value) && value >= min && value <= max;
}
function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function checkRange(symbol: string, label: string, value: unknown, min: number, max: number): void {
  if (!inRange(value, min, max)) errors.push(`${symbol}: missing or out-of-range ${label}`);
}
function checkSymbolSet(label: string, actualSymbols: string[]): void {
  const actual = new Set(actualSymbols);
  const missing = [...EXPECTED_SYMBOLS].filter((symbol) => !actual.has(symbol));
  const unexpected = [...actual].filter((symbol) => !EXPECTED_SYMBOLS.has(symbol));
  if (missing.length) errors.push(`${label}: missing expected symbols: ${missing.join(", ")}`);
  if (unexpected.length) errors.push(`${label}: unexpected symbols: ${unexpected.join(", ")}`);
}
function parseMarketDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2])));
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${date.getUTCFullYear()}` === value ? date : null;
}
function ageInDays(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}
function validIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await Bun.file(path).text()) as T;
}
