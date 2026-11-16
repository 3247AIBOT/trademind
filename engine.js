// EMA
function ema(arr, p){
  const k=2/(p+1); const r=[arr[0]];
  for(let i=1;i<arr.length;i++) r.push(arr[i]*k+r[i-1]*(1-k));
  return r;
}

// RSI
function rsi(cl, p=14){
  const r=new Array(p).fill(null);
  let g=0,l=0;
  for(let i=1;i<=p;i++){const d=cl[i]-cl[i-1];g+=Math.max(d,0);l+=Math.max(-d,0);}
  let ag=g/p,al=l/p;
  r.push(al===0?100:100-100/(1+ag/al));
  for(let i=p+1;i<cl.length;i++){
    const d=cl[i]-cl[i-1];
    ag=(ag*(p-1)+Math.max(d,0))/p; al=(al*(p-1)+Math.max(-d,0))/p;
    r.push(al===0?100:100-100/(1+ag/al));
  }
  return r;
}

// MACD
function macd(cl){
  const e12=ema(cl,12),e26=ema(cl,26);
  const line=e12.map((v,i)=>v-e26[i]);
  const sig=ema(line.slice(26),9);
  const fSig=[...new Array(26).fill(null),...sig];
  return {line,signal:fSig,hist:line.map((v,i)=>fSig[i]!=null?v-fSig[i]:null)};
}

// Bollinger Bands
function bb(cl,p=20,m=2){
  return cl.map((_,i)=>{
    if(i<p-1)return null;
    const s=cl.slice(i-p+1,i+1);
    const mn=s.reduce((a,b)=>a+b)/p;
    const sd=Math.sqrt(s.map(x=>(x-mn)**2).reduce((a,b)=>a+b)/p);
    return{upper:mn+m*sd,mid:mn,lower:mn-m*sd,bw:(mn+m*sd-(mn-m*sd))/(mn)*100};
  });
}

// Supertrend
function supertrend(data, p=10, mult=3){
  const atr=calcATR(data,p);
  const result=[];
  for(let i=0;i<data.length;i++){
    if(atr[i]==null){result.push(null);continue;}
    const hl2=(data[i].h+data[i].l)/2;
    const basicUpper=hl2+mult*atr[i];
    const basicLower=hl2-mult*atr[i];
    const prev=result[i-1];
    let finalUpper=basicUpper,finalLower=basicLower;
    if(prev){
      finalUpper=(basicUpper<prev.upper||data[i-1].c>prev.upper)?basicUpper:prev.upper;
      finalLower=(basicLower>prev.lower||data[i-1].c<prev.lower)?basicLower:prev.lower;
    }
    const trend=(!prev||prev.trend===1)?(data[i].c<finalLower?-1:1):(data[i].c>finalUpper?1:-1);
    result.push({upper:finalUpper,lower:finalLower,trend,line:trend===1?finalLower:finalUpper});
  }
  return result;
}

// ATR
function calcATR(data, p=14){
  const tr=data.map((d,i)=>{
    if(i===0)return d.h-d.l;
    return Math.max(d.h-d.l,Math.abs(d.h-data[i-1].c),Math.abs(d.l-data[i-1].c));
  });
  const atr=new Array(p).fill(null);
  let sum=tr.slice(0,p+1).reduce((a,b)=>a+b,0);
  atr.push(sum/(p+1));
  for(let i=p+1;i<data.length;i++){atr.push((atr[atr.length-1]*(p-1)+tr[i])/p);}
  return atr;
}

// ADX (Wilder) — returns array aligned to data, null until warm-up done
function adx(data,p=14){
  const n=data.length,out=new Array(n).fill(null);
  if(n<2*p+1)return out;
  const tr=[],pd=[],md=[];
  for(let i=1;i<n;i++){const u=data[i].h-data[i-1].h,d=data[i-1].l-data[i].l;
    pd.push(u>d&&u>0?u:0);md.push(d>u&&d>0?d:0);
    tr.push(Math.max(data[i].h-data[i].l,Math.abs(data[i].h-data[i-1].c),Math.abs(data[i].l-data[i-1].c)));}
  let sT=0,sP=0,sM=0;for(let i=0;i<p;i++){sT+=tr[i];sP+=pd[i];sM+=md[i];}
  const dx=[],di=[];
  for(let i=p-1;i<tr.length;i++){
    if(i>=p){sT=sT-sT/p+tr[i];sP=sP-sP/p+pd[i];sM=sM-sM/p+md[i];}
    const pdi=sT?100*sP/sT:0,mdi=sT?100*sM/sT:0;
    di.push({pdi,mdi,idx:i+1});dx.push(pdi+mdi?100*Math.abs(pdi-mdi)/(pdi+mdi):0);
  }
  let a=dx.slice(0,p).reduce((x,y)=>x+y,0)/p;
  for(let k=p-1;k<dx.length;k++){if(k>=p)a=(a*(p-1)+dx[k])/p;out[di[k].idx]={adx:a,pdi:di[k].pdi,mdi:di[k].mdi};}
  return out;
}

// OBV
function obv(data){
  const r=[0];
  for(let i=1;i<data.length;i++){
    r.push(r[i-1]+(data[i].c>data[i-1].c?data[i].v:data[i].c<data[i-1].c?-data[i].v:0));
  }
  return r;
}

// Stochastic
function stoch(data,k=14,d=3){
  const kv=data.map((_,i)=>{
    if(i<k-1)return null;
    const s=data.slice(i-k+1,i+1);
    const lo=Math.min(...s.map(x=>x.l)),hi=Math.max(...s.map(x=>x.h));
    return hi===lo?50:((data[i].c-lo)/(hi-lo))*100;
  });
  const dv=kv.map((_,i)=>{
    const vs=kv.slice(Math.max(0,i-d+1),i+1).filter(v=>v!=null);
    return vs.length===d?vs.reduce((a,b)=>a+b)/d:null;
  });
  return{k:kv,d:dv};
}

// Williams Fractals
function fractals(data,n=2){
  const ups=[],dns=[];
  for(let i=n;i<data.length-n;i++){
    let u=true,d=true;
    for(let j=1;j<=n;j++){
      if(data[i].h<=data[i-j].h||data[i].h<=data[i+j].h)u=false;
      if(data[i].l>=data[i-j].l||data[i].l>=data[i+j].l)d=false;
    }
    if(u)ups.push(i);if(d)dns.push(i);
  }
  return{ups,dns};
}
function fractalTrend(data,fr){
  const lu=fr.ups.slice(-3),ld=fr.dns.slice(-3);
  let hhhl=false,lhll=false;
  if(lu.length>=2){const h1=data[lu[lu.length-2]].h,h2=data[lu[lu.length-1]].h;if(h2>h1)hhhl=true;else if(h2<h1)lhll=true;}
  if(ld.length>=2){const l1=data[ld[ld.length-2]].l,l2=data[ld[ld.length-1]].l;
    if(l2>l1&&hhhl)return'STRONG_BULL';
    if(l2<l1&&lhll)return'STRONG_BEAR';
    if(l2>l1)return'BULL';if(l2<l1)return'BEAR';
  }
  return hhhl?'BULL':lhll?'BEAR':'NEUTRAL';
}

// Pivot Points (Classic)
function pivots(data){
  const prev=data[data.length-2];
  if(!prev)return null;
  const pp=(prev.h+prev.l+prev.c)/3;
  return{
    pp, r1:2*pp-prev.l, r2:pp+(prev.h-prev.l), r3:pp+2*(prev.h-prev.l),
    s1:2*pp-prev.h, s2:pp-(prev.h-prev.l), s3:pp-2*(prev.h-prev.l)
  };
}

// Candlestick Patterns
function candlePatterns(data){
  const pats=[];
  const n=data.length;
  if(n<3)return pats;
  const c=data[n-1],p1=data[n-2],p2=data[n-3];
  const body=d=>Math.abs(d.c-d.o);
  const range=d=>d.h-d.l;
  const isBull=d=>d.c>d.o;
  const isBear=d=>d.c<d.o;

  // Hammer
  const lShadow=Math.min(c.o,c.c)-c.l;
  const uShadow=c.h-Math.max(c.o,c.c);
  if(lShadow>2*body(c)&&uShadow<body(c)*.3&&isBear(p1))pats.push({name:'Hammer',bias:'bull',strength:2});

  // Shooting Star
  if(uShadow>2*body(c)&&lShadow<body(c)*.3&&isBull(p1))pats.push({name:'Shooting Star',bias:'bear',strength:2});

  // Bullish Engulfing
  if(isBear(p1)&&isBull(c)&&c.o<p1.c&&c.c>p1.o)pats.push({name:'Bullish Engulfing',bias:'bull',strength:3});

  // Bearish Engulfing
  if(isBull(p1)&&isBear(c)&&c.o>p1.c&&c.c<p1.o)pats.push({name:'Bearish Engulfing',bias:'bear',strength:3});

  // Doji
  if(body(c)<range(c)*.1)pats.push({name:'Doji',bias:'neutral',strength:1});

  // Morning Star
  if(isBear(p2)&&body(p1)<range(p1)*.3&&isBull(c)&&c.c>p2.o)pats.push({name:'Morning Star',bias:'bull',strength:3});

  // Evening Star
  if(isBull(p2)&&body(p1)<range(p1)*.3&&isBear(c)&&c.c<p2.o)pats.push({name:'Evening Star',bias:'bear',strength:3});

  // Three White Soldiers
  if(isBull(c)&&isBull(p1)&&isBull(p2)&&c.c>p1.c&&p1.c>p2.c)pats.push({name:'Three White Soldiers',bias:'bull',strength:3});

  // Three Black Crows
  if(isBear(c)&&isBear(p1)&&isBear(p2)&&c.c<p1.c&&p1.c<p2.c)pats.push({name:'Three Black Crows',bias:'bear',strength:3});

  return pats;
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE ALL
// ═══════════════════════════════════════════════════════════════
function computeAll(data){
  const cl=data.map(d=>d.c);
  const e20=ema(cl,20),e50=ema(cl,50),e200=ema(cl,200);
  const r=rsi(cl);
  const m=macd(cl);
  const b=bb(cl);
  const st=supertrend(data);
  const atrArr=calcATR(data);
  const adxArr=adx(data);
  const obvArr=obv(data);
  const stochObj=stoch(data);
  const frObj=fractals(data);
  const ft=fractalTrend(data,frObj);
  const piv=pivots(data);
  const pats=candlePatterns(data);
  const vols=data.map(d=>d.v);
  const avgVol=vols.slice(-20).reduce((a,b)=>a+b)/20;
  const curVol=vols[vols.length-1];
  const n=cl.length-1;
  const curST=st[n];
  const curADX=adxArr[n]||{adx:0,pdi:0,mdi:0};
  const curATR=atrArr[n]||0;
  const curOBV=obvArr[n];
  const prevOBV=obvArr[n-5]||obvArr[0];
  const obvTrend=curOBV>prevOBV?'up':'down';

  // OBV divergence: price up but OBV down or vice versa
  const priceTrend=cl[n]>cl[n-5]?'up':'down';
  const obvDivergence=priceTrend!==obvTrend?priceTrend==='up'?'bearish_div':'bullish_div':null;

  // Volume surge
  const volSig=curVol>avgVol*1.6?'SURGE':curVol>avgVol*1.2?'HIGH':curVol<avgVol*.7?'LOW':'NORMAL';

  return{
    e20,e50,e200,rsi:r,macd:m,bb:b,supertrend:st,atr:atrArr,adx:adxArr,
    obv:obvArr,stoch:stochObj,fractals:frObj,fractalTrend:ft,pivots:piv,patterns:pats,
    volSig,avgVol,curVol,obvTrend,obvDivergence,
    cur:{
      close:cl[n],e20:e20[n],e50:e50[n],e200:e200[n],
      rsi:r[n],macdHist:m.hist[n],macdLine:m.line[n],macdSig:m.signal[n],
      bb:b[n],st:curST,adx:curADX,atr:curATR,
      stochK:stochObj.k[n],stochD:stochObj.d[n],
      piv,obv:curOBV,obvTrend,obvDivergence,volSig
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// HIGH-CONVICTION SCORING ENGINE
// Each criterion has a weight (1-3) and a category.
// Alert fires ONLY if total score ≥ 7 AND at least 4 categories confirm
// ═══════════════════════════════════════════════════════════════
function scoreHC(ind){
  const c=ind.cur;
  const reasons=[];
  let bull=0,bear=0;
  const categories={trend:0,momentum:0,volatility:0,volume:0,pattern:0,fractal:0};

  const addBull=(cat,text,w)=>{bull+=w;categories[cat]+=w;reasons.push({bias:'bull',cat,text,w});};
  const addBear=(cat,text,w)=>{bear+=w;categories[cat]+=w;reasons.push({bias:'bear',cat,text,w});};

  // ── TREND (weight 1-3) ──
  if(c.close>c.e20&&c.e20>c.e50&&c.e50>c.e200)addBull('trend','All EMAs aligned bullish (20>50>200) — strong uptrend',3);
  else if(c.close<c.e20&&c.e20<c.e50&&c.e50<c.e200)addBear('trend','All EMAs aligned bearish (20<50<200) — strong downtrend',3);
  else if(c.close>c.e20&&c.e20>c.e50)addBull('trend','Price > EMA20 > EMA50 — uptrend',2);
  else if(c.close<c.e20&&c.e20<c.e50)addBear('trend','Price < EMA20 < EMA50 — downtrend',2);

  // Supertrend
  if(c.st){
    if(c.st.trend===1)addBull('trend',`Supertrend bullish (line ₹${c.st.line.toFixed(1)})`,2);
    else addBear('trend',`Supertrend bearish (line ₹${c.st.line.toFixed(1)})`,2);
  }

  // ADX — only score if trend is STRONG
  if(c.adx.adx>25){
    if(c.adx.pdi>c.adx.mdi)addBull('trend',`ADX ${c.adx.adx.toFixed(0)} — strong trend, +DI > -DI`,2);
    else addBear('trend',`ADX ${c.adx.adx.toFixed(0)} — strong trend, -DI > +DI`,2);
  } else if(c.adx.adx<20){
    // Choppy market — penalise both sides equally (don't generate confident alert in ranging market)
    reasons.push({bias:'neutral',cat:'trend',text:`ADX ${c.adx.adx.toFixed(0)} — choppy/ranging market, low conviction`,w:0,flag:'choppy'});
  }

  // ── MOMENTUM ──
  if(c.rsi<30)addBull('momentum',`RSI deeply oversold at ${c.rsi.toFixed(1)} — high-probability reversal zone`,2);
  else if(c.rsi>70)addBear('momentum',`RSI overbought at ${c.rsi.toFixed(1)} — reversal risk elevated`,2);
  else if(c.rsi>50&&c.rsi<65)addBull('momentum',`RSI in bullish momentum zone (${c.rsi.toFixed(1)})`,1);
  else if(c.rsi>35&&c.rsi<50)addBear('momentum',`RSI in bearish zone (${c.rsi.toFixed(1)})`,1);

  // MACD — look for histogram and crossover together
  if(c.macdHist!=null){
    if(c.macdHist>0&&c.macdLine>0)addBull('momentum','MACD positive and above zero line',2);
    else if(c.macdHist>0)addBull('momentum','MACD histogram turning positive',1);
    else if(c.macdHist<0&&c.macdLine<0)addBear('momentum','MACD negative and below zero line',2);
    else if(c.macdHist<0)addBear('momentum','MACD histogram turning negative',1);
  }

  // Stochastic
  if(c.stochK!=null&&c.stochD!=null){
    if(c.stochK<20&&c.stochK>c.stochD)addBull('momentum',`Stoch K(${c.stochK.toFixed(0)}) oversold and crossing up — reversal`,2);
    else if(c.stochK<25)addBull('momentum',`Stoch K oversold at ${c.stochK.toFixed(0)}`,1);
    else if(c.stochK>80&&c.stochK<c.stochD)addBear('momentum',`Stoch K(${c.stochK.toFixed(0)}) overbought and crossing down`,2);
    else if(c.stochK>75)addBear('momentum',`Stoch K overbought at ${c.stochK.toFixed(0)}`,1);
  }

  // ── VOLATILITY / STRUCTURE (BB + ATR) ──
  if(c.bb){
    const squeeze=c.bb.bw<2;// Band squeeze — big move incoming
    if(c.close<c.bb.lower)addBull('volatility',`Price below lower BB — oversold, bounce zone`,2);
    else if(c.close>c.bb.upper)addBear('volatility',`Price above upper BB — extended, pullback likely`,2);
    if(squeeze)reasons.push({bias:'neutral',cat:'volatility',text:'BB squeeze — high volatility move imminent, direction TBD',w:0});
  }

  // Pivot points proximity
  if(c.piv){
    const p=c.close;
    const near=(level,name,bias,w)=>{if(Math.abs(p-level)/p<0.005){bias==='bull'?addBull('volatility',`Price near pivot ${name} (₹${level.toFixed(0)}) — key support`,w):addBear('volatility',`Price near pivot ${name} (₹${level.toFixed(0)}) — key resistance`,w);}};
    near(c.piv.s1,'S1','bull',2);near(c.piv.s2,'S2','bull',2);
    near(c.piv.r1,'R1','bear',2);near(c.piv.r2,'R2','bear',2);
    near(c.piv.pp,'PP','neutral',0);
  }

  // ── VOLUME ──
  if(c.volSig==='SURGE'){
    if(bull>bear)addBull('volume','Volume surge — institutional buying confirmed',2);
    else addBear('volume','Volume surge — institutional selling confirmed',2);
  } else if(c.volSig==='HIGH'){
    if(bull>bear)addBull('volume','Above-average volume confirms bullish move',1);
    else addBear('volume','Above-average volume confirms bearish move',1);
  }

  // OBV
  if(c.obvDivergence==='bullish_div')addBull('volume','OBV bullish divergence — hidden accumulation despite price drop',2);
  else if(c.obvDivergence==='bearish_div')addBear('volume','OBV bearish divergence — distribution despite price rise',2);
  else if(c.obvTrend==='up')addBull('volume','OBV trending up — volume supports bulls',1);
  else addBear('volume','OBV trending down — volume supports bears',1);

  // ── FRACTAL ──
  const ft=ind.fractalTrend;
  if(ft==='STRONG_BULL')addBull('fractal','Fractal: Higher highs + Higher lows — strong uptrend structure',3);
  else if(ft==='BULL')addBull('fractal','Fractal: Higher highs pattern forming',2);
  else if(ft==='STRONG_BEAR')addBear('fractal','Fractal: Lower highs + Lower lows — strong downtrend structure',3);
  else if(ft==='BEAR')addBear('fractal','Fractal: Lower highs pattern forming',2);

  // ── CANDLESTICK PATTERNS ──
  for(const pat of ind.patterns){
    if(pat.bias==='bull')addBull('pattern',`${pat.name} pattern — bullish reversal signal`,pat.strength);
    else if(pat.bias==='bear')addBear('pattern',`${pat.name} pattern — bearish reversal signal`,pat.strength);
  }

  // ── ATR-BASED SL ──
  const atrSL = c.atr * 1.5;

  return{bull,bear,reasons,categories,atrSL,
    total:bull+bear,net:bull-bear,
    isChoppy:reasons.some(r=>r.flag==='choppy'),
    catCount:Object.values(categories).filter(v=>v>0).length
  };
}

// ═══════════════════════════════════════════════════════════════
// HIGH-CONVICTION FILTER — strict gate
// ALERT fires only when: net ≥ 7 AND categories ≥ 4 AND not choppy
// WATCH fires when: net ≥ 5 AND categories ≥ 3
// ═══════════════════════════════════════════════════════════════
function getSignal(sc){
  const {net,catCount,isChoppy,bull,bear} = sc;
  if(isChoppy&&Math.abs(net)<8) return{type:'NO_ALERT',grade:0};
  const side=net>0?'BUY':'SELL';
  const absNet=Math.abs(net);
  if(absNet>=10&&catCount>=5) return{type:side,grade:5,label:'★★★★★ ULTRA HIGH CONVICTION'};
  if(absNet>=8&&catCount>=4)  return{type:side,grade:4,label:'★★★★ HIGH CONVICTION'};
  if(absNet>=6&&catCount>=4)  return{type:side,grade:3,label:'★★★ STRONG SIGNAL'};
  if(absNet>=5&&catCount>=3)  return{type:side,grade:2,label:'★★ MODERATE SIGNAL'};
  return{type:'NO_ALERT',grade:0};
}
// ═══ STRICT DAILY PICK GATE — every rule must pass (used by scan.mjs) ═══
// BUY = enter long (delivery). EXIT = warning for people who already hold the stock.
function strongSignal(D,dbg){
  if(D.length<230)return null;
  const I=computeAll(D),S=scoreHC(I),c=I.cur,n=D.length-1,atr=c.atr,sig=I.macd.signal[n];
  if(!c.bb||!c.st||sig==null||!atr)return null;
  const liquid=[I.avgVol*c.close>=5e7,'Liquid (avg turnover ≥ ₹5 cr/day)'];
  const volOK=[I.curVol>=I.avgVol,'Volume at or above 20-day average'];
  const riskPct=atr*1.5/c.close*100;
  const buy=[
    [c.close>c.e20&&c.e20>c.e50&&c.e50>c.e200,'Price > EMA20 > EMA50 > EMA200'],
    [c.e200>I.e200[n-20],'EMA200 rising'],
    [c.st.trend===1,'Supertrend bullish'],
    [c.adx.adx>=25&&c.adx.pdi>c.adx.mdi,`ADX ${c.adx.adx.toFixed(0)} — strong trend, +DI > -DI`],
    [c.rsi>=50&&c.rsi<=72,`RSI ${c.rsi.toFixed(0)} — strong but not extreme`],
    [c.macdHist>0&&c.macdLine>sig&&c.macdHist>I.macd.hist[n-1],'MACD above signal and rising'],
    [c.close<c.bb.upper&&(c.close-c.e20)/atr<=2.5,'Not stretched above EMA20 / Bollinger'],
    [c.obvTrend==='up'&&c.obvDivergence!=='bearish_div','OBV confirms (accumulation)'],
    [I.fractalTrend.includes('BULL'),'Fractal structure bullish'],
    [S.net>=7&&S.bear<=3,`Conviction score ${S.net} (bull ${S.bull} vs bear ${S.bear})`],
    [riskPct<=5,`Stop within ${riskPct.toFixed(1)}% of price`],volOK,liquid];
  const exit=[
    [c.close<c.e50&&c.e20<c.e50,'Price < EMA50 and EMA20 < EMA50'],
    [c.st.trend===-1,'Supertrend bearish'],
    [c.adx.adx>=25&&c.adx.mdi>c.adx.pdi,`ADX ${c.adx.adx.toFixed(0)} — strong downtrend`],
    [c.macdHist<0&&c.macdLine<sig,'MACD below signal'],
    [c.rsi<48,`RSI ${c.rsi.toFixed(0)} — weak`],
    [S.net<=-7&&S.bull<=3,`Bearish score ${S.net} (bear ${S.bear} vs bull ${S.bull})`],volOK,liquid];
  if(dbg)return{buy,exit};
  const all=r=>r.every(x=>x[0]);
  const base={entry:c.close,net:S.net,cats:S.catCount,rsi:Math.round(c.rsi),adx:Math.round(c.adx.adx),riskPct:+riskPct.toFixed(1)};
  if(all(buy))return{...base,action:'BUY',reasons:buy.map(x=>x[1]),maxEntry:+(c.close+.5*atr).toFixed(2),sl:+(c.close-1.5*atr).toFixed(2),tp:+(c.close+3*atr).toFixed(2)};
  if(all(exit))return{...base,action:'EXIT',reasons:exit.map(x=>x[1]),maxEntry:null,sl:null,tp:null};
  return null;
}
