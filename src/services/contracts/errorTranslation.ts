import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('ContractErrorTranslation')

/**
 * User-friendly contract error definition.
 *
 * Each error includes a human-readable message, a category for UI grouping,
 * and actionable resolution steps the user can try.
 */
export interface ContractErrorInfo {
  /** Short, user-friendly error title */
  title: string
  /** Longer explanation of what went wrong */
  message: string
  /** Category for UI grouping (e.g., "auth", "insufficient", "network") */
  category: ContractErrorCategory
  /** Actionable steps the user can try */
  resolution: string[]
  /** Severity level for UI display */
  severity: 'error' | 'warning' | 'info'
}

export type ContractErrorCategory =
  | 'auth'
  | 'insufficient'
  | 'network'
  | 'contract'
  | 'validation'
  | 'unknown'

/**
 * Map of known Soroban/Soroban contract error patterns to user-friendly messages.
 *
 * Keys are matched against error messages, error names, or error codes.
 * Order matters — more specific patterns should come first.
 */
const ERROR_MAP: Array<{
  pattern: RegExp
  info: ContractErrorInfo
}> = [
  // ── Authorization errors ──────────────────────────────────────────────────
  {
    pattern: /auth|unauthorized|forbidden|not\s+authorized/i,
    info: {
      title: 'Authorization Required',
      message:
        'Your wallet does not have permission to perform this action. This usually means the transaction was not signed by the correct account.',
      category: 'auth',
      severity: 'error',
      resolution: [
        'Make sure you are connected with the correct wallet',
        'Check that the account has the required signer role',
        'If using a multisig, ensure all required signatures are present',
      ],
    },
  },
  {
    pattern: /signature|verify.*signature|invalid.*signature/i,
    info: {
      title: 'Invalid Signature',
      message:
        'The transaction signature could not be verified. The signed data may have been corrupted or the signing key may not match.',
      category: 'auth',
      severity: 'error',
      resolution: [
        'Try signing the transaction again',
        'Ensure your wallet is using the correct network passphrase',
        'Disconnect and reconnect your wallet if the issue persists',
      ],
    },
  },
  {
    pattern: /expired|timeout|timed?\s*out|sequence.*too.*late/i,
    info: {
      title: 'Transaction Expired',
      message:
        'The transaction was not confirmed before it expired. Stellar transactions have a time window for submission.',
      category: 'network',
      severity: 'error',
      resolution: [
        'Try submitting the transaction again',
        'Check your network connection',
        'Increase the transaction timeout if you frequently see this error',
      ],
    },
  },

  // ── Insufficient balance / resources ──────────────────────────────────────
  {
    pattern: /insufficient.*balance|not.*enough.*funds|low.*balance/i,
    info: {
      title: 'Insufficient Balance',
      message:
        'Your account does not have enough XLM or tokens to complete this transaction. You need to cover both the transaction fee and the operation amount.',
      category: 'insufficient',
      severity: 'error',
      resolution: [
        'Check your current balance in your wallet',
        'Add more XLM to your account',
        'Reduce the transaction amount if applicable',
      ],
    },
  },
  {
    pattern: /insufficient.*resource|resource.*limit|compute.*budget|cpu.*exceeded|memory.*exceeded/i,
    info: {
      title: 'Insufficient Resources',
      message:
        'The contract execution requires more computational resources than are available. This can happen with complex operations.',
      category: 'insufficient',
      severity: 'error',
      resolution: [
        'Try again later when the network is less busy',
        'Contact support if this error persists',
      ],
    },
  },
  {
    pattern: /insufficient.*fee|fee.*too.*low|base.*fee/i,
    info: {
      title: 'Transaction Fee Too Low',
      message:
        'The network fee you specified is too low for the current network conditions. Stellar adjusts fees based on demand.',
      category: 'network',
      severity: 'warning',
      resolution: [
        'The fee will be recalculated automatically — try again',
        'Check the current network fee status',
        'If on a busy network, wait a few minutes for fees to decrease',
      ],
    },
  },

  // ── Contract-specific errors ──────────────────────────────────────────────
  {
    pattern: /contract.*not.*found|no.*contract|contract.*missing/i,
    info: {
      title: 'Contract Not Found',
      message:
        'The smart contract could not be found on the network. The contract may have been removed or deployed to a different network.',
      category: 'contract',
      severity: 'error',
      resolution: [
        'Verify you are connected to the correct network (testnet/mainnet)',
        'Check that the contract address is correct',
        'Try refreshing the page and reconnecting',
      ],
    },
  },
  {
    pattern: /contract.*error|invoke.*contract.*error|smart.*contract.*fail/i,
    info: {
      title: 'Smart Contract Error',
      message:
        'The smart contract encountered an error while executing. This may be a temporary issue or a contract-specific validation failure.',
      category: 'contract',
      severity: 'error',
      resolution: [
        'Try the operation again',
        'Check that all required parameters are valid',
        'If the issue persists, contact the contract administrator',
      ],
    },
  },
  {
    pattern: /already.*exist|duplicate|conflict|already.*processed/i,
    info: {
      title: 'Already Processed',
      message:
        'This operation has already been processed. You may be trying to submit a duplicate transaction.',
      category: 'contract',
      severity: 'warning',
      resolution: [
        'Check your transaction history to see if it already completed',
        'No additional action is needed if the previous transaction succeeded',
      ],
    },
  },
  {
    pattern: /not.*found|does.*not.*exist|no.*record|missing.*data/i,
    info: {
      title: 'Record Not Found',
      message:
        'The requested data or record could not be found on the blockchain. It may not have been created yet or may have been deleted.',
      category: 'contract',
      severity: 'warning',
      resolution: [
        'Verify the resource ID or address is correct',
        'Try refreshing the page to reload data',
        'Check if you are looking in the right network (testnet vs mainnet)',
      ],
    },
  },

  // ── Validation errors ─────────────────────────────────────────────────────
  {
    pattern: /invalid.*address|bad.*address|malformed.*address|not.*a.*valid.*stellar/i,
    info: {
      title: 'Invalid Address',
      message: 'The Stellar address provided is not in a valid format. Stellar addresses should start with G or C.',
      category: 'validation',
      severity: 'error',
      resolution: [
        'Double-check the address for typos',
        'Ensure the address starts with G (account) or C (contract)',
        'Copy the address directly from the source instead of typing it',
      ],
    },
  },
  {
    pattern: /invalid.*amount|bad.*amount|parse.*error.*amount|non.*numeric/i,
    info: {
      title: 'Invalid Amount',
      message: 'The amount entered is not valid. Please enter a positive number.',
      category: 'validation',
      severity: 'error',
      resolution: [
        'Enter a valid positive number',
        'Check for commas or special characters that are not allowed',
        'Ensure the amount does not exceed your balance',
      ],
    },
  },
  {
    pattern: /overflow|underflow|too.*large|too.*big|out.*of.*range/i,
    info: {
      title: 'Value Out of Range',
      message: 'The value provided is too large or too small for the expected range.',
      category: 'validation',
      severity: 'error',
      resolution: [
        'Use a smaller value that fits within the expected range',
        'Check the maximum and minimum allowed values',
      ],
    },
  },

  // ── Network errors ────────────────────────────────────────────────────────
  {
    pattern: /network.*error|connection.*refused|fetch.*fail|ECONNREFUSED|ETIMEDOUT/i,
    info: {
      title: 'Network Error',
      message:
        'Could not connect to the Stellar network. Your internet connection may be unstable or the network may be experiencing issues.',
      category: 'network',
      severity: 'error',
      resolution: [
        'Check your internet connection',
        'Try again in a few moments',
        'Check the Stellar network status page',
      ],
    },
  },
  {
    pattern: /rate.*limit|too.*many.*requests|throttl/i,
    info: {
      title: 'Rate Limited',
      message:
        'Too many requests were sent to the network. Please wait a moment before trying again.',
      category: 'network',
      severity: 'warning',
      resolution: [
        'Wait a few seconds and try again',
        'Reduce the frequency of your requests',
      ],
    },
  },

  // ── Ledger errors ─────────────────────────────────────────────────────────
  {
    pattern: /sequence.*number|bad.*sequence|seq.*too.*low|seq.*too.*high/i,
    info: {
      title: 'Account Sequence Error',
      message:
        'The account sequence number is incorrect. This usually means another transaction was submitted before this one was confirmed.',
      category: 'contract',
      severity: 'error',
      resolution: [
        'Refresh your account data and try again',
        'Wait for any pending transactions to complete',
        'The wallet should automatically refresh the sequence number',
      ],
    },
  },

  // ── Soroban-specific ──────────────────────────────────────────────────────
  {
    pattern: /soroban.*contract|soroban.*error|soroban.*auth/i,
    info: {
      title: 'Smart Contract Error',
      message:
        'A Soroban smart contract encountered an error during execution. The contract may have specific requirements that were not met.',
      category: 'contract',
      severity: 'error',
      resolution: [
        'Check that all required parameters are correct',
        'Ensure your account meets the contract prerequisites',
        'Try again — this may be a transient error',
      ],
    },
  },
]

/**
 * Match an error against known patterns and return user-friendly info.
 *
 * @param error - The error to translate (Error instance, string, or unknown)
 * @returns The translated error info with fallback for unknown errors
 */
export function translateContractError(error: unknown): ContractErrorInfo {
  const rawMessage = extractErrorMessage(error)
  const rawName = extractErrorName(error)

  // Log raw error for debugging
  log.debug('Translating contract error', {
    rawMessage: rawMessage.slice(0, 200),
    rawName,
  })

  // Try to match against known patterns
  for (const { pattern, info } of ERROR_MAP) {
    if (pattern.test(rawMessage) || pattern.test(rawName)) {
      log.info('Matched contract error pattern', {
        category: info.category,
        title: info.title,
        pattern: pattern.source.slice(0, 50),
      })
      return info
    }
  }

  // Fallback for unknown errors
  log.warn('Unknown contract error', new Error(rawMessage))
  return {
    title: 'Unexpected Error',
    message:
      rawMessage ||
      'An unexpected error occurred while interacting with the smart contract.',
    category: 'unknown',
    severity: 'error',
    resolution: [
      'Try the operation again',
      'If the issue persists, try disconnecting and reconnecting your wallet',
      'Contact support with the error details if the problem continues',
    ],
  }
}

/**
 * Check if an error matches a specific category.
 */
export function isContractErrorOfCategory(
  error: unknown,
  category: ContractErrorCategory
): boolean {
  const info = translateContractError(error)
  return info.category === category
}

/**
 * Get a short user-friendly title for display in toast notifications.
 */
export function getContractErrorTitle(error: unknown): string {
  return translateContractError(error).title
}

/**
 * Get resolution steps for display in error detail views.
 */
export function getContractErrorResolution(error: unknown): string[] {
  return translateContractError(error).resolution
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return ''
}

function extractErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name
  }
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name: unknown }).name)
  }
  return ''
}
