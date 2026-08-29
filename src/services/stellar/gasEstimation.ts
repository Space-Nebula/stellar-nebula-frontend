import { rpc, Contract, TransactionBuilder, BASE_FEE, nativeToScVal } from '@stellar/stellar-sdk'
import { createStellarRpcServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('GasEstimation')

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionType =
  | 'transfer'
  | 'contract_invoke'
  | 'contract_deploy'
  | 'account_create'
  | 'manage_data'
  | 'payment'
  | 'path_payment'
  | 'create_claimable_balance'
  | 'claim_claimable_balance'

export interface GasEstimateOptions {
  /** The Stellar network config */
  config?: StellarNetworkConfig
  /** Safety multiplier applied to base fee (default: 1.25) */
  safetyMultiplier?: number
  /** Whether to simulate the transaction for more accurate results */
  simulate?: boolean
}

export interface GasEstimateResult {
  /** Estimated fee in stroops */
  feeStroops: number
  /** Estimated fee in human-readable XLM */
  feeXlm: string
  /** Base fee per operation in stroops */
  baseFeeStroops: number
  /** Number of operations in the transaction */
  operationCount: number
  /** Network condition classification */
  networkCondition: 'calm' | 'busy' | 'congested'
  /** Whether fees are elevated and user should be warned */
  highFeeWarning: boolean
  /** Fee trend from recent observations */
  feeTrend: 'stable' | 'rising' | 'falling'
  /** Estimated Soroban resource costs (if applicable) */
  sorobanResources?: SorobanResourceEstimate
  /** Human-readable estimate summary */
  summary: string
}

export interface SorobanResourceEstimate {
  /** CPU instructions budget */
  cpuInstructions: number
  /** Memory bytes budget */
  memoryBytes: number
  /** Read-only ledger entries */
  readEntries: number
  /** Read-write ledger entries */
  writeEntries: number
  /** Footprint bytes for XDR serialization */
  footprintBytes: number
}

export interface FeeWarning {
  level: 'none' | 'watch' | 'high' | 'critical'
  message: string
  suggestion: string
}

// ─── Fee thresholds (in stroops) ─────────────────────────────────────────────

const FEE_THRESHOLDS = {
  /** Below this fee = calm network */
  calm: 100,
  /** Between calm and busy */
  busy: 500,
  /** Above this = congested */
  congested: 2000,
  /** Watch level: user should be aware */
  watch: 1000,
  /** High level: user should be warned */
  high: 5000,
  /** Critical level: strongly recommend waiting */
  critical: 10000,
} as const

// ─── Operation complexity estimates ───────────────────────────────────────────

const OPERATION_COMPLEXITY: Record<string, number> = {
  payment: 1,
  path_payment: 2,
  manage_data: 1,
  create_claimable_balance: 1,
  claim_claimable_balance: 1,
  account_create: 2,
  contract_invoke: 3,
  contract_deploy: 5,
  transfer: 1,
}

// ─── Core estimation functions ────────────────────────────────────────────────

function stroopsToXlm(stroops: number): string {
  return (stroops / 10_000_000).toFixed(7)
}

function classifyNetwork(baseFeeStroops: number): GasEstimateResult['networkCondition'] {
  if (baseFeeStroops <= FEE_THRESHOLDS.calm) return 'calm'
  if (baseFeeStroops <= FEE_THRESHOLDS.busy) return 'busy'
  return 'congested'
}

function getFeeWarning(feeStroops: number): FeeWarning {
  if (feeStroops >= FEE_THRESHOLDS.critical) {
    return {
      level: 'critical',
      message: 'Network fees are extremely high right now.',
      suggestion:
        'Consider waiting a few minutes for fees to decrease. Submitting now would cost significantly more than usual.',
    }
  }
  if (feeStroops >= FEE_THRESHOLDS.high) {
    return {
      level: 'high',
      message: 'Network fees are higher than usual.',
      suggestion:
        'You may want to wait for fees to drop. If this transaction is urgent, proceed with caution.',
    }
  }
  if (feeStroops >= FEE_THRESHOLDS.watch) {
    return {
      level: 'watch',
      message: 'Network fees are moderately elevated.',
      suggestion: 'Fees are slightly above normal. Urgent transactions can proceed.',
    }
  }
  return { level: 'none', message: '', suggestion: '' }
}

async function fetchCurrentBaseFee(config: StellarNetworkConfig): Promise<number> {
  const server = createStellarRpcServer(config)

  try {
    const feeStats = await server.getFeeStats()
    const record = feeStats as unknown as Record<string, unknown>

    // Try soroban inclusion fee first, then general fee stats
    const soroban = record.soroban as Record<string, unknown> | undefined
    const inclusionFee = soroban?.inclusionFee as Record<string, unknown> | undefined

    const candidates = [
      inclusionFee?.p95,
      inclusionFee?.p90,
      inclusionFee?.p50,
      record.p95_inclusion_fee,
      record.p90_inclusion_fee,
      record.p50_inclusion_fee,
      record.max_fee,
      record.max,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
        return Math.ceil(candidate)
      }
    }
  } catch (error) {
    log.warn('Failed to fetch fee stats, using base fee', undefined, error instanceof Error ? error : new Error(String(error)))
  }

  return BASE_FEE
}

async function detectFeeTrend(config: StellarNetworkConfig): Promise<GasEstimateResult['feeTrend']> {
  const server = createStellarRpcServer(config)

  try {
    // Quick check: fetch fee stats and compare p50 vs p95 spread
    const feeStats = await server.getFeeStats()
    const record = feeStats as unknown as Record<string, unknown>
    const soroban = record.soroban as Record<string, unknown> | undefined
    const inclusionFee = soroban?.inclusionFee as Record<string, unknown> | undefined

    const p50 = Number(inclusionFee?.p50 ?? record.p50_inclusion_fee ?? 100)
    const p95 = Number(inclusionFee?.p95 ?? record.p95_inclusion_fee ?? 100)

    // If p95 is much higher than p50, fees are spiking/rising
    const ratio = p50 > 0 ? p95 / p50 : 1
    if (ratio >= 3) return 'rising'
    if (ratio <= 0.7) return 'falling'
    return 'stable'
  } catch {
    return 'stable'
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Estimate the gas fee for a transaction with full network awareness.
 *
 * Fetches live network fee stats, applies safety buffers, classifies
 * network conditions, and provides actionable warnings for the user.
 *
 * @param operationCount - Number of operations in the transaction
 * @param options        - Estimation options
 * @returns Detailed gas estimate with warnings and network context
 *
 * @example
 * const estimate = await estimateGas(1)
 * console.log(`Fee: ${estimate.feeXlm} XLM`)
 * if (estimate.highFeeWarning) {
 *   showToast(estimate.summary)
 * }
 */
export async function estimateGas(
  operationCount: number,
  options: GasEstimateOptions = {}
): Promise<GasEstimateResult> {
  const config = options.config ?? getActiveStellarConfig()
  const safetyMultiplier = options.safetyMultiplier ?? 1.25
  const ops = Math.max(1, operationCount)

  // Fetch current network fees in parallel
  const [baseFeeStroops, feeTrend] = await Promise.all([
    fetchCurrentBaseFee(config),
    detectFeeTrend(config),
  ])

  // Calculate estimated fee
  const rawFee = baseFeeStroops * ops
  const feeStroops = Math.ceil(rawFee * safetyMultiplier)
  const networkCondition = classifyNetwork(baseFeeStroops)
  const warning = getFeeWarning(feeStroops)

  const result: GasEstimateResult = {
    feeStroops,
    feeXlm: stroopsToXlm(feeStroops),
    baseFeeStroops,
    operationCount: ops,
    networkCondition,
    highFeeWarning: warning.level === 'high' || warning.level === 'critical',
    feeTrend,
    summary: buildSummary(feeStroops, networkCondition, warning, feeTrend),
  }

  log.debug('Gas estimate computed', {
    feeStroops,
    feeXlm: result.feeXlm,
    networkCondition,
    feeTrend,
    warning: warning.level,
  })

  return result
}

/**
 * Estimate gas for a specific Soroban contract call via simulation.
 *
 * Builds a simulation transaction and submits it to the RPC to get
 * accurate resource consumption estimates.
 *
 * @param contractId   - The contract address
 * @param methodName   - The contract method to call
 * @param params       - Serialized ScVal parameters
 * @param callerPubKey - The public key of the caller
 * @param options      - Estimation options
 */
export async function estimateSorobanGas(
  contractId: string,
  methodName: string,
  params: rpc.xdr.ScVal[],
  callerPubKey: string,
  options: GasEstimateOptions = {}
): Promise<GasEstimateResult> {
  const config = options.config ?? getActiveStellarConfig()
  const server = createStellarRpcServer(config)

  try {
    const account = await server.getAccount(callerPubKey)
    const contract = new Contract(contractId)

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call(methodName, ...params))
      .setTimeout(30)
      .build()

    const simulation = await server.simulateTransaction(tx)

    // Extract resource estimates from simulation
    const resources: SorobanResourceEstimate = {
      cpuInstructions: 0,
      memoryBytes: 0,
      readEntries: 0,
      writeEntries: 0,
      footprintBytes: 0,
    }

    if ('resources' in simulation) {
      const simResources = (simulation as { resources?: Record<string, unknown> }).resources
      if (simResources) {
        resources.cpuInstructions = Number(simResources.cpu_instructions ?? 0)
        resources.memoryBytes = Number(simResources.memory_bytes ?? 0)
        resources.readEntries = Number(simResources.read_entries ?? 0)
        resources.writeEntries = Number(simResources.write_entries ?? 0)
      }
    }

    // Get fee from simulation result
    const simFee =
      'minResourceFee' in simulation
        ? Number((simulation as { minResourceFee?: string | number }).minResourceFee ?? BASE_FEE)
        : BASE_FEE

    // Also fetch current base fee for network condition info
    const baseFeeStroops = await fetchCurrentBaseFee(config)
    const feeTrend = await detectFeeTrend(config)
    const networkCondition = classifyNetwork(baseFeeStroops)

    const feeStroops = Math.max(simFee, BASE_FEE)
    const warning = getFeeWarning(feeStroops)

    const result: GasEstimateResult = {
      feeStroops,
      feeXlm: stroopsToXlm(feeStroops),
      baseFeeStroops,
      operationCount: 1,
      networkCondition,
      highFeeWarning: warning.level === 'high' || warning.level === 'critical',
      feeTrend,
      sorobanResources: resources,
      summary: buildSummary(feeStroops, networkCondition, warning, feeTrend),
    }

    log.debug('Soroban gas estimate computed', {
      feeStroops,
      feeXlm: result.feeXlm,
      cpuInstructions: resources.cpuInstructions,
      memoryBytes: resources.memoryBytes,
    })

    return result
  } catch (error) {
    log.error('Failed to estimate Soroban gas', error instanceof Error ? error : new Error(String(error)))

    // Fallback to basic estimation
    return estimateGas(1, options)
  }
}

/**
 * Get a human-readable fee warning for display.
 *
 * @param feeStroops - The estimated fee in stroops
 * @returns A warning object with level, message, and suggestion
 */
export function getFeeWarningForDisplay(feeStroops: number): FeeWarning {
  return getFeeWarning(feeStroops)
}

/**
 * Format a gas estimate for display in the UI.
 *
 * @param estimate - The gas estimate result
 * @returns Formatted strings ready for rendering
 */
export function formatGasEstimate(estimate: GasEstimateResult): {
  fee: string
  condition: string
  warning: string
  trend: string
} {
  const conditionLabels: Record<string, string> = {
    calm: '🟢 Network is calm',
    busy: '🟡 Network is busy',
    congested: '🔴 Network is congested',
  }

  const trendLabels: Record<string, string> = {
    stable: '→ Stable',
    rising: '↑ Rising',
    falling: '↓ Falling',
  }

  const warning = getFeeWarning(estimate.feeStroops)

  return {
    fee: `${estimate.feeXlm} XLM`,
    condition: conditionLabels[estimate.networkCondition] ?? 'Unknown',
    warning: warning.message,
    trend: trendLabels[estimate.feeTrend] ?? 'Unknown',
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildSummary(
  feeStroops: number,
  networkCondition: GasEstimateResult['networkCondition'],
  warning: FeeWarning,
  feeTrend: GasEstimateResult['feeTrend']
): string {
  const feeXlm = stroopsToXlm(feeStroops)
  const conditionMap = { calm: 'normal', busy: 'elevated', congested: 'high' }
  const trendMap = { stable: '', rising: ' and rising', falling: ' and falling' }

  let summary = `Estimated fee: ${feeXlm} XLM (${conditionMap[networkCondition]} network${trendMap[feeTrend]})`

  if (warning.level !== 'none') {
    summary += `. ${warning.message}`
  }

  return summary
}
