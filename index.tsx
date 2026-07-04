import { useEffect, useMemo, useState } from "preact/hooks";
import allClassRates from "./data/fidelity-mm-allclass.json";
import {
  applyThemeToDocument,
  THEME_STORAGE_KEY,
  type Category,
  type ResolvedTheme,
  type ThemeMode,
  getStoredThemeMode,
  resolveThemeMode,
} from "./theme";

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
  mn: string;
};

const FUND_RULES: Record<string, FundRule> = {
  FNSXX: { c: "p", njExemptPct: 4, mn: "$10M" },
  FRGXX: { c: "g", njExemptPct: 55, mn: "$10M" },
  FRBXX: { c: "t", njExemptPct: 51, mn: "$10M" },
  FRSXX: { c: "t", njExemptPct: 97, mn: "$10M" },
  FMPXX: { c: "p", njExemptPct: 4, mn: "$10M" },
  FIGXX: { c: "g", njExemptPct: 55, mn: "$10M" },
  FISXX: { c: "t", njExemptPct: 51, mn: "$10M" },
  FSIXX: { c: "t", njExemptPct: 97, mn: "$10M" },
  FTCXX: { c: "nm", njExemptPct: 0, mn: "$10M" },
  FMYXX: { c: "p", njExemptPct: 4, mn: "$0" },
  FGEXX: { c: "g", njExemptPct: 55, mn: "$0" },
  FTUXX: { c: "t", njExemptPct: 51, mn: "$0" },
  FTYXX: { c: "t", njExemptPct: 97, mn: "$0" },
  FSXXX: { c: "nm", njExemptPct: 0, mn: "$0" },
  FCIXX: { c: "p", njExemptPct: 4, mn: "$10M" },
  FCVXX: { c: "g", njExemptPct: 55, mn: "$10M" },
  FCEXX: { c: "t", njExemptPct: 51, mn: "$10M" },
  FOXXX: { c: "t", njExemptPct: 97, mn: "$10M" },
  FEXXX: { c: "nm", njExemptPct: 0, mn: "$10M" },
  FCOXX: { c: "p", njExemptPct: 4, mn: "$10M" },
  FCGXX: { c: "g", njExemptPct: 55, mn: "$10M" },
  FCSXX: { c: "t", njExemptPct: 51, mn: "$10M" },
  FOIXX: { c: "t", njExemptPct: 97, mn: "$10M" },
  FETXX: { c: "nm", njExemptPct: 0, mn: "$10M" },
  FTVXX: { c: "t", njExemptPct: 51, mn: "$10M" },
  FOPXX: { c: "t", njExemptPct: 97, mn: "$10M" },
  FZDXX: { c: "p", njExemptPct: 4, mn: "$100K" },
  FZCXX: { c: "g", njExemptPct: 55, mn: "$100K" },
  FZEXX: { c: "nm", njExemptPct: 0, mn: "$100K" },
  FZBXX: { c: "g", njExemptPct: 55, mn: "$0" },
  FDUXX: { c: "t", njExemptPct: 51, mn: "$0" },
  FDEXX: { c: "nm", njExemptPct: 0, mn: "$0" },
  FZAXX: { c: "g", njExemptPct: 55, mn: "$0" },
  FSRXX: { c: "t", njExemptPct: 51, mn: "$0" },
  FERXX: { c: "nm", njExemptPct: 0, mn: "$0" },
  FSBXX: { c: "ca", njExemptPct: 0, mn: "$1M" },
  FMAXX: { c: "ma", njExemptPct: 0, mn: "$1M" },
  FSKXX: { c: "nj", njExemptPct: 100, mn: "$1M" },
  FNKXX: { c: "ny", njExemptPct: 0, mn: "$1M" },
  FZGXX: { c: "g", njExemptPct: 55, mn: "$0" },
};

const fedB = [
  { r: 10, l: "10% · $0–$11.6K" },
  { r: 12, l: "12% · $11.6K–$47.2K" },
  { r: 22, l: "22% · $47.2K–$100.5K" },
  { r: 24, l: "24% · $100.5K–$192K" },
  { r: 32, l: "32% · $192K–$243.7K" },
  { r: 35, l: "35% · $243.7K–$609.4K" },
  { r: 37, l: "37% · $609.4K+" },
];
const njB = [
  { r: 1.4, l: "1.40% · $0–$20K" },
  { r: 1.75, l: "1.75% · $20K–$35K" },
  { r: 3.5, l: "3.50% · $35K–$40K" },
  { r: 5.525, l: "5.525% · $40K–$75K" },
  { r: 6.37, l: "6.37% · $75K–$500K" },
  { r: 8.97, l: "8.97% · $500K–$1M" },
  { r: 10.75, l: "10.75% · $1M+" },
];

function buildFunds(rateSheet: RateSheetData): Fund[] {
  return rateSheet.funds
    .filter((fund) => fund.symbol && fund.sevenDayYield !== null)
    .map((fund) => {
      const rule = FUND_RULES[fund.symbol ?? ""];
      if (!rule) {
        throw new Error(`Missing fund rule for ${fund.symbol ?? "unknown symbol"}`);
      }

      return {
        t: fund.symbol ?? "",
        n: displayName(fund),
        y: fund.sevenDayYield ?? 0,
        er: fund.expenseRatioNet ?? fund.expenseRatioGross ?? 0,
        c: rule.c,
        se: rule.njExemptPct,
        mn: rule.mn,
      };
    });
}

const CL: Record<Category, string> = {
  p: "Prime",
  g: "Government",
  t: "Treasury",
  nm: "Natl Muni",
  nj: "NJ Muni",
  ny: "NY Muni",
  ca: "CA Muni",
  ma: "MA Muni",
};

const isMuni = (c: Category) => ["nm", "nj", "ny", "ca", "ma"].includes(c);

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

const allCats: CategoryFilter[] = ["all", "p", "g", "t", "nm", "nj", "ny", "ca", "ma"];
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
  p: "fill-cat-p-fill",
  g: "fill-cat-g-fill",
  t: "fill-cat-t-fill",
  nm: "fill-cat-nm-fill",
  nj: "fill-cat-nj-fill",
  ny: "fill-cat-ny-fill",
  ca: "fill-cat-ca-fill",
  ma: "fill-cat-ma-fill",
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

function barPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round((value / 3.7) * 1000) / 10));
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
  const [fi, setFi] = useState(1);
  const [ni, setNi] = useState(1);
  const [fc, setFc] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;
  const rateDate = rateSheet.requestedPriceDate ?? "latest scrape";
  const fr = fedB[fi].r;
  const nr = njB[ni].r;

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

  const top = res[0];
  const show = showAll ? res : res.slice(0, 15);

  const summary = useMemo(() => {
    return fedB.map((fb) => ({
      fb,
      cols: njB.map((nb) => {
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
    <div className="min-h-screen bg-page text-text font-body tabular-nums">
      <div className="mx-auto max-w-[920px] px-[14px] py-[14px]">
        <header className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="mb-[3px] font-display text-[18px] font-bold leading-[1.18] tracking-normal">
              All {F.length} Fidelity Money Market Funds — After-Tax Yield
            </h2>
            <p className="m-0 text-[11px] leading-[1.45] text-muted">
              7-day yields as of {rateDate}, from the scraped Fidelity all-class money market
              sheet. Single filer brackets (2025 tax year). For NJ residents.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1 shadow-sm">
            <span className="px-1 text-[11px] font-bold text-subtle">Theme</span>
            <div className="inline-flex gap-1">
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
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

        <div className="mb-3 flex flex-wrap gap-5">
          <div className="min-w-[280px] flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-text">Federal Bracket</span>
              <span className="font-body text-[13px] font-bold text-federal">
                {fedB[fi].l}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
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

          <div className="min-w-[280px] flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-text">NJ State Bracket</span>
              <span className="font-body text-[13px] font-bold text-state">
                {njB[ni].l}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={ni}
              onInput={(e) => setNi(rangeValue(e))}
              className="w-full accent-state"
            />
            <div className="flex justify-between text-[9px] text-subtle">
              {njB.map((b) => (
                <span key={b.r}>{b.r}%</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1">
          {allCats.map((c) => {
            const active = fc === c;
            const tone = c === "all" ? "" : categoryButtonVariants[c];
            return (
              <button
                key={c}
                type="button"
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

        <div className="space-y-[3px]">
          {show.map((r, i) => {
            const best = i === 0;
            const w = barPercent(r.a);
            const toneFill = categoryFillClasses[r.c];
            return (
              <div
                key={r.t}
                className="grid grid-cols-[52px_minmax(0,1fr)_62px_42px] items-center gap-x-1"
              >
                <div className="w-[52px] flex-shrink-0 text-[11px] font-semibold text-text">
                  {r.t}
                </div>
                <div className="relative h-5 overflow-hidden rounded-md border border-track-border bg-track">
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="0"
                      y="0"
                      width={w}
                      height="20"
                      rx="6"
                      className={best ? "fill-best-bar" : toneFill}
                    />
                  </svg>
                  <span
                    className={cx(
                      "absolute right-[5px] top-[2px] text-[11px]",
                      best ? "font-bold text-success-text" : "font-medium text-text",
                    )}
                  >
                    {r.a.toFixed(3)}%
                  </span>
                </div>
                <div className="w-[62px] flex-shrink-0 pl-1 text-right text-[9px] text-muted">
                  {CL[r.c]}
                </div>
                <div className="w-[42px] flex-shrink-0 pl-1 text-right text-[9px] text-subtle">
                  {r.mn}
                </div>
              </div>
            );
          })}
        </div>

        {!showAll && res.length > 15 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={cx(buttonBase, neutralButtonClasses, "mt-[6px] px-3")}
          >
            Show all {res.length} funds ▾
          </button>
        )}

        {showAll && res.length > 15 && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={cx(buttonBase, neutralButtonClasses, "mt-[6px] px-3")}
          >
            Show top 15 ▴
          </button>
        )}

        {top && (
          <div className="my-2.5 rounded-md border border-success-border bg-success-bg p-3 text-success-text shadow-sm">
            <strong className="text-[14px]">Best: {top.t}</strong> — {top.n} ({CL[top.c]})
            <br />
            <span className="text-[12px]">
              After-tax yield: <strong>{top.a.toFixed(3)}%</strong> · Gross:{" "}
              {top.y.toFixed(2)}% · ER: {top.er}% · Min: {top.mn}
              <br />
              On $10M ≈{" "}
              <strong>${((top.a / 100) * 1e7).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</strong>
            </span>
          </div>
        )}

        <h3 className="mb-1 mt-4 font-display text-[14px] font-bold leading-tight tracking-normal">
          Winner at Every Bracket Combination
        </h3>

        <div className="overflow-x-auto rounded-md border border-table-cell-border">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border-b-2 border-table-header-border bg-table-header-bg px-[3px] py-[5px] text-left text-[9px] text-muted">
                  Fed↓ \ NJ→
                </th>
                {njB.map((b) => (
                  <th
                    key={b.r}
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
                  <td className="border-b border-table-cell-border px-[3px] py-1 text-[10px] font-semibold text-text">
                    {row.fb.r}%
                  </td>
                  {row.cols.map((w, ci) => {
                    const act = row.fb.r === fr && njB[ci].r === nr;
                    const tone = categoryCellClasses[w.c];
                    return (
                      <td
                        key={ci}
                        data-active={act}
                        className={cx(
                          "border px-[2px] py-1 text-center",
                          act
                            ? "border-selection-border bg-selection-bg"
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
