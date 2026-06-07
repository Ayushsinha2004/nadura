function fmt(n) { return (n ?? 0).toLocaleString('en-GB') }
function eur(n) { return '€' + (Math.round(n ?? 0)).toLocaleString('en-GB') }

export function KpiCards({ kpis, windowLabel = 'this period' }) {
  if (!kpis) return null
  const win = windowLabel.toLowerCase()
  const cards = [
    {
      label: 'Inquiries handled by the AI',
      value: fmt(kpis.inquiries),
      foot: <>over {win} · <b>{fmt(kpis.critical)}</b> flagged critical for manual reply</>,
    },
    {
      label: 'Time given back to Lisa',
      value: kpis.time_saved_h, unit: 'hrs',
      foot: <>over {win} · ~6 min saved per inquiry handled</>,
    },
    {
      label: 'Test orders processed',
      value: fmt(kpis.tests),
      foot: <><b>{eur(kpis.revenue)}</b> of test orders moved through the lab</>,
    },
    {
      label: 'Clients in the database',
      value: fmt(kpis.clients_total),
      foot: <>managed in one live record</>,
    },
  ]
  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div className="kpi" key={c.label}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}{c.unit && <span className="unit">{c.unit}</span>}</div>
          <div className="kpi-foot">{c.foot}</div>
        </div>
      ))}
    </div>
  )
}
