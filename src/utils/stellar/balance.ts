import { useAssetBalance } from '@hooks/useAssetBalance'
import type { StellarNetworkConfig } from '@config/stellar'
import type { FormattedBalance } from '@utils/horizon-utils'

export {
  formatBalance,
  getBalanceCacheKey,
  loadCachedBalances,
  saveCachedBalances,
} from '@utils/horizon-utils'
export type { FormattedBalance } from '@utils/horizon-utils'

export interface UseAccountBalancesResult {
  balances: FormattedBalance[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  isUnfunded: boolean
  refresh: () => Promise<void>
  isStreaming: boolean
  balanceChanged: boolean
}

/**
 * Backwards-compatible view over {@link useAssetBalance} for the wallet header.
 *
 * `isStreaming` is kept as the name the wallet UI already renders; balances now
 * arrive from a 5-second poll instead of a long-lived Horizon payment stream.
 *
 * @deprecated Prefer `useAssetBalance` directly in new code.
 */
export function useAccountBalances(
  accountId: string | null | undefined,
  config?: StellarNetworkConfig
): UseAccountBalancesResult {
  const {
    balances,
    isLoading,
    isRefreshing,
    error,
    isUnfunded,
    refresh,
    isPolling,
    balanceChanged,
  } = useAssetBalance(accountId, { config })

  return {
    balances,
    isLoading,
    isRefreshing,
    error,
    isUnfunded,
    refresh,
    isStreaming: isPolling,
    balanceChanged,
  }
}
