/**
 * Stellar transaction submission service with automatic friendly error parsing.
 */

import { parseStellarError, type ParsedStellarError } from '@/utils/stellar-errors'
import { createHorizonServer, getActiveStellarConfig } from '@/config/stellar'

export interface SubmitTransactionOptions {
  estimatedFeeXlm?: string
  logToSentry?: boolean
}

export interface TransactionSubmissionResult {
  successful: boolean
  hash?: string
  ledger?: number
  parsedError?: ParsedStellarError
}

export class StellarTransactionExecutionError extends Error {
  public parsedError: ParsedStellarError

  constructor(parsed: ParsedStellarError) {
    super(parsed.message)
    this.name = 'StellarTransactionExecutionError'
    this.parsedError = parsed
  }
}

/**
 * Submit an envelope or built transaction to Horizon with friendly error interception.
 */
export async function submitStellarTransaction(
  transaction: unknown,
  options: SubmitTransactionOptions = {}
): Promise<TransactionSubmissionResult> {
  try {
    const config = getActiveStellarConfig()
    const horizon = await createHorizonServer(config)

    // Submit transaction via Horizon
    const result = await (horizon as any).submitTransaction(transaction)

    return {
      successful: true,
      hash: result?.hash,
      ledger: result?.ledger,
    }
  } catch (error) {
    // Intercept and parse raw Stellar SDK error
    const parsed = parseStellarError(error, {
      estimatedFeeXlm: options.estimatedFeeXlm,
      logToSentry: options.logToSentry ?? true,
    })

    return {
      successful: false,
      parsedError: parsed,
    }
  }
}

/**
 * Execute a transaction closure, translating any raw Stellar error into a friendly error.
 */
export async function executeWithFriendlyError<T>(
  action: () => Promise<T>,
  options: SubmitTransactionOptions = {}
): Promise<T> {
  try {
    return await action()
  } catch (error) {
    const parsed = parseStellarError(error, options)
    throw new StellarTransactionExecutionError(parsed)
  }
}
