import { useCallback, useEffect, useRef, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useAccountBalances } from '@utils/stellar/balance'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

const COPY_RESET_MS = 2000

// ─── Component ────────────────────────────────────────────────────────────────

interface WalletDisplayProps {
  onOpenConnectModal?: () => void
}

export function WalletDisplay({ onOpenConnectModal }: WalletDisplayProps) {
  const { walletState, disconnect, isReconnecting, reconnectError } = useWallet()
  const { balances, isLoading, error, isUnfunded, isStreaming, balanceChanged } =
    useAccountBalances(walletState.publicKey)
  const [copied, setCopied] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const xlmBalance = balances.find((b) => b.isNative)
  const resourceAssetHoldings = balances.filter((b) => !b.isNative)

  const handleCopy = useCallback(async () => {
    if (!walletState.publicKey) return
    try {
      await navigator.clipboard.writeText(walletState.publicKey)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), COPY_RESET_MS)
    } catch {
      // Clipboard API unavailable
    }
  }, [walletState.publicKey])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  // Show reconnecting state
  if (isReconnecting) {
    return (
      <div style={containerStyle} aria-label="Reconnecting wallet">
        <div style={reconnectingIndicatorStyle}>
          <div style={spinnerStyle} aria-hidden="true" />
          <span style={reconnectingTextStyle}>Reconnecting…</span>
        </div>
      </div>
    )
  }

  // Show reconnect error
  if (reconnectError && !walletState.isConnected) {
    return (
      <button
        type="button"
        onClick={onOpenConnectModal}
        style={connectButtonStyle}
        aria-label="Connect wallet"
      >
        Connect Wallet
      </button>
    )
  }

  if (!walletState.isConnected || !walletState.publicKey) {
    return (
      <button
        type="button"
        onClick={onOpenConnectModal}
        style={connectButtonStyle}
        aria-label="Connect wallet"
      >
        Connect Wallet
      </button>
    )
  }

  const truncated = truncateAddress(walletState.publicKey)

  return (
    <div style={containerStyle}>
      {/* Loading indicator if initial balance fetch */}
      {isLoading && balances.length === 0 && !isUnfunded && (
        <div style={balanceChipStyle} aria-label="Loading balance">
          <div style={spinnerStyle} aria-hidden="true" />
          <span style={balanceAmountStyle}>Loading…</span>
        </div>
      )}

      {/* Unfunded badge */}
      {isUnfunded && (
        <div
          style={unfundedChipStyle}
          title="Account not funded on Stellar network"
          aria-label="Unfunded account"
        >
          Unfunded (0 XLM)
        </div>
      )}

      {/* Error badge */}
      {error && !isUnfunded && balances.length === 0 && (
        <div style={errorChipStyle} title={error} aria-label={`Balance error: ${error}`}>
          Error loading balance
        </div>
      )}

      {/* XLM Balance chip with streaming indicator */}
      {xlmBalance && (
        <div
          style={{
            ...balanceChipStyle,
            ...(balanceChanged ? balanceChangedStyle : {}),
          }}
          aria-label={`Balance: ${xlmBalance.balance} XLM${isStreaming ? ' (Live)' : ''}`}
        >
          {isStreaming && (
            <span
              style={streamingDotStyle}
              title="Real-time updates active"
              aria-label="Live updates"
            />
          )}
          <span style={balanceLabelStyle}>XLM</span>
          <span style={balanceAmountStyle}>{Number(xlmBalance.balance).toFixed(2)}</span>
        </div>
      )}

      {/* Resource Asset Holdings */}
      {resourceAssetHoldings.length > 0 && (
        <div style={assetsWrapperStyle}>
          <button
            type="button"
            onClick={() => setAssetsOpen((prev) => !prev)}
            aria-label={`Resource asset holdings: ${resourceAssetHoldings.length} assets`}
            aria-expanded={assetsOpen}
            style={assetsButtonStyle}
          >
            <span style={assetsIconStyle}>📦</span>
            <span>{resourceAssetHoldings.length} Assets</span>
          </button>

          {assetsOpen && (
            <div role="region" aria-label="Asset holdings details" style={assetsDropdownStyle}>
              <div style={assetsHeaderStyle}>Resource Asset Holdings</div>
              {resourceAssetHoldings.map((asset, i) => (
                <div key={asset.assetCode + i} style={assetItemStyle}>
                  <span style={assetCodeStyle}>{asset.assetCode}</span>
                  <span style={assetAmountStyle}>{Number(asset.balance).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Address + copy */}
      <div
        style={addressWrapperStyle}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
      >
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : `Copy full address: ${walletState.publicKey}`}
          title={walletState.publicKey}
          style={addressButtonStyle}
        >
          <span style={addressTextStyle}>{truncated}</span>
          <span aria-hidden="true" style={copyIconStyle}>
            {copied ? '✓' : '⧉'}
          </span>
        </button>

        {/* Tooltip with full address */}
        {tooltipVisible && !copied && (
          <div role="tooltip" style={tooltipStyle}>
            {walletState.publicKey}
          </div>
        )}
        {copied && (
          <div role="status" aria-live="polite" style={tooltipStyle}>
            Copied!
          </div>
        )}
      </div>

      {/* Disconnect */}
      <button
        type="button"
        onClick={disconnect}
        aria-label="Disconnect wallet"
        style={disconnectButtonStyle}
        title="Disconnect"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderRadius: 12,
  backgroundColor: 'rgba(100, 108, 255, 0.08)',
  border: '1px solid rgba(100, 108, 255, 0.25)',
}

const balanceChipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 8,
  backgroundColor: 'rgba(100, 108, 255, 0.15)',
  fontSize: '0.78em',
}

const balanceLabelStyle: React.CSSProperties = {
  color: '#9d4edd',
  fontWeight: 600,
}

const balanceAmountStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.9)',
}

const addressWrapperStyle: React.CSSProperties = {
  position: 'relative',
}

const addressButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'none',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.85)',
  cursor: 'pointer',
  fontSize: '0.82em',
  fontFamily: 'monospace',
  padding: '2px 4px',
  borderRadius: 4,
}

const addressTextStyle: React.CSSProperties = {
  letterSpacing: '0.03em',
}

const copyIconStyle: React.CSSProperties = {
  fontSize: '0.9em',
  color: 'rgba(255, 255, 255, 0.45)',
}

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#0d0d1a',
  border: '1px solid rgba(100, 108, 255, 0.3)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: '0.72em',
  fontFamily: 'monospace',
  color: 'rgba(255, 255, 255, 0.85)',
  whiteSpace: 'nowrap',
  zIndex: 50,
  pointerEvents: 'none',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

const disconnectButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.35)',
  cursor: 'pointer',
  fontSize: 14,
  padding: '2px 4px',
  borderRadius: 4,
  lineHeight: 1,
}

const connectButtonStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 10,
  border: '1px solid rgba(100, 108, 255, 0.5)',
  backgroundColor: 'rgba(100, 108, 255, 0.12)',
  color: '#a5adff',
  cursor: 'pointer',
  fontSize: '0.88em',
  fontWeight: 500,
  transition: 'border-color 0.2s, background-color 0.2s',
}

const reconnectingIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
}

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 14,
  height: 14,
  border: '2px solid rgba(100, 108, 255, 0.3)',
  borderTopColor: '#6469ff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

const reconnectingTextStyle: React.CSSProperties = {
  fontSize: '0.88em',
  color: 'rgba(165, 173, 255, 0.8)',
  fontWeight: 500,
}

const streamingDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: '#32d6a5',
  boxShadow: '0 0 0 2px rgba(50, 214, 165, 0.3)',
  animation: 'pulse 2s ease-in-out infinite',
}

const balanceChangedStyle: React.CSSProperties = {
  animation: 'balanceGlow 0.5s ease-out',
  boxShadow: '0 0 12px rgba(50, 214, 165, 0.6)',
}

const unfundedChipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 8,
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171',
  fontSize: '0.78em',
  fontWeight: 500,
}

const errorChipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 8,
  backgroundColor: 'rgba(245, 158, 11, 0.15)',
  color: '#fbbf24',
  fontSize: '0.78em',
}

const assetsWrapperStyle: React.CSSProperties = {
  position: 'relative',
}

const assetsButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 8,
  backgroundColor: 'rgba(167, 139, 250, 0.18)',
  border: '1px solid rgba(167, 139, 250, 0.3)',
  color: '#c084fc',
  fontSize: '0.78em',
  fontWeight: 600,
  cursor: 'pointer',
}

const assetsIconStyle: React.CSSProperties = {
  fontSize: '0.9em',
}

const assetsDropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  backgroundColor: '#0f172a',
  border: '1px solid rgba(167, 139, 250, 0.3)',
  borderRadius: 10,
  padding: '8px 12px',
  minWidth: 160,
  zIndex: 100,
  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
}

const assetsHeaderStyle: React.CSSProperties = {
  fontSize: '0.72em',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
  fontWeight: 700,
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  paddingBottom: 4,
}

const assetItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0',
  fontSize: '0.8em',
}

const assetCodeStyle: React.CSSProperties = {
  color: '#c084fc',
  fontWeight: 600,
  fontFamily: 'monospace',
}

const assetAmountStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontFamily: 'monospace',
}
