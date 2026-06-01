import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'

interface MobileMenuItem {
  label: string
  to: string
}

interface MobileMenuProps {
  isOpen: boolean
  items: MobileMenuItem[]
  onClose: () => void
}

export function MobileMenu({ isOpen, items, onClose }: MobileMenuProps) {
  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <div className={`mobile-menu-root ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="mobile-menu-overlay"
        aria-label="Close mobile menu"
        onClick={onClose}
      />

      <aside className="mobile-menu-panel" aria-label="Mobile navigation menu" aria-hidden={!isOpen}>
        <div className="mobile-menu-header">
          <span>Menu</span>
          <button type="button" className="mobile-menu-close" onClick={onClose} aria-label="Close menu">
            Close
          </button>
        </div>

        <nav className="mobile-menu-links">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'mobile-menu-link mobile-menu-link-active' : 'mobile-menu-link'
              }
              end={item.to === '/'}
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  )
}
