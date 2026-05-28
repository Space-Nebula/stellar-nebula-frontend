import { createStellarRpcServer, getActiveStellarConfig } from '@config/stellar'
import type { StellarNetworkConfig } from '@config/stellar'

export interface GasFeeStats {
  sorobanInclusionFee?: {
    max?: string
    min?: string
    mode?: string
    p50?: string
    p90?: string
    p95?: string
    p99?: string
  }
  inclusionFee?: {
    max?: string
    min?: string
    mode?: string
    p50?: string
    p90?: string
    p95?: string
    p99?: string
  }
  latestLedger?: number
}

export interface GasPriceSnapshot {
  baseFeeStroops: number
  p95FeeStroops: number
  modeFeeStroops: number
  maxFeeStroops: number
  minFeeStroops: number
  trend: 'down' | 'steady' | 'up'
  alertLevel: 'normal' | 'watch' | 'high'
  networkCondition: 'calm' | 'busy' | 'spiky'
  updatedAt: string
  latestLedger: number | null
  raw: GasFeeStats
}

export interface GasMonitorOptions {
  config?: StellarNetworkConfig
  pollIntervalMs?: number
  onUpdate: (snapshot: GasPriceSnapshot) => void
  onError?: (error: Error) => void
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.ceil(value)
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.ceil(parsed) : null
  }
  return null
}

function extractFeeStats(stats: GasFeeStats): {
  baseFeeStroops: number
  p95FeeStroops: number
  modeFeeStroops: number
  maxFeeStroops: number
  minFeeStroops: number
} {
  const soroban = stats.sorobanInclusionFee ?? {}
  const inclusion = stats.inclusionFee ?? {}

  const minFeeStroops = toNumber(soroban.min ?? inclusion.min) ?? 100
  const modeFeeStroops = toNumber(soroban.mode ?? inclusion.mode) ?? minFeeStroops
  const p95FeeStroops = toNumber(soroban.p95 ?? inclusion.p95) ?? modeFeeStroops
  const maxFeeStroops = toNumber(soroban.max ?? inclusion.max) ?? p95FeeStroops
  const baseFeeStroops = Math.max(100, p95FeeStroops)

  return {
    baseFeeStroops,
    p95FeeStroops,
    modeFeeStroops,
    maxFeeStroops,
    minFeeStroops,
  }
}

function trendFromDelta(previous: number | null, next: number): 'down' | 'steady' | 'up' {
  if (previous === null) return 'steady'
  if (next > previous) return 'up'
  if (next < previous) return 'down'
  return 'steady'
}

function alertLevelForBaseFee(baseFeeStroops: number): GasPriceSnapshot['alertLevel'] {
  if (baseFeeStroops >= 600) return 'high'
  if (baseFeeStroops >= 200) return 'watch'
  return 'normal'
}

function networkConditionForBaseFee(baseFeeStroops: number): GasPriceSnapshot['networkCondition'] {
  if (baseFeeStroops <= 100) return 'calm'
  if (baseFeeStroops <= 400) return 'busy'
  return 'spiky'
}

export async function fetchGasPriceSnapshot(
  config?: StellarNetworkConfig,
  previousBaseFee: number | null = null
): Promise<GasPriceSnapshot> {
  const server = createStellarRpcServer(config)
  const response = (await (server as typeof server & { getFeeStats: () => Promise<GasFeeStats> }).getFeeStats()) as GasFeeStats
  const extracted = extractFeeStats(response)

  return {
    ...extracted,
    trend: trendFromDelta(previousBaseFee, extracted.baseFeeStroops),
    alertLevel: alertLevelForBaseFee(extracted.baseFeeStroops),
    networkCondition: networkConditionForBaseFee(extracted.baseFeeStroops),
    updatedAt: new Date().toISOString(),
    latestLedger: typeof response.latestLedger === 'number' ? response.latestLedger : null,
    raw: response,
  }
}

export function startGasPriceMonitor({
  config = getActiveStellarConfig(),
  pollIntervalMs = 30_000,
  onUpdate,
  onError,
}: GasMonitorOptions): () => void {
  let stopped = false
  let previousBaseFee: number | null = null
  let pollingHandle: ReturnType<typeof setInterval> | null = null

  const refresh = async () => {
    if (stopped) return

    try {
      const snapshot = await fetchGasPriceSnapshot(config, previousBaseFee)
      previousBaseFee = snapshot.baseFeeStroops
      onUpdate(snapshot)
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to fetch gas price snapshot'))
    }
  }

  void refresh()
  pollingHandle = setInterval(() => {
    void refresh()
  }, pollIntervalMs)

  return () => {
    stopped = true
    if (pollingHandle) clearInterval(pollingHandle)
  }
}
