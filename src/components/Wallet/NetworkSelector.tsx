import { useEffect, useMemo, useRef, useState } from 'react'
import { useNetwork } from '@/contexts'
import type { StellarNetwork } from '@/types'

// ─── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'relative',
}

const buttonStyle = (isOpen: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backgroundColor: isOpen ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
  color: isOpen ? '#00d4ff' : '#ffffff',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textTransform: 'capitalize',
})

const buttonHoverStyle: React.CSSProperties = {
  backgroundColor: 'rgba(0, 212, 255, 0.15)',
  borderColor: 'rgba(0, 212, 255, 0.4)',
  color: '#00d4ff',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '8px',
  backgroundColor: '#1a1a1a',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  zIndex: 100,
  minWidth: '140px',
  overflow: 'hidden',
}

const optionStyle = (isActive: boolean, isHovered: boolean): React.CSSProperties => ({
  padding: '10px 12px',
  textAlign: 'left',
  backgroundColor: isActive ? 'rgba(0, 212, 255, 0.15)' : isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
  color: isActive ? '#00d4ff' : '#ffffff',
  fontSize: '13px',
  cursor: 'pointer',
  borderLeft: isActive ? '2px solid #00d4ff' : '2px solid transparent',
  transition: 'all 0.15s ease',
  textTransform: 'capitalize',
  fontWeight: isActive ? 500 : 400,
})

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#888888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  paddingLeft: '12px',
  paddingRight: '12px',
  paddingTop: '8px',
}

const dividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  margin: '4px 0',
}

const iconStyle: React.CSSProperties = {
  fontSize: '10px',
  transition: 'transform 0.2s ease',
}

// ─── Component ────────────────────────────────────────────────────────────────

const NETWORKS: StellarNetwork[] = ['testnet', 'futurenet', 'mainnet']

export function NetworkSelector() {
  const { currentNetwork, switchNetwork } = useNetwork()
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredNetwork, setHoveredNetwork] = useState<StellarNetwork | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const getNetworkBadgeColor = (network: StellarNetwork): string => {
    switch (network) {
      case 'testnet':
        return '#ff9500'
      case 'futurenet':
        return '#00d4ff'
      case 'mainnet':
        return '#00ff00'
      default:
        return '#ffffff'
    }
  }

  const handleNetworkSelect = async (network: StellarNetwork) => {
    setIsOpen(false)
    try {
      await switchNetwork(network)
    } catch (err) {
      console.error('Failed to switch network:', err)
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const memoizedNetworks = useMemo(() => NETWORKS, [])

  return (
    <div style={containerStyle} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle(isOpen)}
        onMouseEnter={(e) => {
          if (!isOpen) Object.assign(e.currentTarget.style, buttonHoverStyle)
        }}
        onMouseLeave={(e) => {
          if (!isOpen) Object.assign(e.currentTarget.style, buttonStyle(false))
        }}
        aria-label="Select network"
        aria-expanded={isOpen}
      >
        <span
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getNetworkBadgeColor(currentNetwork),
            flexShrink: 0,
          }}
        />
        {getNetworkLabel(currentNetwork)}
        <span
          style={{
            ...iconStyle,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div style={dropdownStyle}>
          <div style={labelStyle}>Select Network</div>
          <div style={dividerStyle} />
          {memoizedNetworks.map((network) => (
            <button
              key={network}
              type="button"
              onClick={() => handleNetworkSelect(network)}
              onMouseEnter={() => setHoveredNetwork(network)}
              onMouseLeave={() => setHoveredNetwork(null)}
              style={optionStyle(network === currentNetwork, network === hoveredNetwork)}
              aria-label={`Switch to ${getNetworkLabel(network)}`}
            >
              <span style={{ display: 'inline-block', marginRight: '8px' }}>
                {network === currentNetwork ? '✓' : ' '}
              </span>
              {getNetworkLabel(network)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
