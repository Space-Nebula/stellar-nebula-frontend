/**
 * Utility for mapping raw Stellar SDK and Horizon error codes into user-friendly messages,
 * actionable recovery steps, and documentation links.
 */

import { captureError } from '@/services/errorTracking'

export type StellarErrorType =
  | 'bad_seq'
  | 'insufficient_funds'
  | 'timeout'
  | 'network'
  | 'auth'
  | 'user'
  | 'unknown'

export interface StellarErrorDefinition {
  code: string
  type: StellarErrorType
  title: string
  message: string
  recoveryStep: string
  docsAnchor: string
}

export interface ParsedStellarError {
  code: string
  type: StellarErrorType
  title: string
  message: string
  recoveryStep: string
  learnMoreUrl: string
  isStellarError: boolean
  rawError?: unknown
}

export const COMMON_ERRORS_DOC_BASE = '/docs/COMMON_ERRORS.md'

/**
 * Mapping dictionary of known Stellar SDK / Horizon transaction and operation error codes.
 */
export const STELLAR_ERROR_MAP: Record<string, StellarErrorDefinition> = {
  tx_bad_seq: {
    code: 'tx_bad_seq',
    type: 'bad_seq',
    title: 'Account Sequence Out of Sync',
    message: 'The transaction sequence number does not match your current account state on the Stellar network.',
    recoveryStep: 'Refresh your wallet connection to reload the latest account sequence number, then try again.',
    docsAnchor: '#error-tx_bad_seq',
  },
  op_underfunded: {
    code: 'op_underfunded',
    type: 'insufficient_funds',
    title: 'Insufficient Balance',
    message: 'Your wallet balance is too low to complete this operation and maintain the Stellar base reserve.',
    recoveryStep: 'Add more XLM to your wallet to cover the operation amount and minimum balance requirement.',
    docsAnchor: '#error-op_underfunded',
  },
  underfunded: {
    code: 'underfunded',
    type: 'insufficient_funds',
    title: 'Insufficient Balance',
    message: 'Your wallet does not have enough funds for this transaction and its reserve fee.',
    recoveryStep: 'Add XLM funds to your wallet, then try again.',
    docsAnchor: '#error-op_underfunded',
  },
  tx_insufficient_fee: {
    code: 'tx_insufficient_fee',
    type: 'insufficient_funds',
    title: 'Insufficient Transaction Fee',
    message: 'The fee provided is below the network base fee or current surge pricing threshold.',
    recoveryStep: 'Enable dynamic fee estimation or retry the transaction with a higher fee limit.',
    docsAnchor: '#error-tx_insufficient_fee',
  },
  tx_too_late: {
    code: 'tx_too_late',
    type: 'timeout',
    title: 'Transaction Timed Out',
    message: 'The transaction expired before the Stellar consensus network could include it in a ledger.',
    recoveryStep: 'Check your wallet transaction history to verify it was not processed, then resubmit with a fresh timeout.',
    docsAnchor: '#error-tx_too_late',
  },
  timeout: {
    code: 'timeout',
    type: 'timeout',
    title: 'Network Request Timed Out',
    message: 'The request to the Stellar network timed out before a response was received.',
    recoveryStep: 'Check your internet connection, verify if the transaction succeeded on Horizon, and retry if needed.',
    docsAnchor: '#soroban-smart-contract--rpc-errors',
  },
  tx_bad_auth: {
    code: 'tx_bad_auth',
    type: 'auth',
    title: 'Transaction Signature Invalid',
    message: 'The cryptographic signature for this transaction was rejected by the network.',
    recoveryStep: 'Verify your wallet signature permissions and ensure you are signed in with the correct key.',
    docsAnchor: '#wallet--authentication-errors',
  },
  tx_too_early: {
    code: 'tx_too_early',
    type: 'user',
    title: 'Transaction Too Early',
    message: 'The transaction was submitted before its valid starting time bound.',
    recoveryStep: 'Verify your local system clock is synchronized and submit again.',
    docsAnchor: '#common-errors-and-solutions',
  },
  op_no_destination: {
    code: 'op_no_destination',
    type: 'user',
    title: 'Destination Account Inactive',
    message: 'The destination account does not exist or has not been funded yet.',
    recoveryStep: 'Send at least 1 XLM to the destination account first to create and activate it.',
    docsAnchor: '#error-op_no_destination',
  },
  op_low_reserve: {
    code: 'op_low_reserve',
    type: 'insufficient_funds',
    title: 'Minimum Reserve Required',
    message: 'Executing this operation would drop your XLM balance below your account minimum reserve.',
    recoveryStep: 'Deposit additional XLM or close unneeded open offers/trustlines to reduce reserve requirements.',
    docsAnchor: '#error-op_low_reserve',
  },
  op_line_full: {
    code: 'op_line_full',
    type: 'user',
    title: 'Trustline Limit Exceeded',
    message: 'The recipient trustline does not have sufficient room to receive this amount of tokens.',
    recoveryStep: 'Ask the recipient to increase their trustline limit or transfer a smaller amount.',
    docsAnchor: '#error-op_line_full',
  },
  op_no_trust: {
    code: 'op_no_trust',
    type: 'user',
    title: 'Asset Trustline Missing',
    message: 'The destination account has not established a trustline for this custom asset.',
    recoveryStep: 'Add a trustline for the token in the receiving wallet before transferring.',
    docsAnchor: '#error-op_no_trust',
  },
  network_error: {
    code: 'network_error',
    type: 'network',
    title: 'Stellar Network Error',
    message: 'Could not connect to the Stellar Horizon or Soroban RPC network endpoint.',
    recoveryStep: 'Check your internet connection or check the Stellar network status page.',
    docsAnchor: '#soroban-smart-contract--rpc-errors',
  },
}

/**
 * Extract raw Stellar error codes from thrown Error objects, Axios/fetch Horizon responses, or strings.
 */
export function extractErrorCode(error: unknown): string | null {
  if (!error) return null

  if (typeof error === 'string') {
    const lower = error.toLowerCase()
    for (const key of Object.keys(STELLAR_ERROR_MAP)) {
      if (lower.includes(key.toLowerCase())) {
        return key
      }
    }
    return null
  }

  const rec = error as Record<string, unknown>

  // Horizon error response format: error.response.data.extras.result_codes
  const response = rec.response as Record<string, unknown> | undefined
  const data = (response?.data || rec.data) as Record<string, unknown> | undefined
  const extras = data?.extras as Record<string, unknown> | undefined
  const resultCodes = extras?.result_codes as Record<string, unknown> | undefined

  if (resultCodes) {
    if (typeof resultCodes.transaction === 'string' && STELLAR_ERROR_MAP[resultCodes.transaction]) {
      return resultCodes.transaction
    }
    if (Array.isArray(resultCodes.operations) && resultCodes.operations.length > 0) {
      const opCode = String(resultCodes.operations[0])
      if (STELLAR_ERROR_MAP[opCode]) {
        return opCode
      }
    }
  }

  // Check error message string
  if (typeof rec.message === 'string') {
    const msg = rec.message.toLowerCase()
    for (const key of Object.keys(STELLAR_ERROR_MAP)) {
      if (msg.includes(key.toLowerCase())) {
        return key
      }
    }
    if (/network|fetch|econnrefused|failed to fetch/i.test(msg)) {
      return 'network_error'
    }
    if (/timeout|timed? ?out/i.test(msg)) {
      return 'timeout'
    }
    if (/underfunded|insufficient/i.test(msg)) {
      return 'op_underfunded'
    }
    if (/bad_seq|sequence/i.test(msg)) {
      return 'tx_bad_seq'
    }
  }

  return null
}

export interface ParseStellarErrorOptions {
  estimatedFeeXlm?: string
  logToSentry?: boolean
}

/**
 * Humanize a raw Stellar SDK / network error into a user-friendly message with recovery guidance.
 * Automatically attaches structured context tags to Sentry for monitoring.
 */
export function parseStellarError(
  error: unknown,
  options: ParseStellarErrorOptions = {}
): ParsedStellarError {
  const { estimatedFeeXlm, logToSentry = true } = options
  const detectedCode = extractErrorCode(error)

  let parsed: ParsedStellarError

  if (detectedCode && STELLAR_ERROR_MAP[detectedCode]) {
    const def = STELLAR_ERROR_MAP[detectedCode]
    let message = def.message

    // Include estimated fee in insufficient balance message when provided
    if (def.type === 'insufficient_funds' && estimatedFeeXlm) {
      message = `Your wallet balance is too low for the required transaction fee (estimated fee: ${estimatedFeeXlm}).`
    }

    parsed = {
      code: def.code,
      type: def.type,
      title: def.title,
      message,
      recoveryStep: def.recoveryStep,
      learnMoreUrl: `${COMMON_ERRORS_DOC_BASE}${def.docsAnchor}`,
      isStellarError: true,
      rawError: error,
    }
  } else {
    // Fallback for non-Stellar or unmapped errors
    const rawMessage = error instanceof Error ? error.message : String(error || 'An unexpected transaction error occurred')
    parsed = {
      code: 'unknown_stellar_error',
      type: 'unknown',
      title: 'Transaction Error',
      message: 'The Stellar network was unable to complete this transaction.',
      recoveryStep: 'Check your network connection, refresh your account, and try again.',
      learnMoreUrl: `${COMMON_ERRORS_DOC_BASE}#common-errors-and-solutions`,
      isStellarError: false,
      rawError: error,
    }
  }

  // Add Sentry context tags for monitoring
  if (logToSentry) {
    try {
      captureError(error instanceof Error ? error : new Error(parsed.message), {
        tags: {
          stellar_error_code: parsed.code,
          stellar_error_type: parsed.type,
        },
        stellar_error_code: parsed.code,
        stellar_error_type: parsed.type,
        stellar_recovery_step: parsed.recoveryStep,
        learn_more_url: parsed.learnMoreUrl,
      })
    } catch {
      // Sentry logging error should not throw
    }
  }

  return parsed
}
