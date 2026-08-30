import { createStellarRpcServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'

export interface FeeStats {
  /** Fee in stroops for the 10th percentile */
  p10: number
  /** Fee in stroops for the 50th percentile */
  p50: number
  /** Fee in stroops for the 90th percentile */
  p90: number
  /** Fee in stroops for the 95th percentile */
  p95: number
  /** Timestamp of this snapshot */
  recordedAt: string
}

export interface GasMonitorConfig {
  networkConfig?: StellarNetworkConfig
  pollIntervalMs?: number
  onUpdate?: (stats: FeeStats) => void
  onError?: (error: Error) => void
}

export type GasTrend = 'falling' | 'stable' | 'rising' | 'spiking'

export type GasFeeStats = FeeStats

export interface GasPriceSnapshot {
  baseFeeStroops: number
  p95FeeStroops: number
  latestLedger: number | null
  trend: 'up' | 'down' | 'stable'
  networkCondition: 'calm' | 'busy' | 'congested'
  alertLevel: 'calm' | 'watch' | 'high'
  recordedAt: string
}

export interface GasMonitorOptions {
  config?: StellarNetworkConfig
  pollIntervalMs?: number
  onUpdate?: (snapshot: GasPriceSnapshot) => void
  onError?: (error: Error) => void
}

function readPercentile(record: Record<string, unknown>, key: string, fallback: number): number {
  const soroban = record.soroban as Record<string, unknown> | undefined
  const inclusionFee = soroban?.inclusionFee as Record<string, unknown> | undefined
  const value = Number(inclusionFee?.[key] ?? record[key] ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

function classifySnapshot(stats: FeeStats, previous?: FeeStats): GasPriceSnapshot {
  const ratio = previous ? stats.p95 / Math.max(1, previous.p95) : 1
  const trend = ratio >= 1.1 ? 'up' : ratio <= 0.9 ? 'down' : 'stable'
  const networkCondition = stats.p95 >= 5000 ? 'congested' : stats.p95 >= 1000 ? 'busy' : 'calm'
  const alertLevel = stats.p95 >= 5000 ? 'high' : stats.p95 >= 1000 ? 'watch' : 'calm'

  return {
    baseFeeStroops: stats.p50,
    p95FeeStroops: stats.p95,
    latestLedger: null,
    trend,
    networkCondition,
    alertLevel,
    recordedAt: stats.recordedAt,
  }
}

export async function fetchGasPriceSnapshot(
  config: StellarNetworkConfig = getActiveStellarConfig()
): Promise<GasPriceSnapshot> {
  const rpcServer = createStellarRpcServer(config)
  const rawStats = (await rpcServer.getFeeStats()) as unknown as Record<string, unknown>
  const stats: FeeStats = {
    p10: readPercentile(rawStats, 'p10', 100),
    p50: readPercentile(rawStats, 'p50', 100),
    p90: readPercentile(rawStats, 'p90', 100),
    p95: readPercentile(rawStats, 'p95', 100),
    recordedAt: new Date().toISOString(),
  }

  return classifySnapshot(stats)
}

export function startGasPriceMonitor(options: GasMonitorOptions): () => void {
  let previous: FeeStats | undefined

  const wrappedMonitor = createGasMonitor({
    networkConfig: options.config,
    pollIntervalMs: options.pollIntervalMs,
    onError: options.onError,
    onUpdate: (stats) => {
      options.onUpdate?.(classifySnapshot(stats, previous))
      previous = stats
    },
  })

  wrappedMonitor.start()

  return () => wrappedMonitor.stop()
}

/**
 * Monitor Stellar network fee trends with periodic polling.
 *
 * @example
 * const monitor = createGasMonitor({
 *   onUpdate: (stats) => console.log('p95 fee:', stats.p95),
 *   onError: (err) => console.error(err),
 * })
 * monitor.start()
 * // later: monitor.stop()
 */
export function createGasMonitor(config: GasMonitorConfig) {
  const rpcServer = createStellarRpcServer(config.networkConfig ?? getActiveStellarConfig())
  let intervalId: ReturnType<typeof setInterval> | null = null
  let history: FeeStats[] = []
  const MAX_HISTORY = 10

  async function poll(): Promise<void> {
    try {
      const rawStats = await rpcServer.getFeeStats()
      const record = rawStats as unknown as Record<string, unknown>

      const soroban = record.soroban as Record<string, unknown> | undefined
      const inclusionFee = soroban?.inclusionFee as Record<string, unknown> | undefined

      const feeStats: FeeStats = {
        p10: Number(inclusionFee?.p10 ?? record.p10 ?? 100),
        p50: Number(inclusionFee?.p50 ?? record.p50 ?? 100),
        p90: Number(inclusionFee?.p90 ?? record.p90 ?? 100),
        p95: Number(inclusionFee?.p95 ?? record.p95 ?? 100),
        recordedAt: new Date().toISOString(),
      }

      history = [...history.slice(-(MAX_HISTORY - 1)), feeStats]
      config.onUpdate?.(feeStats)
    } catch (error) {
      config.onError?.(error instanceof Error ? error : new Error('Fee poll failed'))
    }
  }

  return {
    /** Start periodic fee polling. */
    start() {
      if (intervalId) return
      void poll()
      intervalId = setInterval(poll, config.pollIntervalMs ?? 30_000)
    },

    /** Stop periodic fee polling. */
    stop() {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    },

    /** Get the observed fee trend based on recent history. */
    getTrend(): GasTrend {
      if (history.length < 2) return 'stable'

      const latest = history[history.length - 1]
      const previous = history[0]
      const ratio = latest.p95 / previous.p95

      if (ratio >= 2) return 'spiking'
      if (ratio >= 1.15) return 'rising'
      if (ratio <= 0.85) return 'falling'
      return 'stable'
    },

    /** Get the latest fee stats. */
    getLatest(): FeeStats | null {
      return history.length > 0 ? history[history.length - 1] : null
    },

    /** Get the full fee history. */
    getHistory(): readonly FeeStats[] {
      return [...history]
    },
  }
}
