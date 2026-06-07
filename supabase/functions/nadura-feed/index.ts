// nadura-feed — read-only Supabase REST proxy for the deployed Nadura dashboard.
//
// WHY THIS EXISTS
//   In dev, the Vite server proxy (vite.config.js → /nadura) rewrites requests to
//   Supabase and injects the service key server-side. That proxy does NOT exist
//   in a production build (Amplify serves static files only), so the dashboard's
//   relative /nadura/rest/v1/* calls 404. This edge function is the production
//   stand-in: it holds the service key as a secret and forwards read requests to
//   PostgREST, so the key never reaches the browser.
//
// CONTRACT  (GET only — read, never own)
//   GET <fn>/<table>?<postgrest-query>  →  <TARGET>/rest/v1/<table>?<query>
//   Range / Range-Unit / Prefer are forwarded (paging + exact counts);
//   content-range is exposed back to the browser.
//
// DEPLOY
//   supabase functions deploy nadura-feed --no-verify-jwt --project-ref <REF>
//   supabase secrets set \
//     NADURA_SUPABASE_URL=https://utczdtqqawncwuwnfzig.supabase.co \
//     NADURA_SERVICE_KEY=<service_role key> \
//     NADURA_ALLOW_ORIGIN=https://<your-amplify-domain> \
//     --project-ref <REF>

const TARGET = Deno.env.get('NADURA_SUPABASE_URL')
const KEY = Deno.env.get('NADURA_SERVICE_KEY')
const ALLOW_ORIGIN = Deno.env.get('NADURA_ALLOW_ORIGIN') || '*'

const cors = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, range, range-unit, prefer, accept, x-client-info',
  'Access-Control-Expose-Headers': 'content-range, content-location, content-type',
  'Vary': 'Origin',
}

// Everything after the function-name segment is the PostgREST path + query.
// Raw substring (not split/join) so any trailing slash is preserved.
function restPath(reqUrl: string): string {
  const u = new URL(reqUrl)
  const marker = '/nadura-feed/'
  const i = u.pathname.indexOf(marker)
  return (i >= 0 ? u.pathname.slice(i + marker.length) : u.pathname.replace(/^\/+/, '')) + u.search
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed (read-only proxy)' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (!TARGET || !KEY) {
    return new Response(JSON.stringify({ message: 'Proxy not configured: set NADURA_SUPABASE_URL and NADURA_SERVICE_KEY' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const target = `${TARGET}/rest/v1/${restPath(req.url)}`
  const headers = new Headers({
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    Accept: req.headers.get('accept') || 'application/json',
  })
  for (const h of ['range', 'range-unit', 'prefer']) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }

  let upstream: Response
  try {
    upstream = await fetch(target, { method: 'GET', headers })
  } catch (_e) {
    return new Response(JSON.stringify({ message: 'Upstream Supabase unreachable' }), {
      status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const out = new Headers(cors)
  for (const h of ['content-type', 'content-range', 'content-location']) {
    const v = upstream.headers.get(h)
    if (v) out.set(h, v)
  }
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: out })
})
