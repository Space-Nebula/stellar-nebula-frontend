import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StellarNetworkConfig } from '@config/stellar'
import { getTransactionHistory, type PaginatedTransactions } from '@services/history/transactions'
import type { StellarTransaction } from '@/types'
import { EmptyTransactions } from '@/components/UI/EmptyStates'
import { sanitizeContractString } from '@/utils/xss-protection'
import { computeRowWindow, mergeTransactionPages } from './transactionWindow'

interface TransactionHistoryProps {
  accountId: string | null | undefined
  title?: string
  pageSize?: number
  config?: StellarNetworkConfig
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

function formatPublicKey(value: string): string {
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}…${value.slice(-6)}`
}

function TransactionItem({ tx }: { tx: StellarTransaction }) {
  const summary: ReactNode[] = [
    <span key="source">
      Source: <strong>{formatPublicKey(tx.sourceAccount)}</strong>
    </span>,
    <span key="fee">Fee: {tx.feeCharged} stroops</span>,
  ]

  if (tx.ledger !== undefined) {
    summary.push(
      <span key="ledger">
        Ledger: <strong>{tx.ledger}</strong>
      </span>
    )
  }

  return (
    <article style={itemStyle}>
      <div style={itemHeaderStyle}>
        <div>
          <strong style={hashStyle}>{tx.hash.slice(0, 12)}…</strong>
          <p style={metaStyle}>{formatTimestamp(tx.createdAt)}</p>
        </div>
        <span style={statusStyle(tx.status === 'success')}>
          {tx.status === 'success' ? 'Successful' : 'Failed'}
        </span>
      </div>

      {/* #301 — a memo is arbitrary text any counterparty can attach to a payment. */}
      <p style={memoStyle}>{tx.memo ? sanitizeContractString(tx.memo) : 'No memo attached'}</p>

      <ul style={opListStyle}>
        {summary.map((line, index) => (
          <li key={index} style={opItemStyle}>
            {line}
          </li>
        ))}
      </ul>
    </article>
  )
}

export function TransactionHistory({
  accountId,
  title = 'Transaction history',
  pageSize = 8,
  config,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<StellarTransaction[]>([])
  const [nextHref, setNextHref] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only the rows near the viewport are mounted. `scrollTop` is tracked in state
  // rather than read on scroll so the window recomputes; a ref would update the
  // DOM without re-rendering it, which is the bug this replaces.
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const canLoadMore = useMemo(() => Boolean(nextHref), [nextHref])

  // The rows to mount, given the current scroll position and how much is visible.
  const window = useMemo(
    () => computeRowWindow({ scrollTop, viewportHeight, count: transactions.length }),
    [scrollTop, transactions.length, viewportHeight]
  )

  const loadPage = useCallback(
    async (cursor?: string, append = false) => {
      if (!accountId) {
        setTransactions([])
        setNextHref(null)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const page: PaginatedTransactions = await getTransactionHistory(
          accountId,
          { limit: pageSize, order: 'desc', cursor },
          config
        )
        setTransactions((current) =>
          mergeTransactionPages(append ? current : [], page.transactions)
        )
        setNextHref(page.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load transaction history')
      } finally {
        setIsLoading(false)
      }
    },
    [accountId, config, pageSize]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage(undefined, false)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadPage])

  if (!accountId) {
    return (
      <section style={panelStyle}>
        <h2 style={titleStyle}>{title}</h2>
        <p style={emptyStyle}>Connect a wallet to inspect ship upgrades and asset activity.</p>
      </section>
    )
  }

  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={titleStyle}>{title}</h2>
        <p style={subtitleStyle}>
          Game-relevant transactions for {formatPublicKey(accountId)}, fetched from Horizon.
        </p>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      {transactions.length === 0 && !isLoading ? (
        <EmptyTransactions compact />
      ) : (
        <div
          style={scrollStyle}
          ref={scrollRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          <div style={listStyle}>
            {/* Placeholders for the rows that are not mounted, so the scrollbar
                still reflects the whole list. */}
            {window.padTop > 0 && <div style={spacerStyle(window.padTop)} aria-hidden="true" />}
            {transactions.slice(window.start, window.end).map((tx) => (
              <TransactionItem key={tx.hash} tx={tx} />
            ))}
            {window.padBottom > 0 && <div style={spacerStyle(window.padBottom)} aria-hidden="true" />}
          </div>
        </div>
        {viewportHeight === 0 && (
          // Measured after mount; before that the window cannot know how much is
          // visible, so every row is mounted once to establish the height.
          <ViewportProbe onMeasured={setViewportHeight} targetRef={scrollRef} />
        )}
      )}

      <div style={actionsStyle}>
        <button
          type="button"
          onClick={() => void loadPage(undefined, false)}
          style={buttonStyle}
          aria-label="Retry loading transaction history"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => void loadPage(nextHref ?? undefined, true)}
          disabled={!canLoadMore || isLoading}
          style={buttonStyle}
        >
          {isLoading ? 'Loading…' : canLoadMore ? 'Load more' : 'End of list'}
        </button>
      </div>
    </section>
  )
}

const panelStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: 20,
  borderRadius: 20,
  border: '1px solid rgba(159, 216, 255, 0.16)',
  background: 'linear-gradient(180deg, rgba(6, 12, 26, 0.92), rgba(9, 17, 33, 0.98))',
  boxShadow: '0 18px 50px rgba(0, 0, 0, 0.28)',
}

const panelHeaderStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
}

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: '#c8d4e6',
  fontSize: '0.92rem',
}

const emptyStyle: CSSProperties = {
  margin: 0,
  color: '#c8d4e6',
}

const errorStyle: CSSProperties = {
  margin: 0,
  color: '#fdba74',
}

const listStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
}

/**
 * A fixed-height scroll viewport. A bounded viewport is what makes windowing
 * possible at all: without one the container grows to fit every row and
 * "visible" is the entire list.
 */
const scrollStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  maxHeight: 640,
  overflowY: 'auto',
  // Keeps a scrollbar on platforms that overlay it, so the list looks scrollable.
  overflowAnchor: 'none'
}

const spacerStyle = (height: number): CSSProperties => ({ height })

/**
 * Reports the viewport height once the scroll container is laid out.
 *
 * `offsetHeight` is 0 in jsdom, so this falls back to the style's `maxHeight`
 * rather than reporting a zero-height viewport that would mount one row.
 */
function ViewportProbe({
  targetRef,
  onMeasured
}: {
  targetRef: React.RefObject<HTMLDivElement | null>
  onMeasured: (height: number) => void
}) {
  useEffect(() => {
    const node = targetRef.current
    if (!node) return
    const measured = node.offsetHeight || parseInt(scrollStyle.maxHeight as string, 10) || 640
    onMeasured(measured)
  }, [onMeasured, targetRef])

  return null
}

const itemStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 14,
  borderRadius: 16,
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
}

const itemHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
}

const hashStyle: CSSProperties = {
  fontSize: '0.95rem',
  color: '#f8fbff',
}

const metaStyle: CSSProperties = {
  margin: '4px 0 0',
  color: '#8da2bd',
  fontSize: '0.82rem',
}

const memoStyle: CSSProperties = {
  margin: 0,
  color: '#d6e0ef',
  fontSize: '0.92rem',
}

const statusStyle = (successful: boolean): CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: '0.78rem',
  fontWeight: 700,
  color: successful ? '#06131d' : '#1f2937',
  background: successful ? '#9fd8ff' : '#f9a8d4',
})

const opListStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  margin: 0,
  paddingLeft: 18,
  color: '#b9c6dd',
  fontSize: '0.86rem',
}

const opItemStyle: CSSProperties = {
  lineHeight: 1.4,
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const buttonStyle: CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(159, 216, 255, 0.24)',
  background: 'rgba(159, 216, 255, 0.09)',
  color: '#f8fbff',
  padding: '0.6rem 0.9rem',
  fontWeight: 700,
}
