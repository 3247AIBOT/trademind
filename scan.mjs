// Daily scanner: runs engine.js over symbols.txt, writes report.json. Run by GitHub Actions after NSE close.
import fs from 'fs';
const src=fs.readFileSync(new URL('./engine.js',import.meta.url),'utf8');
const {computeAll,scoreHC,getSignal}=new Function(src+';return{computeAll,scoreHC,getSignal}')();
const toYahoo=s=>s.toLowerCase().startsWith('us:')?s.slice(3):s.includes('.')?s:s+'.NS';
const syms=fs.readFileSync('symbols.txt','utf8').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
async function candles(ys){
  const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ys)}?range=2y&interval=1d`,{headers:{'User-Agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const res=(await r.json()).chart?.result?.[0];if(!res)throw new Error('no data');
  const q=res.indicators.quote[0],out=[];
  res.timestamp.forEach((t,i)=>{const o=q.open[i],h=q.high[i],l=q.low[i],c=q.close[i];if([o,h,l,c].every(v=>v!=null))out.push({t:t*1000,o,h,l,c,v:q.volume[i]||0});});
  return out;
}
const rows=[],failed=[];
for(const s of syms){
  try{
    const D=await candles(toYahoo(s));
    if(D.length<210)throw new Error('only '+D.length+' candles');
    const I=computeAll(D),S=scoreHC(I),g=getSignal(S),c=I.cur,act=g.type!=='NO_ALERT',dir=g.type==='BUY'?1:-1;
    rows.push({sym:s,price:+c.close.toFixed(2),chg:+((c.close/D.at(-2).c-1)*100).toFixed(2),signal:g.type,grade:g.grade,net:S.net,cats:S.catCount,
      rsi:Math.round(c.rsi),adx:Math.round(c.adx.adx),sl:act?+(c.close-dir*S.atrSL).toFixed(2):null,tp:act?+(c.close+dir*S.atrSL*2).toFixed(2):null,
      asof:new Date(D.at(-1).t).toISOString().slice(0,10),
      why:S.reasons.filter(r=>r.w>0&&r.bias===(S.net>0?'bull':'bear')).slice(0,3).map(r=>r.text)});
  }catch(e){failed.push(`${s}: ${e.message}`);}
  await new Promise(r=>setTimeout(r,300));
}
rows.sort((a,b)=>b.grade-a.grade||Math.abs(b.net)-Math.abs(a.net));
const counts={BUY:0,SELL:0,NO_ALERT:0};rows.forEach(r=>counts[r.signal]++);
fs.writeFileSync('report.json',JSON.stringify({generated:new Date().toISOString(),asof:rows.map(r=>r.asof).sort().at(-1),universe:syms.length,counts,rows,failed}));
console.log(counts,'failed:',failed);
