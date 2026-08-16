import { describe, expect, test } from "bun:test";
import { aggregateMinimumResults, type MinimumFetchResult } from "../../../../src/scripts/fidelity/scrape-fidelity-mm-minimums";

describe("minimum result aggregation", () => {
  test("separates verified entries and sorts failures deterministically", () => {
    const results: MinimumFetchResult[] = [
      {
        symbol: "BBB",
        entry: {
          minimumInvestment: 1_000,
          minimumLabel: "$1K",
          sourceUrl: "source-b",
          status: "verified",
        },
      },
      { symbol: "AAA", failure: "AAA: no minimum" },
      { symbol: "CCC", failure: "CCC: request failed" },
    ];

    expect(aggregateMinimumResults(results)).toEqual({
      entries: {
        BBB: {
          minimumInvestment: 1_000,
          minimumLabel: "$1K",
          sourceUrl: "source-b",
          status: "verified",
        },
      },
      failures: ["AAA: no minimum", "CCC: request failed"],
    });
  });
});
