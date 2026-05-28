export interface RetryOptions {
  retries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetry?: (error: unknown, attempt: number, nextDelayMs: number) => void
}

export interface RetryableOperationContext {
  attempt: number
  maxAttempts: number
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isLikelyUserCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('cancel') ||
    message.includes('rejected') ||
    message.includes('denied') ||
    message.includes('user rejection') ||
    message.includes('user rejected')
  )
}

export function isRetryableStellarError(error: unknown): boolean {
  if (isLikelyUserCancellation(error)) return false

  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('temporarily unavailable') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('429')
    )
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as { status?: number; response?: { status?: number } }
    const status = record.status ?? record.response?.status
    return typeof status === 'number' && (status === 429 || status >= 500)
  }

  return false
}

export async function retryAsync<T>(
  operation: (context: RetryableOperationContext) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = Math.max(0, options.retries ?? 2)
  const maxAttempts = retries + 1
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 750)
  const maxDelayMs = Math.max(initialDelayMs, options.maxDelayMs ?? 8_000)
  const backoffFactor = Math.max(1, options.backoffFactor ?? 2)

  let lastError: unknown
  let nextDelayMs = initialDelayMs

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation({ attempt, maxAttempts })
    } catch (error) {
      lastError = error

      const canRetry =
        attempt < maxAttempts - 1 &&
        (options.shouldRetry?.(error, attempt) ?? isRetryableStellarError(error))

      if (!canRetry) {
        throw error
      }

      options.onRetry?.(error, attempt, nextDelayMs)
      await delay(nextDelayMs)
      nextDelayMs = Math.min(maxDelayMs, Math.ceil(nextDelayMs * backoffFactor))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Retry failed')
}
