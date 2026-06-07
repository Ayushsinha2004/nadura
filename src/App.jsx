import { useState } from 'react'
import { useNaduraData, filterLabel } from './hooks/useNaduraData'
import { Header } from './components/Header'
import { KpiCards } from './components/KpiCards'
import { InquiryVolume } from './components/InquiryVolume'
import { InquiryMix } from './components/InquiryMix'
import { ValueTrend } from './components/ValueTrend'

export default function App() {
  const [timeFilter, setTimeFilter] = useState('30d')
  const { data, loading, error } = useNaduraData(timeFilter)
  const label = filterLabel(timeFilter)

  if (loading && !data) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading The Nadura Clinic results…</span>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Header
        dataThrough={data?.dataThrough}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
      />

      {error && <div className="banner-err">Couldn’t reach the live feed: {error}</div>}

      <p className="section-label">{label} · at a glance</p>
      <KpiCards kpis={data?.kpis} windowLabel={label} />

      <p className="section-label">Inquiries &amp; classification</p>
      <div className="grid-2">
        <InquiryVolume buckets={data?.buckets || []} windowLabel={label} granularity={data?.granularity} />
        <InquiryMix mix={data?.mix} />
      </div>

      <p className="section-label">Value trend</p>
      <ValueTrend buckets={data?.buckets || []} windowLabel={label} granularity={data?.granularity} />

      <p className="note">
        Live, read-only view of the value the AI Lead &amp; Sales System delivered to The Nadura Clinic.
        Inquiries handled and test orders are counted from the clinic’s own records for the selected window;
        every outbound email is still approved by Lisa before it is sent. “Time given back” uses a conservative
        ~6 minutes saved per inquiry the system reads, classifies and drafts a reply for.
      </p>
    </div>
  )
}
