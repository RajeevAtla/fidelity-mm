import { isCategoryCode } from "../domain/categories";
import type { MinimumData, RateSheetData, TaxData } from "./data-contracts";
import { isSupportedTaxAllocationYear } from "./tax-year-policy";

export type AppData = {
  rateSheet: RateSheetData;
  minimumData: MinimumData;
  taxData: TaxData;
};

type JsonRecord = Record<string, unknown>;
type Predicate<T> = (value: unknown) => value is T;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString: Predicate<string> = (value): value is string => typeof value === "string";
const isNonEmptyString: Predicate<string> = (value): value is string =>
  isString(value) && value.trim().length > 0;
const isNullableString: Predicate<string | null> = (value): value is string | null =>
  value === null || typeof value === "string";
const isNullableNumber: Predicate<number | null> = (value): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const isNumber: Predicate<number> = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isNonNegativeInteger: Predicate<number> = (value): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

export function isSafeSourceUrl(value: unknown): value is string {
  if (!isString(value) || value.trim() !== value || value.length === 0) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseAppData(
  rateSheetValue: unknown,
  minimumDataValue: unknown,
  taxDataValue: unknown,
): AppData {
  const rateSheet = parseRateSheetData(rateSheetValue);
  const minimumData = parseMinimumData(minimumDataValue);
  const taxData = parseTaxData(taxDataValue);

  for (const [index, fund] of rateSheet.funds.entries()) {
    if (fund.symbol === null || fund.sevenDayYield === null) continue;
    if (!minimumData.funds[fund.symbol]) {
      throw invalid("minimum data", `funds.${fund.symbol}`, "a matching minimum rule");
    }
    if (!taxData.funds[fund.symbol]) {
      throw invalid("tax data", `funds.${fund.symbol}`, "a matching tax rule");
    }
    const duplicate = rateSheet.funds.findIndex((candidate, candidateIndex) =>
      candidateIndex < index && candidate.symbol === fund.symbol,
    );
    if (duplicate >= 0) {
      throw invalid("rate sheet", `funds[${index}].symbol`, "a unique symbol");
    }
  }

  return { rateSheet, minimumData, taxData };
}

export function parseRateSheetData(value: unknown): RateSheetData {
  const root = requireRecord(value, "rate sheet", "root");
  const checkedAt = requireField(root, "checkedAt", "rate sheet", "checkedAt", isString, "a string");
  if (!isIsoTimestamp(checkedAt)) invalidField("rate sheet", "checkedAt", "a valid ISO timestamp");
  const count = requireField(root, "count", "rate sheet", "count", isNonNegativeInteger, "a non-negative integer");
  requireField(root, "sourceUrl", "rate sheet", "sourceUrl", isSafeSourceUrl, "a valid HTTPS URL");
  requireField(root, "apiUrl", "rate sheet", "apiUrl", isSafeSourceUrl, "a valid HTTPS URL");
  const requestedPriceDate = requireField(
    root,
    "requestedPriceDate",
    "rate sheet",
    "requestedPriceDate",
    isNullableString,
    "a string or null",
  );
  if (requestedPriceDate !== null && !isMarketDate(requestedPriceDate)) {
    invalidField("rate sheet", "requestedPriceDate", "a valid market date or null");
  }
  const funds = requireField(root, "funds", "rate sheet", "funds", Array.isArray, "an array");
  if (count !== funds.length) invalidField("rate sheet", "count", "the number of fund records");

  funds.forEach((value, index) => {
    const path = `funds[${index}]`;
    const fund = requireRecord(value, "rate sheet", path);
    const symbol = requireField(fund, "symbol", "rate sheet", `${path}.symbol`, isNullableString, "a string or null");
    if (symbol !== null && symbol.trim().length === 0) {
      invalidField("rate sheet", `${path}.symbol`, "a non-empty string or null");
    }
    requireField(fund, "name", "rate sheet", `${path}.name`, isNonEmptyString, "a non-empty string");
    const section = requireField(
      fund,
      "section",
      "rate sheet",
      `${path}.section`,
      isNullableString,
      "a string or null",
    );
    if (section !== null && section.trim().length === 0) {
      invalidField("rate sheet", `${path}.section`, "a non-empty string or null");
    }
    const sevenDayYield = requireField(
      fund,
      "sevenDayYield",
      "rate sheet",
      `${path}.sevenDayYield`,
      isNullableNumber,
      "a finite number or null",
    );
    requireNullableRange("rate sheet", `${path}.sevenDayYield`, sevenDayYield, -10, 100);
    const expenseRatioNet = requireField(
      fund,
      "expenseRatioNet",
      "rate sheet",
      `${path}.expenseRatioNet`,
      isNullableNumber,
      "a finite number or null",
    );
    const expenseRatioGross = requireField(
      fund,
      "expenseRatioGross",
      "rate sheet",
      `${path}.expenseRatioGross`,
      isNullableNumber,
      "a finite number or null",
    );
    requireNullableRange("rate sheet", `${path}.expenseRatioNet`, expenseRatioNet, 0, 20);
    requireNullableRange("rate sheet", `${path}.expenseRatioGross`, expenseRatioGross, 0, 20);
    if (expenseRatioNet === null && expenseRatioGross === null) {
      invalidField("rate sheet", `${path}.expenseRatioNet`, "a finite net or gross expense ratio");
    }
  });

  return value as RateSheetData;
}

export function parseMinimumData(value: unknown): MinimumData {
  const root = requireRecord(value, "minimum data", "root");
  const checkedAt = requireField(root, "checkedAt", "minimum data", "checkedAt", isString, "a string");
  if (!isIsoTimestamp(checkedAt)) invalidField("minimum data", "checkedAt", "a valid ISO timestamp");
  const count = requireField(root, "count", "minimum data", "count", isNonNegativeInteger, "a non-negative integer");
  requireField(root, "source", "minimum data", "source", isSafeSourceUrl, "a valid HTTPS URL");
  const funds = requireField(root, "funds", "minimum data", "funds", isRecord, "an object");
  if (count !== Object.keys(funds).length) invalidField("minimum data", "count", "the number of fund records");

  for (const [symbol, value] of Object.entries(funds)) {
    const path = `funds.${symbol}`;
    const fund = requireRecord(value, "minimum data", path);
    const minimumInvestment = requireField(
      fund,
      "minimumInvestment",
      "minimum data",
      `${path}.minimumInvestment`,
      isNumber,
      "a finite number",
    );
    requireRange("minimum data", `${path}.minimumInvestment`, minimumInvestment, 0, 1e9);
    const minimumLabel = requireField(fund, "minimumLabel", "minimum data", `${path}.minimumLabel`, isString, "a string");
    if (minimumLabel.trim().length === 0) {
      invalidField("minimum data", `${path}.minimumLabel`, "a non-empty string");
    }
    requireField(fund, "sourceUrl", "minimum data", `${path}.sourceUrl`, isSafeSourceUrl, "a valid HTTPS URL");
    requireField(
      fund,
      "status",
      "minimum data",
      `${path}.status`,
      (entry): entry is "verified" => entry === "verified",
      "verified",
    );
  }

  return value as MinimumData;
}

export function parseTaxData(value: unknown): TaxData {
  const root = requireRecord(value, "tax data", "root");
  const checkedAt = requireField(root, "checkedAt", "tax data", "checkedAt", isString, "a string");
  if (!isIsoTimestamp(checkedAt)) invalidField("tax data", "checkedAt", "a valid ISO timestamp");
  const count = requireField(root, "count", "tax data", "count", isNonNegativeInteger, "a non-negative integer");
  requireField(root, "sourceUrl", "tax data", "sourceUrl", isSafeSourceUrl, "a valid HTTPS URL");
  const taxYear = requireField(root, "taxYear", "tax data", "taxYear", isNumber, "a finite number");
  if (!isSupportedTaxAllocationYear(taxYear)) {
    invalidField("tax data", "taxYear", "the current or prior allocation year");
  }
  const funds = requireField(root, "funds", "tax data", "funds", isRecord, "an object");
  if (count !== Object.keys(funds).length) invalidField("tax data", "count", "the number of fund records");

  for (const [symbol, value] of Object.entries(funds)) {
    const path = `funds.${symbol}`;
    const fund = requireRecord(value, "tax data", path);
    requireField(fund, "c", "tax data", `${path}.c`, isCategoryCode, "a supported category code");
    const governmentExemptPct = requireField(
      fund,
      "governmentExemptPct",
      "tax data",
      `${path}.governmentExemptPct`,
      isNumber,
      "a finite number",
    );
    requireRange("tax data", `${path}.governmentExemptPct`, governmentExemptPct, 0, 100);
    requireField(fund, "sourceUrl", "tax data", `${path}.sourceUrl`, isSafeSourceUrl, "a valid HTTPS URL");
  }

  return value as TaxData;
}

function requireRecord(value: unknown, document: string, path: string): JsonRecord {
  if (!isRecord(value)) throw invalid(document, path, "an object");
  return value;
}

function requireField<T>(
  object: JsonRecord,
  key: string,
  document: string,
  path: string,
  predicate: Predicate<T>,
  expected: string,
): T {
  const value = object[key];
  if (!predicate(value)) throw invalid(document, path, expected);
  return value;
}

function requireRange(document: string, path: string, value: number, min: number, max: number): void {
  if (value < min || value > max) {
    throw invalid(document, path, `a finite number from ${min} through ${max}`);
  }
}

function requireNullableRange(
  document: string,
  path: string,
  value: number | null,
  min: number,
  max: number,
): void {
  if (value !== null) requireRange(document, path, value, min, max);
}

function invalidField(document: string, path: string, expected: string): never {
  throw invalid(document, path, expected);
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isMarketDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2])));
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${date.getUTCFullYear()}` === value;
}

function invalid(document: string, path: string, expected: string): Error {
  return new Error(`Invalid ${document}: ${path} must be ${expected}`);
}
