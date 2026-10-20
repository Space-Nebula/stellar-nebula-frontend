/**
 * Turns raw errors (wallet, network, contract and runtime failures) into
 * short, actionable messages for people using the app. The technical text is
 * kept separately so it can be logged or shown in development, never by default.
 */

export interface FriendlyError {
  /** Short headline, e.g. "Connection problem". */
  title: string
  /** One sentence explaining what happened in plain language. */
  message: string
  /** What the person can do next. */
  action: string
}

interface ErrorPattern {
  test: RegExp
  friendly: FriendlyError
}

const PATTERNS: ErrorPattern[] = [
  {
    test: /user (rejected|declined|denied|cancel)|request (rejected|cancel)/i,
    friendly: {
      title: 'Request cancelled',
      message: 'You cancelled this request in your wallet.',
      action: 'Try again when you are ready.',
    },
  },
  {
    test: /insufficient|underfunded|not enough (balance|funds)|balance too low/i,
    friendly: {
      title: 'Not enough balance',
      message: 'Your account does not have enough funds for this action and its network fee.',
      action: 'Add funds to your account, then try again.',
    },
  },
  {
    test: /wallet (not|is not) (found|installed|connected)|no wallet|freighter|albedo/i,
    friendly: {
      title: 'Wallet not available',
      message: 'We could not reach your Stellar wallet.',
      action: 'Make sure the wallet extension is installed and unlocked, then reconnect.',
    },
  },
  {
    test: /network|fetch|timed? ?out|timeout|offline|socket|failed to load|econnrefused/i,
    friendly: {
      title: 'Connection problem',
      message: 'We could not reach the network. Your progress has not been lost.',
      action: 'Check your internet connection and try again.',
    },
  },
  {
    test: /simulation|contract|host invocation|soroban/i,
    friendly: {
      title: 'Action could not be completed',
      message: 'The Stellar network rejected this action.',
      action: 'Refresh the page to load the latest game state, then try again.',
    },
  },
]

const FALLBACK: FriendlyError = {
  title: 'Something went wrong',
  message: 'We could not complete that action.',
  action: 'Try again. If it keeps happening, reload the page.',
}

/** Message of a caught `Error`, or `fallback` for anything else that was thrown. */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Raw text of an error, used for pattern matching and technical details. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error) ?? String(error)
  } catch {
    return String(error)
  }
}

/** Map any thrown value to a friendly message. Never returns technical text. */
export function toFriendlyError(error: unknown): FriendlyError {
  const raw = describeError(error)
  const match = PATTERNS.find((pattern) => pattern.test.test(raw))
  return match ? match.friendly : FALLBACK
}
