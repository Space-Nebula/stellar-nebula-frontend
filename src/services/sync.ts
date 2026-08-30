/* eslint-disable */
export interface SyncOptions<T = any> {
  intervalMs?: number
  fetcher: () => Promise<T>
  getLocal: () => Promise<T | null>
  setLocal: (v: T) => Promise<void>
  onConflict?: (local: T, remote: T) => T
  onSync?: (merged: T) => void
}

/**
 * Generic offline/online data synchroniser.
 *
 * Periodically fetches remote data, merges it with local state,
 * and persists the result. Supports custom conflict resolution.
 *
 * @example
 * const sync = new DataSync({
 *   fetcher: () => api.get('/data'),
 *   getLocal: () => storage.get('data'),
 *   setLocal: (v) => storage.set('data', v),
 * })
 * sync.start()
 */
export class DataSync<T = any> {
  private opts: SyncOptions<T>
  private intervalId: number | null = null
  private isSyncing = false

  constructor(opts: SyncOptions<T>) {
    this.opts = { intervalMs: 30000, ...opts }
  }

  /** Start the periodic sync loop. */
  start() {
    if (this.intervalId) return
    this.intervalId = window.setInterval(() => void this.sync(), this.opts.intervalMs)
  }

  /** Stop the periodic sync loop. */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /** Trigger a manual sync outside the normal interval. */
  async manualSync() {
    return this.sync()
  }

  private async sync() {
    if (this.isSyncing) return
    this.isSyncing = true
    try {
      const [remote, local] = await Promise.all([
        this.opts.fetcher(),
        this.opts.getLocal().catch(() => null),
      ])
      const remoteValue = remote as T
      const localValue = local as T | null
      let merged: T = remoteValue
      if (localValue && this.opts.onConflict) {
        merged = this.opts.onConflict(localValue, remoteValue)
      } else if (
        localValue &&
        typeof (localValue as any).updatedAt === 'number' &&
        typeof (remoteValue as any).updatedAt === 'number'
      ) {
        merged =
          (localValue as any).updatedAt > (remoteValue as any).updatedAt ? localValue : remoteValue
      }
      await this.opts.setLocal(merged)
      if (this.opts.onSync) this.opts.onSync(merged)
    } catch (e) {
      console.error('DataSync error', e)
    } finally {
      this.isSyncing = false
    }
  }

  /** Get the current sync status. */
  getStatus() {
    return { isSyncing: this.isSyncing, running: !!this.intervalId }
  }
}

export default DataSync
