import { useEffect, useMemo, useState } from "react";

type Category = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";
type CategoryFilter = Category | "all";
type FundType = "Prime" | "Government" | "Treasury" | "Municipal";
type InvestorType = "Retail" | "Institutional" | "Unknown";
type Theme = "light" | "dark";

type Bracket = {
  r: number;
  l: string;
};

type Fund = {
  t: string;
  n: string;
  y: number;
  er: number | null;
  c: Category;
  fundType: FundType;
  investorType: InvestorType;
  se: number;
  mn: string;
  reportDate: string | null;
};

type FundResult = Fund & {
  a: number;
};

const fedB: Bracket[] = [
  { r: 10, l: "10% · $0–$12.4K" },
  { r: 12, l: "12% · $12.4K–$50.4K" },
  { r: 22, l: "22% · $50.4K–$105.7K" },
  { r: 24, l: "24% · $105.7K–$201.8K" },
  { r: 32, l: "32% · $201.8K–$256.2K" },
  { r: 35, l: "35% · $256.2K–$640.6K" },
  { r: 37, l: "37% · $640.6K+" },
];
const njB: Bracket[] = [
  { r: 1.4, l: "1.40% · $0–$20K" },
  { r: 1.75, l: "1.75% · $20K–$35K" },
  { r: 3.5, l: "3.50% · $35K–$40K" },
  { r: 5.525, l: "5.525% · $40K–$75K" },
  { r: 6.37, l: "6.37% · $75K–$500K" },
  { r: 8.97, l: "8.97% · $500K–$1M" },
  { r: 10.75, l: "10.75% · $1M+" },
];

type RemoteFund = {
  ticker: string;
  name: string;
  yield: number | null;
  category: string | null;
  investorType: string | null;
  minimumInitialInvestment: number | null;
  expenseRatio: number | null;
  reportDate: string | null;
  lastDate: string | null;
  usTreasuryDebt: number | null;
  otherMunicipalSecurity: number | null;
};

const DATA_URL = "https://moneymarket.fun/data/fundYields.json";

const CL: Record<Category, string> = { p:"Prime", g:"Government", t:"Treasury", nm:"Natl Muni", nj:"NJ Muni", ny:"NY Muni", ca:"CA Muni", ma:"MA Muni" };
const CC: Record<Category, string> = { p:"#ef9a9a", g:"#ce93d8", t:"#fff59d", nm:"#a5d6a7", nj:"#90caf9", ny:"#80cbc4", ca:"#ffcc80", ma:"#bcaaa4" };
const LCD: Record<Category, string> = { p:"#5b1616", g:"#401050", t:"#3f3400", nm:"#153d1d", nj:"#0b3553", ny:"#063b38", ca:"#4f2700", ma:"#3f2c25" };
const LCL: Record<Category, string> = { p:"#7f1d1d", g:"#6b217d", t:"#5f4b00", nm:"#1f5c2d", nj:"#0f4c75", ny:"#0f5b55", ca:"#7a3f00", ma:"#5d4037" };
const muniCats: Category[] = ["nm","nj","ny","ca","ma"];
const isMuni = (c: Category) => muniCats.includes(c);

function formatMinimum(value: number | null) {
  if (value == null) return "N/A";
  if (value >= 1_000_000) return `$${value / 1_000_000}M`;
  if (value >= 1_000) return `$${value / 1_000}K`;
  return `$${value}`;
}

function categoryForFund(fund: RemoteFund): Category {
  const category = fund.category?.toLowerCase() ?? "";
  const name = fund.name.toLowerCase();

  if (name.includes("new jersey") || /\bnj\b/.test(name)) return "nj";
  if (name.includes("new york") || /\bny\b/.test(name)) return "ny";
  if (name.includes("california") || /\bca\b/.test(name)) return "ca";
  if (name.includes("massachusetts") || /\bma\b/.test(name)) return "ma";
  if (category.includes("municipal") || category.includes("tax") || name.includes("municipal") || name.includes("tax exempt")) return "nm";
  if (name.includes("treasury") || (fund.usTreasuryDebt ?? 0) >= 0.8) return "t";
  if (category.includes("government")) return "g";
  return "p";
}

function stateExemptPercent(category: Category, fund: RemoteFund) {
  if (category === "nj") return 100;
  if (isMuni(category)) return 0;
  return Math.round((fund.usTreasuryDebt ?? 0) * 100);
}

function fundTypeForFund(category: Category): FundType {
  if (category === "t") return "Treasury";
  if (isMuni(category)) return "Municipal";
  if (category === "g") return "Government";
  return "Prime";
}

function investorTypeForFund(fund: RemoteFund): InvestorType {
  if (fund.investorType === "Retail" || fund.investorType === "Institutional") {
    return fund.investorType;
  }
  return "Unknown";
}

function normalizeFund(fund: RemoteFund): Fund | null {
  const name = fund.name.toLowerCase();
  if (!name.includes("fidelity") && !name.includes("fimm")) return null;
  if (!fund.ticker || !fund.name || fund.yield == null) return null;

  const category = categoryForFund(fund);
  return {
    t: fund.ticker,
    n: fund.name,
    y: fund.yield,
    er: fund.expenseRatio,
    c: category,
    fundType: fundTypeForFund(category),
    investorType: investorTypeForFund(fund),
    se: stateExemptPercent(category, fund),
    mn: formatMinimum(fund.minimumInitialInvestment),
    reportDate: fund.lastDate ?? fund.reportDate,
  };
}

function at(f: Fund, fr: number, nr: number) {
  if (isMuni(f.c) && f.se >= 100) return f.y;
  if (isMuni(f.c)) return f.y - f.y * (1 - f.se/100) * (nr/100);
  return f.y - f.y*(fr/100) - f.y*(1-f.se/100)*(nr/100);
}

const allCats: CategoryFilter[] = ["all","p","g","t","nm","nj","ny","ca","ma"];
const THEME_KEY = "fidelity-mm-theme";

export default function App() {
  const [fi, setFi] = useState(1);
  const [ni, setNi] = useState(1);
  const [fc, setFc] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const dark = theme === "dark";
  const ui = {
    page: dark ? "#0c1116" : "#ffffff",
    text: dark ? "#e6edf3" : "#1f2933",
    muted: dark ? "#94a3b8" : "#666",
    faint: dark ? "#64748b" : "#aaa",
    track: dark ? "#182230" : "#f0f0f0",
    panel: dark ? "#121a24" : "#f5f5f5",
    panelBorder: dark ? "#263244" : "#e0e0e0",
    button: dark ? "#172033" : "#f5f5f5",
    buttonText: dark ? "#dbeafe" : "#333",
    buttonBorder: dark ? "#334155" : "#ccc",
    toggleBg: dark ? "#f8fafc" : "#111827",
    toggleText: dark ? "#111827" : "#ffffff",
    winnerBg: dark ? "#10251a" : "#e8f5e9",
    winnerBorder: dark ? "#256d42" : "#a5d6a7",
    winnerText: dark ? "#9ae6b4" : "#1b5e20",
    activeCell: dark ? "#3a3008" : "#fff9c4",
    activeCellBorder: dark ? "#facc15" : "#f57f17",
    errorBg: dark ? "#351216" : "#ffebee",
    errorBorder: dark ? "#7f1d1d" : "#ef9a9a",
  };

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.style.background = ui.page;
    document.documentElement.style.colorScheme = theme;
    document.body.style.background = ui.page;
    document.body.style.color = ui.text;
  }, [theme, ui.page, ui.text]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFunds() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(DATA_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as RemoteFund[];
        const nextFunds = data
          .map(normalizeFund)
          .filter((fund): fund is Fund => fund !== null);

        if (nextFunds.length === 0) throw new Error("No Fidelity funds found in remote data");
        setFunds(nextFunds);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load fund data");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadFunds();
    return () => controller.abort();
  }, []);

  const fr = fedB[fi].r, nr = njB[ni].r;

  const res = useMemo(() => {
    let l = funds.map(f => ({ ...f, a: at(f, fr, nr) }));
    if (fc !== "all") l = l.filter(f => f.c === fc);
    return l.sort((a, b) => b.a - a.a);
  }, [funds, fi, ni, fc]);

  const top = res[0];
  const show = showAll ? res : res.slice(0, 15);

  // Summary: best at each bracket combo
  const summary = useMemo(() => {
    if (funds.length === 0) return [];
    return fedB.map(fb => ({
      fb,
      cols: njB.map(nb => {
        const best = funds.map(f => ({ t: f.t, a: at(f, fb.r, nb.r), c: f.c })).sort((a,b) => b.a - a.a)[0];
        return best;
      })
    }));
  }, [funds]);

  const reportDate = funds.find(f => f.reportDate)?.reportDate;

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", maxWidth:920, margin:"0 auto", padding:12, minHeight:"100vh", background:ui.page, color:ui.text, transition:"background .2s, color .2s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:14 }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:18 }}>All {funds.length} Fidelity Money Market Funds — After-Tax Yield</h2>
          <p style={{ color:ui.muted, fontSize:11, margin:0 }}>
            7-day yields from moneymarket.fun{reportDate ? ` as of ${reportDate}` : ""}. Single filer brackets (2026 tax year). For NJ residents.
          </p>
        </div>
        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-pressed={dark}
          style={{
            flexShrink:0, border:"none", borderRadius:999, padding:"6px 10px", cursor:"pointer",
            background:ui.toggleBg, color:ui.toggleText, fontSize:11, fontWeight:700, boxShadow:dark?"0 0 0 1px #334155":"0 1px 4px #0002"
          }}
        >
          {dark ? "☀ Light" : "☾ Dark"}
        </button>
      </div>

      {loading && (
        <div style={{ padding:12, background:ui.panel, borderRadius:8, marginBottom:12 }}>
          Loading fund data…
        </div>
      )}

      {error && (
        <div style={{ padding:12, background:ui.errorBg, border:`1px solid ${ui.errorBorder}`, borderRadius:8, marginBottom:12 }}>
          Failed to load fund data from {DATA_URL}: {error}
        </div>
      )}

      {/* Sliders */}
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:12 }}>
        <div style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Federal Bracket</span>
            <span style={{ fontSize:13, fontWeight:700, color:dark?"#93c5fd":"#1565c0" }}>{fedB[fi].l}</span>
          </div>
          <input type="range" min={0} max={6} value={fi} onChange={e=>setFi(+e.target.value)} style={{ width:"100%" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:ui.faint }}>
            {fedB.map(b=><span key={b.r}>{b.r}%</span>)}
          </div>
        </div>
        <div style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:600 }}>NJ State Bracket</span>
            <span style={{ fontSize:13, fontWeight:700, color:dark?"#86efac":"#2e7d32" }}>{njB[ni].l}</span>
          </div>
          <input type="range" min={0} max={6} value={ni} onChange={e=>setNi(+e.target.value)} style={{ width:"100%" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:ui.faint }}>
            {njB.map(b=><span key={b.r}>{b.r}%</span>)}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 }}>
        {allCats.map(c=>(
          <button key={c} onClick={()=>setFc(c)} style={{
            padding:"3px 8px", fontSize:11, border:`1px solid ${ui.buttonBorder}`, borderRadius:12, cursor:"pointer",
            background: fc===c ? (c==="all" ? (dark ? "#e5e7eb" : "#333") : CC[c]) : ui.button,
            color: fc===c && c==="all" ? (dark ? "#111827" : "#fff") : ui.buttonText, fontWeight: fc===c?700:400
          }}>
            {c==="all"?"All":CL[c]} {c!=="all"&&`(${funds.filter(f=>f.c===c).length})`}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      {show.map((r,i)=>{
        const best = i===0;
        const w = Math.max(0,(r.a/3.7)*100);
        return (
          <div key={r.t} style={{ display:"flex", alignItems:"center", marginBottom:2 }}>
            <div style={{ width:52, fontSize:11, fontWeight:600, flexShrink:0 }}>{r.t}</div>
            <div style={{ flex:1, position:"relative", height:20, background:ui.track, borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:`${w}%`, height:"100%", borderRadius:3,
                background: best?"linear-gradient(90deg,#43a047,#66bb6a)":CC[r.c], transition:"width .3s" }}/>
              <span style={{ position:"absolute", right:4, top:2, fontSize:11, fontWeight:best?700:500,
                color:best ? ui.winnerText : ui.text }}>
                {r.a.toFixed(3)}%{best?" 🏆":""}
              </span>
            </div>
            <div style={{ width:92, fontSize:9, color:ui.muted, textAlign:"right", flexShrink:0, paddingLeft:4 }}>{r.fundType} · {r.investorType}</div>
            <div style={{ width:42, fontSize:9, color:ui.faint, textAlign:"right", flexShrink:0, paddingLeft:4 }}>{r.mn}</div>
          </div>
        );
      })}
      {!showAll && res.length>15 && (
        <button onClick={()=>setShowAll(true)} style={{ margin:"6px 0", padding:"4px 12px", fontSize:11, cursor:"pointer",
          border:`1px solid ${ui.buttonBorder}`, borderRadius:4, background:ui.page, color:ui.text }}>
          Show all {res.length} funds ▾
        </button>
      )}
      {showAll && res.length>15 && (
        <button onClick={()=>setShowAll(false)} style={{ margin:"6px 0", padding:"4px 12px", fontSize:11, cursor:"pointer",
          border:`1px solid ${ui.buttonBorder}`, borderRadius:4, background:ui.page, color:ui.text }}>
          Show top 15 ▴
        </button>
      )}

      {/* Winner box */}
      {top && (
        <div style={{ padding:12, background:ui.winnerBg, borderRadius:8, border:`1px solid ${ui.winnerBorder}`, margin:"10px 0" }}>
          <strong style={{ fontSize:14 }}>Best: {top.t}</strong> — {top.n} ({top.fundType} · {top.investorType})
          <br/>
          <span style={{ fontSize:12, color:ui.text }}>
            After-tax yield: <strong>{top.a.toFixed(3)}%</strong> · Gross: {top.y.toFixed(2)}% · ER: {top.er == null ? "N/A" : `${top.er}%`} · Min: {top.mn}
            <br/>On $10M ≈ <strong>${((top.a/100)*1e7).toLocaleString(undefined,{maximumFractionDigits:0})}/yr</strong>
          </span>
        </div>
      )}

      {/* Matrix */}
      <h3 style={{ margin:"16px 0 4px", fontSize:14 }}>Winner at Every Bracket Combination</h3>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", fontSize:10, width:"100%" }}>
          <thead>
            <tr>
                <th style={{ padding:"5px 3px", borderBottom:`2px solid ${ui.text}`, textAlign:"left", fontSize:9 }}>Fed↓ \ NJ→</th>
              {njB.map(b=><th key={b.r} style={{ padding:"5px 2px", borderBottom:`2px solid ${ui.text}`, textAlign:"center", fontSize:9 }}>{b.r}%</th>)}
            </tr>
          </thead>
          <tbody>
            {summary.map(row=>(
              <tr key={row.fb.r}>
                <td style={{ padding:"4px 3px", borderBottom:`1px solid ${ui.panelBorder}`, fontWeight:600, fontSize:10 }}>{row.fb.r}%</td>
                {row.cols.map((w,ci)=>{
                  const act = row.fb.r===fr && njB[ci].r===nr;
                  return (
                    <td key={ci} style={{ padding:"4px 2px", textAlign:"center",
                      background: act ? ui.activeCell : CC[w.c]+"44",
                      border: act ? `2px solid ${ui.activeCellBorder}` : `1px solid ${ui.panelBorder}` }}>
                      <div style={{ fontWeight:600, fontSize:10 }}>{w.t}</div>
                      <div style={{ fontSize:9, color:ui.muted }}>{w.a.toFixed(2)}%</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:10, fontSize:10, color:ui.muted, lineHeight:1.7 }}>
        <strong>Legend:</strong>{" "}
        {(Object.entries(CL) as [Category, string][]).map(([k,v])=>(
          <span key={k} style={{
            display:"inline-block",
            background:dark ? LCD[k] : CC[k],
            color:dark ? "#f8fafc" : LCL[k],
            border:`1px solid ${dark ? CC[k] : LCL[k]}`,
            padding:"2px 6px",
            borderRadius:999,
            marginRight:4,
            marginBottom:4,
            fontWeight:700,
          }}>{v}</span>
        ))}
        <br/><span style={{ color:dark ? "#cbd5e1" : "#555" }}>Yellow border = current selection. State exemption %s approximate & vary yearly. Yields net of ER. Not financial advice.</span>
      </div>
    </div>
  );
}
