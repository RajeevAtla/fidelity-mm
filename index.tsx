import { useEffect, useMemo, useState } from "preact/hooks";
import allClassRates from "./data/fidelity-mm-allclass.json";
import fundMinimums from "./data/fidelity-mm-minimums.json";
import fundTaxRules from "./data/fidelity-mm-tax-rules.json";
import { BAR_WIDTH_CLASSES } from "./bar-widths";
import { ACTIVE_TAX_CONFIG, ACTIVE_TAX_YEAR } from "./tax-brackets";
import { APP_CONFIG } from "./app-config";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type Category = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";

const THEME_STORAGE_KEY = APP_CONFIG.theme.storageKey;
const THEME_META_COLORS = APP_CONFIG.theme.metaColors;

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    return "system";
  }

  return "system";
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function applyThemeToDocument(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;

  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = THEME_META_COLORS[theme];
}

type CategoryFilter = Category | "all";
type Fund = {
  t: string;
  n: string;
  y: number;
  er: number;
  c: Category;
  se: number;
  mn: string;
};
type FundResult = Fund & { a: number };
type RateSheetFund = {
  symbol: string | null;
  name: string;
  section: string | null;
  sevenDayYield: number | null;
  expenseRatioNet: number | null;
  expenseRatioGross: number | null;
};
type RateSheetData = {
  sheetTitle: string | null;
  requestedPriceDate: string | null;
  funds: RateSheetFund[];
};
type FundRule = {
  c: Category;
  njExemptPct: number;
  sourceUrl?: string;
  scrapedAt?: string;
};

type FundMinimum = { minimumInvestment: number; minimumLabel: string };

const FUND_RULES = (fundTaxRules as { funds: Record<string, FundRule> }).funds;

const FUND_MINIMUMS = (fundMinimums as { funds: Record<string, FundMinimum> }).funds;

const fedB = ACTIVE_TAX_CONFIG.federal.map(({ rate: r, label: l }) => ({ r, l }));
const stateB = (ACTIVE_TAX_CONFIG.states[APP_CONFIG.defaults.state] ?? []).map(({ rate: r, label: l }) => ({ r, l }));
const initialFederalBracketIndex = Math.min(APP_CONFIG.defaults.federalBracketIndex, Math.max(0, fedB.length - 1));
const initialStateBracketIndex = Math.min(APP_CONFIG.defaults.stateBracketIndex, Math.max(0, stateB.length - 1));

function buildFunds(rateSheet: RateSheetData): Fund[] {
  return rateSheet.funds
    .filter((fund) => fund.symbol && fund.sevenDayYield !== null)
    .map((fund) => {
      const rule = FUND_RULES[fund.symbol ?? ""];
      const minimum = FUND_MINIMUMS[fund.symbol ?? ""];
      if (!rule) {
        throw new Error(`Missing fund rule for ${fund.symbol ?? "unknown symbol"}`);
      }
      if (!minimum) {
        throw new Error(`Missing minimum investment for ${fund.symbol ?? "unknown symbol"}`);
      }

      return {
        t: fund.symbol ?? "",
        n: displayName(fund),
        y: fund.sevenDayYield ?? 0,
        er: fund.expenseRatioNet ?? fund.expenseRatioGross ?? 0,
        c: rule.c,
        se: rule.njExemptPct,
        mn: minimum.minimumLabel,
      };
    });
}

const CL = APP_CONFIG.categories.labels;
const isMuni = (category: Category) => APP_CONFIG.categories.municipal.includes(category);

function displayName(fund: RateSheetFund) {
  const sectionParts = (fund.section ?? "").split(":");
  const classLabel = cleanLabel(sectionParts[sectionParts.length - 1] ?? "");
  const name = cleanLabel(fund.name);
  return classLabel && !name.toLowerCase().includes(classLabel.toLowerCase())
    ? `${name} - ${classLabel}`
    : name;
}

function cleanLabel(value: string) {
  return value
    .replace(/\s*\d+(?:,\d+)*,?\*?$/g, "")
    .replace(/\s*\*+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const rateSheet = allClassRates as RateSheetData;
const F = buildFunds(rateSheet);

function at(f: Fund, fr: number, nr: number) {
  if (isMuni(f.c) && f.se >= 100) return f.y;
  if (isMuni(f.c)) return f.y - f.y * (1 - f.se / 100) * (nr / 100);
  return f.y - f.y * (fr / 100) - f.y * (1 - f.se / 100) * (nr / 100);
}

const allCats: CategoryFilter[] = ["all", ...APP_CONFIG.categories.order];
const rangeValue = (event: Event) => Number((event.currentTarget as HTMLInputElement).value);
const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const buttonBase =
  "inline-flex items-center rounded-md border px-2 py-[5px] text-[10px] font-medium leading-none transition-colors";
const neutralButtonClasses =
  "border-btn-border bg-btn-bg text-btn-text data-[active=true]:border-border-strong data-[active=true]:bg-btn-active-bg data-[active=true]:text-btn-active-text";
const categoryButtonVariants: Record<Category, string> = {
  p: "data-[active=true]:border-cat-p-border data-[active=true]:bg-cat-p-fill data-[active=true]:text-cat-p-text",
  g: "data-[active=true]:border-cat-g-border data-[active=true]:bg-cat-g-fill data-[active=true]:text-cat-g-text",
  t: "data-[active=true]:border-cat-t-border data-[active=true]:bg-cat-t-fill data-[active=true]:text-cat-t-text",
  nm: "data-[active=true]:border-cat-nm-border data-[active=true]:bg-cat-nm-fill data-[active=true]:text-cat-nm-text",
  nj: "data-[active=true]:border-cat-nj-border data-[active=true]:bg-cat-nj-fill data-[active=true]:text-cat-nj-text",
  ny: "data-[active=true]:border-cat-ny-border data-[active=true]:bg-cat-ny-fill data-[active=true]:text-cat-ny-text",
  ca: "data-[active=true]:border-cat-ca-border data-[active=true]:bg-cat-ca-fill data-[active=true]:text-cat-ca-text",
  ma: "data-[active=true]:border-cat-ma-border data-[active=true]:bg-cat-ma-fill data-[active=true]:text-cat-ma-text",
};
const categoryFillClasses: Record<Category, string> = {
  p: "bg-cat-p-fill",
  g: "bg-cat-g-fill",
  t: "bg-cat-t-fill",
  nm: "bg-cat-nm-fill",
  nj: "bg-cat-nj-fill",
  ny: "bg-cat-ny-fill",
  ca: "bg-cat-ca-fill",
  ma: "bg-cat-ma-fill",
};
const categoryCellClasses: Record<Category, string> = {
  p: "bg-cat-p-soft text-cat-p-text",
  g: "bg-cat-g-soft text-cat-g-text",
  t: "bg-cat-t-soft text-cat-t-text",
  nm: "bg-cat-nm-soft text-cat-nm-text",
  nj: "bg-cat-nj-soft text-cat-nj-text",
  ny: "bg-cat-ny-soft text-cat-ny-text",
  ca: "bg-cat-ca-soft text-cat-ca-text",
  ma: "bg-cat-ma-soft text-cat-ma-text",
};
const categoryCellTextClasses: Record<Category, string> = {
  p: "text-cat-p-text",
  g: "text-cat-g-text",
  t: "text-cat-t-text",
  nm: "text-cat-nm-text",
  nj: "text-cat-nj-text",
  ny: "text-cat-ny-text",
  ca: "text-cat-ca-text",
  ma: "text-cat-ma-text",
};
const categoryLegendClasses: Record<Category, string> = {
  p: "bg-cat-p-soft text-cat-p-text border-cat-p-border",
  g: "bg-cat-g-soft text-cat-g-text border-cat-g-border",
  t: "bg-cat-t-soft text-cat-t-text border-cat-t-border",
  nm: "bg-cat-nm-soft text-cat-nm-text border-cat-nm-border",
  nj: "bg-cat-nj-soft text-cat-nj-text border-cat-nj-border",
  ny: "bg-cat-ny-soft text-cat-ny-text border-cat-ny-border",
  ca: "bg-cat-ca-soft text-cat-ca-text border-cat-ca-border",
  ma: "bg-cat-ma-soft text-cat-ma-text border-cat-ma-border",
};

function barPercent(value: number, min: number, max: number) {
  const span = max - min;
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }
  if (span <= 0) {
    return 100;
  }

  const normalized = Math.max(0, Math.min(1, (value - min) / span));
  const curved = Math.pow(normalized, APP_CONFIG.display.bar.curve);
  const width = APP_CONFIG.display.bar.minimumWidth + curved * APP_CONFIG.display.bar.normalizedWidth;
  return Math.round(Math.max(0, Math.min(100, width)));
}

function barWidthClass(value: number) {
  return BAR_WIDTH_CLASSES[Math.max(0, Math.min(100, Math.round(value)))] ?? BAR_WIDTH_CLASSES[0];
}

function formatAnnualValue(afterTaxYield: number) {
  return ((afterTaxYield / 100) * APP_CONFIG.display.annualBalance).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function buttonClasses(active: boolean, tone?: string) {
  return cx(
    buttonBase,
    neutralButtonClasses,
    tone,
    active && "font-semibold",
  );
}

export default function App(props: { initialThemeMode: ThemeMode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(props.initialThemeMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => resolveThemeMode("system"));
  const [fi, setFi] = useState(initialFederalBracketIndex);
  const [ni, setNi] = useState(initialStateBracketIndex);
  const [fc, setFc] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;
  const rateDate = rateSheet.requestedPriceDate ?? "latest scrape";
  const fr = fedB[fi].r;
  const nr = stateB[ni].r;

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage failures.
    }
  }, [themeMode]);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (themeMode !== "system" || typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");

    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [themeMode]);

  const res = useMemo(() => {
    let l: FundResult[] = F.map((f) => ({ ...f, a: at(f, fr, nr) }));
    if (fc !== "all") l = l.filter((f) => f.c === fc);
    return l.sort((a, b) => b.a - a.a);
  }, [fr, nr, fc]);

  const widthRange = useMemo(() => {
    if (res.length === 0) {
      return { min: 0, max: 0 };
    }

    return res.reduce(
      (acc, fund) => ({
        min: Math.min(acc.min, fund.a),
        max: Math.max(acc.max, fund.a),
      }),
      { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    );
  }, [res]);

  const top = res[0];
  const show = showAll ? res : res.slice(0, APP_CONFIG.display.initialFundLimit);

  const summary = useMemo(() => {
    return fedB.map((fb) => ({
      fb,
      cols: stateB.map((nb) => {
        const best = F.map((f) => ({ t: f.t, a: at(f, fb.r, nb.r), c: f.c })).sort(
          (a, b) => b.a - a.a,
        )[0];
        return best;
      }),
    }));
  }, []);

  const filterCount = (category: CategoryFilter) =>
    category === "all" ? "" : `(${F.filter((f) => f.c === category).length})`;

  return (
    <div role="main" aria-labelledby="page-title" className="min-h-screen bg-page text-text font-body tabular-nums">
      <div className="mx-auto w-full max-w-[920px] px-3 py-3 sm:px-[14px] sm:py-[14px]">
        <header className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 id="page-title" className="mb-[3px] font-display text-[18px] font-bold leading-[1.18] tracking-normal">
              All {F.length} Fidelity Money Market Funds — After-Tax Yield
            </h1>
            <p className="m-0 text-[11px] leading-[1.45] text-muted">
              7-day yields as of {rateDate}, from the scraped Fidelity all-class money market
              sheet. Single filer brackets ({ACTIVE_TAX_YEAR} tax year). For {APP_CONFIG.defaults.state.toUpperCase()} residents.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1 shadow-sm" role="group" aria-label="Theme preference">
            <span className="px-1 text-[11px] font-bold text-subtle">Theme</span>
            <div className="inline-flex gap-1" role="group" aria-label="Choose theme">
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={`${mode === "system" ? "System" : mode[0].toUpperCase() + mode.slice(1)} theme`}
                  aria-pressed={themeMode === mode}
                  data-active={themeMode === mode}
                  onClick={() => setThemeMode(mode)}
                  className={buttonClasses(themeMode === mode)}
                >
                  {mode === "system" ? "System" : mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="mb-3 flex flex-wrap gap-4 sm:gap-5">
          <div className="min-w-0 flex-[1_1_280px]">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="federal-bracket" className="text-[12px] font-semibold text-text">Federal Bracket</label>
              <span className="font-body text-[13px] font-bold text-federal">
              {fedB[fi].l}
              </span>
            </div>
            <input
              id="federal-bracket"
              type="range"
              aria-label="Federal marginal tax bracket"
              aria-valuetext={fedB[fi].l}
              min={APP_CONFIG.defaults.minimumBracketIndex}
              max={fedB.length - 1}
              value={fi}
              onInput={(e) => setFi(rangeValue(e))}
              className="w-full accent-federal"
            />
            <div className="flex justify-between text-[9px] text-subtle">
              {fedB.map((b) => (
                <span key={b.r}>{b.r}%</span>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-[1_1_280px]">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="nj-bracket" className="text-[12px] font-semibold text-text">{APP_CONFIG.defaults.state.toUpperCase()} State Bracket</label>
              <span className="font-body text-[13px] font-bold text-state">
                {stateB[ni].l}
              </span>
            </div>
            <input
              id="nj-bracket"
              type="range"
              aria-label={`${APP_CONFIG.defaults.state.toUpperCase()} marginal tax bracket`}
              aria-valuetext={stateB[ni].l}
              min={APP_CONFIG.defaults.minimumBracketIndex}
              max={stateB.length - 1}
              value={ni}
              onInput={(e) => setNi(rangeValue(e))}
              className="w-full accent-state"
            />
            <div className="flex justify-between text-[9px] text-subtle">
              {stateB.map((b) => (
                <span key={b.r}>{b.r}%</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Fund category filter">
          {allCats.map((c) => {
            const active = fc === c;
            const tone = c === "all" ? "" : categoryButtonVariants[c];
            return (
              <button
                key={c}
                type="button"
                aria-label={`${c === "all" ? "All funds" : CL[c]}${filterCount(c)}`}
                aria-pressed={active}
                data-active={active}
                onClick={() => setFc(c)}
                className={buttonClasses(active, tone)}
              >
                {c === "all" ? "All" : CL[c]} {filterCount(c)}
              </button>
            );
          })}
        </div>

        <div id="fund-list" className="space-y-[3px]" aria-live="polite" aria-label={`${res.length} funds shown`}>
          {show.map((r, i) => {
            const best = i === 0;
            const w = barPercent(r.a, widthRange.min, widthRange.max);
            const fillClass = best ? "bg-best-bar" : categoryFillClasses[r.c];
            return (
              <div
                key={r.t}
                className="grid grid-cols-[52px_minmax(0,1fr)_52px_42px] items-center gap-x-1"
              >
                <div className="w-[52px] flex-shrink-0 text-[11px] font-semibold text-text">
                  {r.t}
                </div>
                <div
                  className="relative h-6 min-w-0 overflow-hidden rounded-md border border-track-border bg-track"
                  role="img"
                  aria-label={`${r.t} ${r.a.toFixed(3)}% after-tax yield`}
                >
                  <div
                    className={cx(
                      "absolute inset-y-0 left-0 rounded-r-full rounded-l-none",
                      fillClass,
                      barWidthClass(w),
                    )}
                  />
                  <span
                    className={cx(
                      "bar-value-label absolute right-[4px] top-[3px] rounded bg-page/85 px-[3px] text-[11px] font-semibold leading-none",
                      best ? "font-bold" : "font-medium",
                    )}
                  >
                    {r.a.toFixed(3)}%
                  </span>
                </div>
                <div className="w-[52px] flex-shrink-0 pl-1 text-right text-[9px] text-muted">
                  {CL[r.c]}
                </div>
                <div className="w-[42px] flex-shrink-0 pl-1 text-right text-[9px] text-subtle">
                  {r.mn}
                </div>
              </div>
            );
          })}
        </div>

        {!showAll && res.length > APP_CONFIG.display.initialFundLimit && (
          <button
            type="button"
            aria-label={`Show all ${res.length} funds`}
            aria-expanded={showAll}
            aria-controls="fund-list"
            onClick={() => setShowAll(true)}
            className={cx(buttonBase, neutralButtonClasses, "mt-[6px] px-3")}
          >
            Show all {res.length} funds ▾
          </button>
        )}

        {showAll && res.length > APP_CONFIG.display.initialFundLimit && (
          <button
            type="button"
            aria-label="Show only the top initial funds"
            aria-expanded={showAll}
            aria-controls="fund-list"
            onClick={() => setShowAll(false)}
            className={cx(buttonBase, neutralButtonClasses, "mt-[6px] px-3")}
          >
            Show top {APP_CONFIG.display.initialFundLimit} ▴
          </button>
        )}

        {top && (
          <div className="my-2.5 overflow-hidden rounded-lg border border-success-border bg-success-bg shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-success-border/70 px-3 py-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-success-border bg-page px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-success-text">
                    Best current fund
                  </span>
                  <span className={cx("rounded-full border px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.08em]", categoryLegendClasses[top.c])}>
                    {CL[top.c]}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[15px] font-bold leading-[1.15] text-text">
                    {top.t}
                  </div>
                  <div className="mt-[2px] max-w-[42rem] text-[12px] leading-[1.35] text-success-text">
                    {top.n}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-success-border bg-page px-3 py-2 text-right">
                <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                  After-tax yield
                </div>
                <div className="font-display text-[26px] font-bold leading-none text-success-text">
                  {top.a.toFixed(3)}%
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  Winner at current brackets
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-success-border/70 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-page px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                  Gross
                </div>
                <div className="text-[12px] font-semibold text-text">{top.y.toFixed(2)}%</div>
              </div>
              <div className="bg-page px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                  Expense ratio
                </div>
                <div className="text-[12px] font-semibold text-text">{top.er.toFixed(2)}%</div>
              </div>
              <div className="bg-page px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                  Minimum
                </div>
                <div className="text-[12px] font-semibold text-text">{top.mn}</div>
              </div>
              <div className="bg-page px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                  On $10M
                </div>
                <div className="text-[12px] font-semibold text-success-text">
                  ≈ ${formatAnnualValue(top.a)}/yr
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="mb-1 mt-4 font-display text-[14px] font-bold leading-tight tracking-normal">
          Winner at Every Bracket Combination
        </h2>

        <div className="overflow-x-auto rounded-md border border-table-cell-border" role="region" aria-label="Winner by federal and New Jersey tax bracket">
          <table className="min-w-[560px] w-full border-collapse text-[10px]">
            <caption className="sr-only">Best after-tax fund for every federal and New Jersey tax bracket combination</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b-2 border-table-header-border bg-table-header-bg px-[3px] py-[5px] text-left text-[9px] text-muted">
                  Fed↓ \ NJ→
                </th>
                {stateB.map((b) => (
                  <th
                    key={b.r}
                    scope="col"
                    className="border-b-2 border-table-header-border bg-table-header-bg px-[2px] py-[5px] text-center text-[9px] text-muted"
                  >
                    {b.r}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.fb.r}>
                  <th scope="row" className="border-b border-table-cell-border px-[3px] py-1 text-[10px] font-semibold text-text">
                    {row.fb.r}%
                  </th>
                  {row.cols.map((w, ci) => {
                    const act = row.fb.r === fr && stateB[ci].r === nr;
                    const tone = categoryCellClasses[w.c];
                    return (
                      <td
                        key={ci}
                        data-active={act}
                        className={cx(
                          "border px-[2px] py-1 text-center",
                          act
                            ? "relative z-10 border-transparent bg-selection-bg ring-2 ring-inset ring-selection-border"
                            : cx("border-table-cell-border", tone),
                        )}
                      >
                        <div
                          className={cx("text-[10px] font-bold", act ? "text-selection-text" : categoryCellTextClasses[w.c])}
                        >
                          {w.t}
                        </div>
                        <div className={cx("text-[9px]", act ? "text-selection-text" : "text-muted")}>
                          {w.a.toFixed(2)}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2.5 text-[9px] leading-[1.5] text-subtle">
          <strong className="text-text">Legend:</strong>{" "}
          {(Object.entries(CL) as [Category, string][]).map(([k, v]) => (
            <span
              key={k}
              className={cx(
                "mr-[3px] inline-block rounded-[3px] border px-[5px] py-px",
                categoryLegendClasses[k],
              )}
            >
              {v}
            </span>
          ))}
          <br />
          Yellow border = current selection. State exemption %s approximate & vary yearly. Yields net of ER.
          Not financial advice.
        </div>
      </div>
    </div>
  );
}
