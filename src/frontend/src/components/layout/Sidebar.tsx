import { NavLink } from 'react-router-dom'
import { Wallet, TrendingUp, Receipt, Settings, ChevronLeft, LucideIcon } from 'lucide-react'
import { Logo } from '../ui/Logo'

const navItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Budget', icon: Wallet },
  { to: '/income', label: 'Income', icon: TrendingUp },
  { to: '/tax', label: 'Tax', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <nav className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-logo">
        <Logo variant="sidebar" collapsed={collapsed} />
      </div>
      <ul className="sidebar-nav" role="list">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <span className="sidebar-nav-label">{label}</span>
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
          <span className="sidebar-nav-icon" aria-hidden="true">
            <ChevronLeft
              size={18}
              strokeWidth={1.75}
              className={`sidebar-toggle-icon${collapsed ? ' sidebar-toggle-icon--flipped' : ''}`}
            />
          </span>
          <span className="sidebar-nav-label">Collapse</span>
        </button>
      </div>
    </nav>
  )
}
