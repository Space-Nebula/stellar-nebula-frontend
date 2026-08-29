/* eslint-disable */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Horizon } from '@stellar/stellar-sdk'
import { createHorizonServer } from '@config/stellar'
import type { StellarNetworkConfig } from '@config/stellar'
import { toast } from 'react-hot-toast'

export interface FormattedBalance {
  assetCode: string
  assetIssuer?: string
  balance: string
  assetType: 'native' | 'credit_alphanum4' | 'credit_alphanum12' | 'liquidity_pool_shares'
  isNative: boolean
}

interface UseAccountBalancesResult {
  balances: FormattedBalance[]
  isLoading: boolean
  error: string | null
  isUnfunded: boolean
  refresh: () => Promise<void>
  isStreaming: boolean
  balanceChanged: boolean
}

/**
 * Format a Horizon balance line into a more usable UI format
 */
export const formatBalance = (balance: Horizon.HorizonApi.BalanceLine): FormattedBalance => {
  if (balance.asset_type === 'native') {
    return {
      assetCode: 'XLM',
      balance: balance.balance,
      assetType: 'native',
      isNative: true,
    }
  }

  const code = 'asset_code' in balance ? balance.asset_code : 'LP'
  const issuer = 'asset_issuer' in balance ? balance.asset_issuer : undefined

  return {
    assetCode: code,
    assetIssuer: issuer,
    balance: balance.balance,
    assetType: balance.asset_type as
      | 'credit_alphanum4'
      | 'credit_alphanum12'
      | 'liquidity_pool_shares',
    isNative: false,
  }
}

export const getBalanceCacheKey = (accountId: string): string =>
  `stellar-nebula:balance-cache:${accountId}`

export function loadCachedBalances(accountId: string): FormattedBalance[] | null {
  if (typeof window === 'undefined' || !accountId) return null
  try {
    const raw = localStorage.getItem(getBalanceCacheKey(accountId))
    if (!raw) return null
    return JSON.parse(raw) as FormattedBalance[]
  } catch {
    return null
  }
}

export function saveCachedBalances(accountId: string, balances: FormattedBalance[]): void {
  if (typeof window === 'undefined' || !accountId) return
  try {
    if (balances.length === 0) {
      localStorage.removeItem(getBalanceCacheKey(accountId))
    } else {
      localStorage.setItem(getBalanceCacheKey(accountId), JSON.stringify(balances))
    }
  } catch {
    // Ignore quota errors
  }
}

/**
 * React hook to fetch and auto-refresh account balances
 */
export function useAccountBalances(
  accountId: string | null | undefined,
  config?: StellarNetworkConfig
): UseAccountBalancesResult {
  const [balances, setBalances] = useState<FormattedBalance[]>(() => {
    if (accountId) {
      const cached = loadCachedBalances(accountId)
      if (cached && cached.length > 0) return cached
    }
    return []
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnfunded, setIsUnfunded] = useState<boolean>(false)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [balanceChanged, setBalanceChanged] = useState<boolean>(false)
  const previousBalancesRef = useRef<FormattedBalance[]>(balances)
  const balanceChangeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Populate cache if accountId changes
  useEffect(() => {
    if (accountId) {
      const cached = loadCachedBalances(accountId)
      if (cached && cached.length > 0) {
        setBalances(cached)
        previousBalancesRef.current = cached
      }
    } else {
      setBalances([])
      previousBalancesRef.current = []
    }
  }, [accountId])

  const fetchBalances = useCallback(async () => {
    if (!accountId) {
      setBalances([])
      setError(null)
      setIsUnfunded(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsUnfunded(false)

    try {
      const server = createHorizonServer(config)
      const account = await server.accounts().accountId(accountId).call()

      const formatted = account.balances.map(formatBalance)
      // Sort XLM first
      formatted.sort((a, b) => (a.isNative === b.isNative ? 0 : a.isNative ? -1 : 1))

      // Check for balance changes
      const hasChanges = formatted.some((newBalance, idx) => {
        const oldBalance = previousBalancesRef.current[idx]
        return !oldBalance || oldBalance.balance !== newBalance.balance
      })

      if (hasChanges && previousBalancesRef.current.length > 0) {
        setBalanceChanged(true)

        // Show toast notification for balance change
        const xlmBalance = formatted.find((b) => b.isNative)
        if (xlmBalance) {
          toast.success(`Balance updated: ${parseFloat(xlmBalance.balance).toFixed(2)} XLM`, {
            duration: 3000,
            icon: '💰',
          })
        }

        // Reset indicator after 2 seconds
        if (balanceChangeTimerRef.current) {
          clearTimeout(balanceChangeTimerRef.current)
        }
        balanceChangeTimerRef.current = setTimeout(() => {
          setBalanceChanged(false)
        }, 2000)
      }

      previousBalancesRef.current = formatted
      setBalances(formatted)
      saveCachedBalances(accountId, formatted)
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined

      if (status === 404) {
        setIsUnfunded(true)
        setBalances([])
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances')
      }
    } finally {
      setIsLoading(false)
    }
  }, [accountId, config])

  useEffect(() => {
    const loadBalances = async () => {
      await fetchBalances()
    }

    void loadBalances()

    if (!accountId) return

    let closeStream: (() => void) | undefined

    try {
      const server = createHorizonServer(config)

      // Auto-refresh on transactions via Horizon streaming
      closeStream = server
        .payments()
        .forAccount(accountId)
        .cursor('now')
        .stream({
          onmessage: () => {
            setIsStreaming(true)
            void fetchBalances()
          },
          onerror: (err) => {
            console.error('Error in payment stream:', err)
            setIsStreaming(false)
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
              void loadBalances()
            }, 5000)
          },
        })

      setIsStreaming(true)
    } catch (err) {
      console.error('Failed to setup stream', err)
      setIsStreaming(false)
    }

    return () => {
      if (closeStream) {
        closeStream()
        setIsStreaming(false)
      }
      if (balanceChangeTimerRef.current) {
        clearTimeout(balanceChangeTimerRef.current)
      }
    }
  }, [accountId, fetchBalances, config])

  return {
    balances,
    isLoading,
    error,
    isUnfunded,
    refresh: fetchBalances,
    isStreaming,
    balanceChanged,
  }
}
