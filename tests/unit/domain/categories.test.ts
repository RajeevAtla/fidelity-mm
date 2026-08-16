import { describe, expect, test } from "bun:test";
import {
  CATEGORY_CODES,
  MUNICIPAL_CATEGORIES,
  isCategoryCode,
  isMunicipalCategory,
} from "../../../src/domain/categories";

describe("category contract", () => {
  test("keeps the supported category order and municipal membership", () => {
    expect(CATEGORY_CODES).toEqual(["p", "g", "t", "nm", "nj", "ny", "ca", "ma"]);
    expect(MUNICIPAL_CATEGORIES).toEqual(["nm", "nj", "ny", "ca", "ma"]);
    expect(isMunicipalCategory("nm")).toBe(true);
    expect(isMunicipalCategory("g")).toBe(false);
  });

  test("checks category values at runtime", () => {
    expect(isCategoryCode("p")).toBe(true);
    expect(isCategoryCode("not-a-category")).toBe(false);
    expect(isCategoryCode(null)).toBe(false);
  });
});
