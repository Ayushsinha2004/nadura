import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { count, rows, rowsAll } from '../lib/nadura'

// Same stated assumption as the report spec: 0.1 h (~6 min) of Lisa's time saved
// per inquiry the AI reads, classifies and drafts a reply for. If the spec
// changes, change it here so the dashboard and the report agree.
const HOURS_SAVED_PER_INQUIRY = 0.1
const REFRESH_MS = 60 * 1000

// The four AI classification categories (exact DB strings → friendly labels).
// Colours sampled from the Nadura logo: navy wordmark, cyan "Clinic", green tree.
export const CLASS_MAP = {
  'Direct Test Query Received':                       { label: 'Direct test query', key: 'direct',   color: '#163f55' },
  'Test Information Requested':                       { label: 'Test info requested', key: 'info',   color: '#1ca1b2' },
  'Symptoms Mentioned':                               { label: 'Symptoms mentioned', key: 'symptom', color: '#519234' },
  'Critical Case Identified - Manual Reply Required': { label: 'Critical case', key: 'critical',     color: '#dc2626' },
}
const CRITICAL = 'Critical Case Identified - Manual Reply Required'

export const TIME_FILTERS = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
]
export const filterLabel = (k) => (TIME_FILTERS.find((f) => f.key === k) || {}).label || k

// Parse a PostgREST 'YYYY-MM-DD' date as LOCAL midnight (no timezone drift).
function parseDate(s) {
  if (!s) return null
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function dayKey(d) { return startOfDay(d).toISOString().slice(0, 10) }
function weekStart(d) { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x } // Monday

function buildBuckets(items, start, end, granularity) {
  const buckets = []
  const idx = {}
  const fmtDay = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  if (granularity === 'day') {
    const spanDays = Math.round((startOfDay(end) - startOfDay(start)) / 86400000)
    const label = spanDays <= 7 ? fmtDay : fmtDate
    for (let d = startOfDay(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d); idx[k] = buckets.length
      buckets.push({ key: k, label: label(d), count: 0 })
    }
    items.forEach((it) => { const k = dayKey(it._d); if (k in idx) buckets[idx[k]].count++ })
  } else {
    for (let d = weekStart(start); d <= end; d.setDate(d.getDate() + 7)) {
      const k = dayKey(d); idx[k] = buckets.length
      buckets.push({ key: k, label: fmtDate(d), count: 0 })
    }
    items.forEach((it) => { const k = dayKey(weekStart(it._d)); if (k in idx) buckets[idx[k]].count++ })
  }

  let cum = 0
  return buckets.map((b) => {
    cum += b.count * HOURS_SAVED_PER_INQUIRY
    return { ...b, hours: +(b.count * HOURS_SAVED_PER_INQUIRY).toFixed(1), cumHours: +cum.toFixed(1) }
  })
}

function computeWindow(raw, filter) {
  const def = TIME_FILTERS.find((f) => f.key === filter) || TIME_FILTERS[0]
  const now = new Date()
  const todayEnd = startOfDay(now); todayEnd.setHours(23, 59, 59, 999)
  let start
  if (def.days == null) start = raw.firstDate ? new Date(raw.firstDate) : now
  else { start = startOfDay(now); start.setDate(start.getDate() - (def.days - 1)) }
  const startMs = startOfDay(start).getTime()
  const endMs = todayEnd.getTime()

  // Window is [start … today] — future-dated rows (> today) are excluded, the
  // same way the engine's KPI window does with BETWEEN period_start AND period_end.
  const inWin = (d) => { const t = d ? d.getTime() : NaN; return t >= startMs && t <= endMs }

  const winEnq = raw.enq.filter((e) => inWin(e._d))
  const winOrders = raw.orders.filter((o) => inWin(o._d))

  const inquiries = winEnq.length
  const critical = winEnq.filter((e) => e.classification_outcome === CRITICAL).length
  const tests = winOrders.length
  const revenue = winOrders.reduce((s, o) => s + (Number(o.test_price) || 0), 0)

  // Inquiry mix by classification (donut).
  const mixCounts = {}
  winEnq.forEach((e) => {
    const c = e.classification_outcome
    const key = CLASS_MAP[c] ? c : 'Unclassified'
    mixCounts[key] = (mixCounts[key] || 0) + 1
  })
  const mix = Object.entries(mixCounts).map(([c, value]) => {
    const meta = CLASS_MAP[c] || { label: 'Unclassified', key: 'other', color: '#8aa0a6' }
    return { ...meta, name: meta.label, value, pct: inquiries ? Math.round((value / inquiries) * 100) : 0 }
  }).sort((a, b) => b.value - a.value)

  const granularity = def.days != null && def.days <= 30 ? 'day' : 'week'

  return {
    inquiries,
    critical,
    tests,
    revenue: Math.round(revenue),
    time_saved_h: +(inquiries * HOURS_SAVED_PER_INQUIRY).toFixed(1),
    mix,
    buckets: buildBuckets(winEnq, start, now, granularity),
    granularity,
  }
}

export function useNaduraData(timeFilter = '30d') {
  const raw = useRef(null) // { clientsTotal, enq, orders, firstDate, dataThrough }
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [clientsTotal, enqRaw, ordersRaw] = await Promise.all([
        count('clients'),
        rowsAll('enquiries', 'select=query_date,classification_outcome&order=query_date.desc'),
        rows('orders?select=order_date,test_price,test_name&limit=5000'),
      ])
      const now = startOfDay(new Date()).getTime()
      const enq = enqRaw.map((e) => ({ ...e, _d: parseDate(e.query_date) }))
      const orders = ordersRaw.map((o) => ({ ...o, _d: parseDate(o.order_date) }))
      // earliest real date (for "All time"); latest date that is not in the future.
      const pastEnq = enq.filter((e) => e._d && e._d.getTime() <= now)
      const firstDate = pastEnq.reduce((min, e) => (!min || e._d < min ? e._d : min), null)
      const dataThrough = pastEnq.reduce((max, e) => (!max || e._d > max ? e._d : max), null)

      raw.current = {
        clientsTotal,
        enq,
        orders,
        firstDate,
        dataThrough: dataThrough ? dayKey(dataThrough) : null,
      }
      setError(null)
      setVersion((v) => v + 1)
    } catch (err) {
      setError(err.message || 'Failed to load live data from the Nadura Supabase')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  const data = useMemo(() => {
    const r = raw.current
    if (!r) return null
    const w = computeWindow(r, timeFilter)
    return {
      kpis: {
        inquiries: w.inquiries,
        critical: w.critical,
        time_saved_h: w.time_saved_h,
        tests: w.tests,
        revenue: w.revenue,
        clients_total: r.clientsTotal,
      },
      mix: w.mix,
      buckets: w.buckets,
      granularity: w.granularity,
      dataThrough: r.dataThrough,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, version])

  return { data, loading, error, reload: load }
}
