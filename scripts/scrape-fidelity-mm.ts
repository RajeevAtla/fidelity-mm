import { DATA_PATHS, FIDELITY_SOURCES, SCRAPER_USER_AGENT } from "../data-sources";
import { fetchWithRetry } from "../fetch-utils";

const PAGE_URL = FIDELITY_SOURCES.rateSheetPage;
const DATA_URL = FIDELITY_SOURCES.rateSheetApi;

const TAB_TO_GROUP = {
  allClass: "All Class Money Market Rate Sheet",
  direct: "Direct Money Market Rate Sheet",
  shortTerm: "Fidelity Ultra-Short Duration Bond Funds Sheet",
} as const;

type TabName = keyof typeof TAB_TO_GROUP;

type FidelityRateSheet = {
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

type MoneyMarketFund = {
  fundNo: string;
  symbol: string | null;
  name: string;
  section: string | null;
  date: string | null;
  nav: number | null;
  oneDayYield: number | null;
  sevenDayYield: number | null;
  thirtyDayYield: number | null;
  dailyMilRate: number | null;
  portfolioNetAssets: number | null;
  portfolioNetAssetsDate: string | null;
  weightedAverageMaturityDays: number | null;
  weightedAverageMaturityDate: string | null;
  expenseRatioGross: number | null;
  expenseRatioNet: number | null;
  monthEndSevenDayYield: number | null;
  monthEndSevenDayYieldWithoutReimbursement: number | null;
  monthEndDate: string | null;
};

const tab = readTab();
const outIndex = process.argv.indexOf("--out");
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: bun scripts/scrape-fidelity-mm.ts [--tab allClass|direct|shortTerm] [--out path]

Fetches Fidelity institutional daily rate sheets from ${PAGE_URL} and prints JSON.
Use --out to also write the JSON to a file.`);
  process.exit(0);
}

const groupSystemName = TAB_TO_GROUP[tab];
const apiUrl = `${DATA_URL}?groupSystemName=${encodeURIComponent(groupSystemName)}`;
const response = await fetchWithRetry(apiUrl, {
  headers: {
    accept: "application/json,text/plain,*/*",
    referer: PAGE_URL,
    "user-agent":
      SCRAPER_USER_AGENT,
  },
});

if (!response.ok) {
  throw new Error(`Fidelity returned ${response.status} ${response.statusText}`);
}

const rateSheet = (await response.json()) as FidelityRateSheet;
const funds = normalizeRateSheet(rateSheet);
const json = `${JSON.stringify(
  {
    sourceUrl: PAGE_URL,
    apiUrl,
    scrapedAt: new Date().toISOString(),
    tab,
    groupSystemName,
    sheetTitle: rateSheet.sheetTitle ?? null,
    dateType: rateSheet.dateType ?? null,
    complete: rateSheet.complete ?? null,
    requestedPriceDate: rateSheet.requestedPriceDate ?? null,
    count: funds.length,
    funds,
  },
  null,
  2,
)}\n`;

if (outPath) {
  await Bun.write(outPath, json);
}

console.log(json);

function readTab(): TabName {
  const tabIndex = process.argv.indexOf("--tab");
  const value = tabIndex >= 0 ? process.argv[tabIndex + 1] : "allClass";

  if (value === "allClass" || value === "direct" || value === "shortTerm") {
    return value;
  }

  throw new Error(`Invalid --tab "${value}". Expected allClass, direct, or shortTerm.`);
}

function normalizeRateSheet(rateSheet: FidelityRateSheet): MoneyMarketFund[] {
  const funds: MoneyMarketFund[] = [];
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

function parseNumber(value: string | number | null | undefined): number | null {
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
