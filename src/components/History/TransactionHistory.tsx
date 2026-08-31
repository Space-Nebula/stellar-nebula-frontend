import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { StellarNetworkConfig } from '@config/stellar'
import { getTransactionHistory, type PaginatedTransactions } from '@services/history/transactions'
import type { StellarTransaction } from '@/types'
import { EmptyTransactions } from '@/components/UI/EmptyStates'

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

      <p style={memoStyle}>{tx.memo ?? 'No memo attached'}</p>

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

  const canLoadMore = useMemo(() => Boolean(nextHref), [nextHref])

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
        setTransactions((current) => {
          const next = append ? [...current, ...page.transactions] : page.transactions
          return next.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        })
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
        <div style={listStyle}>
          {transactions.map((tx) => (
            <TransactionItem key={tx.hash} tx={tx} />
          ))}
        </div>
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
