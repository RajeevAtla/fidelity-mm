import { FIDELITY_SOURCES, SCRAPER_USER_AGENT } from "../../data/data-sources";
import type { RateSheetData, RateSheetFund } from "../../data/data-contracts";
import { fetchWithRetry } from "../fetch-utils";

const PAGE_URL = FIDELITY_SOURCES.rateSheetPage;
const DATA_URL = FIDELITY_SOURCES.rateSheetApi;

const TAB_TO_GROUP = {
  allClass: "All Class Money Market Rate Sheet",
  direct: "Direct Money Market Rate Sheet",
  shortTerm: "Fidelity Ultra-Short Duration Bond Funds Sheet",
} as const;

type TabName = keyof typeof TAB_TO_GROUP;

export type FidelityRateSheet = {
  sheetTitle?: string;
  dateType?: string;
  complete?: boolean;
  requestedPriceDate?: string;
  taxEquivalentYieldDate?: string;
  milrateYieldDates?: string[];
  classSections?: Array<{
    description?: string;
    funds?: FidelityFund[];
  }>;
};

type FidelityFund = {
  fundNumber?: number | string;
  tradingSymbol?: string;
  fundAlternateName?: string;
  nav?: string | number;
  displayNav?: string;
  portfolioNetAssets?: string | number;
  portfolioNetAssetsDate?: string;
  monthEndSevenDayYield?: string | number;
  monthEndSevenDayYieldWithoutReimbursement?: string | number;
  monthEndDate?: string;
  expenseRatioGrossPercentage?: string | number;
  expenseRatioNetPercentage?: string | number;
  milrateYields?: Array<{
    date?: string;
    milRate?: string | number;
    oneDayYield?: string | number;
    sevenDayYield?: string | number;
    thirtyDayYield?: string | number;
    averageMaturityDaysInDays?: string | number;
    averageMaturityDaysInDaysDate?: string;
  }>;
};

export async function main(args: readonly string[] = process.argv.slice(2)): Promise<void> {
  const tab = readTab(args);
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined;

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: bun src/scripts/fidelity/scrape-fidelity-mm.ts [--tab allClass|direct|shortTerm] [--out path]

Fetches Fidelity institutional daily rate sheets from ${PAGE_URL} and prints JSON.
Use --out to also write the JSON to a file.`);
    return;
  }

  const groupSystemName = TAB_TO_GROUP[tab];
  const apiUrl = `${DATA_URL}?groupSystemName=${encodeURIComponent(groupSystemName)}`;
  const response = await fetchWithRetry(apiUrl, {
    headers: {
      accept: "application/json,text/plain,*/*",
      referer: PAGE_URL,
      "user-agent": SCRAPER_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Fidelity returned ${response.status} ${response.statusText}`);
  }

  const rateSheet = (await response.json()) as FidelityRateSheet;
  const funds = normalizeRateSheet(rateSheet);
  const output: RateSheetData = {
    sourceUrl: PAGE_URL,
    apiUrl,
    checkedAt: new Date().toISOString(),
    tab,
    groupSystemName,
    sheetTitle: rateSheet.sheetTitle ?? null,
    dateType: rateSheet.dateType ?? null,
    complete: rateSheet.complete ?? null,
    requestedPriceDate: rateSheet.requestedPriceDate ?? null,
    count: funds.length,
    funds,
  };
  const json = `${JSON.stringify(output, null, 2)}\n`;

  if (outPath) {
    await Bun.write(outPath, json);
  }

  console.log(json);
}

export function readTab(args: readonly string[]): TabName {
  const tabIndex = args.indexOf("--tab");
  const value = tabIndex >= 0 ? args[tabIndex + 1] : "allClass";

  if (value === "allClass" || value === "direct" || value === "shortTerm") {
    return value;
  }

  throw new Error(`Invalid --tab "${value}". Expected allClass, direct, or shortTerm.`);
}

export function normalizeRateSheet(rateSheet: FidelityRateSheet): RateSheetFund[] {
  const funds: RateSheetFund[] = [];
  const primaryDate = rateSheet.milrateYieldDates?.[0] ?? null;

  for (const section of rateSheet.classSections ?? []) {
    for (const fund of section.funds ?? []) {
      const primaryYield =
        fund.milrateYields?.find((yieldRow) => yieldRow.date === primaryDate) ?? fund.milrateYields?.[0];

      funds.push({
        fundNo: String(fund.fundNumber ?? ""),
        symbol: fund.tradingSymbol ?? null,
        name: cleanText(fund.fundAlternateName ?? ""),
        section: section.description ? cleanText(section.description) : null,
        date: primaryYield?.date ?? primaryDate,
        nav: parseNumber(fund.nav ?? fund.displayNav),
        oneDayYield: parseNumber(primaryYield?.oneDayYield),
        sevenDayYield: parseNumber(primaryYield?.sevenDayYield),
        thirtyDayYield: parseNumber(primaryYield?.thirtyDayYield),
        dailyMilRate: parseNumber(primaryYield?.milRate),
        portfolioNetAssets: parseNumber(fund.portfolioNetAssets),
        portfolioNetAssetsDate: fund.portfolioNetAssetsDate ?? null,
        weightedAverageMaturityDays: parseNumber(primaryYield?.averageMaturityDaysInDays),
        weightedAverageMaturityDate: primaryYield?.averageMaturityDaysInDaysDate ?? null,
        expenseRatioGross: parseNumber(fund.expenseRatioGrossPercentage),
        expenseRatioNet: parseNumber(fund.expenseRatioNetPercentage),
        monthEndSevenDayYield: parseNumber(fund.monthEndSevenDayYield),
        monthEndSevenDayYieldWithoutReimbursement: parseNumber(
          fund.monthEndSevenDayYieldWithoutReimbursement,
        ),
        monthEndDate: fund.monthEndDate ?? null,
      });
    }
  }

  return funds;
}

export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).replace(/[$,%]/g, "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: string): string {
  return decodeEntities(value)
    .replace(/\^/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;|&#60;/gi, "<")
    .replace(/&gt;|&#62;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

if (import.meta.main) {
  await main();
}
