import { useNetwork } from '@/contexts'
import type { StellarNetwork } from '@/types'

// ─── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: '32px',
  maxWidth: '450px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  animation: 'slideIn 0.3s ease-out',
}

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#ffffff',
  marginBottom: '12px',
}

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#b3b3b3',
  marginBottom: '24px',
  lineHeight: '1.6',
}

const warningBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 193, 7, 0.1)',
  border: '1px solid rgba(255, 193, 7, 0.3)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '24px',
  fontSize: '13px',
  color: '#ffc107',
  lineHeight: '1.5',
}

const networkDisplayStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px',
}

const networkItemStyle: React.CSSProperties = {
  textAlign: 'center',
}

const networkLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888888',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const networkNameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#ffffff',
  textTransform: 'capitalize',
}

const arrowStyle: React.CSSProperties = {
  color: '#666666',
  fontSize: '18px',
}

const buttonsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
}

const buttonStyle = (isPrimary: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '12px 16px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: isPrimary ? '#00d4ff' : 'rgba(255, 255, 255, 0.1)',
  color: isPrimary ? '#000000' : '#ffffff',
})

const buttonHoverStyle = (isPrimary: boolean): React.CSSProperties => ({
  ...buttonStyle(isPrimary),
  backgroundColor: isPrimary ? '#00e6ff' : 'rgba(255, 255, 255, 0.15)',
  transform: 'translateY(-1px)',
})

// ─── Component ────────────────────────────────────────────────────────────────

interface NetworkSwitchModalProps {
  onClose?: () => void
}

export function NetworkSwitchModal({ onClose }: NetworkSwitchModalProps) {
  const { currentNetwork, pendingNetwork, networkSwitchPending, confirmNetworkSwitch, cancelNetworkSwitch } =
    useNetwork()

  if (!networkSwitchPending || !pendingNetwork) {
    return null
  }

  const getNetworkLabel = (network: StellarNetwork): string => {
    switch (network) {
      case 'testnet':
        return 'Testnet'
      case 'futurenet':
        return 'Futurenet'
      case 'mainnet':
        return 'Mainnet'
      default:
        return network
    }
  }

  const handleConfirm = () => {
    confirmNetworkSwitch()
    onClose?.()
  }

  const handleCancel = () => {
    cancelNetworkSwitch()
    onClose?.()
  }

  return (
    <div style={overlayStyle} onClick={handleCancel}>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          button:hover {
            opacity: 0.9;
          }
        `}
      </style>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>Switch Network?</h2>
        <p style={messageStyle}>
          Switching networks will disconnect your wallet and require you to reconnect to continue using the app.
        </p>

        <div style={warningBoxStyle}>
          ⚠️ Make sure you have your wallet extension open and that it supports the target network before confirming.
        </div>

        <div style={networkDisplayStyle}>
          <div style={networkItemStyle}>
            <div style={networkLabelStyle}>Current</div>
            <div style={networkNameStyle}>{getNetworkLabel(currentNetwork)}</div>
          </div>
          <div style={arrowStyle}>→</div>
          <div style={networkItemStyle}>
            <div style={networkLabelStyle}>Switch to</div>
            <div style={networkNameStyle}>{getNetworkLabel(pendingNetwork)}</div>
          </div>
        </div>

        <div style={buttonsContainerStyle}>
          <button
            type="button"
            onClick={handleCancel}
            style={buttonStyle(false)}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, buttonHoverStyle(false))
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, buttonStyle(false))
            }}
            aria-label="Cancel network switch"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={buttonStyle(true)}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, buttonHoverStyle(true))
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, buttonStyle(true))
            }}
            aria-label="Confirm network switch"
          >
            Switch Network
          </button>
        </div>
      </div>
    </div>
  )
}
