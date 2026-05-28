import { useEffect, useMemo, useState } from 'react'
import { getActiveStellarConfig } from '@/config/stellar'
import { startGasPriceMonitor, type GasPriceSnapshot } from '@services/stellar'

interface GasPriceMonitorProps {
  config?: ReturnType<typeof getActiveStellarConfig>
}

function formatTrend(snapshot: GasPriceSnapshot): string {
  const direction =
    snapshot.trend === 'up' ? 'rising' : snapshot.trend === 'down' ? 'cooling' : 'stable'
  return `${direction} ${snapshot.networkCondition}`
}

export function GasPriceMonitor({ config }: GasPriceMonitorProps) {
  const resolvedConfig = useMemo(() => config ?? getActiveStellarConfig(), [config])
  const [snapshot, setSnapshot] = useState<GasPriceSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const stop = startGasPriceMonitor({
      config: resolvedConfig,
      pollIntervalMs: 30_000,
      onUpdate: (next) => {
        if (!cancelled) {
          setSnapshot(next)
          setError(null)
        }
      },
      onError: (monitorError) => {
        if (!cancelled) {
          setError(monitorError.message)
        }
      },
    })

    return () => {
      cancelled = true
      stop()
    }
  }, [resolvedConfig])

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Gas monitor</p>
          <h3 style={titleStyle}>Track network fee pressure</h3>
          <p style={copyStyle}>
            Polls Soroban fee stats every 30 seconds and highlights when base fees begin to spike.
          </p>
        </div>
        <span
          style={{
            ...chipStyle,
            ...(snapshot?.alertLevel === 'high'
              ? highChipStyle
              : snapshot?.alertLevel === 'watch'
                ? watchChipStyle
                : calmChipStyle),
          }}
        >
          {snapshot ? snapshot.alertLevel.toUpperCase() : 'LOADING'}
        </span>
      </div>

      {snapshot ? (
        <div style={metricGridStyle}>
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>Base fee</span>
            <strong style={metricValueStyle}>{snapshot.baseFeeStroops} stroops</strong>
          </div>
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>P95</span>
            <strong style={metricValueStyle}>{snapshot.p95FeeStroops} stroops</strong>
          </div>
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>Trend</span>
            <strong style={metricValueStyle}>{formatTrend(snapshot)}</strong>
          </div>
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>Ledger</span>
            <strong style={metricValueStyle}>{snapshot.latestLedger ?? 'n/a'}</strong>
          </div>
        </div>
      ) : (
        <p style={emptyStateStyle}>Loading current fee stats...</p>
      )}

      {snapshot && (
        <p style={detailStyle}>
          Suggested inclusion fee: {snapshot.baseFeeStroops} stroops per operation. Network mode:
          {' '}
          {snapshot.networkCondition}.
        </p>
      )}

      {error && <p role="alert" style={errorStyle}>{error}</p>}
    </section>
  )
}

const panelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  borderRadius: 28,
  padding: 24,
  background: 'linear-gradient(180deg, rgba(6, 14, 31, 0.92), rgba(10, 18, 36, 0.98))',
  border: '1px solid rgba(159, 216, 255, 0.14)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
}

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#9fd8ff',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const titleStyle: React.CSSProperties = {
  margin: '0.3rem 0 0',
  fontSize: '1.35rem',
}

const copyStyle: React.CSSProperties = {
  margin: '0.65rem 0 0',
  color: '#c8d4e6',
  fontSize: 14,
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '0.5rem 0.75rem',
  fontSize: 12,
  fontWeight: 800,
  border: '1px solid rgba(255,255,255,0.08)',
}

const calmChipStyle: React.CSSProperties = {
  background: 'rgba(50, 214, 165, 0.12)',
  color: '#9ff2dd',
}

const watchChipStyle: React.CSSProperties = {
  background: 'rgba(253, 186, 116, 0.12)',
  color: '#fdba74',
}

const highChipStyle: React.CSSProperties = {
  background: 'rgba(255, 99, 132, 0.14)',
  color: '#ffc7d2',
}

const metricGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
}

const metricCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  borderRadius: 18,
  padding: '0.9rem 1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
}

const metricLabelStyle: React.CSSProperties = {
  color: '#8ea0b9',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const metricValueStyle: React.CSSProperties = {
  color: '#f8fbff',
  fontSize: '1rem',
}

const emptyStateStyle: React.CSSProperties = {
  margin: 0,
  color: '#8ea0b9',
}

const detailStyle: React.CSSProperties = {
  margin: 0,
  color: '#c8d4e6',
  fontSize: 14,
}

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: '#ffb3c1',
}
