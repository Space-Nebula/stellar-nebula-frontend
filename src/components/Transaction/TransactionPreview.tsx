import type { JSX } from 'react'
import type { ParsedSimulationResult, ContractNativeValue } from '@/utils/stellar/responseParser'

export interface TransactionPreviewCost {
  label: string
  amount: string
}

export interface TransactionPreviewOutcome {
  label: string
  value: string
}

export interface TransactionPreviewProps {
  operationName: string
  // Estimated network fee in stroops (e.g. from simulation.minResourceFee).
  feeStroops: string | number | null | undefined
  costs: TransactionPreviewCost[]
  outcomes: TransactionPreviewOutcome[]
  simulation?: ParsedSimulationResult<ContractNativeValue> | null
  simulationError?: string | null
}

function formatStroops(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Estimating…'
  const stroops = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(stroops) || stroops <= 0) return 'Estimating…'
  return `${(stroops / 10_000_000).toFixed(7)} XLM`
}

/**
 * Pre-sign review panel: shows the simulated resource costs and expected
 * outcome of a transaction so a user can verify before signing.
 */
export function TransactionPreview({
  operationName,
  feeStroops,
  costs,
  outcomes,
  simulation,
  simulationError,
}: TransactionPreviewProps): JSX.Element | null {
  const feeLabel = simulation ? formatStroops(simulation.minResourceFee) : formatStroops(feeStroops)

  return (
    <section style={panelStyle}>
      <div style={headerRowStyle}>
        <p style={eyebrowStyle}>Transaction simulation</p>
        <span
          style={{
            ...statusChipStyle,
            ...(simulation?.status === 'error' ? errorChipStyle : okChipStyle),
          }}
        >
          {simulation && simulation.status === 'error' ? 'Failure predicted' : 'Roughly safe'}
        </span>
      </div>

      <dl style={gridStyle}>
        <div style={rowStyle}>
          <dt style={labelStyle}>Operation</dt>
          <dd style={valueStyle}>{operationName}</dd>
        </div>
        <div style={rowStyle}>
          <dt style={labelStyle}>Estimated network fee</dt>
          <dd style={valueStyle}>{feeLabel}</dd>
        </div>
        {simulation?.status === 'error' && (
          <div style={rowStyle}>
            <dt style={labelStyle}>Simulation result</dt>
            <dd style={{ ...valueStyle, ...errorTextStyle }}>
              {simulationError ?? 'Simulation predicted failure.'}
            </dd>
          </div>
        )}
      </dl>

      {costs.length > 0 && (
        <div>
          <p style={sectionLabelStyle}>Resource costs</p>
          <dl style={gridStyle}>
            {costs.map((cost) => (
              <div key={cost.label} style={rowStyle}>
                <dt style={labelStyle}>{cost.label}</dt>
                <dd style={valueStyle}>{cost.amount}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {outcomes.length > 0 && (
        <div>
          <p style={sectionLabelStyle}>Expected outcome</p>
          <dl style={gridStyle}>
            {outcomes.map((outcome) => (
              <div key={outcome.label} style={rowStyle}>
                <dt style={labelStyle}>{outcome.label}</dt>
                <dd style={valueStyle}>{outcome.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}

const panelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
  borderRadius: 18,
  padding: '1rem',
  background: 'rgba(50, 214, 165, 0.06)',
  border: '1px solid rgba(50, 214, 165, 0.18)',
  marginBottom: 18,
}

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#32d6a5',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const statusChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '0.35rem 0.7rem',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const okChipStyle: React.CSSProperties = {
  background: 'rgba(50, 214, 165, 0.12)',
  color: '#9ff2dd',
}

const errorChipStyle: React.CSSProperties = {
  background: 'rgba(255, 99, 132, 0.14)',
  color: '#ffb3c1',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  margin: 0,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
}

const labelStyle: React.CSSProperties = {
  color: '#8ea0b9',
  fontSize: 13,
}

const valueStyle: React.CSSProperties = {
  color: '#f8fbff',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'right',
  wordBreak: 'break-word',
  margin: 0,
}

const errorTextStyle: React.CSSProperties = {
  color: '#ffc7d2',
}

const sectionLabelStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: '#8ea0b9',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
}
