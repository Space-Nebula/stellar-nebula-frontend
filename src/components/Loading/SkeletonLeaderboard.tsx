/**
 * SkeletonLeaderboard
 *
 * Placeholder shimmer shown while the Leaderboard page is loading.
 */
export function SkeletonLeaderboard() {
  return (
    <div className="skeleton-leaderboard" aria-busy="true" aria-label="Loading leaderboard">
      <div className="skeleton skeleton-block skeleton-leaderboard-header" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton skeleton-leaderboard-row" />
      ))}
    </div>
  )
}
