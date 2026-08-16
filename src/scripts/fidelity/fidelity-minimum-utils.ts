type FeatureInformation = {
  featureCode?: string | number | null;
  featureValue?: string | number | null;
};

export function initialInvestmentFromOverview(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const overview = value.overview;
  if (!isRecord(overview)) return null;

  const feature = Array.isArray(overview.featureInformation)
    ? (overview.featureInformation as FeatureInformation[]).find(
        (candidate) => String(candidate?.featureCode) === "3",
      )
    : undefined;
  return parseMinimum(feature?.featureValue ?? (overview.minimumInitialInvestment as string | number | null | undefined));
}

export function tradingSymbolFromOverview(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.overview)) return null;
  const symbol = value.overview.tradingSymbol;
  return typeof symbol === "string" && symbol.trim() ? symbol.trim().toUpperCase() : null;
}

export function parseMinimum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/\s+/g, " ");
  const directAmount = Number(text.replace(/[$,%]/g, "").replace(/,/g, "").trim());
  if (Number.isFinite(directAmount)) return directAmount;

  const match = text.match(
    /minimum\s+(?:initial\s+)?(?:investment|purchase)\s*[:$]?\s*\$?\s*([\d,]+(?:\.\d+)?)(?:\s*(million|m|thousand|k))?/i,
  );
  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  const suffix = match[2]?.toLowerCase();
  const multiplier =
    suffix === "million" || suffix === "m"
      ? 1_000_000
      : suffix === "thousand" || suffix === "k"
        ? 1_000
        : 1;
  return Number.isFinite(amount) ? amount * multiplier : null;
}

export function formatMinimum(amount: number): string {
  if (amount === 0) return "$0";
  const roundedMillion = Math.round(amount / 1_000_000);
  if (amount >= 1_000_000 && Math.abs(amount - roundedMillion * 1_000_000) < 0.01) {
    return `${roundedMillion}M`;
  }
  if (amount >= 1_000 && amount % 1_000 === 0) return `$${amount / 1_000}K`;
  return `$${amount.toLocaleString("en-US")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
