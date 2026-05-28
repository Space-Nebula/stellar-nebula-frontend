import { useState, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { NebulaCanvas } from './components/Canvas'
import ErrorBoundary from './components/ErrorBoundary'
import { WalletProvider, useWallet } from './contexts/WalletContext'
import { NetworkProvider } from './contexts/NetworkContext'
import { WalletDisplay, ConnectModal, NetworkSelector, NetworkSwitchModal } from './components/Wallet'
import { isDev } from './config'
import { useGraphicsStore } from '@/store'
import type { StellarNetwork } from './types'
import './App.css'

function VisualSettingsPanel() {
  const bloomEnabled = useGraphicsStore((state) => state.bloomEnabled)
  const bloomIntensity = useGraphicsStore((state) => state.bloomIntensity)
  const performanceMode = useGraphicsStore((state) => state.performanceMode)
  const starfieldDensity = useGraphicsStore((state) => state.starfieldDensity)
  const setBloomEnabled = useGraphicsStore((state) => state.setBloomEnabled)
  const setBloomIntensity = useGraphicsStore((state) => state.setBloomIntensity)
  const setPerformanceMode = useGraphicsStore((state) => state.setPerformanceMode)
  const setStarfieldDensity = useGraphicsStore((state) => state.setStarfieldDensity)

  return (
    <div style={panelStyle}>
      <div style={panelHeaderStyle}>
        <span style={panelTitleStyle}>Visual Settings</span>
        <span style={panelHintStyle}>Bloom stays subtle by default</span>
      </div>

      <div style={toggleRowStyle}>
        <span style={toggleLabelStyle}>Bloom</span>
        <button
          type="button"
          aria-pressed={bloomEnabled}
          onClick={() => setBloomEnabled(!bloomEnabled)}
          style={switchStyle(bloomEnabled)}
        >
          <span style={switchKnobStyle(bloomEnabled)} />
        </button>
      </div>

      <label style={sliderRowStyle}>
        <span style={sliderLabelStyle}>Intensity</span>
        <input
          type="range"
          min="0"
          max="1.2"
          step="0.01"
          value={bloomIntensity}
          onChange={(event) => setBloomIntensity(Number(event.target.value))}
          disabled={!bloomEnabled}
          style={sliderStyle}
          aria-label="Bloom intensity"
        />
        <span style={sliderValueStyle}>{bloomIntensity.toFixed(2)}</span>
      </label>

      <button
        type="button"
        aria-pressed={performanceMode}
        onClick={() => setPerformanceMode(!performanceMode)}
        style={performanceButtonStyle(performanceMode)}
      >
        Performance mode {performanceMode ? 'on' : 'off'}
      </button>

      <label style={{ ...sliderRowStyle, marginBottom: 0, marginTop: 10 }}>
        <span style={sliderLabelStyle}>Star density</span>
        <input
          type="range"
          min="0.4"
          max="1.5"
          step="0.01"
          value={starfieldDensity}
          onChange={(event) => setStarfieldDensity(Number(event.target.value))}
          style={sliderStyle}
          aria-label="Starfield density"
        />
        <span style={sliderValueStyle}>{starfieldDensity.toFixed(2)}</span>
      </label>
    </div>
  )
}

function AppInner() {
  const [modalOpen, setModalOpen] = useState(false)
  const [networkModalOpen, setNetworkModalOpen] = useState(false)
  const { disconnect } = useWallet()

  const handleNetworkChange = useCallback(async (network: StellarNetwork) => {
    // Disconnect wallet when switching networks
    disconnect()
    toast.success(`Switched to ${network} network`)
    setNetworkModalOpen(false)
  }, [disconnect])

  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <NebulaCanvas showFps={isDev} />
      </div>

      {/* Wallet HUD — top-right overlay */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <NetworkSelector />
        <WalletDisplay onOpenConnectModal={() => setModalOpen(true)} />
      </div>

      <ConnectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <NetworkSwitchModal onClose={() => setNetworkModalOpen(false)} />
      <VisualSettingsPanel />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: 8,
            background: '#1a1a1a',
            color: 'rgba(255, 255, 255, 0.87)',
            border: '1px solid rgba(100, 108, 255, 0.3)',
          },
          success: {
            iconTheme: { primary: '#646cff', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ff4444', secondary: '#fff' },
          },
        }}
      />
    </>
  )
}

function App() {
  const handleNetworkChange = useCallback(async (network: StellarNetwork) => {
    // This callback is passed to NetworkProvider to handle side effects
    // when the network changes
  }, [])

  return (
    <ErrorBoundary>
      <NetworkProvider onNetworkChange={handleNetworkChange}>
        <WalletProvider>
          <AppInner />
        </WalletProvider>
      </NetworkProvider>
    </ErrorBoundary>
  )
}

export default App

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  left: 16,
  bottom: 16,
  zIndex: 12,
  width: 240,
  padding: 14,
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(10, 10, 24, 0.78), rgba(12, 12, 32, 0.92))',
  border: '1px solid rgba(167, 139, 250, 0.18)',
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.34)',
  backdropFilter: 'blur(12px)',
  color: 'rgba(255, 255, 255, 0.9)',
}

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  marginBottom: 12,
  textAlign: 'left',
}

const panelTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '0.02em',
}

const panelHintStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.58)',
}

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 12,
}

const toggleLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
}

const sliderRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: 10,
  marginBottom: 12,
}

const sliderLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#a78bfa',
}

const sliderValueStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'monospace',
  color: 'rgba(255, 255, 255, 0.64)',
  width: 38,
  textAlign: 'right',
}

const performanceButtonStyle = (enabled: boolean): React.CSSProperties => ({
  width: '100%',
  border: '1px solid rgba(96, 165, 250, 0.25)',
  background: enabled ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.05)',
  color: enabled ? '#bfdbfe' : 'rgba(255, 255, 255, 0.78)',
  padding: '8px 10px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'left',
})

const switchStyle = (enabled: boolean): React.CSSProperties => ({
  width: 46,
  height: 26,
  borderRadius: 999,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  background: enabled ? 'rgba(167, 139, 250, 0.72)' : 'rgba(255, 255, 255, 0.12)',
  padding: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: enabled ? 'flex-end' : 'flex-start',
})

const switchKnobStyle = (enabled: boolean): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: enabled ? '#f8fafc' : 'rgba(255, 255, 255, 0.76)',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
})
