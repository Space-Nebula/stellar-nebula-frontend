/* eslint-disable */
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after 30 seconds
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (!dismissed) {
          setShowPrompt(true)
        }
      }, 30000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div style={overlayStyle} role="dialog" aria-label="Install app prompt" aria-modal="true">
      <div style={promptStyle}>
        <div style={iconContainerStyle}>
          <span style={iconStyle}>📱</span>
        </div>

        <h3 style={titleStyle}>Install Nebula Nomad</h3>
        <p style={descriptionStyle}>
          Install our app for a better experience with offline support and quick access!
        </p>

        <div style={featuresStyle}>
          <div style={featureStyle}>
            <span>⚡</span>
            <span>Faster loading</span>
          </div>
          <div style={featureStyle}>
            <span>📴</span>
            <span>Offline access</span>
          </div>
          <div style={featureStyle}>
            <span>🔔</span>
            <span>Push notifications</span>
          </div>
        </div>

        <div style={actionsStyle}>
          <button
            onClick={handleInstall}
            style={installButtonStyle}
            aria-label="Install Nebula Nomad app"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            style={dismissButtonStyle}
            aria-label="Dismiss install prompt, maybe later"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'center',
  padding: '1rem',
  pointerEvents: 'none',
}

const promptStyle: React.CSSProperties = {
  backgroundColor: 'rgba(10, 16, 32, 0.98)',
  border: '1px solid rgba(50, 214, 165, 0.3)',
  borderRadius: '1.5rem',
  padding: '1.5rem',
  maxWidth: '400px',
  width: '100%',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
  pointerEvents: 'auto',
  animation: 'slideUp 0.3s ease-out',
}

const iconContainerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '1rem',
}

const iconStyle: React.CSSProperties = {
  fontSize: '3rem',
  display: 'inline-block',
  animation: 'bounce 1s ease-in-out infinite',
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 0.5rem 0',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#f8fbff',
  textAlign: 'center',
}

const descriptionStyle: React.CSSProperties = {
  margin: '0 0 1.5rem 0',
  fontSize: '0.95rem',
  color: '#c8d4e6',
  textAlign: 'center',
  lineHeight: 1.5,
}

const featuresStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '0.75rem',
  marginBottom: '1.5rem',
}

const featureStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem',
  backgroundColor: 'rgba(50, 214, 165, 0.08)',
  border: '1px solid rgba(50, 214, 165, 0.2)',
  borderRadius: '0.75rem',
  fontSize: '0.75rem',
  color: '#aabbd3',
  textAlign: 'center',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
}

const installButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.875rem 1.5rem',
  borderRadius: '999px',
  border: 'none',
  backgroundColor: '#32d6a5',
  color: '#07111f',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const dismissButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.875rem 1.5rem',
  borderRadius: '999px',
  border: '1px solid rgba(210, 222, 255, 0.2)',
  backgroundColor: 'transparent',
  color: '#b9c6dd',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
}
