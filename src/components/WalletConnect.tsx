import { useState, useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useWalletDetection } from '@/hooks/useWalletDetection'
import { Spinner } from '@/components/UI/Spinner'
import type { WalletType } from '@/types'

export interface WalletConnectProps {
  walletType?: WalletType
  onConnected?: () => void
  className?: string
}

/**
 * WalletConnect component with Firefox asynchronous injection support (#546).
 * Displays "Detecting wallet..." during retries and provides a manual Retry button
 * if the extension was not detected on initial load.
 */
export function WalletConnect({
  walletType = 'freighter',
  onConnected,
  className = '',
}: WalletConnectProps) {
  const { walletState, connect, isLoading: isConnecting, error: contextError } = useWallet()
  const { isDetecting, isInstalled, error: detectionError, retry } = useWalletDetection({
    walletType,
    timeoutMs: 3000,
    initialDelayMs: 100,
  })

  const [connectError, setConnectError] = useState<string | null>(null)

  const handleConnect = useCallback(async () => {
    setConnectError(null)
    try {
      await connect(walletType)
      onConnected?.()
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [connect, onConnected, walletType])

  const handleRetry = useCallback(async () => {
    setConnectError(null)
    const found = await retry()
    if (found) {
      await handleConnect()
    }
  }, [retry, handleConnect])

  const errorMessage = connectError || contextError || detectionError

  return (
    <div className={`wallet-connect-container p-4 rounded-xl border border-space-800 bg-space-950/70 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            {walletType === 'freighter' ? '🚀' : '👛'}
          </span>
          <span className="font-semibold text-white capitalize">{walletType} Wallet</span>
        </div>

        {isDetecting ? (
          <span className="flex items-center gap-1.5 text-xs text-cosmic-cyan">
            <Spinner size="sm" />
            <span>Detecting wallet…</span>
          </span>
        ) : isInstalled ? (
          <span className="text-xs text-emerald-400 font-medium">Available</span>
        ) : (
          <span className="text-xs text-amber-400 font-medium">Not detected</span>
        )}
      </div>

      {isDetecting ? (
        <div className="py-3 text-center text-sm text-space-300 flex items-center justify-center gap-2">
          <Spinner size="sm" />
          <span>Searching for {walletType} extension (waiting up to 3s)…</span>
        </div>
      ) : !isInstalled ? (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs text-space-400">
            {walletType === 'freighter'
              ? 'Freighter extension not detected yet. If using Firefox, extension injection may be delayed.'
              : `${walletType} is not installed or enabled.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleRetry()}
              aria-label="Retry wallet detection"
              className="flex-1 py-1.5 px-3 rounded bg-space-800 hover:bg-space-700 text-white text-xs font-semibold transition-colors"
            >
              🔄 Retry Detection
            </button>
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded border border-space-700 hover:border-space-500 text-space-300 text-xs font-medium text-center transition-colors"
            >
              Get Extension
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            disabled={isConnecting || walletState.isConnected}
            onClick={() => void handleConnect()}
            className="w-full py-2 px-4 rounded bg-cosmic-cyan text-space-950 font-bold text-sm hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                <span>Connecting…</span>
              </span>
            ) : walletState.isConnected ? (
              'Connected'
            ) : (
              `Connect ${walletType}`
            )}
          </button>
        </div>
      )}

      {errorMessage && !isDetecting && (
        <div role="alert" className="mt-2 text-xs text-rose-400">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

export default WalletConnect
