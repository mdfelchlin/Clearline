import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { api } from '../../services/api'
import { Account, AccountMember, Invitation } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'

const TABS = ['Profile', 'Appearance', 'Account & Members', 'Invite Users', 'Notifications'] as const
type Tab = typeof TABS[number]

function ProfileTab() {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/user/preferences', { display_name: displayName })
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['user'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="profile-title">
      <h2 id="profile-title" className="section-title">Profile</h2>
      <form onSubmit={handleSave} className="settings-form" noValidate>
        <Input label="Email" type="email" value={user?.email ?? ''} disabled />
        <Input
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />
        <div className="settings-form-actions">
          <Button type="submit" loading={saving}>Save changes</Button>
          {saved && <span className="success-msg" role="status">Saved!</span>}
        </div>
      </form>
    </section>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()

  return (
    <section aria-labelledby="appearance-title">
      <h2 id="appearance-title" className="section-title">Appearance</h2>
      <div className="theme-options">
        {(['light', 'dark'] as const).map((t) => (
          <button
            key={t}
            className={`theme-option ${theme === t ? 'theme-option-active' : ''}`}
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
          >
            <span className="theme-option-icon">{t === 'light' ? '☀️' : '🌙'}</span>
            <span className="theme-option-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function AccountMembersTab() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: () => api.get<{ account: Account }>('/accounts').then((d) => d.account),
  })

  const { data: members, isLoading } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => api.get<{ members: AccountMember[] }>(`/accounts/${account!.id}/members`).then((d) => d.members),
    enabled: !!account?.id,
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/accounts/${account!.id}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-members'] })
    },
  })

  if (isLoading) return <Spinner />

  return (
    <section aria-labelledby="members-title">
      <h2 id="members-title" className="section-title">Account & Members</h2>
      {isLoading ? <Spinner /> : (
        <ul className="members-list">
          {members?.map((m) => (
            <li key={m.user_id} className="member-item">
              <div className="member-info">
                <span className="member-name">{m.users.display_name ?? m.users.email}</span>
                <span className="member-email">{m.users.email}</span>
                <span className={`badge badge-${m.role}`}>{m.role}</span>
              </div>
              {user?.id === account?.owner_id && m.user_id !== user.id && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => { if (confirm(`Remove ${m.users.email}?`)) removeMutation.mutate(m.user_id) }}
                  loading={removeMutation.isPending}
                >
                  Remove
                </Button>
              )}
              {user?.id === m.user_id && user.id !== account?.owner_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (confirm('Leave this account?')) removeMutation.mutate(m.user_id) }}
                >
                  Leave
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function InviteTab() {
  const { user } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: () => api.get<{ account: Account }>('/accounts').then((d) => d.account),
  })

  const { data: invitations } = useQuery({
    queryKey: ['invitations', account?.id],
    queryFn: () => api.get<{ invitations: Invitation[] }>(`/accounts/${account!.id}/invitations`).then((d) => d.invitations),
    enabled: !!account?.id,
  })

  const queryClient = useQueryClient()

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      api.post(`/accounts/${account!.id}/members`, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setTimeout(() => setInviteSuccess(''), 3000)
    },
    onError: (err) => {
      setInviteError(String(err))
    },
  })

  const isOwner = user?.id === account?.owner_id

  if (!isOwner) {
    return (
      <section>
        <h2 className="section-title">Invite Users</h2>
        <p className="text-muted">Only account owners can invite members.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="invite-title">
      <h2 id="invite-title" className="section-title">Invite Users</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setInviteError('')
          if (!inviteEmail.trim()) return
          inviteMutation.mutate(inviteEmail)
        }}
        className="invite-form"
        noValidate
      >
        <Input
          label="Email address"
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="colleague@example.com"
          required
          error={inviteError || undefined}
        />
        <Button type="submit" loading={inviteMutation.isPending}>Send invitation</Button>
      </form>
      {inviteSuccess && <p className="success-msg" role="status">{inviteSuccess}</p>}

      {invitations && invitations.length > 0 && (
        <div className="pending-invitations">
          <h3 className="subsection-title">Pending invitations</h3>
          <ul className="invitations-list">
            {invitations.map((inv) => (
              <li key={inv.id} className="invitation-item">
                <span>{inv.email}</span>
                <span className="badge badge-pending">Pending</span>
                <span className="text-muted">Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function NotificationsTab() {
  const { user, refreshUser } = useAuth()
  const [saving, setSaving] = useState(false)

  const prefs = user?.notification_preferences ?? {}
  const [emailNotifs, setEmailNotifs] = useState(prefs.email_notifications ?? true)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/user/preferences', {
        notification_preferences: { email_notifications: emailNotifs },
      })
      await refreshUser()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="notifications-title">
      <h2 id="notifications-title" className="section-title">Notification Preferences</h2>
      <form onSubmit={handleSave} className="settings-form" noValidate>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={emailNotifs}
            onChange={(e) => setEmailNotifs(e.target.checked)}
          />
          Email notifications
        </label>
        <div className="settings-form-actions">
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </section>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <nav className="tabs" aria-label="Settings tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="tab-content settings-content" role="tabpanel">
        {activeTab === 'Profile' && <ProfileTab />}
        {activeTab === 'Appearance' && <AppearanceTab />}
        {activeTab === 'Account & Members' && <AccountMembersTab />}
        {activeTab === 'Invite Users' && <InviteTab />}
        {activeTab === 'Notifications' && <NotificationsTab />}
      </div>
    </div>
  )
}
