import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ApiError } from '../../services/api'

type Mode = 'signin' | 'signup' | 'magic'

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export default function Login() {
  const { login, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({})

  const returnUrl = new URLSearchParams(location.search).get('return') ?? '/'

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    if (mode !== 'magic') {
      if (!password) e.password = 'Password is required'
      else if (mode === 'signup' && password.length < 8) e.password = 'Password must be at least 8 characters'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!validate()) return

    setLoading(true)
    try {
      if (mode === 'signup') {
        const result = await authService.signUp(email, password, displayName || undefined)
        if (result.access_token) {
          await refreshUser()
          navigate(returnUrl, { replace: true })
        } else {
          setInfo(result.message ?? 'Account created! Check your email to confirm.')
        }
      } else if (mode === 'magic') {
        await login(email)
        setInfo('Magic link sent! Check your email to sign in.')
      } else {
        await login(email, password)
        navigate(returnUrl, { replace: true })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-text">Clearline</span>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'auth-tab-active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); setInfo('') }}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'auth-tab-active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); setInfo('') }}
            type="button"
          >
            Create account
          </button>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {info && <div className="alert alert-success" role="status">{info}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {mode === 'signup' && (
            <Input
              label="Display name (optional)"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
            error={errors.email}
          />

          {mode !== 'magic' && (
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              error={errors.password}
              hint={mode === 'signup' ? 'At least 8 characters' : undefined}
              suffix={
                <button
                  type="button"
                  className="input-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              }
            />
          )}

          <Button type="submit" loading={loading} className="auth-submit">
            {mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
          </Button>
        </form>

        {mode === 'signin' && (
          <button
            className="auth-link-btn"
            onClick={() => { setMode('magic'); setError(''); setInfo('') }}
            type="button"
          >
            Sign in with magic link instead
          </button>
        )}
        {mode === 'magic' && (
          <button
            className="auth-link-btn"
            onClick={() => { setMode('signin'); setError(''); setInfo('') }}
            type="button"
          >
            Sign in with password instead
          </button>
        )}
      </div>
    </div>
  )
}
