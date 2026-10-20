import { useEffect, useState } from 'react'
import { useLedger } from '@/hooks/useLedger'
import type { StellarNetwork } from '@/config/stellar'
import styles from './LedgerConnect.module.css'
import { getErrorMessage } from '@utils/error-messages'

export interface LedgerConnectProps {
  network?: StellarNetwork
  onConnect?: (publicKey: string) => void
  onError?: (error: string) => void
  isLoading?: boolean
}

type ConnectionStep = 'idle' | 'checking' | 'requesting' | 'connected' | 'error'

export function LedgerConnect({
  network = 'testnet',
  onConnect,
  onError,
  isLoading: externalLoading = false,
}: LedgerConnectProps) {
  const ledger = useLedger({ network })
  const [step, setStep] = useState<ConnectionStep>('checking')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const checkSupport = async () => {
      const supported = await ledger.checkAvailability()
      setIsSupported(supported)
      setStep(supported ? 'idle' : 'error')

      if (!supported) {
        const message = 'Ledger WebUSB is not supported in this browser'
        onError?.(message)
      }
    }

    checkSupport()
  }, [ledger, onError])

  const handleConnect = async () => {
    try {
      setStep('requesting')
      const publicKey = await ledger.connect()
      setStep('connected')
      onConnect?.(publicKey)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to connect to Ledger')
      setStep('error')
      onError?.(message)
    }
  }

  const handleDisconnect = async () => {
    await ledger.disconnect()
    setStep('idle')
  }

  const isLoading = externalLoading || ledger.isLoading

  if (!isSupported && step === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Ledger Not Supported</h3>
          <p>Your browser doesn't support Ledger WebUSB. Please use:</p>
          <ul>
            <li>Chrome, Chromium, or Edge on desktop</li>
            <li>A Ledger-compatible mobile wallet</li>
          </ul>
        </div>
      </div>
    )
  }

  if (ledger.isConnected && ledger.publicKey) {
    return (
      <div className={styles.container}>
        <div className={styles.connected}>
          <div className={styles.successIcon}>✓</div>
          <h3>Ledger Connected</h3>
          <div className={styles.publicKeyDisplay}>
            <label>Public Key:</label>
            <code>{ledger.publicKey}</code>
          </div>
          <button
            className={styles.disconnectBtn}
            onClick={handleDisconnect}
            disabled={isLoading}
            type="button"
          >
            Disconnect Ledger
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.icon}>💳</div>
          <h3>Connect Ledger Wallet</h3>
        </div>

        {ledger.error && (
          <div className={styles.errorBox}>
            <p>{ledger.error}</p>
            <button
              className={styles.retryBtn}
              onClick={() => ledger.clearError()}
              type="button"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className={styles.instructions}>
          <ol>
            <li>Connect your Ledger device via USB</li>
            <li>Open the Stellar App on your Ledger device</li>
            <li>Click the connect button below</li>
            <li>Approve the connection on your device</li>
          </ol>
        </div>

        <button
          className={styles.connectBtn}
          onClick={handleConnect}
          disabled={isLoading || ledger.isConnected}
          type="button"
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Connecting...
            </>
          ) : (
            'Connect Ledger'
          )}
        </button>

        <div className={styles.footer}>
          <p>Network: <strong>{network.toUpperCase()}</strong></p>
          <p className={styles.disclaimer}>
            Always verify transactions on your Ledger device before signing.
          </p>
        </div>
      </div>
    </div>
  )
}
