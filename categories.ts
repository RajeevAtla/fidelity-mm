export const CATEGORY_CODES = ["p", "g", "t", "nm", "nj", "ny", "ca", "ma"] as const;

export type CategoryCode = (typeof CATEGORY_CODES)[number];

export const MUNICIPAL_CATEGORIES = ["nm", "nj", "ny", "ca", "ma"] as const;

const CATEGORY_CODE_SET = new Set<string>(CATEGORY_CODES);
const MUNICIPAL_CATEGORY_SET = new Set<string>(MUNICIPAL_CATEGORIES);

export function isCategoryCode(value: unknown): value is CategoryCode {
  return typeof value === "string" && CATEGORY_CODE_SET.has(value);
}

export function isMunicipalCategory(value: unknown): value is CategoryCode {
  return typeof value === "string" && MUNICIPAL_CATEGORY_SET.has(value);
}
