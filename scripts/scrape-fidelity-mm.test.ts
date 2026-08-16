import { describe, expect, test } from "bun:test";
import { normalizeRateSheet, parseNumber, type FidelityRateSheet } from "./scrape-fidelity-mm";

describe("Fidelity rate-sheet parsing", () => {
  test("normalizes the primary yield row and fund values", () => {
    const rateSheet: FidelityRateSheet = {
      milrateYieldDates: ["07/31/2026", "07/30/2026"],
      classSections: [
        {
          description: "<b>FIMM&nbsp;Section</b>",
          funds: [
            {
              fundNumber: 123,
              tradingSymbol: "ABCXX",
              fundAlternateName: "Prime ^ &amp; Fund",
              nav: "$1.00",
              portfolioNetAssets: "1,234.5",
              portfolioNetAssetsDate: "07/31/2026",
              expenseRatioGrossPercentage: "0.20%",
              expenseRatioNetPercentage: "0.10%",
              monthEndSevenDayYield: "3.5%",
              monthEndDate: "07/31/2026",
              milrateYields: [
                { date: "07/30/2026", oneDayYield: "2", sevenDayYield: "2.1" },
                {
                  date: "07/31/2026",
                  milRate: "0.0001",
                  oneDayYield: "3.1%",
                  sevenDayYield: "3.2%",
                  thirtyDayYield: "3.3%",
                  averageMaturityDaysInDays: "25",
                  averageMaturityDaysInDaysDate: "07/30/2026",
                },
              ],
            },
          ],
        },
      ],
    };

    expect(normalizeRateSheet(rateSheet)).toEqual([
      {
        fundNo: "123",
        symbol: "ABCXX",
        name: "Prime & Fund",
        section: "FIMM Section",
        date: "07/31/2026",
        nav: 1,
        oneDayYield: 3.1,
        sevenDayYield: 3.2,
        thirtyDayYield: 3.3,
        dailyMilRate: 0.0001,
        portfolioNetAssets: 1234.5,
        portfolioNetAssetsDate: "07/31/2026",
        weightedAverageMaturityDays: 25,
        weightedAverageMaturityDate: "07/30/2026",
        expenseRatioGross: 0.2,
        expenseRatioNet: 0.1,
        monthEndSevenDayYield: 3.5,
        monthEndSevenDayYieldWithoutReimbursement: null,
        monthEndDate: "07/31/2026",
      },
    ]);
  });

  test("returns null for missing or invalid numeric values", () => {
    expect(parseNumber(undefined)).toBeNull();
    expect(parseNumber("not a number")).toBeNull();
  });
});
