import type { WalletType } from '@/types'

export interface WalletError {
  message: string
  code: string
  helpText?: string
  isRetryable: boolean
}

function parseErrorMessage(error: unknown): { message: string; rawError: Error | null } {
  if (error instanceof Error) {
    return { message: error.message, rawError: error }
  }
  const message = String(error)
  return { message, rawError: null }
}

/**
 * Enhance wallet connection errors with specific messages and recovery suggestions.
 */
export function handleWalletConnectionError(
  error: unknown,
  walletType: WalletType
): WalletError {
  const { message } = parseErrorMessage(error)
  const lowerMessage = message.toLowerCase()

  if (walletType === 'freighter') {
    if (lowerMessage.includes('freighter') && lowerMessage.includes('not')) {
      return {
        code: 'FREIGHTER_NOT_INSTALLED',
        message: 'Freighter wallet is not installed',
        helpText: 'Install the Freighter extension from https://www.freighter.app',
        isRetryable: false,
      }
    }

    if (lowerMessage.includes('user') && lowerMessage.includes('reject')) {
      return {
        code: 'USER_REJECTED',
        message: 'You rejected the wallet connection request',
        helpText: 'Approve the connection in the extension popup to continue',
        isRetryable: true,
      }
    }

    if (lowerMessage.includes('timeout')) {
      return {
        code: 'REQUEST_TIMEOUT',
        message: 'Wallet connection request timed out',
        helpText: 'The wallet took too long to respond. Please try again.',
        isRetryable: true,
      }
    }
  }

  if (walletType === 'albedo') {
    if (lowerMessage.includes('not available')) {
      return {
        code: 'ALBEDO_NOT_AVAILABLE',
        message: 'Albedo is not available in this browser',
        helpText: 'Albedo requires a compatible browser with popup support. Try using a different browser.',
        isRetryable: false,
      }
    }

    if (lowerMessage.includes('user') && lowerMessage.includes('reject')) {
      return {
        code: 'USER_REJECTED',
        message: 'You rejected the wallet connection request',
        helpText: 'Approve the connection in the popup window to continue',
        isRetryable: true,
      }
    }
  }

  if (lowerMessage.includes('public key') || lowerMessage.includes('pubkey')) {
    return {
      code: 'INVALID_KEY',
      message: 'Failed to retrieve your public key from the wallet',
      helpText: 'Try disconnecting and reconnecting your wallet extension.',
      isRetryable: true,
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: message || `Failed to connect ${walletType} wallet`,
    helpText: 'Please try again or contact support if the problem persists.',
    isRetryable: true,
  }
}

/**
 * Get a user-friendly error message for wallet operations.
 */
export function formatWalletError(error: WalletError): string {
  let text = error.message

  if (error.helpText) {
    text += `. ${error.helpText}`
  }

  return text
}
