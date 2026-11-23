import { useState, useEffect, useCallback, useRef } from 'react'
import { detectFreighterWithRetry } from '@/services/wallets/freighter'
import type { WalletType } from '@/types'

export interface UseWalletDetectionOptions {
  walletType?: WalletType
  timeoutMs?: number
  initialDelayMs?: number
  autoStart?: boolean
}

export interface UseWalletDetectionReturn {
  isDetecting: boolean
  isInstalled: boolean
  error: string | null
  retry: () => Promise<boolean>
}

/**
 * Hook to reliably detect browser wallet extensions (particularly on Firefox) (#546).
 * Handles asynchronous injection timing by polling with exponential backoff
 * and listening for extension load events up to 3 seconds.
 */
export function useWalletDetection(options: UseWalletDetectionOptions = {}): UseWalletDetectionReturn {
  const {
    walletType = 'freighter',
    timeoutMs = 3000,
    initialDelayMs = 100,
    autoStart = true,
  } = options

  const [isDetecting, setIsDetecting] = useState<boolean>(autoStart)
  const [isInstalled, setIsInstalled] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const activeAttemptRef = useRef<number>(0)

  const runDetection = useCallback(async (): Promise<boolean> => {
    const attemptId = ++activeAttemptRef.current
    setIsDetecting(true)
    setError(null)

    try {
      let detected = false
      if (walletType === 'freighter') {
        detected = await detectFreighterWithRetry(timeoutMs, initialDelayMs)
      } else {
        // Fallback for other wallets
        detected = typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>)[walletType])
      }

      if (attemptId === activeAttemptRef.current) {
        setIsInstalled(detected)
        if (!detected) {
          setError(
            `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet not detected. If recently installed, please refresh or retry.`
          )
        }
      }
      return detected
    } catch {
      if (attemptId === activeAttemptRef.current) {
        setIsInstalled(false)
        setError(`Failed while checking for ${walletType} wallet.`)
      }
      return false
    } finally {
      if (attemptId === activeAttemptRef.current) {
        setIsDetecting(false)
      }
    }
  }, [walletType, timeoutMs, initialDelayMs])

  useEffect(() => {
    if (autoStart) {
      void runDetection()
    }
  }, [autoStart, runDetection])

  return {
    isDetecting,
    isInstalled,
    error,
    retry: runDetection,
  }
}

export default useWalletDetection
