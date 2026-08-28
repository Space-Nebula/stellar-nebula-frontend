import { useEffect, useMemo, useState } from 'react'
import {
  startContractEventListener,
  type ContractEventRecord,
} from '@/services/contracts/eventListener'
import { useDebounce } from '@/hooks'

interface ContractEventFeedProps {
  defaultContractId?: string
}

export function ContractEventFeed({ defaultContractId = '' }: ContractEventFeedProps) {
  const [contractId, setContractId] = useState(defaultContractId)
  const [events, setEvents] = useState<ContractEventRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const debouncedContractId = useDebounce(contractId.trim(), 250)
  const canStream = useMemo(
    () => /^C[A-Z2-7]{55}$/.test(debouncedContractId),
    [debouncedContractId]
  )
  const isLive = canStream

  useEffect(() => {
    if (!canStream) {
      return
    }

    const resetHandle = setTimeout(() => {
      setEvents([])
      setError(null)
    }, 0)

    const stop = startContractEventListener({
      contractId: debouncedContractId,
      onEvent: (event) => {
        setEvents((current) => [event, ...current].slice(0, 8))
      },
      onError: (listenerError) => {
        setError(listenerError.message)
      },
    })

    return () => {
      clearTimeout(resetHandle)
      stop()
    }
  }, [canStream, debouncedContractId])

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Contract events</p>
          <h3 style={titleStyle}>Live event listener</h3>
          <p style={copyStyle}>
            Horizon keeps the stream live while RPC fetches the contract events for the selected
            contract ID.
          </p>
        </div>
        <span style={{ ...chipStyle, ...(isLive ? liveChipStyle : idleChipStyle) }}>
          {isLive ? 'Streaming' : 'Idle'}
        </span>
      </div>

      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Contract ID</span>
        <input
          value={contractId}
          onChange={(event) => setContractId(event.target.value.trim())}
          placeholder="C..."
          style={inputStyle}
        />
      </label>

      {!canStream && contractId.trim() && (
        <p style={hintStyle}>Enter a valid Soroban contract ID to start streaming events.</p>
      )}

      <div style={feedStyle}>
        {events.length === 0 ? (
          <p style={emptyStateStyle}>No live events yet.</p>
        ) : (
          events.map((event) => (
            <article key={event.id} style={eventCardStyle}>
              <div style={eventHeaderStyle}>
                <span style={eventTypeStyle}>{event.type}</span>
                <span style={eventMetaStyle}>
                  {event.ledger ? `Ledger ${event.ledger}` : 'Live'}
                </span>
              </div>
              <p style={eventSummaryStyle}>{event.summary}</p>
              <p style={eventMetaStyle}>{event.txHash ?? 'Transaction hash unavailable'}</p>
            </article>
          ))
        )}
      </div>

      {error && (
        <p role="alert" style={errorStyle}>
          {error}
        </p>
      )}
    </section>
  )
}

const panelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  borderRadius: 28,
  padding: 24,
  background: 'linear-gradient(180deg, rgba(7, 16, 34, 0.9), rgba(11, 21, 44, 0.95))',
  border: '1px solid rgba(50, 214, 165, 0.14)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
}

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#32d6a5',
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
  fontWeight: 700,
  border: '1px solid rgba(255,255,255,0.08)',
}

const liveChipStyle: React.CSSProperties = {
  background: 'rgba(50, 214, 165, 0.12)',
  color: '#9ff2dd',
}

const idleChipStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  color: '#d8e4f4',
}

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
}

const fieldLabelStyle: React.CSSProperties = {
  color: '#8ea0b9',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  color: '#f8fbff',
  padding: '0.8rem 1rem',
  outline: 'none',
}

const hintStyle: React.CSSProperties = {
  margin: 0,
  color: '#8ea0b9',
  fontSize: 13,
}

const feedStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
}

const emptyStateStyle: React.CSSProperties = {
  margin: 0,
  padding: '1rem',
  borderRadius: 18,
  background: 'rgba(255,255,255,0.03)',
  border: '1px dashed rgba(255,255,255,0.08)',
  color: '#8ea0b9',
}

const eventCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  borderRadius: 18,
  padding: '0.9rem 1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
}

const eventHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
}

const eventTypeStyle: React.CSSProperties = {
  color: '#9ff2dd',
  fontWeight: 800,
}

const eventMetaStyle: React.CSSProperties = {
  color: '#8ea0b9',
  fontSize: 12,
}

const eventSummaryStyle: React.CSSProperties = {
  margin: 0,
  color: '#f8fbff',
  fontSize: 14,
}

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: '#ffb3c1',
}
