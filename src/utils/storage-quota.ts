/**
 * localStorage quota safety (issue #551): quota-aware writes, usage
 * monitoring and a bounded LRU history so the app never crashes with
 * QuotaExceededError after extended use.
 */

/** Scan history keeps only the most recent entries. */
export const MAX_SCAN_HISTORY = 50
/** Conservative localStorage budget (browsers allow ~5MB per origin). */
export const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024
/** Usage ratio at which the user is warned. */
export const QUOTA_WARNING_THRESHOLD = 0.8

/** True for the QuotaExceededError variants thrown by different browsers. */
export function isQuotaExceededError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { name?: unknown; code?: unknown }
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  )
}

export interface StorageUsage {
  usedBytes: number
  quotaBytes: number
  ratio: number
  warning: boolean
}

/** Approximate bytes used (UTF-16: 2 bytes per char, keys included). */
export function getStorageUsage(
  storage: Storage = window.localStorage,
  quotaBytes: number = DEFAULT_QUOTA_BYTES
): StorageUsage {
  let chars = 0
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key === null) continue
      chars += key.length + (storage.getItem(key)?.length ?? 0)
    }
  } catch {
    // storage unreadable: report empty rather than throwing
  }
  const usedBytes = chars * 2
  const ratio = quotaBytes > 0 ? usedBytes / quotaBytes : 0
  return { usedBytes, quotaBytes, ratio, warning: ratio >= QUOTA_WARNING_THRESHOLD }
}

export interface SafeSetOptions {
  storage?: Storage
  /** Called on a quota error to free space; return true if anything was freed. */
  evict?: () => boolean
}

export type SafeSetResult = 'ok' | 'evicted' | 'failed'

/**
 * Write to storage without ever throwing. On quota errors it calls `evict`
 * once and retries; 'failed' means the value was not persisted and the caller
 * should keep it in memory only.
 */
export function safeSetItem(key: string, value: string, opts: SafeSetOptions = {}): SafeSetResult {
  const storage = opts.storage ?? window.localStorage
  try {
    storage.setItem(key, value)
    return 'ok'
  } catch (err) {
    if (!isQuotaExceededError(err) || !opts.evict) return 'failed'
  }
  try {
    if (!opts.evict()) return 'failed'
    storage.setItem(key, value)
    return 'evicted'
  } catch {
    return 'failed'
  }
}

/** Remove every key starting with one of the prefixes (the "Clear cache" action). */
export function clearCache(prefixes: string[], storage: Storage = window.localStorage): number {
  const doomed: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key !== null && prefixes.some((p) => key.startsWith(p))) doomed.push(key)
  }
  doomed.forEach((k) => storage.removeItem(k))
  return doomed.length
}

/**
 * Most-recently-used-first list capped at `max` entries. Re-adding an
 * existing id moves it to the front instead of duplicating it.
 */
export function pushLru<T extends { id: string }>(
  list: readonly T[],
  entry: T,
  max: number = MAX_SCAN_HISTORY
): T[] {
  return [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, Math.max(0, max))
}

/** Keep only the transaction hash of a stored Stellar transaction object. */
export function toTxnRef(txn: { hash?: string; id?: string }): { hash: string } | null {
  const hash = txn.hash ?? txn.id
  return typeof hash === 'string' && hash.length > 0 ? { hash } : null
}
