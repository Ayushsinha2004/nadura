import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function ValueTrend({ buckets, windowLabel, granularity }) {
  const unitWord = granularity === 'week' ? 'week' : 'day'
  return (
    <div className="card">
      <div className="panel-head">
        <span className="panel-title">Value delivered</span>
        <span className="hint">inquiries handled &amp; cumulative hours saved · {windowLabel} · per {unitWord}</span>
      </div>
      <div style={{ padding: '14px 12px 16px' }}>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={buckets} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#dde6ea" vertical={false} />
            <XAxis dataKey="label" stroke="#93a6af" tickLine={false} axisLine={false} fontSize={12}
                   minTickGap={18} interval="preserveStartEnd" />
            <YAxis yAxisId="l" stroke="#93a6af" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <YAxis yAxisId="r" orientation="right" stroke="#93a6af" tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #dde6ea', borderRadius: 8, color: '#163f55' }}
              labelStyle={{ color: '#5e7785' }}
              formatter={(v, name) => name === 'cumHours' ? [`${v} hrs`, 'Cumulative hours saved'] : [`${v}`, 'Inquiries handled']}
            />
            <Bar yAxisId="l" dataKey="count" fill="#1ca1b2" radius={[4, 4, 0, 0]} maxBarSize={34} opacity={0.9} />
            <Line yAxisId="r" type="monotone" dataKey="cumHours" stroke="#519234" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
