const FUND_RESEARCH_URL = "https://fundresearch.fidelity.com/mutual-funds/summary";
const FUND_CATALOG_URL = "https://institutional.fidelity.com/app/funds-and-products/list/FIIS_PP_SP28_DPL3/fidelity-money-market-funds.html";
const RATE_SHEET_PATH = "data/fidelity-mm-allclass.json";

type RateSheet = { funds?: Array<{ symbol?: string | null }> };
type MinimumRule = {
  minimumInvestment: number | null;
  minimumLabel: string;
  sourceUrl: string;
  scrapedAt: string;
};

const outIndex = process.argv.indexOf("--out");
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : "data/fidelity-mm-minimums.json";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: bun scripts/scrape-fidelity-mm-minimums.ts [--out path]");
  process.exit(0);
}

const rateSheet = JSON.parse(await Bun.file(RATE_SHEET_PATH).text()) as RateSheet;
const symbols = [...new Set((rateSheet.funds ?? []).map((fund) => fund.symbol).filter(Boolean))] as string[];
if (symbols.length === 0) throw new Error(`No fund symbols found in ${RATE_SHEET_PATH}`);

const catalogResponse = await fetch(FUND_CATALOG_URL, {
  headers: {
    accept: "text/html,application/xhtml+xml",
    "user-agent": "fidelity-mm/1.0 (+https://github.com/RajeevAtla/fidelity-mm; personal research scraper)",
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
  const response = await fetch(sourceUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "fidelity-mm/1.0 (+https://github.com/local/fidelity-mm; personal research scraper)",
    },
  });

  if (!response.ok) {
    failures.push(`${symbol}: Fidelity returned ${response.status}`);
    continue;
  }

  const html = await response.text();
  const minimum = parseMinimum(html);
  if (minimum === null) {
    failures.push(`${symbol}: minimum investment was not found on ${sourceUrl}`);
    continue;
  }

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

function parseMinimum(html: string): number | null {
  const text = decodeHtml(html).replace(/\s+/g, " ");
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
