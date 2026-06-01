import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useDebounce } from '@/hooks'
import {
  buildTrustlineTransaction,
  checkTrustlineReserve,
  fetchTrustlineStatus,
  submitTrustlineTransaction,
  type TrustlineAsset,
  type TrustlineStatus,
} from '@/services/assets/trustlines'
import { estimateTransactionFee, formatFeeInXlm } from '@/utils/stellar/feeEstimation'
import { getActiveStellarConfig } from '@/config/stellar'
import { ConfirmModal } from './ConfirmModal'

function isValidAssetCode(code: string): boolean {
  return /^[A-Z0-9]{1,12}$/.test(code)
}

function isValidIssuer(issuer: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(issuer)
}

export function TrustlineManager() {
  const { walletState, signTransaction } = useWallet()
  const config = getActiveStellarConfig()
  const [assetCode, setAssetCode] = useState('GAME')
  const [issuer, setIssuer] = useState('')
  const [limit, setLimit] = useState('')
  const [statusMessage, setStatusMessage] = useState<string>(
    'Choose an asset to inspect its trustline status.'
  )
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [trustlineStatus, setTrustlineStatus] = useState<TrustlineStatus | null>(null)
  const [estimatedFee, setEstimatedFee] = useState<string>('---')
  const [estimatedFeeStroops, setEstimatedFeeStroops] = useState<number | null>(null)
  const [draftXdr, setDraftXdr] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitResult, setSubmitResult] = useState<string | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)

  const debouncedAssetCode = useDebounce(assetCode, 200)
  const debouncedIssuer = useDebounce(issuer, 200)

  const asset = useMemo<TrustlineAsset | null>(() => {
    if (!isValidAssetCode(debouncedAssetCode) || !isValidIssuer(debouncedIssuer)) return null
    return {
      code: debouncedAssetCode,
      issuer: debouncedIssuer,
    }
  }, [debouncedAssetCode, debouncedIssuer])

  const reserveCheck = useMemo(() => {
    if (!trustlineStatus) return null
    return checkTrustlineReserve(trustlineStatus.nativeBalance, trustlineStatus.subentryCount)
  }, [trustlineStatus])

  useEffect(() => {
    if (!assetCode || !issuer) return
    if (!isValidAssetCode(assetCode) || !isValidIssuer(issuer)) return
    void handleInspectTrustline()
    // The inputs are intentionally debounced to avoid spamming Horizon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAssetCode, debouncedIssuer])

  async function handleInspectTrustline() {
    if (!walletState.publicKey || !asset) {
      setStatusMessage('Connect a wallet and enter a valid asset to inspect the trustline.')
      return
    }

    setIsChecking(true)
    setStatusError(null)
    setSubmitResult(null)

    try {
      const status = await fetchTrustlineStatus(walletState.publicKey, asset)
      setTrustlineStatus(status)

      if (status.exists) {
        setStatusMessage(
          `Trustline already exists with a balance of ${status.balance} and a limit of ${status.limit}.`
        )
      } else {
        setStatusMessage(
          `No trustline found yet. Creating one will consume ${status.reserveDeltaXlm} XLM of reserve.`
        )
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Unable to inspect trustline state.')
    } finally {
      setIsChecking(false)
    }
  }

  const handlePrepareTrustline = async () => {
    if (!walletState.publicKey || !asset) {
      setStatusError('Connect a wallet and enter a valid asset before preparing the transaction.')
      return
    }

    if (!walletState.network) {
      setStatusError('Wallet network is unavailable.')
      return
    }

    if (walletState.network !== config.network) {
      setStatusError(
        'Wallet network does not match the active Horizon configuration. Switch your wallet network before preparing this transaction.'
      )
      return
    }

    setIsPreparing(true)
    setStatusError(null)
    setWalletError(null)
    setSubmitResult(null)

    try {
      const draft = await buildTrustlineTransaction(
        walletState.publicKey,
        asset,
        limit.trim() || undefined
      )
      setDraftXdr(draft.xdr)

      const fee = await estimateTransactionFee({ operationCount: 1, safetyBufferMultiplier: 1.25 })
      setEstimatedFee(fee.xlm)
      setEstimatedFeeStroops(fee.stroops)
      setConfirmOpen(true)
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : 'Unable to prepare trustline transaction.'
      )
    } finally {
      setIsPreparing(false)
    }
  }

  const handleConfirmTrustline = async () => {
    if (isSubmitting) {
      return
    }

    if (!draftXdr || !asset) {
      setStatusError('No draft transaction available.')
      return
    }

    setIsSubmitting(true)
    setStatusError(null)
    setWalletError(null)

    try {
      const signedXdr = await signTransaction(draftXdr)
      if (!signedXdr) {
        throw new Error('Transaction signing was cancelled.')
      }

      const submission = await submitTrustlineTransaction(signedXdr)
      const record = submission as Record<string, unknown>
      const hash = typeof record.hash === 'string' ? record.hash : 'submitted'
      setSubmitResult(`Trustline submitted successfully. Transaction ${hash}.`)
      setConfirmOpen(false)

      if (walletState.publicKey) {
        const refreshed = await fetchTrustlineStatus(walletState.publicKey, asset)
        setTrustlineStatus(refreshed)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit trustline transaction.'
      setWalletError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const networkLabel = walletState.network ?? config.network

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Trustline management</p>
          <h3 style={titleStyle}>Inspect, confirm, and submit trustlines</h3>
          <p style={copyStyle}>
            Check whether the wallet already trusts the resource asset, estimate the reserve impact,
            and prepare a signed change-trust transaction.
          </p>
        </div>
        <div style={chipStackStyle}>
          <span style={chipStyle}>Network: {networkLabel}</span>
          <span style={chipStyle}>Horizon: {config.horizonUrl}</span>
        </div>
      </div>

      <div style={formGridStyle}>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Asset code</span>
          <input
            value={assetCode}
            onChange={(event) => setAssetCode(event.target.value.toUpperCase())}
            placeholder="GAME"
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Issuer public key</span>
          <input
            value={issuer}
            onChange={(event) => setIssuer(event.target.value.trim())}
            placeholder="G..."
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Trustline limit</span>
          <input
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            placeholder="Leave empty for the default maximum"
            style={inputStyle}
          />
        </label>
      </div>

      <div style={buttonRowStyle}>
        <button
          type="button"
          onClick={handleInspectTrustline}
          style={secondaryButtonStyle}
          disabled={isChecking}
        >
          {isChecking ? 'Inspecting…' : 'Inspect trustline'}
        </button>
        <button
          type="button"
          onClick={handlePrepareTrustline}
          style={primaryButtonStyle}
          disabled={isPreparing}
        >
          {isPreparing ? 'Preparing…' : 'Prepare trustline'}
        </button>
      </div>

      <div style={statusCardStyle}>
        <p style={statusLabelStyle}>Status</p>
        <p style={statusMessageStyle}>{statusMessage}</p>
        {trustlineStatus && (
          <div style={statusMetricsStyle}>
            <span style={metricStyle}>Exists: {trustlineStatus.exists ? 'Yes' : 'No'}</span>
            <span style={metricStyle}>Balance: {trustlineStatus.balance}</span>
            <span style={metricStyle}>Reserve: {trustlineStatus.reserveDeltaXlm} XLM</span>
            <span style={metricStyle}>Can afford: {trustlineStatus.canAfford ? 'Yes' : 'No'}</span>
            <span style={metricStyle}>Current limit: {trustlineStatus.limit}</span>
          </div>
        )}
        {reserveCheck && (
          <p style={reserveNoteStyle}>
            Available reserve: {reserveCheck.availableXlm} XLM. Required reserve:{' '}
            {reserveCheck.requiredXlm} XLM.
          </p>
        )}
        {estimatedFeeStroops !== null && (
          <p style={reserveNoteStyle}>Estimated fee: {formatFeeInXlm(estimatedFeeStroops)}.</p>
        )}
        {statusError && (
          <p role="alert" style={errorStyle}>
            {statusError}
          </p>
        )}
        {walletError && (
          <p role="alert" style={errorStyle}>
            {walletError}
          </p>
        )}
        {submitResult && <p style={successStyle}>{submitResult}</p>}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Confirm trustline transaction"
        operationType="changeTrust"
        estimatedFee={estimatedFee === '---' ? 'Fee not estimated yet' : `${estimatedFee} XLM`}
        details={[
          { label: 'Asset', value: asset ? `${asset.code}:${asset.issuer}` : 'Unknown' },
          { label: 'Limit', value: limit.trim() || 'Default maximum' },
          {
            label: 'Expected reserve impact',
            value: trustlineStatus ? `${trustlineStatus.reserveDeltaXlm} XLM` : '0.5000000 XLM',
          },
          {
            label: 'Wallet',
            value: walletState.publicKey
              ? `${walletState.publicKey.slice(0, 6)}…${walletState.publicKey.slice(-6)}`
              : 'Disconnected',
          },
        ]}
        isSubmitting={isSubmitting}
        error={walletError}
        confirmLabel="Sign and submit"
        onConfirm={handleConfirmTrustline}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  )
}

const panelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 18,
  borderRadius: 28,
  padding: 24,
  background: 'linear-gradient(180deg, rgba(8, 15, 33, 0.92), rgba(11, 18, 40, 0.96))',
  border: '1px solid rgba(159, 216, 255, 0.16)',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.24)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 18,
  flexWrap: 'wrap',
}

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#32d6a5',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const titleStyle: React.CSSProperties = {
  margin: '0.3rem 0 0',
  fontSize: '1.45rem',
}

const copyStyle: React.CSSProperties = {
  margin: '0.7rem 0 0',
  maxWidth: 640,
  color: '#c8d4e6',
  fontSize: 14,
}

const chipStackStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.5rem 0.75rem',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#d8e4f4',
  fontSize: 12,
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
}

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
}

const fieldLabelStyle: React.CSSProperties = {
  color: '#8ea0b9',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  color: '#f8fbff',
  padding: '0.8rem 1rem',
  outline: 'none',
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
}

const primaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: 'none',
  background: '#32d6a5',
  color: '#07111f',
  fontWeight: 800,
  padding: '0.8rem 1.1rem',
}

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f8fbff',
  fontWeight: 700,
  padding: '0.8rem 1.1rem',
}

const statusCardStyle: React.CSSProperties = {
  borderRadius: 22,
  padding: 18,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
}

const statusLabelStyle: React.CSSProperties = {
  margin: 0,
  color: '#8ea0b9',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const statusMessageStyle: React.CSSProperties = {
  margin: '0.5rem 0 0',
  color: '#f8fbff',
}

const statusMetricsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 12,
}

const metricStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: '0.45rem 0.7rem',
  background: 'rgba(159, 216, 255, 0.08)',
  border: '1px solid rgba(159, 216, 255, 0.12)',
  color: '#d9ebff',
  fontSize: 12,
}

const reserveNoteStyle: React.CSSProperties = {
  margin: '0.85rem 0 0',
  color: '#c8d4e6',
  fontSize: 13,
}

const errorStyle: React.CSSProperties = {
  margin: '0.75rem 0 0',
  color: '#ffb3c1',
}

const successStyle: React.CSSProperties = {
  margin: '0.75rem 0 0',
  color: '#9ff2dd',
}
