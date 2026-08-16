import { CATEGORY_CODES, MUNICIPAL_CATEGORIES, type CategoryCode } from "./categories";

export const SUPPORTED_STATE_CODES = [
  "ak", "al", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la",
  "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nh", "nj", "nm", "nv", "ny", "nc", "nd", "oh", "ok",
  "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
] as const;

export type StateCode = typeof SUPPORTED_STATE_CODES[number];
export type StateMunicipalCategory = Extract<CategoryCode, "nj" | "ny" | "ca" | "ma">;

export const STATE_MUNICIPAL_CATEGORIES: StateMunicipalCategory[] = ["nj", "ny", "ca", "ma"];

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
    ak: { abbreviation: "AK", name: "Alaska" },
    al: { abbreviation: "AL", name: "Alabama" },
    az: { abbreviation: "AZ", name: "Arizona" },
    ar: { abbreviation: "AR", name: "Arkansas" },
    ca: { abbreviation: "CA", name: "California" },
    co: { abbreviation: "CO", name: "Colorado" },
    ct: { abbreviation: "CT", name: "Connecticut" },
    de: { abbreviation: "DE", name: "Delaware" },
    fl: { abbreviation: "FL", name: "Florida" },
    ga: { abbreviation: "GA", name: "Georgia" },
    hi: { abbreviation: "HI", name: "Hawaii" },
    id: { abbreviation: "ID", name: "Idaho" },
    il: { abbreviation: "IL", name: "Illinois" },
    in: { abbreviation: "IN", name: "Indiana" },
    ia: { abbreviation: "IA", name: "Iowa" },
    ks: { abbreviation: "KS", name: "Kansas" },
    ky: { abbreviation: "KY", name: "Kentucky" },
    la: { abbreviation: "LA", name: "Louisiana" },
    me: { abbreviation: "ME", name: "Maine" },
    md: { abbreviation: "MD", name: "Maryland" },
    ma: { abbreviation: "MA", name: "Massachusetts" },
    mi: { abbreviation: "MI", name: "Michigan" },
    mn: { abbreviation: "MN", name: "Minnesota" },
    ms: { abbreviation: "MS", name: "Mississippi" },
    mo: { abbreviation: "MO", name: "Missouri" },
    mt: { abbreviation: "MT", name: "Montana" },
    ne: { abbreviation: "NE", name: "Nebraska" },
    nh: { abbreviation: "NH", name: "New Hampshire" },
    nj: { abbreviation: "NJ", name: "New Jersey" },
    nm: { abbreviation: "NM", name: "New Mexico" },
    nv: { abbreviation: "NV", name: "Nevada" },
    ny: { abbreviation: "NY", name: "New York" },
    nc: { abbreviation: "NC", name: "North Carolina" },
    nd: { abbreviation: "ND", name: "North Dakota" },
    oh: { abbreviation: "OH", name: "Ohio" },
    ok: { abbreviation: "OK", name: "Oklahoma" },
    or: { abbreviation: "OR", name: "Oregon" },
    pa: { abbreviation: "PA", name: "Pennsylvania" },
    ri: { abbreviation: "RI", name: "Rhode Island" },
    sc: { abbreviation: "SC", name: "South Carolina" },
    sd: { abbreviation: "SD", name: "South Dakota" },
    tn: { abbreviation: "TN", name: "Tennessee" },
    tx: { abbreviation: "TX", name: "Texas" },
    ut: { abbreviation: "UT", name: "Utah" },
    vt: { abbreviation: "VT", name: "Vermont" },
    va: { abbreviation: "VA", name: "Virginia" },
    wa: { abbreviation: "WA", name: "Washington" },
    wv: { abbreviation: "WV", name: "West Virginia" },
    wi: { abbreviation: "WI", name: "Wisconsin" },
    wy: { abbreviation: "WY", name: "Wyoming" },
  } satisfies Record<StateCode, { abbreviation: string; name: string }>,
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
