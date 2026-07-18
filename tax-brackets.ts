export type TaxBracket = {
  rate: number;
  label: string;
};

export type TaxYearConfig = {
  taxYear: number;
  federal: TaxBracket[];
  nj: TaxBracket[];
  sources: {
    federal: string;
    nj: string;
  };
};

// Keep tax-year data separate from presentation and calculations. Add a new
// entry here for a future year, then change ACTIVE_TAX_YEAR below.
export const TAX_YEARS: Record<number, TaxYearConfig> = {
  2026: {
    taxYear: 2026,
    federal: [
      { rate: 10, label: "10% · $0–$12.4K" },
      { rate: 12, label: "12% · $12.4K–$50.4K" },
      { rate: 22, label: "22% · $50.4K–$105.7K" },
      { rate: 24, label: "24% · $105.7K–$201.8K" },
      { rate: 32, label: "32% · $201.8K–$256.2K" },
      { rate: 35, label: "35% · $256.2K–$640.6K" },
      { rate: 37, label: "37% · $640.6K+" },
    ],
    // NJ publishes continuing rate schedules rather than a separately
    // inflation-indexed bracket table. Keep the current statutory schedule
    // explicit and version it with the active tax year for auditability.
    nj: [
      { rate: 1.4, label: "1.40% · $0–$20K" },
      { rate: 1.75, label: "1.75% · $20K–$35K" },
      { rate: 3.5, label: "3.50% · $35K–$40K" },
      { rate: 5.525, label: "5.525% · $40K–$75K" },
      { rate: 6.37, label: "6.37% · $75K–$500K" },
      { rate: 8.97, label: "8.97% · $500K–$1M" },
      { rate: 10.75, label: "10.75% · $1M+" },
    ],
    sources: {
      federal: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-to-the-one-big-beautiful-bill",
      nj: "https://www.nj.gov/www.nj.gov/treasury/taxation/taxtables.shtml",
    },
  },
};

export const ACTIVE_TAX_YEAR = 2026;
export const ACTIVE_TAX_CONFIG = TAX_YEARS[ACTIVE_TAX_YEAR];

if (!ACTIVE_TAX_CONFIG) {
  throw new Error(`Missing tax configuration for ${ACTIVE_TAX_YEAR}`);
}
