import * as StellarSdk from '@stellar/stellar-sdk'
import { createHorizonServer, getActiveStellarConfig } from '@/config/stellar'

export type ContractEventType = 'ScanCompleted' | 'ShipUpgraded' | 'ResourceMinted' | 'Unknown'

export interface ContractEventRecord {
  id: string
  type: ContractEventType
  summary: string
  ledger?: number
  txHash?: string
  contractId?: string
  timestamp?: string
  raw: unknown
}

export interface ContractEventListenerOptions {
  contractId?: string
  horizonUrl?: string
  rpcUrl?: string
  onEvent: (event: ContractEventRecord) => void
  onError?: (error: Error) => void
}

function readTextLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  const candidates = [
    record.name,
    record.type,
    record.event_type,
    record.summary,
    record.topic,
    record.topics,
    record.data,
    record.value,
  ]

  return candidates
    .map((candidate) => {
      if (typeof candidate === 'string') return candidate
      if (Array.isArray(candidate)) return candidate.map(readTextLike).join(' ')
      if (candidate && typeof candidate === 'object') return JSON.stringify(candidate)
      return ''
    })
    .join(' ')
}

function detectType(text: string): ContractEventType {
  const normalized = text.toLowerCase()
  if (normalized.includes('scancompleted')) return 'ScanCompleted'
  if (normalized.includes('shipupgraded')) return 'ShipUpgraded'
  if (normalized.includes('resourceminted')) return 'ResourceMinted'
  return 'Unknown'
}

function buildSummary(type: ContractEventType, text: string): string {
  switch (type) {
    case 'ScanCompleted':
      return 'A scan completed successfully.'
    case 'ShipUpgraded':
      return 'A ship upgrade event was detected.'
    case 'ResourceMinted':
      return 'A resource mint event was detected.'
    default:
      return text || 'Unclassified contract activity.'
  }
}

function normalizeContractEvent(raw: unknown): ContractEventRecord {
  const text = readTextLike(raw)
  const type = detectType(text)
  const record = raw as Record<string, unknown> | null

  return {
    id:
      (record?.id as string | undefined) ||
      (record?.paging_token as string | undefined) ||
      `event-${Date.now()}`,
    type,
    summary: buildSummary(type, text),
    ledger:
      typeof record?.ledger === 'number'
        ? record.ledger
        : typeof record?.ledger === 'string'
          ? Number(record.ledger)
          : undefined,
    txHash:
      (record?.tx_hash as string | undefined) ||
      (record?.transaction_hash as string | undefined) ||
      undefined,
    contractId: (record?.contract_id as string | undefined) || undefined,
    timestamp:
      (record?.timestamp as string | undefined) || (record?.created_at as string | undefined),
    raw,
  }
}

/**
 * Start a live event listener that bridges Horizon ledger streaming with RPC
 * contract-event polling.
 *
 * Horizon gives us a live stream of new ledgers. RPC then resolves the actual
 * contract events, which keeps this usable even when contract event retention
 * differs across providers.
 */
export function startContractEventListener(options: ContractEventListenerOptions): () => void {
  const config = getActiveStellarConfig()
  const horizon = createHorizonServer({
    ...config,
    horizonUrl: options.horizonUrl || config.horizonUrl,
    rpcUrl: options.rpcUrl || config.rpcUrl,
  })
  const rpcServer = new StellarSdk.rpc.Server(options.rpcUrl || config.rpcUrl)

  let stopped = false
  let latestLedger = 0
  let pollingHandle: ReturnType<typeof setInterval> | null = null

  const fetchEvents = async () => {
    if (stopped) return

    try {
      const rpc = rpcServer as unknown as {
        getEvents: (params: Record<string, unknown>) => Promise<unknown>
      }

      const response = await rpc.getEvents({
        startLedger: latestLedger > 0 ? latestLedger + 1 : 0,
        limit: 25,
        ...(options.contractId
          ? {
              filters: [
                {
                  type: 'contractId',
                  contractIds: [options.contractId],
                },
              ],
            }
          : {}),
      })

      const record = response as Record<string, unknown>
      const events = Array.isArray(record.events)
        ? record.events
        : Array.isArray(record.records)
          ? record.records
          : []

      const eventLatestLedger =
        typeof record.latestLedger === 'number'
          ? record.latestLedger
          : typeof record.latest_ledger === 'number'
            ? record.latest_ledger
            : latestLedger

      latestLedger = Math.max(latestLedger, eventLatestLedger)

      for (const event of events) {
        options.onEvent(normalizeContractEvent(event))
      }
    } catch (error) {
      const message = error instanceof Error ? error : new Error('Failed to fetch contract events')
      options.onError?.(message)
    }
  }

  const stream = (
    horizon as unknown as {
      ledgers: () => {
        stream: (handlers: {
          onmessage: (ledger: Record<string, unknown>) => void
          onerror: (error: unknown) => void
        }) => { close?: () => void }
      }
    }
  )
    .ledgers()
    .stream({
      onmessage: (ledger) => {
        const nextLedger =
          typeof ledger.sequence === 'number'
            ? ledger.sequence
            : typeof ledger.sequence === 'string'
              ? Number(ledger.sequence)
              : typeof ledger.ledger_seq === 'number'
                ? ledger.ledger_seq
                : 0

        latestLedger = Math.max(latestLedger, nextLedger)
        void fetchEvents()
      },
      onerror: (error) => {
        const wrapped = error instanceof Error ? error : new Error('Horizon streaming failed')
        options.onError?.(wrapped)
      },
    })

  pollingHandle = setInterval(() => {
    void fetchEvents()
  }, 8_000)

  void fetchEvents()

  return () => {
    stopped = true
    if (pollingHandle) clearInterval(pollingHandle)
    stream.close?.()
  }
}

export { normalizeContractEvent }
