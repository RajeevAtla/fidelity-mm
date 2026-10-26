import { FIDELITY_SOURCES, SCRAPER_USER_AGENT } from "../../data/data-sources";
import type { RateSheetData, RateSheetFund } from "../../data/data-contracts";
import { fetchWithRetry, type FetchRetryDependencies } from "../fetch-utils";
import { validateRateData } from "./validate-fidelity-data";

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
  portfolioNetAssets?: string | number | null;
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

export type ScrapeDependencies = {
  fetch?: FetchRetryDependencies["fetch"];
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  write?: (path: string, json: string) => Promise<unknown>;
  log?: (message: string) => void;
};

export async function main(
  args: readonly string[] = process.argv.slice(2),
  dependencies: ScrapeDependencies = {},
): Promise<void> {
  const tab = readTab(args);
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined;
  if (outIndex >= 0 && (!outPath || outPath.startsWith("--"))) throw new Error("--out requires a path");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: bun src/scripts/fidelity/scrape-fidelity-mm.ts [--tab allClass|direct|shortTerm] [--out path]

Fetches Fidelity institutional daily rate sheets from ${PAGE_URL} and prints JSON.
Use --out to also write the JSON to a file.`);
    return;
  }

  const groupSystemName = TAB_TO_GROUP[tab];
  const apiUrl = `${DATA_URL}?groupSystemName=${encodeURIComponent(groupSystemName)}`;
  const output = await fetchReadyRateSheet(apiUrl, tab, dependencies);
  const json = `${JSON.stringify(output, null, 2)}\n`;

  if (outPath) {
    await (dependencies.write ?? Bun.write)(outPath, json);
  }

  console.log(json);
}

async function fetchReadyRateSheet(apiUrl: string, tab: TabName, dependencies: ScrapeDependencies): Promise<RateSheetData> {
  const log = dependencies.log ?? console.error;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetchWithRetry(apiUrl, {
      headers: {
        accept: "application/json,text/plain,*/*",
        referer: PAGE_URL,
        "user-agent": SCRAPER_USER_AGENT,
      },
    }, { fetch: dependencies.fetch });
    if (!response.ok) throw new Error(`Fidelity returned ${response.status} ${response.statusText}`);
    const payload: unknown = await response.json();
    if (tab === "allClass" && !isRateSheet(payload)) throw new Error("Invalid Fidelity data: malformed rate-sheet structure");
    const raw = payload as FidelityRateSheet;
    const funds = normalizeRateSheet(raw);
    const now = (dependencies.now ?? Date.now)();
    const output: RateSheetData = {
      sourceUrl: PAGE_URL, apiUrl, checkedAt: new Date(now).toISOString(),
      tab, groupSystemName: TAB_TO_GROUP[tab], sheetTitle: raw.sheetTitle ?? null,
      dateType: raw.dateType ?? null, complete: raw.complete ?? null,
      requestedPriceDate: raw.requestedPriceDate ?? null, count: funds.length, funds,
    };
    // Only allClass has a fixed supported universe and publication contract.
    // Preserve the other CLI tabs' existing normalization behavior.
    if (tab !== "allClass") return output;
    const errors = validateRateData(output, now);
    const missingAssets = new Set(raw.classSections!.flatMap(section => section.funds ?? [])
      .filter(fund => fund.portfolioNetAssets == null || fund.portfolioNetAssets === "")
      .map(fund => fund.tradingSymbol));
    log(`Fidelity readiness attempt ${attempt}/3: date=${output.requestedPriceDate}, complete=${output.complete}, funds=${funds.length}, missingAssets=${missingAssets.size}`);
    if (errors.length === 0) return output;
    const transientOnly = errors.every(error =>
      (error === "Rate sheet is not marked complete" && raw.complete === false) ||
      (error.endsWith(": missing or out-of-range portfolio net assets") && missingAssets.has(error.split(":")[0])));
    if (!transientOnly) throw new Error(`Invalid Fidelity data:\n${errors.join("\n")}`);
    if (attempt === 3) throw new Error(`Fidelity source not ready after 3 attempts: date=${output.requestedPriceDate}, complete=${output.complete}, missingAssets=${missingAssets.size}`);
    const delay = attempt * 60_000;
    log(`Fidelity source not ready; retrying in ${delay / 1000} seconds`);
    await (dependencies.sleep ?? Bun.sleep)(delay);
  }
  throw new Error("Fidelity readiness attempts exhausted");
}

function isRateSheet(value: unknown): value is FidelityRateSheet {
  if (!value || typeof value !== "object") return false;
  const sections = (value as FidelityRateSheet).classSections;
  return Array.isArray(sections) && sections.every(section =>
    section && typeof section === "object" && Array.isArray(section.funds) &&
    section.funds.every(fund => fund && typeof fund === "object" && !Array.isArray(fund) &&
      ((typeof fund.fundNumber === "string" && fund.fundNumber.trim() !== "") ||
        (typeof fund.fundNumber === "number" && Number.isFinite(fund.fundNumber))) &&
      typeof fund.tradingSymbol === "string" && fund.tradingSymbol.trim() !== "" &&
      typeof fund.fundAlternateName === "string" && fund.fundAlternateName.trim() !== "" &&
      Array.isArray(fund.milrateYields) && fund.milrateYields.every(row => row && typeof row === "object")));
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
  if (typeof value !== "string" && typeof value !== "number") return null;

  const normalized = String(value).replace(/[$,%]/g, "").replace(/,/g, "").trim();
  if (normalized === "") return null;
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
