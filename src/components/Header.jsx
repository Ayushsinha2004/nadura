import { TIME_FILTERS } from '../hooks/useNaduraData'

export function Header({ dataThrough, timeFilter, onTimeFilterChange }) {
  const through = dataThrough
    ? new Date(dataThrough).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  return (
    <header className="hdr">
      <div className="hdr-brand">
        <img className="hdr-logo-img" src="/clinic-logo.jpg" alt="The Nadura Clinic" />
        <div className="hdr-divider" />
        <div>
          <div className="hdr-title">Results<span className="beta">LIVE</span></div>
          <div className="hdr-sub">Lead &amp; Sales System · the value delivered</div>
        </div>
      </div>

      <div className="hdr-right">
        <div className="filter" role="tablist" aria-label="Time range">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-btn${timeFilter === f.key ? ' active' : ''}`}
              onClick={() => onTimeFilterChange(f.key)}
              aria-selected={timeFilter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="hdr-meta">
          <span className="dot" /><span className="live">Live</span>
          {through && <span className="thru"> · through {through}</span>}
        </div>
      </div>
    </header>
  )
}
