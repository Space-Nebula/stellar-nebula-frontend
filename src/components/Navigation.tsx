import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { HelpModal } from './Help/HelpModal'
import { MobileMenu } from './Layout/MobileMenu'

import NotificationCenter from './Notifications/NotificationCenter'

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Nebula', to: '/nebula' },
  { label: 'Ship', to: '/dashboard' },
  { label: 'Market', to: '/marketplace' },
]

function Navigation() {
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label="Stellar Nebula home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Stellar Nebula</span>
        </NavLink>

        <nav className="main-nav" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
          <button type="button" className="help-link" onClick={() => setIsHelpOpen(true)}>
            Help
          </button>
        </nav>

        <div className="header-tools">
          <NotificationCenter />
        </div>

        <button
          type="button"
          className="mobile-menu-trigger"
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        items={navigationItems}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  )
}

export default Navigation
