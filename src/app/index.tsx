import { useEffect, useMemo, useState } from "preact/hooks";
import allClassRates from "../../data/fidelity-mm-allclass.json";
import fundMinimums from "../../data/fidelity-mm-minimums.json";
import fundTaxRules from "../../data/fidelity-mm-tax-rules.json";
import { BAR_WIDTH_CLASSES } from "../domain/bar-widths";
import { parseAppData } from "../data/data-boundary";
import { ACTIVE_TAX_CONFIG, ACTIVE_TAX_YEAR } from "../domain/tax-brackets";
import { APP_CONFIG } from "../config/app-config";
import { calculateAnnualValue, calculateBarWidth } from "../domain/calculations";
import { DataFreshness } from "../ui/freshness";
import { FundResults } from "../ui/fund-results";
import {
  buildFunds,
  calculateAfterTaxResults,
  countFundsByCategory,
  filterAndSortFunds,
  getWidthRange,
  getWinnerMatrix,
  type CategoryFilter,
} from "../domain/fund-model";
import {
  applyThemeToDocument,
  getSystemThemePreference,
  subscribeToSystemThemePreference,
  writeStoredThemeMode,
} from "../ui/theme-browser";
import { resolveThemeMode } from "../ui/theme";
import type { ResolvedTheme, ThemeMode } from "../ui/theme";
import type { CategoryCode } from "../domain/categories";
import { SUPPORTED_STATE_CODES, type StateCode } from "../config/app-config";

const THEME_STORAGE_KEY = APP_CONFIG.theme.storageKey;
const THEME_META_COLORS = APP_CONFIG.theme.metaColors;

const fedB = ACTIVE_TAX_CONFIG.federal.map(({ rate: r, label: l }) => ({ r, l }));
const initialFederalBracketIndex = Math.min(APP_CONFIG.defaults.federalBracketIndex, Math.max(0, fedB.length - 1));
const initialStateBracketIndex = Math.min(
  APP_CONFIG.defaults.stateBracketIndex,
  Math.max(0, ACTIVE_TAX_CONFIG.states[APP_CONFIG.defaults.state].brackets.length - 1),
);

const CL = APP_CONFIG.categories.labels;
const allCats: CategoryFilter[] = ["all", ...APP_CONFIG.categories.order];
const rangeValue = (event: Event) => Number((event.currentTarget as HTMLInputElement).value);
const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const buttonBase =
  "inline-flex items-center rounded-md border px-2 py-[5px] text-[10px] font-medium leading-none transition-colors";
const neutralButtonClasses =
  "border-btn-border bg-btn-bg text-btn-text data-[active=true]:border-border-strong data-[active=true]:bg-btn-active-bg data-[active=true]:text-btn-active-text";
const categoryButtonVariants: Record<CategoryCode, string> = {
  p: "data-[active=true]:border-cat-p-border data-[active=true]:bg-cat-p-fill data-[active=true]:text-cat-p-text",
  g: "data-[active=true]:border-cat-g-border data-[active=true]:bg-cat-g-fill data-[active=true]:text-cat-g-text",
  t: "data-[active=true]:border-cat-t-border data-[active=true]:bg-cat-t-fill data-[active=true]:text-cat-t-text",
  nm: "data-[active=true]:border-cat-nm-border data-[active=true]:bg-cat-nm-fill data-[active=true]:text-cat-nm-text",
  nj: "data-[active=true]:border-cat-nj-border data-[active=true]:bg-cat-nj-fill data-[active=true]:text-cat-nj-text",
  ny: "data-[active=true]:border-cat-ny-border data-[active=true]:bg-cat-ny-fill data-[active=true]:text-cat-ny-text",
  ca: "data-[active=true]:border-cat-ca-border data-[active=true]:bg-cat-ca-fill data-[active=true]:text-cat-ca-text",
  ma: "data-[active=true]:border-cat-ma-border data-[active=true]:bg-cat-ma-fill data-[active=true]:text-cat-ma-text",
};
const categoryFillClasses: Record<CategoryCode, string> = {
  p: "bg-cat-p-fill",
  g: "bg-cat-g-fill",
  t: "bg-cat-t-fill",
  nm: "bg-cat-nm-fill",
  nj: "bg-cat-nj-fill",
  ny: "bg-cat-ny-fill",
  ca: "bg-cat-ca-fill",
  ma: "bg-cat-ma-fill",
};
const categoryCellClasses: Record<CategoryCode, string> = {
  p: "bg-cat-p-soft text-cat-p-text",
  g: "bg-cat-g-soft text-cat-g-text",
  t: "bg-cat-t-soft text-cat-t-text",
  nm: "bg-cat-nm-soft text-cat-nm-text",
  nj: "bg-cat-nj-soft text-cat-nj-text",
  ny: "bg-cat-ny-soft text-cat-ny-text",
  ca: "bg-cat-ca-soft text-cat-ca-text",
  ma: "bg-cat-ma-soft text-cat-ma-text",
};
const categoryCellTextClasses: Record<CategoryCode, string> = {
  p: "text-cat-p-text",
  g: "text-cat-g-text",
  t: "text-cat-t-text",
  nm: "text-cat-nm-text",
  nj: "text-cat-nj-text",
  ny: "text-cat-ny-text",
  ca: "text-cat-ca-text",
  ma: "text-cat-ma-text",
};
const categoryLegendClasses: Record<CategoryCode, string> = {
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
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
  return Math.round(calculateBarWidth(value, min, max, APP_CONFIG.display.bar));
}

function barWidthClass(value: number) {
  return BAR_WIDTH_CLASSES[Math.max(0, Math.min(100, Math.round(value)))] ?? BAR_WIDTH_CLASSES[0];
}

function formatAnnualValue(afterTaxYield: number) {
  return calculateAnnualValue(afterTaxYield, APP_CONFIG.display.annualBalance).toLocaleString(undefined, {
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

export default function App(props: {
  initialThemeMode: ThemeMode;
  onResidentStateChange?: (state: StateCode) => void;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(props.initialThemeMode);
  const [state, setState] = useState<StateCode>(APP_CONFIG.defaults.state);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    resolveThemeMode("system", getSystemThemePreference()),
  );
  const [fi, setFi] = useState(initialFederalBracketIndex);
  const [ni, setNi] = useState(initialStateBracketIndex);
  const [fc, setFc] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const { rateSheet, minimumData, taxData } = useMemo(
    () => parseAppData(allClassRates, fundMinimums, fundTaxRules),
    [],
  );
  const funds = useMemo(
    () => buildFunds(rateSheet, taxData.funds, minimumData.funds),
    [minimumData, rateSheet, taxData],
  );

  const currentState = APP_CONFIG.states[state];
  const stateConfig = ACTIVE_TAX_CONFIG.states[state];
  const stateB = stateConfig.brackets.map(({ rate: r, label: l }) => ({ r, l }));
  const stateBracketIndex = Math.min(ni, Math.max(0, stateB.length - 1));
  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;
  const fr = fedB[fi].r;
  const nr = stateB[stateBracketIndex]?.r ?? 0;

  useEffect(() => {
    writeStoredThemeMode(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme, THEME_META_COLORS);
  }, [resolvedTheme]);

  useEffect(() => {
    if (themeMode !== "system") {
      return;
    }

    return subscribeToSystemThemePreference((prefersDark) => {
      setSystemTheme(resolveThemeMode("system", prefersDark));
    });
  }, [themeMode]);

  const res = useMemo(() => {
    return filterAndSortFunds(calculateAfterTaxResults(funds, fr, nr, state), fc);
  }, [funds, fr, nr, state, fc]);

  const widthRange = useMemo(() => getWidthRange(res), [res]);

  const top = res[0];
  const summary = useMemo(() => getWinnerMatrix(funds, fedB, stateB, state), [funds, state, stateB]);
  const categoryCounts = useMemo(() => countFundsByCategory(funds), [funds]);

  const filterCount = (category: CategoryFilter) =>
    category === "all" ? "" : `(${categoryCounts[category] ?? 0})`;

  return (
    <div role="main" aria-labelledby="page-title" className="min-h-screen bg-page text-text font-body tabular-nums">
      <div className="mx-auto w-full max-w-[920px] px-3 py-3 sm:px-[14px] sm:py-[14px]">
        <header className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 id="page-title" className="mb-[3px] font-display text-[18px] font-bold leading-[1.18] tracking-normal">
              All {funds.length} Fidelity Money Market Funds — After-Tax Yield
            </h1>
            <p className="m-0 text-[11px] leading-[1.45] text-muted">
              Fidelity all-class money market 7-day yields. Single filer brackets ({ACTIVE_TAX_YEAR} tax year).
              For {currentState.abbreviation} residents.
            </p>
            <DataFreshness sourceDate={rateSheet.requestedPriceDate} checkedAt={rateSheet.checkedAt} now={Date.now()} />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1 shadow-sm">
            <label htmlFor="resident-state" className="px-1 text-[11px] font-bold text-subtle">Resident state</label>
            <select
              id="resident-state"
              value={state}
              onChange={(event) => {
                const nextState = (event.currentTarget as HTMLSelectElement).value as StateCode;
                setState(nextState);
                props.onResidentStateChange?.(nextState);
                setNi(Math.min(APP_CONFIG.defaults.stateBracketIndex, ACTIVE_TAX_CONFIG.states[nextState].brackets.length - 1));
              }}
              className="rounded border border-btn-border bg-btn-bg px-2 py-[5px] text-[11px] font-semibold text-btn-text"
            >
              {SUPPORTED_STATE_CODES.map((code) => (
                <option key={code} value={code}>{APP_CONFIG.states[code].name}</option>
              ))}
            </select>
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

        {stateConfig.note && (
          <p className="mb-3 rounded border border-warning-border bg-warning-bg px-2 py-1.5 text-[10px] leading-[1.4] text-warning-text" role="status">
            {stateConfig.note}
          </p>
        )}

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
              <label htmlFor="state-bracket" className="text-[12px] font-semibold text-text">{currentState.abbreviation} State Bracket</label>
              <span className="font-body text-[13px] font-bold text-state">
                {stateB[stateBracketIndex].l}
              </span>
            </div>
            <input
              id="state-bracket"
              type="range"
              aria-label={`${currentState.abbreviation} marginal tax bracket`}
              aria-valuetext={stateB[stateBracketIndex].l}
              min={APP_CONFIG.defaults.minimumBracketIndex}
              max={stateB.length - 1}
              value={stateBracketIndex}
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

        <FundResults
          funds={res}
          expanded={showAll}
          initialLimit={APP_CONFIG.display.initialFundLimit}
          categoryLabels={CL}
          barClass={(fund, index) => cx(
            index === 0 ? "bg-best-bar" : categoryFillClasses[fund.c],
            barWidthClass(barPercent(fund.a, widthRange.min, widthRange.max)),
          )}
          toggleButtonClass={cx(buttonBase, neutralButtonClasses, "mt-[6px] px-3")}
          onExpandedChange={setShowAll}
        />

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

        <div className="overflow-x-auto rounded-md border border-table-cell-border" role="region" aria-label={`Winner by federal and ${currentState.abbreviation} tax bracket`}>
          <table className="min-w-[560px] w-full border-collapse text-[10px]">
            <caption className="sr-only">Best after-tax fund for every federal and {currentState.name} tax bracket combination</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b-2 border-table-header-border bg-table-header-bg px-[3px] py-[5px] text-left text-[9px] text-muted">
                  Fed↓ \ {currentState.abbreviation}→
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
          {(Object.entries(CL) as [CategoryCode, string][]).map(([k, v]) => (
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
           Yellow border = current selection. State exemption %s approximate & vary yearly. Tax allocation data: {taxData.taxYear}. Yields net of ER.
          Not financial advice.
        </div>
      </div>
    </div>
  );
}
