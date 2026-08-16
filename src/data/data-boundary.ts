import { isCategoryCode } from "../domain/categories";
import type { MinimumData, RateSheetData, TaxData } from "./data-contracts";

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
const isNullableString: Predicate<string | null> = (value): value is string | null =>
  value === null || typeof value === "string";
const isNullableNumber: Predicate<number | null> = (value): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const isNumber: Predicate<number> = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function parseAppData(
  rateSheetValue: unknown,
  minimumDataValue: unknown,
  taxDataValue: unknown,
): AppData {
  return {
    rateSheet: parseRateSheetData(rateSheetValue),
    minimumData: parseMinimumData(minimumDataValue),
    taxData: parseTaxData(taxDataValue),
  };
}

export function parseRateSheetData(value: unknown): RateSheetData {
  const root = requireRecord(value, "rate sheet", "root");
  requireField(root, "checkedAt", "rate sheet", "checkedAt", isString, "a string");
  requireField(
    root,
    "requestedPriceDate",
    "rate sheet",
    "requestedPriceDate",
    isNullableString,
    "a string or null",
  );
  const funds = requireField(root, "funds", "rate sheet", "funds", Array.isArray, "an array");

  funds.forEach((value, index) => {
    const path = `funds[${index}]`;
    const fund = requireRecord(value, "rate sheet", path);
    requireField(fund, "symbol", "rate sheet", `${path}.symbol`, isNullableString, "a string or null");
    requireField(fund, "name", "rate sheet", `${path}.name`, isString, "a string");
    requireField(fund, "section", "rate sheet", `${path}.section`, isNullableString, "a string or null");
    requireField(
      fund,
      "sevenDayYield",
      "rate sheet",
      `${path}.sevenDayYield`,
      isNullableNumber,
      "a finite number or null",
    );
    requireField(
      fund,
      "expenseRatioNet",
      "rate sheet",
      `${path}.expenseRatioNet`,
      isNullableNumber,
      "a finite number or null",
    );
    requireField(
      fund,
      "expenseRatioGross",
      "rate sheet",
      `${path}.expenseRatioGross`,
      isNullableNumber,
      "a finite number or null",
    );
  });

  return value as RateSheetData;
}

export function parseMinimumData(value: unknown): MinimumData {
  const root = requireRecord(value, "minimum data", "root");
  const funds = requireField(root, "funds", "minimum data", "funds", isRecord, "an object");

  for (const [symbol, value] of Object.entries(funds)) {
    const path = `funds.${symbol}`;
    const fund = requireRecord(value, "minimum data", path);
    requireField(fund, "minimumLabel", "minimum data", `${path}.minimumLabel`, isString, "a string");
  }

  return value as MinimumData;
}

export function parseTaxData(value: unknown): TaxData {
  const root = requireRecord(value, "tax data", "root");
  const funds = requireField(root, "funds", "tax data", "funds", isRecord, "an object");

  for (const [symbol, value] of Object.entries(funds)) {
    const path = `funds.${symbol}`;
    const fund = requireRecord(value, "tax data", path);
    requireField(fund, "c", "tax data", `${path}.c`, isCategoryCode, "a supported category code");
    requireField(
      fund,
      "governmentExemptPct",
      "tax data",
      `${path}.governmentExemptPct`,
      isNumber,
      "a finite number",
    );
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

function invalid(document: string, path: string, expected: string): Error {
  return new Error(`Invalid ${document}: ${path} must be ${expected}`);
}
