import { useEffect, useMemo, useState } from "preact/hooks";
import allClassRates from "./data/fidelity-mm-allclass.json";
import {
  applyThemeToDocument,
  THEMES,
  THEME_STORAGE_KEY,
  type Category,
  type ResolvedTheme,
  type ThemeMode,
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

function readStoredThemeMode(): ThemeMode {
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

function buttonStyle(theme: (typeof THEMES)["light"], active: boolean) {
  return {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${active ? theme.borderStrong : theme.neutralButtonBorder}`,
    background: active ? theme.neutralButtonActiveBg : theme.neutralButtonBg,
    color: active ? theme.neutralButtonActiveText : theme.neutralButtonText,
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    lineHeight: 1,
  } as const;
}

export default function App(props: { initialThemeMode: ThemeMode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(props.initialThemeMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => resolveThemeMode("system"));
  const [fi, setFi] = useState(1);
  const [ni, setNi] = useState(1);
  const [fc, setFc] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;
  const theme = THEMES[resolvedTheme];
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

  const shellStyle = {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${theme.pageBg} 0%, ${theme.pageBgAlt} 100%)`,
    color: theme.text,
    fontFamily: "system-ui,sans-serif",
  } as const;

  const containerStyle = {
    maxWidth: 920,
    margin: "0 auto",
    padding: 14,
  } as const;

  const sectionLabelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: theme.text,
  } as const;

  const sliderMetaStyle = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 9,
    color: theme.subtle,
  } as const;

  const filterCount = (category: CategoryFilter) =>
    category === "all" ? "" : `(${F.filter((f) => f.c === category).length})`;

  return (
    <div style={shellStyle}>
      <div style={containerStyle}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
            marginBottom: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: "0 0 3px", fontSize: 18, lineHeight: 1.25 }}>
              All {F.length} Fidelity Money Market Funds — After-Tax Yield
            </h2>
            <p style={{ color: theme.muted, fontSize: 11, margin: 0, lineHeight: 1.45 }}>
              7-day yields as of {rateDate}, from the scraped Fidelity all-class money market
              sheet. Single filer brackets (2025 tax year). For NJ residents.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.surface,
              boxShadow: theme.cardShadow,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.subtle }}>Theme</span>
            <div style={{ display: "inline-flex", gap: 4 }}>
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={themeMode === mode}
                  onClick={() => setThemeMode(mode)}
                  style={buttonStyle(theme, themeMode === mode)}
                >
                  {mode === "system" ? "System" : mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={sectionLabelStyle}>Federal Bracket</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.accentFederal }}>
                {fedB[fi].l}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={fi}
              onInput={(e) => setFi(rangeValue(e))}
              style={{ width: "100%", accentColor: theme.accentFederal }}
            />
            <div style={sliderMetaStyle}>
              {fedB.map((b) => (
                <span key={b.r}>{b.r}%</span>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={sectionLabelStyle}>NJ State Bracket</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.accentState }}>
                {njB[ni].l}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={ni}
              onInput={(e) => setNi(rangeValue(e))}
              style={{ width: "100%", accentColor: theme.accentState }}
            />
            <div style={sliderMetaStyle}>
              {njB.map((b) => (
                <span key={b.r}>{b.r}%</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
          {allCats.map((c) => {
            const active = fc === c;
            const tone = c === "all" ? null : theme.category[c];
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setFc(c)}
                style={{
                  ...buttonStyle(theme, active),
                  background:
                    active && c !== "all"
                      ? tone?.fill
                      : active
                        ? theme.neutralButtonActiveBg
                        : theme.neutralButtonBg,
                  color:
                    active && c !== "all"
                      ? tone?.text
                      : active
                        ? theme.neutralButtonActiveText
                        : theme.neutralButtonText,
                  borderColor:
                    active && c !== "all"
                      ? tone?.border
                      : active
                        ? theme.borderStrong
                        : theme.neutralButtonBorder,
                }}
              >
                {c === "all" ? "All" : CL[c]} {filterCount(c)}
              </button>
            );
          })}
        </div>

        {show.map((r, i) => {
          const best = i === 0;
          const w = Math.max(0, (r.a / 3.7) * 100);
          const tone = theme.category[r.c];
          return (
            <div key={r.t} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
              <div style={{ width: 52, fontSize: 11, fontWeight: 600, flexShrink: 0, color: theme.text }}>
                {r.t}
              </div>
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  height: 20,
                  background: theme.chartTrack,
                  border: `1px solid ${theme.chartTrackBorder}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${w}%`,
                    height: "100%",
                    borderRadius: 6,
                    background: best
                      ? `linear-gradient(90deg, ${theme.bestBarStart}, ${theme.bestBarEnd})`
                      : tone.fill,
                    transition: "width .25s ease",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 5,
                    top: 2,
                    fontSize: 11,
                    fontWeight: best ? 700 : 500,
                    color: best ? theme.successText : theme.text,
                  }}
                >
                  {r.a.toFixed(3)}%{best ? " 🏆" : ""}
                </span>
              </div>
              <div
                style={{
                  width: 62,
                  fontSize: 9,
                  color: theme.muted,
                  textAlign: "right",
                  flexShrink: 0,
                  paddingLeft: 4,
                }}
              >
                {CL[r.c]}
              </div>
              <div
                style={{
                  width: 42,
                  fontSize: 9,
                  color: theme.subtle,
                  textAlign: "right",
                  flexShrink: 0,
                  paddingLeft: 4,
                }}
              >
                {r.mn}
              </div>
            </div>
          );
        })}

        {!showAll && res.length > 15 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            style={{
              ...buttonStyle(theme, false),
              margin: "6px 0",
              padding: "5px 12px",
            }}
          >
            Show all {res.length} funds ▾
          </button>
        )}

        {showAll && res.length > 15 && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            style={{
              ...buttonStyle(theme, false),
              margin: "6px 0",
              padding: "5px 12px",
            }}
          >
            Show top 15 ▴
          </button>
        )}

        {top && (
          <div
            style={{
              padding: 12,
              background: theme.successBg,
              borderRadius: 8,
              border: `1px solid ${theme.successBorder}`,
              margin: "10px 0",
              boxShadow: theme.cardShadow,
              color: theme.successText,
            }}
          >
            <strong style={{ fontSize: 14 }}>Best: {top.t}</strong> — {top.n} ({CL[top.c]})
            <br />
            <span style={{ fontSize: 12 }}>
              After-tax yield: <strong>{top.a.toFixed(3)}%</strong> · Gross:{" "}
              {top.y.toFixed(2)}% · ER: {top.er}% · Min: {top.mn}
              <br />
              On $10M ≈{" "}
              <strong>${((top.a / 100) * 1e7).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</strong>
            </span>
          </div>
        )}

        <h3 style={{ margin: "16px 0 4px", fontSize: 14 }}>Winner at Every Bracket Combination</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 10, width: "100%" }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "5px 3px",
                    borderBottom: `2px solid ${theme.tableHeaderBorder}`,
                    textAlign: "left",
                    fontSize: 9,
                    color: theme.muted,
                    background: theme.tableHeaderBg,
                  }}
                >
                  Fed↓ \ NJ→
                </th>
                {njB.map((b) => (
                  <th
                    key={b.r}
                    style={{
                      padding: "5px 2px",
                      borderBottom: `2px solid ${theme.tableHeaderBorder}`,
                      textAlign: "center",
                      fontSize: 9,
                      color: theme.muted,
                      background: theme.tableHeaderBg,
                    }}
                  >
                    {b.r}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.fb.r}>
                  <td
                    style={{
                      padding: "4px 3px",
                      borderBottom: `1px solid ${theme.tableCellBorder}`,
                      fontWeight: 600,
                      fontSize: 10,
                      color: theme.text,
                    }}
                  >
                    {row.fb.r}%
                  </td>
                  {row.cols.map((w, ci) => {
                    const act = row.fb.r === fr && njB[ci].r === nr;
                    const tone = theme.category[w.c];
                    return (
                      <td
                        key={ci}
                        style={{
                          padding: "4px 2px",
                          textAlign: "center",
                          background: act ? theme.selectionBg : tone.soft,
                          border: act
                            ? `2px solid ${theme.selectionBorder}`
                            : `1px solid ${theme.tableCellBorder}`,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 10, color: act ? theme.selectionText : tone.text }}>
                          {w.t}
                        </div>
                        <div style={{ fontSize: 9, color: act ? theme.selectionText : theme.muted }}>
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

        <div style={{ marginTop: 10, fontSize: 9, color: theme.subtle, lineHeight: 1.5 }}>
          <strong style={{ color: theme.text }}>Legend:</strong>{" "}
          {(Object.entries(CL) as [Category, string][]).map(([k, v]) => (
            <span
              key={k}
              style={{
                background: theme.category[k].soft,
                color: theme.category[k].text,
                border: `1px solid ${theme.category[k].border}`,
                padding: "1px 5px",
                borderRadius: 4,
                marginRight: 3,
                display: "inline-block",
              }}
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
