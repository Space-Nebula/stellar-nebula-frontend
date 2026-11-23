import { getActiveStellarConfig, createHorizonServer } from '@/config/stellar'
import { fetchAccountBalances as fetchHorizonAccountBalances } from '@/utils/horizon-utils'

/**
 * Fetches user balances for an account from Stellar Horizon (#552).
 * Returns a map of asset code -> balance number (e.g. { XLM: 100.5, DUST: 45 }).
 */
export async function fetchAccountBalances(
  accountId?: string | null
): Promise<Record<string, number>> {
  if (!accountId) {
    return {}
  }

  try {
    const config = getActiveStellarConfig()
    const horizon = await createHorizonServer(config)
    const formattedBalances = await fetchHorizonAccountBalances(horizon, accountId)

    const result: Record<string, number> = {}
    for (const b of formattedBalances) {
      result[b.assetCode] = parseFloat(b.balance) || 0
    }
    return result
  } catch (err) {
    // If account not found / network error, return empty balance map
    return {}
  }
}

/**
 * Fetches the user balance for a specific asset on Stellar DEX (#552).
 * Defaults to 'XLM' if no assetCode specified.
 */
export async function fetchUserAssetBalance(
  accountId?: string | null,
  assetCode: string = 'XLM'
): Promise<number> {
  if (!accountId) {
    return 0
  }

  const balances = await fetchAccountBalances(accountId)
  return balances[assetCode] ?? 0
}

export default {
  fetchAccountBalances,
  fetchUserAssetBalance,
}
