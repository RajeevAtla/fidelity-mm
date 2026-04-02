import { useState, useMemo } from "react";

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

// cat: p=prime, g=govt, t=treasury, nm=natl muni, nj=NJ muni, ny=NY muni, ca=CA muni, ma=MA muni
// se: state exempt % for NJ resident. fedEx: true=fed tax exempt
const F = [
  // PRIME
  { t:"FNSXX", n:"FIMM Money Market Portfolio - Instl Class", y:3.65, er:0.14, c:"p", se:4, mn:"$10M" },
  { t:"FMPXX", n:"FIMM Money Market Portfolio - Class I", y:3.58, er:0.18, c:"p", se:4, mn:"$10M" },
  { t:"FCIXX", n:"FIMM Money Market Portfolio - Class II", y:3.47, er:0.28, c:"p", se:4, mn:"$1M" },
  { t:"FZDXX", n:"Money Market Fund Premium Class", y:3.46, er:0.36, c:"p", se:4, mn:"$100K" },
  { t:"SPRXX", n:"Money Market Fund", y:3.34, er:0.42, c:"p", se:4, mn:"$0" },
  // GOVERNMENT
  { t:"FRGXX", n:"FIMM Gov't Portfolio - Instl Class", y:3.57, er:0.10, c:"g", se:55, mn:"$10M" },
  { t:"FIGXX", n:"FIMM Gov't Portfolio - Class I", y:3.53, er:0.18, c:"g", se:55, mn:"$10M" },
  { t:"FCVXX", n:"FIMM Gov't Portfolio - Class II", y:3.37, er:0.34, c:"g", se:55, mn:"$1M" },
  { t:"FCGXX", n:"FIMM Gov't Portfolio - Class III", y:3.27, er:0.44, c:"g", se:55, mn:"$0" },
  { t:"FZCXX", n:"Gov't MM Fund Premium Class", y:3.38, er:0.32, c:"g", se:55, mn:"$100K" },
  { t:"SPAXX", n:"Gov't Money Market Fund", y:3.29, er:0.42, c:"g", se:55, mn:"$0" },
  { t:"FDRXX", n:"Gov't Cash Reserves", y:3.37, er:0.34, c:"g", se:57, mn:"$0" },
  { t:"FZBXX", n:"Gov't MM Daily Money Class", y:3.00, er:0.52, c:"g", se:55, mn:"$0" },
  { t:"FZAXX", n:"Gov't MM Capital Reserves Class", y:2.75, er:0.77, c:"g", se:55, mn:"$0" },
  // TREASURY
  { t:"FRBXX", n:"FIMM Treasury Portfolio - Instl Class", y:3.59, er:0.10, c:"t", se:51, mn:"$10M" },
  { t:"FRSXX", n:"FIMM Treasury Only Portfolio - Instl Class", y:3.57, er:0.10, c:"t", se:97, mn:"$10M" },
  { t:"FSIXX", n:"FIMM Treasury Only Portfolio - Class I", y:3.47, er:0.18, c:"t", se:97, mn:"$1M" },
  { t:"FCEXX", n:"FIMM Treasury Portfolio - Class II", y:3.40, er:0.25, c:"t", se:51, mn:"$1M" },
  { t:"FOXXX", n:"FIMM Treasury Only Portfolio - Class II", y:3.38, er:0.25, c:"t", se:97, mn:"$1M" },
  { t:"FOIXX", n:"FIMM Treasury Only Portfolio - Class III", y:3.28, er:0.35, c:"t", se:97, mn:"$0" },
  { t:"FZFXX", n:"Treasury Money Market Fund", y:3.31, er:0.42, c:"t", se:51, mn:"$0" },
  { t:"FDLXX", n:"Treasury Only Money Market Fund", y:3.29, er:0.42, c:"t", se:97, mn:"$0" },
  { t:"FDUXX", n:"Treasury MM Daily Money Class", y:3.03, er:0.52, c:"t", se:51, mn:"$0" },
  { t:"FSRXX", n:"Treasury MM Capital Reserves Class", y:2.78, er:0.77, c:"t", se:51, mn:"$0" },
  { t:"FDCXX", n:"Treasury MM Advisor Class C", y:2.28, er:1.28, c:"t", se:51, mn:"$0" },
  // NATIONAL MUNI
  { t:"FTCXX", n:"FIMM Tax Exempt Portfolio - Class I", y:2.30, er:0.18, c:"nm", se:0, mn:"$10M" },
  { t:"FZEXX", n:"Tax-Exempt MM Premium Class", y:2.19, er:0.26, c:"nm", se:0, mn:"$100K" },
  { t:"FTEXX", n:"Municipal Money Market Fund", y:2.18, er:0.40, c:"nm", se:0, mn:"$0" },
  { t:"FMOXX", n:"Tax-Exempt Money Market Fund", y:2.14, er:0.47, c:"nm", se:0, mn:"$0" },
  { t:"FDEXX", n:"Tax-Exempt MM Daily Money Class", y:1.86, er:0.62, c:"nm", se:0, mn:"$0" },
  { t:"FERXX", n:"Tax-Exempt MM Capital Reserves", y:1.61, er:0.87, c:"nm", se:0, mn:"$0" },
  // NJ MUNI
  { t:"FSKXX", n:"NJ Muni MM - Instl Class", y:2.14, er:0.20, c:"nj", se:100, mn:"$1M" },
  { t:"FSJXX", n:"NJ Muni MM Premium Class", y:2.03, er:0.36, c:"nj", se:100, mn:"$100K" },
  { t:"FAYXX", n:"NJ Muni MM Fund", y:1.85, er:0.48, c:"nj", se:100, mn:"$0" },
  // NY MUNI
  { t:"FNKXX", n:"NY Muni MM - Instl Class", y:2.31, er:0.20, c:"ny", se:0, mn:"$1M" },
  { t:"FSNXX", n:"NY Muni MM Premium Class", y:2.21, er:0.36, c:"ny", se:0, mn:"$100K" },
  { t:"FAWXX", n:"NY Muni MM Fund", y:2.04, er:0.48, c:"ny", se:0, mn:"$0" },
  // MA MUNI
  { t:"FMAXX", n:"MA Muni MM - Instl Class", y:2.18, er:0.20, c:"ma", se:0, mn:"$1M" },
  { t:"FMSXX", n:"MA Muni MM Premium Class", y:2.11, er:0.36, c:"ma", se:0, mn:"$100K" },
  { t:"FAUXX", n:"MA Muni MM Fund", y:1.93, er:0.48, c:"ma", se:0, mn:"$0" },
  // CA MUNI
  { t:"FSBXX", n:"CA Muni MM - Instl Class", y:2.06, er:0.20, c:"ca", se:0, mn:"$1M" },
  { t:"FSPXX", n:"CA Muni MM Premium Class", y:1.99, er:0.36, c:"ca", se:0, mn:"$100K" },
  { t:"FABXX", n:"CA Muni MM Fund", y:1.81, er:0.48, c:"ca", se:0, mn:"$0" },
];

const CL = { p:"Prime", g:"Government", t:"Treasury", nm:"Natl Muni", nj:"NJ Muni", ny:"NY Muni", ca:"CA Muni", ma:"MA Muni" };
const CC = { p:"#ef9a9a", g:"#ce93d8", t:"#fff59d", nm:"#a5d6a7", nj:"#90caf9", ny:"#80cbc4", ca:"#ffcc80", ma:"#bcaaa4" };
const isMuni = c => ["nm","nj","ny","ca","ma"].includes(c);

function at(f, fr, nr) {
  if (isMuni(f.c) && f.se >= 100) return f.y;
  if (isMuni(f.c)) return f.y - f.y * (1 - f.se/100) * (nr/100);
  return f.y - f.y*(fr/100) - f.y*(1-f.se/100)*(nr/100);
}

const allCats = ["all","p","g","t","nm","nj","ny","ca","ma"];

export default function App() {
  const [fi, setFi] = useState(1);
  const [ni, setNi] = useState(1);
  const [fc, setFc] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const fr = fedB[fi].r, nr = njB[ni].r;

  const res = useMemo(() => {
    let l = F.map(f => ({ ...f, a: at(f, fr, nr) }));
    if (fc !== "all") l = l.filter(f => f.c === fc);
    return l.sort((a, b) => b.a - a.a);
  }, [fi, ni, fc]);

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
  }, []);

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", maxWidth:920, margin:"0 auto", padding:12 }}>
      <h2 style={{ margin:"0 0 2px", fontSize:18 }}>All {F.length} Fidelity Money Market Funds — After-Tax Yield</h2>
      <p style={{ color:"#666", fontSize:11, margin:"0 0 14px" }}>
        7-day yields as of 3/30/2026, net of expense ratio. Single filer brackets (2025 tax year). For NJ residents.
      </p>

      {/* Sliders */}
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:12 }}>
        <div style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Federal Bracket</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#1565c0" }}>{fedB[fi].l}</span>
          </div>
          <input type="range" min={0} max={6} value={fi} onChange={e=>setFi(+e.target.value)} style={{ width:"100%" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#aaa" }}>
            {fedB.map(b=><span key={b.r}>{b.r}%</span>)}
          </div>
        </div>
        <div style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:600 }}>NJ State Bracket</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#2e7d32" }}>{njB[ni].l}</span>
          </div>
          <input type="range" min={0} max={6} value={ni} onChange={e=>setNi(+e.target.value)} style={{ width:"100%" }}/>
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
        {Object.entries(CL).map(([k,v])=>(
          <span key={k} style={{ background:CC[k], padding:"1px 5px", borderRadius:3, marginRight:3 }}>{v}</span>
        ))}
        <br/>Yellow border = current selection. State exemption %s approximate & vary yearly. Yields net of ER. Not financial advice.
      </div>
    </div>
  );
}
