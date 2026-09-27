import { describe, expect, it, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '../../../test/utils'
import { TransactionHistory } from '../TransactionHistory'
import { ROW_HEIGHT } from '../transactionWindow'
import type { StellarTransaction } from '@/types'

/**
 * The history list pages from Horizon, so what it does per page is what decides
 * whether a long history stays usable (#316). The list previously mounted every
 * loaded row and re-sorted the whole accumulated array on each append, so the
 * cost grew with the length of the history rather than with the size of a page.
 *
 * These tests assert the two properties that make the cost flat: only the rows
 * near the viewport are in the DOM, and appending a page merges rather than
 * concatenates.
 */
const { mockGetTransactionHistory } = vi.hoisted(() => ({
  mockGetTransactionHistory: vi.fn()
}))

vi.mock('@services/history/transactions', () => ({
  getTransactionHistory: mockGetTransactionHistory
}))

function tx(index: number, overrides: Partial<StellarTransaction> = {}): StellarTransaction {
  return {
    hash: `hash-${index}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    sourceAccount: `G${'A'.repeat(50)}`,
    feeCharged: '100',
    status: 'success',
    memo: `memo ${index}`,
    ledger: index,
    ...overrides
  } as StellarTransaction
}

const ACCOUNT = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV'

function page(items: StellarTransaction[], nextCursor: string | null) {
  return { transactions: items, nextCursor, hasMore: nextCursor !== null }
}

/** Rows actually mounted in the DOM. */
const mountedRows = (): number => screen.getAllByRole('article').length

describe('TransactionHistory pagination', () => {
  beforeEach(() => {
    mockGetTransactionHistory.mockReset()
  })

  it('mounts only a window of rows, not the whole loaded page', async () => {
    mockGetTransactionHistory.mockResolvedValue(page(Array.from({ length: 400 }, (_, i) => tx(i)), null))

    render(<TransactionHistory accountId={ACCOUNT} pageSize={400} />)

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
    })

    // 400 rows were loaded; a handful are in the DOM.
    expect(mockGetTransactionHistory).toHaveBeenCalled()
    expect(mountedRows()).toBeLessThan(30)
  })

  it('keeps the mounted count flat as more pages are loaded', async () => {
    const user = userEvent.setup()
    const first = Array.from({ length: 60 }, (_, i) => tx(i))
    const second = Array.from({ length: 60 }, (_, i) => tx(i + 60))
    const third = Array.from({ length: 60 }, (_, i) => tx(i + 120))

    mockGetTransactionHistory
      .mockResolvedValueOnce(page(first, 'cursor-1'))
      .mockResolvedValueOnce(page(second, 'cursor-2'))
      .mockResolvedValueOnce(page(third, null))

    render(<TransactionHistory accountId={ACCOUNT} pageSize={60} />)

    await waitFor(() => expect(mountedRows()).toBeGreaterThan(0))
    const afterFirst = mountedRows()

    await user.click(screen.getByRole('button', { name: /load more/i }))
    await waitFor(() => expect(mockGetTransactionHistory).toHaveBeenCalledTimes(2))
    const afterSecond = mountedRows()

    await user.click(screen.getByRole('button', { name: /load more/i }))
    await waitFor(() => expect(mockGetTransactionHistory).toHaveBeenCalledTimes(3))
    const afterThird = mountedRows()

    // 180 rows are loaded in total; the DOM does not grow with them.
    expect(afterThird).toBe(afterFirst)
    expect(afterSecond).toBe(afterFirst)
    expect(afterThird).toBeLessThan(30)
  })

  it('passes the cursor when loading the next page', async () => {
    const user = userEvent.setup()
    mockGetTransactionHistory
      .mockResolvedValueOnce(page([tx(0), tx(1)], 'cursor-abc'))
      .mockResolvedValueOnce(page([tx(2)], null))

    render(<TransactionHistory accountId={ACCOUNT} pageSize={2} />)
    await waitFor(() => expect(mockGetTransactionHistory).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: /load more/i }))
    await waitFor(() => expect(mockGetTransactionHistory).toHaveBeenCalledTimes(2))

    // The first call has no cursor; the second continues from the previous one.
    expect(mockGetTransactionHistory.mock.calls[0][1].cursor).toBeUndefined()
    expect(mockGetTransactionHistory.mock.calls[1][1].cursor).toBe('cursor-abc')
  })

  it('does not render a transaction that appears on two pages twice', async () => {
    const user = userEvent.setup()
    const overlap = tx(1)
    mockGetTransactionHistory
      // A cursor page overlapping the previous one, which happens when something
      // lands between two requests.
      .mockResolvedValueOnce(page([tx(0), overlap], 'cursor-1'))
      .mockResolvedValueOnce(page([overlap, tx(2)], null))

    render(<TransactionHistory accountId={ACCOUNT} pageSize={2} />)
    await waitFor(() => expect(mountedRows()).toBeGreaterThan(0))

    await user.click(screen.getByRole('button', { name: /load more/i }))
    await waitFor(() => expect(mockGetTransactionHistory).toHaveBeenCalledTimes(2))

    // Each hash is rendered exactly once. The row shows the hash in its first
    // <strong>, so that is what identifies a duplicate.
    const rendered = Array.from(document.querySelectorAll('article strong'))
      .map((node) => node.textContent)
      .filter((text): text is string => Boolean(text?.startsWith('hash-')))
    expect(rendered.length).toBeGreaterThan(0)
    expect(new Set(rendered).size).toBe(rendered.length)
  })

  it('shows the end of the list once the last page has no cursor', async () => {
    const user = userEvent.setup()
    mockGetTransactionHistory
      .mockResolvedValueOnce(page([tx(0)], 'cursor-1'))
      .mockResolvedValueOnce(page([tx(1)], null))

    render(<TransactionHistory accountId={ACCOUNT} pageSize={1} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /load more/i })).toBeEnabled())

    await user.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end of list/i })).toBeDisabled()
    })
  })

  it('pads the unrendered rows so the scroll height still matches the history', async () => {
    mockGetTransactionHistory.mockResolvedValue(page(Array.from({ length: 200 }, (_, i) => tx(i)), null))

    const { container } = render(<TransactionHistory accountId={ACCOUNT} pageSize={200} />)
    await waitFor(() => expect(mountedRows()).toBeGreaterThan(0))

    // Two spacers stand in for the rows that are not mounted.
    const spacers = container.querySelectorAll('div[aria-hidden="true"]')
    expect(spacers.length).toBeGreaterThan(0)
    const spacerHeights = Array.from(spacers).map((node) => parseInt(node.style.height, 10))
    expect(spacerHeights.some((height) => height > 0)).toBe(true)
  })

  it('replaces the list on refresh instead of accumulating it', async () => {
    const user = userEvent.setup()
    mockGetTransactionHistory.mockResolvedValue(page([tx(0), tx(1)], null))

    render(<TransactionHistory accountId={ACCOUNT} pageSize={2} />)
    await waitFor(() => expect(mountedRows()).toBe(2))

    await user.click(screen.getByRole('button', { name: /retry loading transaction history/i }))

    // A refresh re-reads the first page; the same rows are still there, not
    // duplicated by an append.
    await waitFor(() => expect(mockGetTransactionHistory).toHaveBeenCalledTimes(2))
    expect(mountedRows()).toBe(2)
  })

  it('surfaces a load failure without dropping what is already loaded', async () => {
    const user = userEvent.setup()
    mockGetTransactionHistory
      .mockResolvedValueOnce(page([tx(0)], 'cursor-1'))
      .mockRejectedValueOnce(new Error('Horizon rate limit reached'))

    render(<TransactionHistory accountId={ACCOUNT} pageSize={1} />)
    await waitFor(() => expect(mountedRows()).toBe(1))

    await user.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => {
      expect(screen.getByText(/horizon rate limit reached/i)).toBeInTheDocument()
    })
    // The already-loaded page is still on screen.
    expect(mountedRows()).toBe(1)
  })

  it('estimates row height so the scroll position maps to a row index', () => {
    // The window math depends on a stable row height; a list whose rows are not
    // close to this would scroll imprecisely.
    expect(ROW_HEIGHT).toBeGreaterThan(0)
  })
})
