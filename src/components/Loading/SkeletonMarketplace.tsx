/**
 * SkeletonMarketplace
 *
 * Placeholder shimmer shown while the Marketplace page is loading.
 */
export function SkeletonMarketplace() {
  return (
    <div className="skeleton-marketplace" aria-busy="true" aria-label="Loading marketplace">
      <div className="skeleton skeleton-block skeleton-marketplace-header" />
      <div className="skeleton skeleton-card skeleton-marketplace-body" />
    </div>
  )
}
