import { ACTIVE_TAX_YEAR } from "../domain/tax-brackets";

export function isSupportedTaxAllocationYear(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= ACTIVE_TAX_YEAR - 1 && value <= ACTIVE_TAX_YEAR;
}
