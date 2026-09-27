import type { StellarTransaction } from '@/types'

/**
 * Windowing and page-merging helpers for the transaction history list.
 *
 * The list pages from Horizon with a cursor, so the number of *loaded*
 * transactions grows one page at a time. Rendering every one of them is what
 * makes a long history slow: the DOM grows without bound while the data stays
 * small, and every node carries a memo, timestamps and a list of operations. So
 * only the rows near the viewport are mounted, and the rest are represented by
 * two spacer elements whose heights come from the row estimate.
 *
 * This is deliberately not a dependency. A general virtualiser handles
 * variable-height rows, grids and sticky headers; this list is uniform cards in
 * a single column, and a dependency would be a larger dependency than the
 * problem.
 */

/** Row height used for the scroll-height estimate, in pixels. */
export const ROW_HEIGHT = 168

/** Rows rendered beyond the viewport so a fast scroll does not flash blanks. */
export const DEFAULT_OVERSCAN = 4

export interface RowWindow {
  /** Index of the first rendered row. */
  start: number
  /** Index *after* the last rendered row. */
  end: number
  /** Height of the spacer above the rendered rows. */
  padTop: number
  /** Height of the spacer below the rendered rows. */
  padBottom: number
}

/**
 * The slice of rows to mount for a given scroll position.
 *
 * Clamps at both ends, so a list shorter than the viewport, a scroll position
 * past the end (which happens when rows are added above the current offset), and
 * an empty list all produce a valid window rather than a negative index.
 */
export function computeRowWindow(params: {
  scrollTop: number
  viewportHeight: number
  count: number
  rowHeight?: number
  overscan?: number
}): RowWindow {
  const { scrollTop, viewportHeight, count } = params
  const rowHeight = params.rowHeight ?? ROW_HEIGHT
  const overscan = params.overscan ?? DEFAULT_OVERSCAN

  if (count <= 0) return { start: 0, end: 0, padTop: 0, padBottom: 0 }

  const safeRowHeight = rowHeight > 0 ? rowHeight : 1
  const visible = Math.max(1, Math.ceil(viewportHeight / safeRowHeight))
  // A negative scroll offset (rubber-banding) must not produce a negative index.
  const firstVisible = Math.max(0, Math.floor(Math.max(0, scrollTop) / safeRowHeight))

  const start = Math.max(0, firstVisible - overscan)
  const end = Math.min(count, firstVisible + visible + overscan)

  return {
    start,
    end,
    padTop: start * safeRowHeight,
    padBottom: Math.max(0, (count - end) * safeRowHeight)
  }
}

/**
 * Merge a newly fetched page into what is already loaded.
 *
 * Two things the naive `append` gets wrong:
 *
 *  - **Duplicates.** A cursor page can overlap the previous one when
 *    transactions land between requests, and the same hash then renders twice
 *    with the same React key.
 *  - **Order.** Horizon answers `order: 'desc'`, so a page is newest-first, and
 *    the list is displayed oldest-first. Appending and re-sorting the whole
 *    accumulated array on every page is O(n log n) per click, which is the
 *    avoidable half of the cost.
 *
 * The result is sorted oldest-first, so the newest transaction stays at the
 * bottom of the list exactly as before.
 */
export function mergeTransactionPages(
  current: readonly StellarTransaction[],
  incoming: readonly StellarTransaction[]
): StellarTransaction[] {
  if (incoming.length === 0) return current.slice()

  const byHash = new Map<string, StellarTransaction>()
  for (const tx of current) byHash.set(tx.hash, tx)
  for (const tx of incoming) {
    // Later pages win on a hash collision: the newer fetch has the fresher
    // record for the same transaction.
    byHash.set(tx.hash, tx)
  }

  return Array.from(byHash.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}
