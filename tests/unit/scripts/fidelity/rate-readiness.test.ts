import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import rate from "../../../../data/fidelity-mm-allclass.json";
import { main, type FidelityRateSheet } from "../../../../src/scripts/fidelity/scrape-fidelity-mm";

// Synthetic API-shaped fixture reconstructed from checked-in normalized data.
// Issue #14 logs establish the false/null pattern, not the raw API field layout.
function fixture(): FidelityRateSheet {
  return {
    complete: true, requestedPriceDate: rate.requestedPriceDate,
    milrateYieldDates: [rate.requestedPriceDate],
    classSections: [{ description: "Fixture", funds: rate.funds.map(fund => ({
      fundNumber: fund.fundNo, tradingSymbol: fund.symbol,
      fundAlternateName: fund.name, nav: fund.nav,
      portfolioNetAssets: fund.portfolioNetAssets,
      expenseRatioGrossPercentage: fund.expenseRatioGross,
      expenseRatioNetPercentage: fund.expenseRatioNet,
      milrateYields: [{ date: fund.date, oneDayYield: fund.oneDayYield,
        sevenDayYield: fund.sevenDayYield, thirtyDayYield: fund.thirtyDayYield,
        averageMaturityDaysInDays: fund.weightedAverageMaturityDays }],
    })) }],
  };
}

const outputSpy = spyOn(console, "log").mockImplementation(() => {});
afterEach(() => outputSpy.mockClear());
afterAll(() => outputSpy.mockRestore());

function harness(responses: unknown[]) {
  const sleeps: number[] = [];
  const logs: string[] = [];
  let requests = 0;
  let output = "last-good";
  let writes = 0;
  return {
    sleeps, logs,
    get requests() { return requests; },
    get output() { return output; },
    get writes() { return writes; },
    run: () => main(["--out", "fixture.json"], {
      fetch: async () => Response.json(responses[Math.min(requests++, responses.length - 1)]),
      now: () => Date.parse(rate.checkedAt),
      sleep: async ms => { sleeps.push(ms); },
      log: message => { logs.push(message); },
      write: async (_path, json) => { output = json; writes++; },
    }),
  };
}

describe("all-class publication readiness", () => {
  test("retries the issue 14 pattern and writes only the completed snapshot", async () => {
    const incomplete = fixture();
    incomplete.complete = false;
    for (const fund of incomplete.classSections![0]!.funds!) fund.portfolioNetAssets = null;
    const h = harness([incomplete, fixture()]);
    await h.run();
    expect(h.requests).toBe(2);
    expect(h.sleeps).toEqual([60_000]);
    expect(h.writes).toBe(1);
    const published = JSON.parse(h.output);
    expect(published.complete).toBe(true);
    expect(published.funds).toHaveLength(40);
    expect(published.funds.every((fund: { portfolioNetAssets: unknown }) => typeof fund.portfolioNetAssets === "number")).toBe(true);
    expect(h.logs[0]).toContain("missingAssets=40");
  });

  test("caps readiness retries and preserves output on exhaustion", async () => {
    const incomplete = fixture();
    incomplete.complete = false;
    const h = harness([incomplete]);
    await expect(h.run()).rejects.toThrow("source not ready after 3 attempts");
    expect(h.requests).toBe(3);
    expect(h.sleeps).toEqual([60_000, 120_000]);
    expect(h.output).toBe("last-good");
    expect(h.writes).toBe(0);
    expect(outputSpy).not.toHaveBeenCalled();
  });

  test("retries missing assets even when Fidelity marks the sheet complete", async () => {
    const incomplete = fixture();
    delete incomplete.classSections![0]!.funds![0]!.portfolioNetAssets;
    const h = harness([incomplete, fixture()]);
    await h.run();
    expect(h.requests).toBe(2);
    expect(h.writes).toBe(1);
  });

  test.each(["stale", "missing fund", "duplicate fund", "date mismatch", "bad yield", "bad assets", "bad identity"])(
    "rejects %s without readiness retries or writes", async kind => {
      const invalid = fixture();
      const funds = invalid.classSections![0]!.funds!;
      if (kind === "stale") invalid.requestedPriceDate = "01/01/2026";
      if (kind === "missing fund") funds.pop();
      if (kind === "duplicate fund") funds.push(structuredClone(funds[0]!));
      if (kind === "date mismatch") funds[0]!.milrateYields![0]!.date = "01/01/2026";
      if (kind === "bad yield") funds[0]!.milrateYields![0]!.sevenDayYield = "invalid";
      if (kind === "bad assets") funds[0]!.portfolioNetAssets = "invalid";
      if (kind === "bad identity") funds[0]!.fundNumber = "";
      const h = harness([invalid]);
      await expect(h.run()).rejects.toThrow("Invalid Fidelity data");
      expect(h.requests).toBe(1);
      expect(h.sleeps).toEqual([]);
      expect(h.output).toBe("last-good");
      expect(h.writes).toBe(0);
    },
  );

  test.each([null, {}, { classSections: [null] }, { classSections: [{ funds: [null] }] }])(
    "rejects malformed payload %j", async raw => {
      const h = harness([raw]);
      await expect(h.run()).rejects.toThrow("malformed rate-sheet structure");
      expect(h.requests).toBe(1);
      expect(h.writes).toBe(0);
    },
  );

  test("accepts a recent prior market date without requiring yesterday", async () => {
    const h = harness([fixture()]);
    await h.run();
    expect(h.requests).toBe(1);
    expect(h.sleeps).toEqual([]);
    expect(h.writes).toBe(1);
  });

  test.each(["direct", "shortTerm"])("preserves permissive normalization for the %s CLI tab", async tab => {
    let output = "";
    await main(["--tab", tab, "--out", "other.json"], {
      fetch: async () => Response.json({ classSections: [{ funds: [{ fundNumber: 1, nav: "1.00" }] }] }),
      write: async (_path, json) => { output = json; },
    });
    expect(JSON.parse(output).funds[0].nav).toBe(1);
    expect(JSON.parse(output).tab).toBe(tab);
  });
});
