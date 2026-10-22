import type { Horizon } from '@stellar/stellar-sdk'
import { createHorizonServer } from '@config/stellar'
import type { StellarNetworkConfig } from '@config/stellar'
import {
  fetchAccountBalances,
  getHorizonErrorStatus,
  type FormattedBalance,
} from '@utils/horizon-utils'
import { createScopedLogger } from './logging'

const log = createScopedLogger('BalanceWatcher')

/** How often balances are refreshed while the watcher is running. */
export const DEFAULT_BALANCE_POLL_INTERVAL_MS = 5_000

export interface BalanceSnapshot {
  balances: FormattedBalance[]
  /** True when Horizon reports the account has not been funded yet (404). */
  unfunded: boolean
  /** Timestamp (ms) of the successful fetch. */
  fetchedAt: number
}

export interface BalanceWatcherOptions {
  accountId: string
  /** Poll cadence in ms. Defaults to {@link DEFAULT_BALANCE_POLL_INTERVAL_MS}. */
  intervalMs?: number
  /** Network override; defaults to the active Stellar config. */
  config?: StellarNetworkConfig
  /** Injectable Horizon server, used by tests to avoid network calls. */
  horizonServer?: Horizon.Server
  /** Called after every successful poll, including the first one. */
  onChange?: (snapshot: BalanceSnapshot, previous: BalanceSnapshot | null) => void
  /** Called when a poll fails for a reason other than an unfunded account. */
  onError?: (error: Error) => void
}

export interface BalanceWatcher {
  /** Begin polling immediately, then every `intervalMs`. */
  start: () => void
  /** Stop polling and clear any scheduled refresh. */
  stop: () => void
  /** Fetch once, right now (also reschedules the next poll). */
  refresh: () => Promise<BalanceSnapshot | null>
  /** Whether polling is currently active. */
  isRunning: () => boolean
  /** Most recent successful snapshot, or null before the first poll. */
  getSnapshot: () => BalanceSnapshot | null
}

/**
 * Poll Horizon for an account's balances.
 *
 * The next poll is only scheduled after the previous request settles, so slow
 * Horizon responses can never pile up concurrent requests. A 404 is treated as
 * a valid "unfunded account" snapshot rather than an error so the UI can show
 * the fund-your-account state; any other failure is forwarded to `onError`
 * while polling continues.
 *
 * @example
 * const watcher = createBalanceWatcher({
 *   accountId,
 *   onChange: ({ balances }) => setBalances(balances),
 * })
 * watcher.start()
 * // later
 * watcher.stop()
 */
export function createBalanceWatcher(options: BalanceWatcherOptions): BalanceWatcher {
  const intervalMs = options.intervalMs ?? DEFAULT_BALANCE_POLL_INTERVAL_MS
  let running = false
  let inFlight = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let snapshot: BalanceSnapshot | null = null
  let server: Horizon.Server | null = options.horizonServer ?? null

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const scheduleNext = () => {
    clearTimer()
    if (!running) return
    timer = setTimeout(() => {
      void refresh()
    }, intervalMs)
  }

  async function refresh(): Promise<BalanceSnapshot | null> {
    clearTimer()

    // A poll is already in flight: join it instead of firing a duplicate request.
    if (inFlight) return snapshot

    inFlight = true
    const previous = snapshot

    try {
      server ??= await createHorizonServer(options.config)
      const balances = await fetchAccountBalances(server, options.accountId)
      snapshot = { balances, unfunded: false, fetchedAt: Date.now() }
      options.onChange?.(snapshot, previous)
      return snapshot
    } catch (err) {
      if (getHorizonErrorStatus(err) === 404) {
        snapshot = { balances: [], unfunded: true, fetchedAt: Date.now() }
        options.onChange?.(snapshot, previous)
        return snapshot
      }

      log.warn('Balance poll failed', { accountId: options.accountId.slice(0, 8) })
      options.onError?.(err instanceof Error ? err : new Error(String(err)))
      return null
    } finally {
      inFlight = false
      scheduleNext()
    }
  }

  return {
    start() {
      if (running) return
      running = true
      void refresh()
    },
    stop() {
      running = false
      clearTimer()
    },
    refresh,
    isRunning: () => running,
    getSnapshot: () => snapshot,
  }
}
