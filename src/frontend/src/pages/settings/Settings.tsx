import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Palette, Bell, Users, UserPlus, Sun, Moon, Monitor } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { api } from '../../services/api'
import { Account, AccountMember, Invitation } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'

function SettingsCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <span className="settings-card-icon"><Icon size={18} strokeWidth={1.75} /></span>
        <div>
          <h2 className="settings-card-title">{title}</h2>
          {description && <p className="settings-card-desc">{description}</p>}
        </div>
      </div>
      <div className="settings-card-body">{children}</div>
    </div>
  )
}

function ProfileSection() {
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
    <SettingsCard icon={User} title="Profile" description="Update your name and account details.">
      <form onSubmit={handleSave} className="settings-form" noValidate>
        <div className="settings-form-row">
          <Input label="Email" type="email" value={user?.email ?? ''} disabled />
          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="settings-form-actions">
          <Button type="submit" loading={saving}>Save changes</Button>
          {saved && <span className="success-msg" role="status">Saved!</span>}
        </div>
      </form>
    </SettingsCard>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <SettingsCard icon={Palette} title="Appearance" description="Choose your preferred color theme.">
      <div className="theme-options">
        {([
          { key: 'system', label: 'System', Icon: Monitor },
          { key: 'light', label: 'Light', Icon: Sun },
          { key: 'dark', label: 'Dark', Icon: Moon },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`theme-option ${theme === key ? 'theme-option-active' : ''}`}
            onClick={() => setTheme(key)}
            aria-pressed={theme === key}
            type="button"
          >
            <Icon size={22} strokeWidth={1.5} className="theme-option-icon" />
            <span className="theme-option-label">{label}</span>
          </button>
        ))}
      </div>
    </SettingsCard>
  )
}

function NotificationsSection() {
  const { user, refreshUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard icon={Bell} title="Notifications" description="Control how and when you receive notifications.">
      <form onSubmit={handleSave} className="settings-form" noValidate>
        <div className="settings-toggle-row">
          <div>
            <span className="settings-toggle-label">Email notifications</span>
            <span className="settings-toggle-desc">Receive updates and alerts via email</span>
          </div>
          <label className="settings-switch" aria-label="Email notifications">
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
            />
            <span className="settings-switch-track" />
          </label>
        </div>
        <div className="settings-form-actions">
          <Button type="submit" loading={saving}>Save</Button>
          {saved && <span className="success-msg" role="status">Saved!</span>}
        </div>
      </form>
    </SettingsCard>
  )
}

function MembersSection() {
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
    mutationFn: (userId: string) => api.delete(`/accounts/${account!.id}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-members'] }),
  })

  return (
    <SettingsCard icon={Users} title="Team Members" description="People who have access to this account.">
      {isLoading ? <Spinner /> : (
        <ul className="members-list">
          {members?.map((m) => (
            <li key={m.user_id} className="member-item">
              <div className="member-avatar">{(m.users.display_name ?? m.users.email).charAt(0).toUpperCase()}</div>
              <div className="member-info">
                <span className="member-name">{m.users.display_name ?? m.users.email}</span>
                <span className="member-email">{m.users.email}</span>
              </div>
              <span className={`badge badge-${m.role}`}>{m.role}</span>
              {user?.id === account?.owner_id && m.user_id !== user?.id && (
                <Button variant="danger" size="sm"
                  onClick={() => { if (confirm(`Remove ${m.users.email}?`)) removeMutation.mutate(m.user_id) }}
                  loading={removeMutation.isPending}
                >
                  Remove
                </Button>
              )}
              {user?.id === m.user_id && user.id !== account?.owner_id && (
                <Button variant="ghost" size="sm"
                  onClick={() => { if (confirm('Leave this account?')) removeMutation.mutate(m.user_id) }}
                >
                  Leave
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  )
}

function InviteSection() {
  const { user } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const queryClient = useQueryClient()

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: () => api.get<{ account: Account }>('/accounts').then((d) => d.account),
  })

  const { data: invitations } = useQuery({
    queryKey: ['invitations', account?.id],
    queryFn: () => api.get<{ invitations: Invitation[] }>(`/accounts/${account!.id}/invitations`).then((d) => d.invitations),
    enabled: !!account?.id,
  })

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(`/accounts/${account!.id}/members`, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setTimeout(() => setInviteSuccess(''), 3000)
    },
    onError: (err) => setInviteError(String(err)),
  })

  const isOwner = user?.id === account?.owner_id

  return (
    <SettingsCard icon={UserPlus} title="Invite Members" description="Send an invitation to give someone access to this account.">
      {!isOwner ? (
        <p className="text-muted">Only account owners can invite members.</p>
      ) : (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); setInviteError(''); if (inviteEmail.trim()) inviteMutation.mutate(inviteEmail) }}
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
        </>
      )}
    </SettingsCard>
  )
}

export default function Settings() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>
      <div className="settings-sections">
        <ProfileSection />
        <AppearanceSection />
        <NotificationsSection />
        <MembersSection />
        <InviteSection />
      </div>
    </div>
  )
}
