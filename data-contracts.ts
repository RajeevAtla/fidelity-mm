import type { CategoryCode } from "./app-config";

export type CheckedDocument = {
  checkedAt: string;
  count: number;
};

export type RateSheetFund = {
  fundNo: string;
  symbol: string | null;
  name: string;
  section: string | null;
  date: string | null;
  nav: number | null;
  oneDayYield: number | null;
  sevenDayYield: number | null;
  thirtyDayYield: number | null;
  dailyMilRate: number | null;
  portfolioNetAssets: number | null;
  portfolioNetAssetsDate: string | null;
  weightedAverageMaturityDays: number | null;
  weightedAverageMaturityDate: string | null;
  expenseRatioGross: number | null;
  expenseRatioNet: number | null;
  monthEndSevenDayYield: number | null;
  monthEndSevenDayYieldWithoutReimbursement: number | null;
  monthEndDate: string | null;
};

export type RateSheetData = CheckedDocument & {
  sourceUrl: string;
  apiUrl: string;
  tab: string;
  groupSystemName: string;
  sheetTitle: string | null;
  dateType: string | null;
  complete: boolean | null;
  requestedPriceDate: string | null;
  funds: RateSheetFund[];
};

export type MinimumRule = {
  minimumInvestment: number;
  minimumLabel: string;
  sourceUrl: string;
  status: "verified";
};

export type MinimumData = CheckedDocument & {
  source: string;
  funds: Record<string, MinimumRule>;
};

export type TaxRule = {
  c: CategoryCode;
  njExemptPct: number;
  sourceUrl: string;
};

export type TaxData = CheckedDocument & {
  sourceUrl: string;
  taxYear: number;
  funds: Record<string, TaxRule>;
};
