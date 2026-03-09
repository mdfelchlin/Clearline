import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/budget', label: 'Budget', icon: '💰' },
  { to: '/income', label: 'Income', icon: '📊' },
  { to: '/tax', label: 'Tax', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <nav className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-logo">
        <img src="/clearline-logo.png" alt="Clearline" className="sidebar-logo-img" />
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
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`sidebar-toggle-icon${collapsed ? ' sidebar-toggle-icon--flipped' : ''}`}
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="sidebar-nav-label">Collapse</span>
        </button>
      </div>
    </nav>
  )
}
