import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function InquiryVolume({ buckets, windowLabel, granularity }) {
  const unitWord = granularity === 'week' ? 'week' : 'day'
  return (
    <div className="card">
      <div className="panel-head">
        <span className="panel-title">Inquiry volume</span>
        <span className="hint">{windowLabel} · per {unitWord}</span>
      </div>
      <div style={{ padding: '14px 12px 16px' }}>
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={buckets} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="iv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1ca1b2" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#1ca1b2" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#dde6ea" vertical={false} />
            <XAxis dataKey="label" stroke="#93a6af" tickLine={false} axisLine={false} fontSize={12}
                   minTickGap={18} interval="preserveStartEnd" />
            <YAxis stroke="#93a6af" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #dde6ea', borderRadius: 8, color: '#163f55' }}
              labelStyle={{ color: '#5e7785' }}
              formatter={(v) => [`${v} inquiries`, 'Handled']}
            />
            <Area type="monotone" dataKey="count" stroke="#1ca1b2" strokeWidth={2.5} fill="url(#iv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
