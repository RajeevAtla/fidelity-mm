import { describe, expect, test } from "bun:test";
import rateDataJson from "../../../../data/fidelity-mm-allclass.json";
import minimumDataJson from "../../../../data/fidelity-mm-minimums.json";
import taxDataJson from "../../../../data/fidelity-mm-tax-rules.json";
import { validateData, type MinimumData, type RateData, type TaxData } from "../../../../src/scripts/fidelity/validate-fidelity-data";

const now = Date.parse(rateDataJson.checkedAt);
const staleNow = now + 6 * 86_400_000;

function data() {
  return {
    rate: structuredClone(rateDataJson) as RateData,
    minimum: structuredClone(minimumDataJson) as MinimumData,
    tax: structuredClone(taxDataJson) as TaxData,
  };
}

describe("Fidelity data validation", () => {
  test("accepts the checked-in data at its check date", () => {
    const { rate, minimum, tax } = data();
    expect(validateData(rate, minimum, tax, now)).toEqual([]);
  });

  test("reports stale rate data", () => {
    const { rate, minimum, tax } = data();
    const errors = validateData(rate, minimum, tax, staleNow);
    expect(errors).toContain("Rate sheet: checkedAt is more than five days old");
    expect(errors).toContain("Rate sheet: requestedPriceDate is more than five days old");
  });

  test("reports a missing expected rate record", () => {
    const { rate, minimum, tax } = data();
    rate.funds = rate.funds?.filter((fund) => fund.symbol !== "FNSXX");
    rate.count = rate.funds?.length;

    expect(validateData(rate, minimum, tax, now)).toContain("FNSXX: missing rate record");
  });

  test("reports duplicate rate-sheet symbols", () => {
    const { rate, minimum, tax } = data();
    rate.funds?.push(structuredClone(rate.funds[0]));
    rate.count = rate.funds?.length;

    expect(validateData(rate, minimum, tax, now)).toContain("Duplicate rate-sheet symbols: FNSXX");
  });
});
