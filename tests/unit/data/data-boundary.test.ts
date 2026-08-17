import { describe, expect, test } from "bun:test";
import rateDataJson from "../../../data/fidelity-mm-allclass.json";
import minimumDataJson from "../../../data/fidelity-mm-minimums.json";
import taxDataJson from "../../../data/fidelity-mm-tax-rules.json";
import { parseAppData } from "../../../src/data/data-boundary";

function appData() {
  return {
    rate: structuredClone(rateDataJson) as { funds: Array<Record<string, unknown>> },
    minimum: structuredClone(minimumDataJson) as { funds: Record<string, Record<string, unknown>> },
    tax: structuredClone(taxDataJson) as { taxYear: number; funds: Record<string, Record<string, unknown>> },
  };
}

describe("runtime app data boundary", () => {
  test("returns typed application data for valid documents", () => {
    const parsed = parseAppData(rateDataJson, minimumDataJson, taxDataJson);

    expect(parsed.rateSheet.funds[0].symbol).toBe("FNSXX");
    expect(parsed.minimumData.funds.FNSXX.minimumLabel).toBe("10M");
    expect(parsed.taxData.funds.FNSXX.c).toBe("p");
  });

  test("rejects malformed rate fields with a document path", () => {
    const data = appData();
    data.rate.funds[0].sevenDayYield = "3.64";

    expect(() => parseAppData(data.rate, data.minimum, data.tax)).toThrow(
      "Invalid rate sheet: funds[0].sevenDayYield must be a finite number or null",
    );
  });

  test("rejects malformed minimum records", () => {
    const data = appData();
    delete data.minimum.funds.FNSXX.minimumLabel;

    expect(() => parseAppData(data.rate, data.minimum, data.tax)).toThrow(
      "Invalid minimum data: funds.FNSXX.minimumLabel must be a string",
    );
  });

  test("rejects unsupported tax categories", () => {
    const data = appData();
    data.tax.funds.FNSXX.c = "other";

    expect(() => parseAppData(data.rate, data.minimum, data.tax)).toThrow(
      "Invalid tax data: funds.FNSXX.c must be a supported category code",
    );
  });

  test("rejects out-of-range values consumed by the comparison", () => {
    const data = appData();
    data.rate.funds[0].sevenDayYield = 101;

    expect(() => parseAppData(data.rate, data.minimum, data.tax)).toThrow(
      "Invalid rate sheet: funds[0].sevenDayYield must be a finite number from -10 through 100",
    );
  });

  test("requires verified HTTPS minimum sources", () => {
    const data = appData();
    data.minimum.funds.FNSXX.status = "pending";

    expect(() => parseAppData(data.rate, data.minimum, data.tax)).toThrow(
      "Invalid minimum data: funds.FNSXX.status must be verified",
    );
  });

  test("requires a current or prior tax allocation year", () => {
    const data = appData();
    data.tax.taxYear = 2024;

    expect(() => parseAppData(data.rate, data.minimum, data.tax)).toThrow(
      "Invalid tax data: taxYear must be the current or prior allocation year",
    );
  });

  test("rejects unsafe source URLs", () => {
    const data = appData();
    data.minimum.funds.FNSXX.sourceUrl = "javascript:alert(1)";

    expect(() => parseAppData(data.rate, data.minimum, data.tax)).toThrow(
      "Invalid minimum data: funds.FNSXX.sourceUrl must be a valid HTTPS URL",
    );
  });
});
