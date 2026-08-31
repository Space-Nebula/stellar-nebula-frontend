/**
 * SkeletonNebulaView
 *
 * Placeholder shimmer shown while the Nebula View page is loading.
 * Mirrors: header → canvas → resource grid → harvest log.
 */
export function SkeletonNebulaView() {
  return (
    <div className="skeleton-nebula" aria-busy="true" aria-label="Loading nebula view">
      {/* Page header */}
      <div className="skeleton skeleton-block skeleton-nebula-header" />

      {/* Canvas area */}
      <div className="skeleton skeleton-block skeleton-nebula-canvas" />

      {/* Resource grid */}
      <div className="skeleton-nebula-grid">
        <div className="skeleton skeleton-card skeleton-nebula-panel" />
        <div className="skeleton skeleton-card skeleton-nebula-panel" />
      </div>

      {/* Harvest log panel */}
      <div className="skeleton skeleton-card" style={{ height: '14rem', borderRadius: 24 }} />
    </div>
  )
}
