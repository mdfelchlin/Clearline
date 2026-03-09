import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function UserArea() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayName = user?.display_name ?? user?.email ?? 'User'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div className="user-area">
      <button
        className="user-area-btn"
        onClick={() => navigate('/settings')}
        aria-label={`User settings for ${displayName}`}
        title="Go to Settings"
      >
        <span className="user-avatar" aria-hidden="true">{initials}</span>
        <span className="user-name">{displayName}</span>
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={handleLogout}
        aria-label="Sign out"
      >
        Sign out
      </button>
    </div>
  )
}
