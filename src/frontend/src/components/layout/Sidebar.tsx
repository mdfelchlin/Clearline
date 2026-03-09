import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/budget', label: 'Budget', icon: '💰' },
  { to: '/income', label: 'Income', icon: '📊' },
  { to: '/tax', label: 'Tax', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Clearline</span>
      </div>
      <ul className="sidebar-nav" role="list">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''}`
              }
            >
              <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
