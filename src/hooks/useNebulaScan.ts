import { useState, useCallback } from 'react'
import { parseStellarError, type ParsedStellarError } from '@/utils/stellar-errors'
import { showStellarErrorToast } from '@/components/Toast'
import { haptics } from '@/utils/haptics'
import { useNebulaScan as useContractNebulaScan, type UseNebulaScanOptions, type UseNebulaScanReturn } from './contracts/useNebulaScan'
import type { ScanNebulaResult } from '@/services/contracts'

export interface FriendlyNebulaScanReturn extends Omit<UseNebulaScanReturn, 'error'> {
  error: string | null
  friendlyError: ParsedStellarError | null
  recoveryStep: string | null
  learnMoreUrl: string | null
}

/**
 * Hook to execute nebula scans with humanized error handling.
 *
 * Catches raw Stellar SDK codes (tx_bad_seq, op_underfunded, timeout) and transforms
 * them into actionable user messages, displays distinct error toasts with recovery steps
 * and troubleshooting links, and tags errors in Sentry.
 */
export function useNebulaScan(options: UseNebulaScanOptions): FriendlyNebulaScanReturn {
  const [friendlyError, setFriendlyError] = useState<ParsedStellarError | null>(null)
  const baseHook = useContractNebulaScan(options)

  const scan = useCallback(
    async (nebulaId: string, scannerPublicKey: string): Promise<ScanNebulaResult | null> => {
      setFriendlyError(null)

      try {
        const result = await baseHook.scan(nebulaId, scannerPublicKey)
        if (!result && baseHook.error) {
          const parsed = parseStellarError(baseHook.error)
          setFriendlyError(parsed)
          showStellarErrorToast(baseHook.error)
        }
        return result
      } catch (err) {
        const parsed = parseStellarError(err)
        setFriendlyError(parsed)
        showStellarErrorToast(err)
        haptics.error()
        return null
      }
    },
    [baseHook]
  )

  const reset = useCallback(() => {
    setFriendlyError(null)
    baseHook.reset()
  }, [baseHook])

  return {
    ...baseHook,
    scan,
    reset,
    error: friendlyError?.message ?? baseHook.error,
    friendlyError,
    recoveryStep: friendlyError?.recoveryStep ?? null,
    learnMoreUrl: friendlyError?.learnMoreUrl ?? null,
  }
}

export default useNebulaScan
