import { SUPPORTED_STATE_CODES, type StateCode } from "./app-config";

export type TaxBracket = {
  rate: number;
  label: string;
};

export type StateTaxConfig = {
  brackets: TaxBracket[];
  source: string;
  note?: string;
  capitalGains?: TaxBracket[];
};

export type TaxYearConfig = {
  taxYear: number;
  federal: TaxBracket[];
  states: Record<StateCode, StateTaxConfig>;
  sources: {
    federal: string;
    state: string;
  };
};

const STATE_TAX_SOURCE = "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/";

function brackets(...rows: Array<[number, string]>): TaxBracket[] {
  return rows.map(([rate, threshold]) => ({ rate, label: `${rate}% · ${threshold}+` }));
}

function state(bracketsForState: TaxBracket[], options: Omit<StateTaxConfig, "brackets" | "source"> = {}): StateTaxConfig {
  return { brackets: bracketsForState, source: STATE_TAX_SOURCE, ...options };
}

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
    states: {
      al: state(brackets([2, "$0"], [4, "$500"], [5, "$3K"])),
      az: state(brackets([2.5, "$0"])),
      ar: state(brackets([2, "$0"], [3.9, "$4.6K"])),
      ca: state(brackets([1, "$0"], [2, "$11.1K"], [4, "$26.3K"], [6, "$41.5K"], [8, "$57.5K"], [9.3, "$72.7K"], [10.3, "$371.5K"], [11.3, "$445.8K"], [12.3, "$743K"], [13.3, "$1M"])),
      co: state(brackets([4.4, "$0"])),
      ct: state(brackets([2, "$0"], [4.5, "$10K"], [5.5, "$50K"], [6, "$100K"], [6.5, "$200K"], [6.9, "$250K"], [6.99, "$500K"])),
      de: state(brackets([2.2, "$2K"], [3.9, "$5K"], [4.8, "$10K"], [5.2, "$20K"], [5.55, "$25K"], [6.6, "$60K"])),
      ga: state(brackets([5.19, "$0"])),
      hi: state(brackets([1.4, "$0"], [3.2, "$9.6K"], [5.5, "$14.4K"], [6.4, "$19.2K"], [6.8, "$24K"], [7.2, "$36K"], [7.6, "$48K"], [7.9, "$125K"], [8.25, "$175K"], [9, "$225K"], [10, "$275K"], [11, "$325K"])),
      id: state(brackets([5.3, "$4.8K"])),
      il: state(brackets([4.95, "$0"])),
      in: state(brackets([2.95, "$0"])),
      ia: state(brackets([3.8, "$0"])),
      ks: state(brackets([5.2, "$0"], [5.58, "$23K"])),
      ky: state(brackets([3.5, "$0"])),
      la: state(brackets([3, "$0"])),
      me: state(brackets([5.8, "$0"], [6.75, "$27.4K"], [7.15, "$64.8K"])),
      md: state(brackets([2, "$0"], [3, "$1K"], [4, "$2K"], [4.75, "$3K"], [5, "$100K"], [5.25, "$125K"], [5.5, "$150K"], [5.75, "$250K"], [6.25, "$500K"], [6.5, "$1M"])),
      ma: state(brackets([5, "$0"], [9, "$1.08M"])),
      mi: state(brackets([4.25, "$0"])),
      mn: state(brackets([5.35, "$0"], [6.8, "$33.3K"], [7.85, "$109.4K"], [9.85, "$203.2K"])),
      ms: state(brackets([4, "$10K"])),
      mo: state(brackets([2, "$1.35K"], [2.5, "$2.7K"], [3, "$4K"], [3.5, "$5.4K"], [4, "$6.7K"], [4.5, "$8.1K"], [4.7, "$9.4K"])),
      mt: state(brackets([4.7, "$0"], [5.65, "$47.5K"])),
      ne: state(brackets([2.46, "$0"], [3.51, "$4.1K"], [4.55, "$24.8K"])),
      nj: state([
        { rate: 1.4, label: "1.40% · $0–$20K" },
        { rate: 1.75, label: "1.75% · $20K–$35K" },
        { rate: 3.5, label: "3.50% · $35K–$40K" },
        { rate: 5.525, label: "5.525% · $40K–$75K" },
        { rate: 6.37, label: "6.37% · $75K–$500K" },
        { rate: 8.97, label: "8.97% · $500K–$1M" },
        { rate: 10.75, label: "10.75% · $1M+" },
      ]),
      nm: state(brackets([1.5, "$0"], [3.2, "$5.5K"], [4.3, "$16.5K"], [4.7, "$33.5K"], [4.9, "$66.5K"], [5.9, "$210K"])),
      ny: state(brackets([3.9, "$0"], [4.4, "$8.5K"], [5.15, "$11.7K"], [5.4, "$13.9K"], [5.9, "$80.7K"], [6.85, "$215.4K"], [9.65, "$1.08M"], [10.3, "$5M"], [10.9, "$25M"])),
      nc: state(brackets([3.99, "$0"])),
      nd: state(brackets([1.95, "$48.5K"], [2.5, "$244.8K"])),
      oh: state(brackets([2.75, "$26.1K"])),
      ok: state(brackets([2.5, "$3.8K"], [3.5, "$4.9K"], [4.5, "$7.2K"])),
      or: state(brackets([4.75, "$0"], [6.75, "$4.6K"], [8.75, "$11.4K"], [9.9, "$125K"])),
      pa: state(brackets([3.07, "$0"])),
      ri: state(brackets([3.75, "$0"], [4.75, "$82.1K"], [5.99, "$186.5K"])),
      sc: state(brackets([0, "$0"], [3, "$3.6K"], [6, "$18.2K"])),
      ut: state(brackets([4.5, "$0"])),
      vt: state(brackets([3.35, "$0"], [6.6, "$49.4K"], [7.6, "$119.7K"], [8.75, "$249.7K"])),
      va: state(brackets([2, "$0"], [3, "$3K"], [5, "$5K"], [5.75, "$17K"])),
      wa: state([{ rate: 0, label: "0% · Ordinary income not taxed" }], {
        note: "Washington's separate capital-gains tax is not applied to money-market yield income.",
        capitalGains: brackets([7, "$0"], [9, "$1M"]),
      }),
      wv: state(brackets([2.22, "$0"], [2.96, "$10K"], [3.33, "$25K"], [4.44, "$40K"], [4.82, "$60K"])),
      wi: state(brackets([3.5, "$0"], [4.4, "$15.1K"], [5.3, "$52K"], [7.65, "$332.7K"])),
    },
    sources: {
      federal: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-to-the-one-big-beautiful-bill",
      state: STATE_TAX_SOURCE,
    },
  },
};

for (const [taxYear, config] of Object.entries(TAX_YEARS)) {
  if (Object.keys(config.states).length !== SUPPORTED_STATE_CODES.length) {
    throw new Error(`Every supported state needs a tax configuration for ${taxYear}`);
  }
}

export const ACTIVE_TAX_YEAR = Math.max(...Object.keys(TAX_YEARS).map(Number));
export const ACTIVE_TAX_CONFIG = TAX_YEARS[ACTIVE_TAX_YEAR];

if (!ACTIVE_TAX_CONFIG) {
  throw new Error(`Missing tax configuration for ${ACTIVE_TAX_YEAR}`);
}
