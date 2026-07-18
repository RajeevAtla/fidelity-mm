export type CategoryCode = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";

export const APP_CONFIG = {
  site: {
    basePath: "/fidelity-mm/",
    productionOrigin: "https://rajeevatla.github.io",
    canonicalUrl: "https://rajeevatla.github.io/fidelity-mm/",
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
    order: ["p", "g", "t", "nm", "nj", "ny", "ca", "ma"] as CategoryCode[],
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
    municipal: ["nm", "nj", "ny", "ca", "ma"] as CategoryCode[],
  },
} as const;
