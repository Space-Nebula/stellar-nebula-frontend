import { describe, expect, it } from 'vitest'
import {
  computeRowWindow,
  mergeTransactionPages,
  DEFAULT_OVERSCAN,
  ROW_HEIGHT
} from '../transactionWindow'
import type { StellarTransaction } from '@/types'

/**
 * Windowing and page merging for the history list (#316).
 *
 * The list already paged from Horizon with a cursor; what it did not do was bound
 * the work per page. Every loaded row was mounted, and each append re-sorted the
 * whole accumulated array — so a long history got slower with every "Load more",
 * which is the performance complaint behind the issue. These tests pin the two
 * decisions that make the cost independent of history length: how many rows are
 * mounted, and what merging a page does to the list.
 */
function tx(hash: string, createdAt: string, extra: Partial<StellarTransaction> = {}): StellarTransaction {
  return {
    hash,
    createdAt,
    sourceAccount: 'GABC',
    feeCharged: '100',
    status: 'success',
    memo: null,
    ...extra
  } as StellarTransaction
}

describe('computeRowWindow', () => {
  it('mounts nothing for an empty list', () => {
    expect(computeRowWindow({ scrollTop: 0, viewportHeight: 600, count: 0 })).toEqual({
      start: 0,
      end: 0,
      padTop: 0,
      padBottom: 0
    })
  })

  it('mounts only the visible rows plus overscan, not the whole list', () => {
    const w = computeRowWindow({ scrollTop: 0, viewportHeight: 600, count: 500 })

    const visibleRows = Math.ceil(600 / ROW_HEIGHT)
    expect(w.start).toBe(0)
    expect(w.end).toBe(visibleRows + DEFAULT_OVERSCAN)
    // The point: the mounted count does not grow with the history.
    expect(w.end - w.start).toBeLessThan(20)
  })

  it('keeps the mounted count constant as the history grows', () => {
    const small = computeRowWindow({ scrollTop: 0, viewportHeight: 600, count: 20 })
    const large = computeRowWindow({ scrollTop: 0, viewportHeight: 600, count: 5000 })

    expect(large.end - large.start).toBe(small.end - small.start)
  })

  it('moves the window with the scroll position', () => {
    const w = computeRowWindow({ scrollTop: ROW_HEIGHT * 50, viewportHeight: 600, count: 500 })

    expect(w.start).toBe(50 - DEFAULT_OVERSCAN)
    expect(w.padTop).toBe((50 - DEFAULT_OVERSCAN) * ROW_HEIGHT)
  })

  it('pads above and below so the scrollbar still reflects every row', () => {
    const w = computeRowWindow({ scrollTop: ROW_HEIGHT * 50, viewportHeight: 600, count: 500 })
    const total = w.padTop + (w.end - w.start) * ROW_HEIGHT + w.padBottom

    expect(total).toBe(500 * ROW_HEIGHT)
  })

  it('clamps at the end of the list', () => {
    const w = computeRowWindow({ scrollTop: ROW_HEIGHT * 5000, viewportHeight: 600, count: 100 })

    expect(w.end).toBe(100)
    expect(w.padBottom).toBe(0)
  })

  it('renders the whole list when it is shorter than the viewport', () => {
    const w = computeRowWindow({ scrollTop: 0, viewportHeight: 4000, count: 3 })

    expect(w.start).toBe(0)
    expect(w.end).toBe(3)
    expect(w.padTop).toBe(0)
    expect(w.padBottom).toBe(0)
  })

  it('never produces a negative index or height from a rubber-banded scroll', () => {
    const w = computeRowWindow({ scrollTop: -500, viewportHeight: 600, count: 50 })

    expect(w.start).toBe(0)
    expect(w.padTop).toBe(0)
    expect(w.padBottom).toBeGreaterThanOrEqual(0)
  })

  it('survives a zero or negative row height instead of dividing by zero', () => {
    for (const rowHeight of [0, -10]) {
      const w = computeRowWindow({ scrollTop: 100, viewportHeight: 600, count: 5, rowHeight })
      expect(Number.isFinite(w.padTop)).toBe(true)
      expect(Number.isFinite(w.padBottom)).toBe(true)
      expect(w.end).toBeLessThanOrEqual(5)
    }
  })
})

describe('mergeTransactionPages', () => {
  const page1 = [tx('a', '2026-01-01T00:00:00Z'), tx('c', '2026-01-03T00:00:00Z')]
  const page2 = [tx('c', '2026-01-03T00:00:00Z'), tx('b', '2026-01-02T00:00:00Z')]

  it('orders the list oldest first, keeping the newest at the bottom', () => {
    expect(mergeTransactionPages(page1, page2).map((t) => t.hash)).toEqual(['a', 'b', 'c'])
  })

  it('drops a transaction that appears on both pages', () => {
    // Cursor pages overlap when something lands between two requests, and the
    // duplicate would otherwise render twice under the same React key.
    const merged = mergeTransactionPages(page1, page2)

    expect(merged.filter((t) => t.hash === 'c')).toHaveLength(1)
    expect(merged).toHaveLength(3)
  })

  it('prefers the newer record when a hash is refetched', () => {
    const merged = mergeTransactionPages(
      [tx('x', '2026-01-01T00:00:00Z', { memo: 'stale' })],
      [tx('x', '2026-01-01T00:00:00Z', { memo: 'fresh' })]
    )

    expect(merged).toHaveLength(1)
    expect(merged[0].memo).toBe('fresh')
  })

  it('returns a copy rather than the same array when the page is empty', () => {
    const current = [tx('a', '2026-01-01T00:00:00Z')]
    const merged = mergeTransactionPages(current, [])

    expect(merged).toEqual(current)
    expect(merged).not.toBe(current)
  })

  it('replaces rather than merges when a page is loaded without appending', () => {
    // The refresh path passes an empty accumulator, so a re-fetch does not
    // accumulate history across refreshes.
    const merged = mergeTransactionPages([], page2)

    expect(merged.map((t) => t.hash)).toEqual(['b', 'c'])
  })

  it('handles an unparseable timestamp without dropping the row', () => {
    const merged = mergeTransactionPages(
      [tx('good', '2026-01-01T00:00:00Z')],
      [tx('bad', 'not-a-date'), tx('also-good', '2026-01-02T00:00:00Z')]
    )

    expect(merged.map((t) => t.hash).sort()).toEqual(['also-good', 'bad', 'good'])
  })
})
