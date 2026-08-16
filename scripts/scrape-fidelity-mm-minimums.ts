import { DATA_PATHS, FIDELITY_SOURCES, SCRAPER_USER_AGENT } from "../data-sources";
import type { MinimumData, RateSheetData } from "../data-contracts";
import { fetchWithRetry } from "../fetch-utils";
import {
  formatMinimum,
  initialInvestmentFromOverview,
  tradingSymbolFromOverview,
} from "./fidelity-minimum-utils";

const FUND_DETAILS_URL = FIDELITY_SOURCES.fundDetails;
const FUND_DATA_API = FIDELITY_SOURCES.fundDataApi;
const RATE_SHEET_PATH = DATA_PATHS.rateSheet;
type IdentifiedFund = RateSheetData["funds"][number] & { fundNo: string; symbol: string };

export type MinimumFetchResult =
  | { symbol: string; entry: MinimumData["funds"][string] }
  | { symbol: string; failure: string };

export function aggregateMinimumResults(results: MinimumFetchResult[]): {
  entries: MinimumData["funds"];
  failures: string[];
} {
  const entries: MinimumData["funds"] = {};
  const failures: string[] = [];

  for (const result of results) {
    if ("failure" in result) failures.push(result.failure);
    else entries[result.symbol] = result.entry;
  }

  return { entries, failures: failures.sort() };
}

export async function main(args: readonly string[] = process.argv.slice(2)): Promise<void> {
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : DATA_PATHS.minimums;

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: bun scripts/scrape-fidelity-mm-minimums.ts [--out path]");
    return;
  }

  const rateSheet = JSON.parse(await Bun.file(RATE_SHEET_PATH).text()) as RateSheetData;
  const rateFunds = rateSheet.funds;
  if (rateFunds.length === 0) throw new Error(`No funds found in ${RATE_SHEET_PATH}`);
  const incompleteFunds = rateFunds.filter((fund) => !fund.fundNo || !fund.symbol);
  if (incompleteFunds.length > 0) {
    throw new Error(`${incompleteFunds.length} rate-sheet funds are missing a fund number or symbol`);
  }
  const funds = rateFunds.filter(
    (fund): fund is IdentifiedFund => Boolean(fund.fundNo && fund.symbol),
  );

  const results = await fetchMinimums(funds);
  const { entries, failures } = aggregateMinimumResults(results);
  if (failures.length > 0 || Object.keys(entries).length !== funds.length) {
    throw new Error(`Could not verify all fund minimums:\n${failures.join("\n")}`);
  }

  const sortedEntries = Object.fromEntries(
    funds.map(({ symbol }) => [symbol, entries[symbol]]),
  );
  const output: MinimumData = {
    source: FUND_DATA_API,
    checkedAt: new Date().toISOString(),
    count: Object.keys(sortedEntries).length,
    funds: sortedEntries,
  };
  const json = `${JSON.stringify(output, null, 2)}\n`;
  await Bun.write(outPath, json);
  console.log(json);
}

async function fetchMinimums(funds: IdentifiedFund[]): Promise<MinimumFetchResult[]> {
  const workerCount = Math.min(8, funds.length);
  const workerResults = await Promise.all(
    Array.from({ length: workerCount }, (_, workerIndex) => {
      const assignedFunds = funds.filter((_, fundIndex) => fundIndex % workerCount === workerIndex);
      return (async () => {
        const results: MinimumFetchResult[] = [];
        for (const fund of assignedFunds) results.push(await fetchMinimum(fund));
        return results;
      })();
    }),
  );
  return workerResults.flat();
}

async function fetchMinimum({ fundNo, symbol }: IdentifiedFund): Promise<MinimumFetchResult> {
  const sourceUrl = `${FUND_DETAILS_URL}/${fundNo}.html`;
  const apiUrl = `${FUND_DATA_API}/${fundNo}.json?filter=overview`;
  const response = await fetchWithRetry(apiUrl, {
    headers: {
      accept: "application/json",
      referer: sourceUrl,
      "user-agent": SCRAPER_USER_AGENT,
    },
  });

  if (!response.ok) {
    return { symbol, failure: `${symbol}: Fidelity returned ${response.status} for ${apiUrl}` };
  }

  const overview = await response.json();
  const returnedSymbol = tradingSymbolFromOverview(overview);
  if (returnedSymbol !== symbol) {
    return { symbol, failure: `${symbol}: fund ${fundNo} returned symbol ${returnedSymbol ?? "none"}` };
  }

  const minimum = initialInvestmentFromOverview(overview);
  if (minimum === null) {
    return { symbol, failure: `${symbol}: Fidelity returned no parseable minimum for fund ${fundNo}` };
  }

  return {
    symbol,
    entry: {
      minimumInvestment: minimum,
      minimumLabel: formatMinimum(minimum),
      sourceUrl,
      status: "verified",
    },
  };
}

if (import.meta.main) {
  await main();
}
