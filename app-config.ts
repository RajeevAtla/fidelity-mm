import { CATEGORY_CODES, MUNICIPAL_CATEGORIES, type CategoryCode } from "./categories";

export const APP_CONFIG = {
  site: {
    basePath: "/fidelity-mm/",
    productionOrigin: "https://rajeevatla.com",
    canonicalUrl: "https://rajeevatla.com/fidelity-mm/",
    developmentPort: 9001,
  },
  defaults: {
    state: "nj" as const,
    minimumBracketIndex: 0,
    federalBracketIndex: 1,
    stateBracketIndex: 1,
  },
  states: {
    nj: { abbreviation: "NJ", name: "New Jersey" },
  },
  display: {
    initialFundLimit: 15,
    annualBalance: 10_000_000,
    bar: {
      minimumWidth: 12,
      normalizedWidth: 88,
      curve: 0.72,
    },
  },
  theme: {
    storageKey: "fidelity-mm-theme-mode",
    metaColors: {
      light: "#edf3f8",
      dark: "#000000",
    },
  },
  categories: {
    order: CATEGORY_CODES,
    labels: {
      p: "Prime",
      g: "Government",
      t: "Treasury",
      nm: "Natl Muni",
      nj: "NJ Muni",
      ny: "NY Muni",
      ca: "CA Muni",
      ma: "MA Muni",
    } satisfies Record<CategoryCode, string>,
    municipal: MUNICIPAL_CATEGORIES,
  },
} as const;
