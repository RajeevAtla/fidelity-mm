import { DATA_PATHS, FIDELITY_SOURCES, SCRAPER_USER_AGENT } from "../data-sources";
import type { RateSheetData, TaxData, TaxRule } from "../data-contracts";
import { isMunicipalCategory } from "../calculations";
import { fetchWithRetry } from "../fetch-utils";
import { categoryFor } from "./fidelity-tax-utils";

const TAX_INFORMATION_URL = FIDELITY_SOURCES.taxInformationPage;
const RATE_SHEET_PATH = DATA_PATHS.rateSheet;
const DEFAULT_OUT_PATH = DATA_PATHS.taxRules;

type TaxFund = RateSheetData["funds"][number] & { symbol: string };

export type TaxPercentages = {
  fimmMoneyMarket: number;
  fimmGovernment: number;
  fimmTreasury: number;
  fimmTreasuryOnly: number;
  retailMoneyMarket: number;
  retailGovernment: number;
  retailTreasury: number;
  retailTreasuryOnly: number;
};

export async function main(args: readonly string[] = process.argv.slice(2)): Promise<void> {
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : DEFAULT_OUT_PATH;

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: bun scripts/scrape-fidelity-mm-tax.ts [--out path]");
    return;
  }

  const rateSheet = JSON.parse(await Bun.file(RATE_SHEET_PATH).text()) as RateSheetData;
  const funds = rateSheet.funds.filter((fund): fund is TaxFund => Boolean(fund.symbol));
  if (funds.length === 0) throw new Error("No fund symbols found in " + RATE_SHEET_PATH);

  const pageResponse = await fetchWithRetry(TAX_INFORMATION_URL, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": SCRAPER_USER_AGENT },
  });
  if (!pageResponse.ok) {
    throw new Error("Fidelity tax page returned " + pageResponse.status + " " + pageResponse.statusText);
  }

  const pageHtml = await pageResponse.text();
  const pdfUrl = findGovernmentSecuritiesPdf(pageHtml, new Date().getUTCFullYear() - 1);
  const pdfResponse = await fetchWithRetry(pdfUrl, {
    headers: { accept: "application/pdf", referer: TAX_INFORMATION_URL, "user-agent": SCRAPER_USER_AGENT },
  });
  if (!pdfResponse.ok) {
    throw new Error("Fidelity tax PDF returned " + pdfResponse.status + " " + pdfResponse.statusText);
  }

  const pdfText = await extractPdfText(new Uint8Array(await pdfResponse.arrayBuffer()));
  const percentages: TaxPercentages = {
    fimmMoneyMarket: requiredPercentage(pdfText, "Fidelity Investments Money Market - Money Market Portfolio - All Classes"),
    fimmGovernment: requiredPercentage(pdfText, "Fidelity Investments Money Market Government Portfolio - All Classes"),
    fimmTreasury: requiredPercentage(pdfText, "Fidelity Investments Money Market Treasury Portfolio - All Classes"),
    fimmTreasuryOnly: requiredPercentage(pdfText, "Fidelity Investments Money Market Treasury Only Portfolio - All Classes"),
    retailMoneyMarket: requiredPercentage(pdfText, "Fidelity Money Market Fund - Premium Class"),
    retailGovernment: requiredPercentage(pdfText, "Fidelity Government Money Market Fund - All Classes"),
    retailTreasury: requiredPercentage(pdfText, "Fidelity Treasury Money Market Fund - All Classes"),
    retailTreasuryOnly: requiredPercentage(pdfText, "Fidelity Treasury Only Money Market Fund - All Classes"),
  };

  const result = buildTaxRules(funds, percentages, pdfUrl);
  const output: TaxData = {
    sourceUrl: TAX_INFORMATION_URL,
    taxYear: taxYearFromPdf(pdfText),
    checkedAt: new Date().toISOString(),
    count: Object.keys(result).length,
    funds: result,
  };
  await Bun.write(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify(output, null, 2));
}

export function findGovernmentSecuritiesPdf(html: string, fallbackTaxYear: number): string {
  const match = html.match(/ty(\d{2})-gse-supplemental-letter\.pdf/i);
  const taxYear = match ? Number("20" + match[1]) : fallbackTaxYear;
  const yearSuffix = String(taxYear).slice(-2);
  return "https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/taxes/ty" + yearSuffix + "-gse-supplemental-letter.pdf";
}

export function buildTaxRules(
  funds: TaxFund[],
  percentages: TaxPercentages,
  sourceUrl: string,
): Record<string, TaxRule> {
  const result: Record<string, TaxRule> = {};
  for (const fund of funds) {
    const category = categoryFor(fund.name ?? "");
    result[fund.symbol] = {
      c: category,
      governmentExemptPct: isMunicipalCategory(category) ? 0 : percentageFor(fund, percentages),
      sourceUrl,
    };
  }
  return result;
}

export function taxYearFromPdf(text: string): number {
  const match = text.match(/(20\d{2})\s+Percentage of Income from/);
  if (!match) throw new Error("Could not determine the tax year from Fidelity's tax PDF");
  return Number(match[1]);
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const process = Bun.spawn(["pdftotext", "-layout", "-", "-"], {
    stdin: bytes,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error("pdftotext failed (" + exitCode + "): " + stderr.trim());
  }
  return stdout;
}

export function requiredPercentage(text: string, label: string): number {
  const normalizedLabel = normalizeText(label);
  const line = text.split(/\r?\n/).find((candidate) => normalizeText(candidate).includes(normalizedLabel) && /\d+(?:\.\d+)?%\s*\*?$/.test(candidate.trim()));
  const match = line?.match(/(\d+(?:\.\d+)?)%\s*\*?$/);
  if (!match) throw new Error("Could not find tax percentage for " + label);
  return Number(match[1]);
}

function normalizeText(value: string): string {
  return value.replace(/[®SM]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function percentageFor(fund: { name?: string; section?: string | null }, percentages: TaxPercentages): number {
  const name = (fund.name ?? "").toLowerCase();
  const fimm = (fund.section ?? "").toLowerCase().includes("fidelity investments money market funds");
  if (name.includes("treasury only")) return fimm ? percentages.fimmTreasuryOnly : percentages.retailTreasuryOnly;
  if (name.includes("treasury")) return fimm ? percentages.fimmTreasury : percentages.retailTreasury;
  if (name.includes("government")) return fimm ? percentages.fimmGovernment : percentages.retailGovernment;
  return fimm ? percentages.fimmMoneyMarket : percentages.retailMoneyMarket;
}

if (import.meta.main) {
  await main();
}
