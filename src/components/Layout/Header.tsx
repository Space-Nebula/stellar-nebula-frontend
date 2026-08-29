import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useWallet } from '@/contexts'

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Nebula', to: '/nebula' },
  { label: 'Ship', to: '/dashboard' },
  { label: 'Market', to: '/marketplace' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

interface HeaderProps {
  onOpenConnectModal?: () => void
}

function Header({ onOpenConnectModal }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { walletState, disconnect } = useWallet()
  const { isConnected, publicKey } = walletState

  function toggleMenu() {
    setMenuOpen((prev) => !prev)
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="site-header" role="banner">
        {/* Brand / Logo */}
        <NavLink to="/" className="brand" aria-label="Stellar Nebula home" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true" />
          <span>Stellar Nebula</span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="main-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Wallet button (desktop) */}
        <div className="header-wallet">
          {isConnected && publicKey ? (
            <div className="header-wallet-connected">
              <span className="header-wallet-address" title={publicKey}>
                {truncate(publicKey)}
              </span>
              <button
                onClick={disconnect}
                className="header-wallet-disconnect"
                aria-label="Disconnect wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenConnectModal}
              className="wallet-connect-btn primary-action"
              aria-label="Connect wallet"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="header-hamburger"
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`hamburger-bar ${menuOpen ? 'hamburger-bar--open-1' : ''}`} />
          <span className={`hamburger-bar ${menuOpen ? 'hamburger-bar--open-2' : ''}`} />
          <span className={`hamburger-bar ${menuOpen ? 'hamburger-bar--open-3' : ''}`} />
        </button>

        {/* Mobile menu */}
        {menuOpen && (
          <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'mobile-nav-link mobile-nav-link--active' : 'mobile-nav-link'
                }
                end={item.to === '/'}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mobile-wallet">
              {isConnected && publicKey ? (
                <>
                  <span className="header-wallet-address">{truncate(publicKey)}</span>
                  <button
                    onClick={() => {
                      disconnect()
                      closeMenu()
                    }}
                    className="header-wallet-disconnect"
                    aria-label="Disconnect wallet"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onOpenConnectModal?.()
                    closeMenu()
                  }}
                  className="wallet-connect-btn primary-action"
                  aria-label="Connect wallet"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  )
}

export default Header
