/**
 * SkeletonDashboard
 *
 * Placeholder shimmer shown while the Ship Dashboard page is loading.
 * Mirrors the real layout: hero → metrics → fleet/inventory grid.
 */
export function SkeletonDashboard() {
  return (
    <section className="skeleton-dashboard" aria-busy="true" aria-label="Loading ship dashboard">
      {/* Hero banner */}
      <div className="skeleton skeleton-block skeleton-hero" />

      {/* Metric row */}
      <div className="skeleton-metric-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card skeleton-metric" />
        ))}
      </div>

      {/* Main grid: fleet panel + inventory column */}
      <div className="skeleton-grid-two">
        <div className="skeleton skeleton-card skeleton-panel" />
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="skeleton skeleton-card skeleton-panel" />
          <div className="skeleton skeleton-card" style={{ height: '8rem' }} />
        </div>
      </div>
    </section>
  )
}
