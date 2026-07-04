import { useMemo, useState } from "preact/hooks";
import allClassRates from "./data/fidelity-mm-allclass.json";

type Category = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";
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

const CL: Record<Category, string> = { p:"Prime", g:"Government", t:"Treasury", nm:"Natl Muni", nj:"NJ Muni", ny:"NY Muni", ca:"CA Muni", ma:"MA Muni" };
const CC: Record<Category, string> = { p:"#ef9a9a", g:"#ce93d8", t:"#fff59d", nm:"#a5d6a7", nj:"#90caf9", ny:"#80cbc4", ca:"#ffcc80", ma:"#bcaaa4" };
const isMuni = (c: Category) => ["nm","nj","ny","ca","ma"].includes(c);

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
  if (isMuni(f.c)) return f.y - f.y * (1 - f.se/100) * (nr/100);
  return f.y - f.y*(fr/100) - f.y*(1-f.se/100)*(nr/100);
}

const allCats: CategoryFilter[] = ["all","p","g","t","nm","nj","ny","ca","ma"];
const rangeValue = (event: Event) => Number((event.currentTarget as HTMLInputElement).value);

export default function App() {
  const [fi, setFi] = useState(1);
  const [ni, setNi] = useState(1);
  const [fc, setFc] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const rateDate = rateSheet.requestedPriceDate ?? "latest scrape";
  const fr = fedB[fi].r, nr = njB[ni].r;

  const res = useMemo(() => {
    let l: FundResult[] = F.map(f => ({ ...f, a: at(f, fr, nr) }));
    if (fc !== "all") l = l.filter(f => f.c === fc);
    return l.sort((a, b) => b.a - a.a);
  }, [F, fi, ni, fc]);

  const top = res[0];
  const show = showAll ? res : res.slice(0, 15);

  // Summary: best at each bracket combo
  const summary = useMemo(() => {
    return fedB.map(fb => ({
      fb,
      cols: njB.map(nb => {
        const best = F.map(f => ({ t: f.t, a: at(f, fb.r, nb.r), c: f.c })).sort((a,b) => b.a - a.a)[0];
        return best;
      })
    }));
  }, [F]);

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", maxWidth:920, margin:"0 auto", padding:12 }}>
      <h2 style={{ margin:"0 0 2px", fontSize:18 }}>All {F.length} Fidelity Money Market Funds — After-Tax Yield</h2>
      <p style={{ color:"#666", fontSize:11, margin:"0 0 14px" }}>
      7-day yields as of {rateDate}, from the scraped Fidelity all-class money market sheet. Single filer brackets (2025 tax year). For NJ residents.
      </p>

      {/* Sliders */}
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:12 }}>
        <div style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Federal Bracket</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#1565c0" }}>{fedB[fi].l}</span>
          </div>
          <input type="range" min={0} max={6} value={fi} onInput={e=>setFi(rangeValue(e))} style={{ width:"100%" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#aaa" }}>
            {fedB.map(b=><span key={b.r}>{b.r}%</span>)}
          </div>
        </div>
        <div style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:600 }}>NJ State Bracket</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#2e7d32" }}>{njB[ni].l}</span>
          </div>
          <input type="range" min={0} max={6} value={ni} onInput={e=>setNi(rangeValue(e))} style={{ width:"100%" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#aaa" }}>
            {njB.map(b=><span key={b.r}>{b.r}%</span>)}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 }}>
        {allCats.map(c=>(
          <button key={c} onClick={()=>setFc(c)} style={{
            padding:"3px 8px", fontSize:11, border:"1px solid #ccc", borderRadius:12, cursor:"pointer",
            background: fc===c ? (c==="all"?"#333":CC[c]) : "#f5f5f5",
            color: fc===c && c==="all" ? "#fff" : "#333", fontWeight: fc===c?700:400
          }}>
            {c==="all"?"All":CL[c]} {c!=="all"&&`(${F.filter(f=>f.c===c).length})`}
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
            <div style={{ flex:1, position:"relative", height:20, background:"#f0f0f0", borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:`${w}%`, height:"100%", borderRadius:3,
                background: best?"linear-gradient(90deg,#43a047,#66bb6a)":CC[r.c], transition:"width .3s" }}/>
              <span style={{ position:"absolute", right:4, top:2, fontSize:11, fontWeight:best?700:500,
                color:best?"#1b5e20":"#333" }}>
                {r.a.toFixed(3)}%{best?" 🏆":""}
              </span>
            </div>
            <div style={{ width:62, fontSize:9, color:"#888", textAlign:"right", flexShrink:0, paddingLeft:4 }}>{CL[r.c]}</div>
            <div style={{ width:42, fontSize:9, color:"#aaa", textAlign:"right", flexShrink:0, paddingLeft:4 }}>{r.mn}</div>
          </div>
        );
      })}
      {!showAll && res.length>15 && (
        <button onClick={()=>setShowAll(true)} style={{ margin:"6px 0", padding:"4px 12px", fontSize:11, cursor:"pointer",
          border:"1px solid #ccc", borderRadius:4, background:"#fff" }}>
          Show all {res.length} funds ▾
        </button>
      )}
      {showAll && res.length>15 && (
        <button onClick={()=>setShowAll(false)} style={{ margin:"6px 0", padding:"4px 12px", fontSize:11, cursor:"pointer",
          border:"1px solid #ccc", borderRadius:4, background:"#fff" }}>
          Show top 15 ▴
        </button>
      )}

      {/* Winner box */}
      {top && (
        <div style={{ padding:12, background:"#e8f5e9", borderRadius:8, border:"1px solid #a5d6a7", margin:"10px 0" }}>
          <strong style={{ fontSize:14 }}>Best: {top.t}</strong> — {top.n} ({CL[top.c]})
          <br/>
          <span style={{ fontSize:12 }}>
            After-tax yield: <strong>{top.a.toFixed(3)}%</strong> · Gross: {top.y.toFixed(2)}% · ER: {top.er}% · Min: {top.mn}
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
              <th style={{ padding:"5px 3px", borderBottom:"2px solid #333", textAlign:"left", fontSize:9 }}>Fed↓ \ NJ→</th>
              {njB.map(b=><th key={b.r} style={{ padding:"5px 2px", borderBottom:"2px solid #333", textAlign:"center", fontSize:9 }}>{b.r}%</th>)}
            </tr>
          </thead>
          <tbody>
            {summary.map(row=>(
              <tr key={row.fb.r}>
                <td style={{ padding:"4px 3px", borderBottom:"1px solid #e0e0e0", fontWeight:600, fontSize:10 }}>{row.fb.r}%</td>
                {row.cols.map((w,ci)=>{
                  const act = row.fb.r===fr && njB[ci].r===nr;
                  return (
                    <td key={ci} style={{ padding:"4px 2px", textAlign:"center",
                      background: act?"#fff9c4":CC[w.c]+"44",
                      border: act?"2px solid #f57f17":"1px solid #e0e0e0" }}>
                      <div style={{ fontWeight:600, fontSize:10 }}>{w.t}</div>
                      <div style={{ fontSize:9, color:"#555" }}>{w.a.toFixed(2)}%</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:10, fontSize:9, color:"#999", lineHeight:1.5 }}>
        <strong>Legend:</strong>{" "}
        {(Object.entries(CL) as [Category, string][]).map(([k,v])=>(
          <span key={k} style={{ background:CC[k], padding:"1px 5px", borderRadius:3, marginRight:3 }}>{v}</span>
        ))}
        <br/>Yellow border = current selection. State exemption %s approximate & vary yearly. Yields net of ER. Not financial advice.
      </div>
    </div>
  );
}
