import { describe, expect, test } from "bun:test";
import {
  findGovernmentSecuritiesPdf,
  requiredPercentage,
  taxYearFromPdf,
} from "./scrape-fidelity-mm-tax";

describe("Fidelity tax-letter parsing", () => {
  test("selects the PDF year from the page or explicit fallback", () => {
    expect(findGovernmentSecuritiesPdf("href=\"/taxes/ty24-gse-supplemental-letter.pdf\"", 2025)).toBe(
      "https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/taxes/ty24-gse-supplemental-letter.pdf",
    );
    expect(findGovernmentSecuritiesPdf("no annual PDF link", 2025)).toContain("/ty25-gse-supplemental-letter.pdf");
  });

  test("parses labeled percentages and the tax year", () => {
    const text = [
      "2025 Percentage of Income from U.S. Government Securities",
      "Fidelity Investments Money Market - Money Market Portfolio - All Classes  16.17% *",
    ].join("\n");

    expect(requiredPercentage(text, "Fidelity Investments Money Market - Money Market Portfolio - All Classes")).toBe(16.17);
    expect(taxYearFromPdf(text)).toBe(2025);
  });
});
