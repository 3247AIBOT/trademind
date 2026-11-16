# TradeMind — NSE High-Conviction Trading Agent

A self-contained technical trading agent for Indian markets (NSE/BSE).
Generates alerts **only** when multiple independent indicators align — fewer signals, higher quality.

## What's inside

### 11 Indicators computed
| Indicator | What it tells you |
|---|---|
| RSI (14) | Momentum, overbought/oversold |
| MACD | Trend momentum and crossovers |
| EMA 20 / 50 / 200 | Trend alignment across timeframes |
| Bollinger Bands | Volatility and price extremes |
| Supertrend | Clean buy/sell trend line |
| ADX (14) | Trend strength — filters out choppy markets |
| Williams Fractals | Higher highs/lows structure |
| Stochastic %K/%D | Momentum reversals |
| OBV + Divergence | Volume flow and hidden accumulation/distribution |
| ATR (14) | Volatility — used for SL/TP sizing |
| Pivot Points | Key daily support/resistance levels |
| Candlestick Patterns | Hammer, Engulfing, Morning Star, Doji, and 5 more |

### High-conviction gate (why you get fewer, better alerts)
An alert fires **only** when:
- Net bull/bear score ≥ 7 (not just 4 like most screeners)
- At least 4 out of 6 indicator *categories* confirm the direction
- ADX > 20 (market is actually trending, not ranging)

If conditions aren't met, you see a "No Signal" card explaining exactly what's missing.

### Alert output includes
- Entry price in ₹
- Stop-loss = 1.5× ATR (volatility-adjusted, not a fixed %)
- Target = 3× ATR (always a minimum 1:2 R:R)
- Pivot level target (R1/S1) as secondary reference
- Conviction grade ★ to ★★★★★
- Confidence % and category breakdown

---

## Deploy to GitHub Pages (10 minutes)

### Step 1 — Create a GitHub account
Go to [github.com](https://github.com) → Sign up (free)

### Step 2 — Create a repository
1. Click the **+** icon → **New repository**
2. Name: `trademind`
3. Visibility: **Public**
4. Click **Create repository**

### Step 3 — Upload files
1. In your new repo, click **Add file → Upload files**
2. Drag and drop all 4 files: `index.html`, `worker.js`, `wrangler.toml`, `README.md`
3. Click **Commit changes**

### Step 4 — Enable GitHub Pages
1. Go to **Settings** (top tab of your repo)
2. Scroll to **Pages** in the left sidebar
3. Under Source: select **Deploy from a branch**
4. Branch: `main` | Folder: `/ (root)`
5. Click **Save**
6. Wait ~60 seconds → your site is live at:
   `https://YOUR_GITHUB_USERNAME.github.io/trademind/`

---

## Activate live NSE data (Twelve Data)

### Step 1 — Get a free API key
1. Go to [twelvedata.com/apikey](https://twelvedata.com/apikey)
2. Sign up — no credit card needed
3. Free plan: 800 API calls/day (enough for personal trading)
4. Copy your API key

### Step 2 — Enter it in the app
1. Open your GitHub Pages URL
2. You'll see a yellow banner at the top
3. Paste your Twelve Data key and click **Save**
4. The key is stored only in your browser — never sent anywhere except Twelve Data

### Supported symbols
| What you want | Type in box | Exchange |
|---|---|---|
| Nifty 50 | `NIFTY` | NSE |
| Bank Nifty | `BANKNIFTY` | NSE |
| Reliance | `RELIANCE` | NSE |
| TCS | `TCS` | NSE |
| Infosys | `INFY` | NSE |
| HDFC Bank | `HDFCBANK` | NSE |
| Adani Enterprises | `ADANIENT` | NSE |
| Wipro | `WIPRO` | NSE |

---

## Activate the AI Ask Agent (optional)

The Ask Agent tab answers questions about your chart in plain English.
Without setup it uses a smart rule-based fallback. For full Claude AI:

### Step 1 — Get a Cloudflare account
Go to [cloudflare.com](https://cloudflare.com) → Sign up (free)

### Step 2 — Get an Anthropic API key
Go to [console.anthropic.com](https://console.anthropic.com/settings/keys) → Create key

### Step 3 — Deploy the Worker
Open a terminal on your computer:

```bash
# Install Wrangler (Cloudflare's CLI tool)
npm install -g wrangler

# Log in to Cloudflare
wrangler login

# Add your Anthropic key as a secret (paste when prompted)
wrangler secret put ANTHROPIC_API_KEY

# Deploy
wrangler deploy
```

You'll get a URL like: `https://trademind-proxy.YOUR_SUBDOMAIN.workers.dev`

### Step 4 — Connect to the app
Open your GitHub Pages site, press **F12** to open the browser console, and run:

```javascript
localStorage.setItem('cf_worker', 'https://trademind-proxy.YOUR_SUBDOMAIN.workers.dev')
location.reload()
```

The Ask Agent tab now uses full Claude AI.

---

## Conviction scoring explained

```
Category        Max contribution
─────────────────────────────────
Trend           EMA alignment + Supertrend + ADX     up to 7
Momentum        RSI + MACD + Stochastic               up to 5
Volatility      Bollinger Bands + Pivot proximity     up to 4
Volume          Volume surge + OBV + Divergence       up to 4
Fractal         Williams Fractal structure            up to 3
Pattern         Candlestick patterns                  up to 3
─────────────────────────────────
Alert threshold:  net ≥ 7  AND  4+ categories confirm
Watch threshold:  net ≥ 5  AND  3+ categories confirm
ADX < 20       :  signal suppressed (choppy market)
```

---

## Disclaimer
This tool is for informational and educational purposes only.
It does not constitute financial advice. Always manage your risk.
Past technical setups do not guarantee future results.

---

## Daily report (added)

- `scan.mjs` + `.github/workflows/daily-scan.yml` scan every symbol in `symbols.txt` at 16:30 IST (Mon-Fri) and commit `report.json`.
- `engine.js` holds the shared indicator/scoring code used by both the page and the scanner.
- One-time setup: Settings → Actions → General → Workflow permissions → **Read and write**, then run **daily-scan** once from the Actions tab.
- Symbols: `RELIANCE` = NSE, `500325.BO` = BSE, `us:AAPL` = US.

## Correction: data source
Twelve Data's free plan does **not** include NSE (it needs the paid Grow plan). The app now uses your Cloudflare Worker (`worker.js`, free Yahoo data) whenever `cf_worker` is set. After updating `worker.js` run `wrangler deploy` again. The Twelve Data key is only a fallback.
