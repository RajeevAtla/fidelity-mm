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

const outIndex = process.argv.indexOf("--out");
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : DATA_PATHS.minimums;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: bun scripts/scrape-fidelity-mm-minimums.ts [--out path]");
  process.exit(0);
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

const entries: MinimumData["funds"] = {};
const failures: string[] = [];

let nextFundIndex = 0;
const workerCount = Math.min(8, funds.length);
await Promise.all(
  Array.from({ length: workerCount }, async () => {
    while (nextFundIndex < funds.length) {
      const { fundNo, symbol } = funds[nextFundIndex++];
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
        failures.push(`${symbol}: Fidelity returned ${response.status} for ${apiUrl}`);
        continue;
      }

      const overview = await response.json();
      const returnedSymbol = tradingSymbolFromOverview(overview);
      if (returnedSymbol !== symbol) {
        failures.push(`${symbol}: fund ${fundNo} returned symbol ${returnedSymbol ?? "none"}`);
        continue;
      }

      const minimum = initialInvestmentFromOverview(overview);
      if (minimum === null) {
        failures.push(`${symbol}: Fidelity returned no parseable minimum for fund ${fundNo}`);
        continue;
      }

      entries[symbol] = {
        minimumInvestment: minimum,
        minimumLabel: formatMinimum(minimum),
        sourceUrl,
        status: "verified",
      };
    }
  }),
);

if (failures.length > 0 || Object.keys(entries).length !== funds.length) {
  throw new Error(`Could not verify all fund minimums:\n${failures.sort().join("\n")}`);
}

const checkedAt = new Date().toISOString();
const sortedEntries = Object.fromEntries(
  funds.map(({ symbol }) => [symbol, entries[symbol]]),
);
const output: MinimumData = {
    source: FUND_DATA_API,
    checkedAt,
    count: Object.keys(sortedEntries).length,
    funds: sortedEntries,
};
const json = `${JSON.stringify(output, null, 2)}\n`;
await Bun.write(outPath, json);
console.log(json);
