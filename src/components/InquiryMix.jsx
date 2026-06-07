import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export function InquiryMix({ mix }) {
  if (!mix) return null
  const total = mix.reduce((s, t) => s + t.value, 0)
  return (
    <div className="card">
      <div className="panel-head">
        <span className="panel-title">Inquiry mix</span>
        <span className="hint">{total.toLocaleString('en-GB')} inquiries</span>
      </div>
      <div style={{ position: 'relative', padding: '6px 0 0' }}>
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={mix} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={52} outerRadius={74} paddingAngle={2} stroke="none">
              {mix.map((t) => <Cell key={t.key} fill={t.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>{total.toLocaleString('en-GB')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.5 }}>INQUIRIES</div>
          </div>
        </div>
      </div>
      <div className="legend">
        {mix.map((t) => (
          <div className="legend-row" key={t.key}>
            <span className="legend-left">
              <span className="legend-dot" style={{ background: t.color }} />{t.name}
            </span>
            <span><span className="legend-val">{t.value.toLocaleString('en-GB')}</span>
              <span className="legend-pct">{t.pct}%</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}
