import { NavLink } from 'react-router-dom'
import NotificationCenter from './Notifications/NotificationCenter'

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Nebula', to: '/nebula' },
  { label: 'Ship', to: '/dashboard' },
  { label: 'Market', to: '/marketplace' },
]

function Navigation() {
  return (
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
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link-active' : 'nav-link'
            }
            end={item.to === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="header-tools">
        <NotificationCenter />
      </div>
    </header>
  )
}

export default Navigation
