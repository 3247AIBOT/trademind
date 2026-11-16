// Daily scanner — STRICT mode. Writes report.json (strong picks only), data/*.json chart snapshots,
// and picks.md (only when there are picks; the workflow turns it into a GitHub Issue = email alert).
import fs from 'fs';
const src=fs.readFileSync(new URL('./engine.js',import.meta.url),'utf8');
const {computeAll,strongSignal}=new Function(src+';return{computeAll,strongSignal}')();
const MAX_BUY=5; // never recommend more than this many new buys in a day
const toYahoo=s=>s.toLowerCase().startsWith('us:')?s.slice(3):s.includes('.')?s:s+'.NS';
const key=s=>s.replace(/^us:/i,'').toUpperCase().replace(/\.NS$/,'').replace(/[^A-Z0-9_-]/g,'_');
const syms=fs.readFileSync('symbols.txt','utf8').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
async function candles(ys){
  const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ys)}?range=2y&interval=1d`,{headers:{'User-Agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const res=(await r.json()).chart?.result?.[0];if(!res)throw new Error('no data');
  const q=res.indicators.quote[0],out=[];
  res.timestamp.forEach((t,i)=>{const o=q.open[i],h=q.high[i],l=q.low[i],c=q.close[i];if([o,h,l,c].every(v=>v!=null))out.push({t:t*1000,o,h,l,c,v:q.volume[i]||0});});
  return out;
}
fs.mkdirSync('data',{recursive:true});
// Market filter: new NSE buys only when Nifty 50 is in an established uptrend
let regime={ok:false,note:'could not verify Nifty trend — no new buys'};
try{const c=computeAll(await candles('^NSEI')).cur;
  regime={ok:c.close>c.e50&&c.e50>c.e200,note:`Nifty ${c.close.toFixed(0)} · EMA50 ${c.e50.toFixed(0)} · EMA200 ${c.e200.toFixed(0)}`};}catch(e){}
const buys=[],exits=[],failed=[];let scanned=0;
for(const s of syms){
  try{
    const D=await candles(toYahoo(s));
    if(D.length<240)throw new Error('only '+D.length+' candles');
    fs.writeFileSync('data/'+key(s)+'.json',JSON.stringify(D.slice(-320).map(d=>[d.t,+d.o.toFixed(2),+d.h.toFixed(2),+d.l.toFixed(2),+d.c.toFixed(2),d.v])));
    scanned++;
    const a=strongSignal(D),b=strongSignal(D.slice(0,-1)); // must also have qualified at yesterday's close
    if(a&&b&&a.action===b.action&&!(a.action==='BUY'&&toYahoo(s).endsWith('.NS')&&!regime.ok)){
      const row={sym:s.replace(/^us:/i,''),...a,price:+a.entry.toFixed(2),chg:+((D.at(-1).c/D.at(-2).c-1)*100).toFixed(2),asof:new Date(D.at(-1).t).toISOString().slice(0,10),why:a.reasons};
      (a.action==='BUY'?buys:exits).push(row);
    }
  }catch(e){failed.push(`${s}: ${e.message}`);}
  await new Promise(r=>setTimeout(r,300));
}
buys.sort((x,y)=>y.net-x.net);
const picks=[...buys.slice(0,MAX_BUY),...exits];
fs.writeFileSync('report.json',JSON.stringify({generated:new Date().toISOString(),asof:picks[0]?.asof||new Date().toISOString().slice(0,10),universe:syms.length,scanned,regime,picks,failed}));
if(picks.length){
  fs.writeFileSync('picks.md',`**Market filter:** ${regime.ok?'supportive':'NOT supportive (no new buys)'} — ${regime.note}\n\n`+picks.map(p=>p.action==='BUY'
    ?`- **BUY ${p.sym}** @ ₹${p.price} (do not chase above ₹${p.maxEntry}) · Stop ₹${p.sl} · Target ₹${p.tp} · risk ${p.riskPct}%\n  - ${p.why.slice(0,6).join('; ')}`
    :`- **EXIT / AVOID ${p.sym}** @ ₹${p.price} (if you hold it) — ${p.why.slice(0,4).join('; ')}`).join('\n')+'\n\nRisk at most 1% of capital per trade: shares = 1% of capital ÷ (entry − stop). Educational only, not financial advice.');
}else fs.rmSync('picks.md',{force:true});
console.log({regime,picks:picks.map(p=>p.action+' '+p.sym),failed});
