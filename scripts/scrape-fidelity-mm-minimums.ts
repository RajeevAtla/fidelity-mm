import { DATA_PATHS, FIDELITY_SOURCES, SCRAPER_USER_AGENT } from "../data-sources";

const FUND_RESEARCH_URL = FIDELITY_SOURCES.fundResearch;
const FUND_CATALOG_URL = FIDELITY_SOURCES.fundCatalog;
const FUND_SUMMARY_API = FIDELITY_SOURCES.fundSummaryApi;
const RATE_SHEET_PATH = DATA_PATHS.rateSheet;

type RateSheet = { funds?: Array<{ symbol?: string | null }> };
type MinimumRule = {
  minimumInvestment: number | null;
  minimumLabel: string;
  sourceUrl: string;
  scrapedAt: string;
};

const outIndex = process.argv.indexOf("--out");
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : DATA_PATHS.minimums;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: bun scripts/scrape-fidelity-mm-minimums.ts [--out path]");
  process.exit(0);
}

const rateSheet = JSON.parse(await Bun.file(RATE_SHEET_PATH).text()) as RateSheet;
const existingMinimums = await readExistingMinimums();
const symbols = [...new Set((rateSheet.funds ?? []).map((fund) => fund.symbol).filter(Boolean))] as string[];
if (symbols.length === 0) throw new Error(`No fund symbols found in ${RATE_SHEET_PATH}`);

const catalogResponse = await fetch(FUND_CATALOG_URL, {
  headers: {
    accept: "text/html,application/xhtml+xml",
    "user-agent": SCRAPER_USER_AGENT,
  },
});
if (!catalogResponse.ok) {
  throw new Error("Fidelity catalog returned " + catalogResponse.status + " " + catalogResponse.statusText);
}
const catalogText = decodeHtml(await catalogResponse.text()).replace(/\s+/g, " ");

const scrapedAt = new Date().toISOString();
const entries: Record<string, MinimumRule> = {};
const failures: string[] = [];

for (const symbol of symbols) {
  const cusip = findCusip(symbol, catalogText);
  if (!cusip) {
    failures.push(symbol + ": CUSIP was not found in " + FUND_CATALOG_URL);
    continue;
  }

  const sourceUrl = FUND_RESEARCH_URL + "/" + cusip;
  const apiUrl = FUND_SUMMARY_API + "/" + cusip + "/summary?funduniverse=RETAIL&period=10YR&documentId=" + cusip;
  const response = await fetch(apiUrl, {
    headers: {
      accept: "application/json",
      referer: sourceUrl,
      "user-agent": SCRAPER_USER_AGENT,
    },
  });

  if (!response.ok) {
    const existing = existingMinimums[symbol];
    if (existing) {
      console.warn(symbol + ": Fidelity API returned " + response.status + "; preserving checked-in minimum " + existing.minimumLabel);
      entries[symbol] = {
        ...existing,
        sourceUrl,
        scrapedAt,
      };
      continue;
    }
    failures.push(`${symbol}: Fidelity returned ${response.status} for ${apiUrl} and no checked-in fallback exists`);
    continue;
  }

  const summary = await response.json() as {
    details?: { subjectAreaData?: { minimumInvestmentRetail?: string | number | null } };
  };
  const minimum = parseMinimum(summary.details?.subjectAreaData?.minimumInvestmentRetail);

  entries[symbol] = {
    minimumInvestment: minimum,
    minimumLabel: formatMinimum(minimum),
    sourceUrl,
    scrapedAt,
  };
}

if (failures.length > 0) {
  throw new Error(`Could not refresh all fund minimums:\n${failures.join("\n")}`);
}

const json = `${JSON.stringify({ source: FUND_CATALOG_URL, scrapedAt, count: Object.keys(entries).length, funds: entries }, null, 2)}\n`;
await Bun.write(outPath, json);
console.log(json);

async function readExistingMinimums(): Promise<Record<string, MinimumRule>> {
  try {
    const data = JSON.parse(await Bun.file(DATA_PATHS.minimums).text()) as {
      funds?: Record<string, MinimumRule>;
    };
    return data.funds ?? {};
  } catch {
    return {};
  }
}

function parseMinimum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/\s+/g, " ");
  const directAmount = Number(text.replace(/[$,%]/g, "").replace(/,/g, "").trim());
  if (Number.isFinite(directAmount)) return directAmount;
  const patterns = [
    /minimum\s+(?:initial\s+)?investment\s*[:$]?\s*\$?\s*([\d,]+(?:\.\d+)?)(?:\s*(million|m|thousand|k))?/i,
    /minimum\s+(?:initial\s+)?purchase\s*[:$]?\s*\$?\s*([\d,]+(?:\.\d+)?)(?:\s*(million|m|thousand|k))?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const amount = Number(match[1].replace(/,/g, ""));
    const suffix = match[2]?.toLowerCase();
    const multiplier = suffix === "million" || suffix === "m" ? 1_000_000 : suffix === "thousand" || suffix === "k" ? 1_000 : 1;
    if (Number.isFinite(amount)) return amount * multiplier;
  }

  return null;
}

function findCusip(symbol: string, catalogText: string): string | null {
  const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const afterSymbol = catalogText.match(new RegExp("\\b" + escapedSymbol + "\\b\\s+CUSIP\\s+([0-9A-Z]{9})", "i"));
  if (afterSymbol) return afterSymbol[1].toUpperCase();

  const beforeSymbol = catalogText.match(new RegExp("CUSIP\\s+([0-9A-Z]{9})\\s+(?:Fund #\\s+\\d+\\s+)?(?:Symbol\\s+)?"+escapedSymbol+"\\b", "i"));
  return beforeSymbol?.[1]?.toUpperCase() ?? null;
}
function formatMinimum(amount: number): string {
  if (amount === 0) return "$0";
  if (amount >= 1_000_000 && amount % 1_000_000 === 0) return `$${amount / 1_000_000}M`;
  if (amount >= 1_000 && amount % 1_000 === 0) return `$${amount / 1_000}K`;
  return `$${amount.toLocaleString("en-US")}`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}
