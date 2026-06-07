// Nadura Supabase requests are proxied so the service key never reaches the browser.
//   • dev  — the Vite server proxy at /nadura/* (vite.config.js) injects the key.
//   • prod — set VITE_NADURA_FEED_URL to the deployed `nadura-feed` edge function
//            (e.g. https://<ref>.functions.supabase.co/nadura-feed). It appends the
//            /rest/v1 segment itself, so point the var at the function root.
// Default keeps the dev proxy path so `vite dev` works with no extra config.
const FEED = import.meta.env.VITE_NADURA_FEED_URL
const BASE = FEED ? FEED.replace(/\/$/, '') : '/nadura/rest/v1'

// Fetch rows for a PostgREST path (e.g. "orders?select=order_date,test_price&limit=2000").
export async function rows(path) {
  const res = await fetch(`${BASE}/${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    let msg = res.statusText
    try { msg = (await res.json()).message || msg } catch (_) { /* ignore */ }
    throw new Error(`${res.status}: ${msg}`)
  }
  return res.json()
}

// Fetch ALL rows for a query, paging past PostgREST's 1000-row cap via Range.
export async function rowsAll(table, query) {
  const PAGE = 1000
  const out = []
  let from = 0
  for (;;) {
    const res = await fetch(`${BASE}/${table}?${query}`, {
      headers: {
        Accept: 'application/json',
        'Range-Unit': 'items',
        Range: `${from}-${from + PAGE - 1}`,
        Prefer: 'count=exact',
      },
    })
    if (!res.ok && res.status !== 206) throw new Error(`${res.status} paging ${table}`)
    const batch = await res.json()
    out.push(...batch)
    const total = parseInt((res.headers.get('content-range') || '/0').split('/').pop(), 10) || 0
    from += batch.length
    if (!batch.length || batch.length < PAGE || (total && from >= total)) break
  }
  return out
}

// Exact row count via PostgREST's Content-Range header (cheap; returns no rows).
// `filters` is a raw PostgREST filter string, e.g. "current_stage=eq.Active".
export async function count(table, filters = '') {
  const url = `${BASE}/${table}?select=id${filters ? '&' + filters : ''}`
  const res = await fetch(url, {
    headers: { Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
  })
  // PostgREST returns 206 Partial Content for a ranged request — that's fine.
  if (!res.ok && res.status !== 206) throw new Error(`${res.status} counting ${table}`)
  const cr = res.headers.get('content-range') || '/0'
  return parseInt(cr.split('/').pop(), 10) || 0
}
