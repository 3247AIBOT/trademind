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
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
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
