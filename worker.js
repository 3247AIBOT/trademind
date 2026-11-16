/**
 * TradeMind — Cloudflare Worker
 * Proxies requests to Anthropic API so your key stays server-side.
 *
 * DEPLOY STEPS:
 *   1. Install Wrangler:  npm install -g wrangler
 *   2. Login:             wrangler login
 *   3. Add secret:        wrangler secret put ANTHROPIC_API_KEY
 *                         (paste your key when prompted)
 *   4. Deploy:            wrangler deploy
 *   5. Copy the worker URL and paste it into the app:
 *      localStorage.setItem('cf_worker', 'https://your-worker.workers.dev')
 *      (open browser console on your GitHub Pages URL and run this once)
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // GET ?symbol=ICICIBANK.NS&interval=1d&range=2y  ->  free Yahoo Finance candles
    if (request.method === 'GET') {
      const u = new URL(request.url);
      const sym = u.searchParams.get('symbol') || '', iv = u.searchParams.get('interval') || '1d', rg = u.searchParams.get('range') || '2y';
      const cors = { 'Access-Control-Allow-Origin': '*' };
      if (!/^[A-Za-z0-9&._^-]{1,20}$/.test(sym) || !/^[0-9a-z]{2,5}$/.test(iv) || !/^[0-9a-z]{2,5}$/.test(rg))
        return new Response('bad params', { status: 400, headers: cors });
      const y = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${iv}&range=${rg}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 300 } });
      return new Response(await y.text(), { status: y.status, headers: { 'Content-Type': 'application/json', ...cors } });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const { messages, model = 'claude-sonnet-4-6', max_tokens = 600 } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response('messages array required', { status: 400 });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens, messages }),
    });

    const data = await anthropicRes.json();

    return new Response(JSON.stringify(data), {
      status: anthropicRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
