export type CalculationCategory = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";

export type AfterTaxInputs = {
  grossYield: number;
  federalRate: number;
  stateRate: number;
  stateExemptPct: number;
  category: CalculationCategory;
};

export function isMunicipalCategory(category: CalculationCategory): boolean {
  return category === "nm" || category === "nj" || category === "ny" || category === "ca" || category === "ma";
}

export function calculateAfterTaxYield({
  grossYield,
  federalRate,
  stateRate,
  stateExemptPct,
  category,
}: AfterTaxInputs): number {
  const stateTaxableYield = grossYield * (1 - clampPercent(stateExemptPct) / 100);
  if (isMunicipalCategory(category)) {
    return grossYield - stateTaxableYield * (stateRate / 100);
  }
  return grossYield - grossYield * (federalRate / 100) - stateTaxableYield * (stateRate / 100);
}

export function calculateAnnualValue(afterTaxYield: number, balance: number): number {
  return (afterTaxYield / 100) * balance;
}

export function calculateBarWidth(
  value: number,
  minimum: number,
  maximum: number,
  options: { minimumWidth?: number; normalizedWidth?: number; curve?: number } = {},
): number {
  const minimumWidth = options.minimumWidth ?? 12;
  const normalizedWidth = options.normalizedWidth ?? 88;
  const curve = options.curve ?? 0.72;
  if (maximum <= minimum) return 100;
  const normalized = Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
  return minimumWidth + normalizedWidth * normalized ** curve;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
