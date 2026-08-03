export const DATA_PATHS = {
  rateSheet: "data/fidelity-mm-allclass.json",
  minimums: "data/fidelity-mm-minimums.json",
  taxRules: "data/fidelity-mm-tax-rules.json",
} as const;

export const FIDELITY_SOURCES = {
  rateSheetPage: "https://institutional.fidelity.com/app/funds/dailyratesheets",
  rateSheetApi: "https://institutional.fidelity.com/app/funds/data/dailyratesheets.json",
  fundDetails: "https://institutional.fidelity.com/app/fund/sasid/details",
  fundDataApi: "https://institutional.fidelity.com/app/fund/data",
  taxInformationPage: "https://www.fidelity.com/tax-information/fidelity-mutual-fund-tax-information",
  repositoryUrl: "https://github.com/RajeevAtla/fidelity-mm",
} as const;

export const SCRAPER_USER_AGENT =
  "fidelity-mm/1.0 (+https://github.com/RajeevAtla/fidelity-mm; personal research scraper)";
