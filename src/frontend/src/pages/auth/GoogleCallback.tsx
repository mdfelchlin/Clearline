import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { setTokens } from '../../services/api'
import { LoadingPage } from '../../components/ui/Spinner'

export default function AuthCallback() {
  const { loginWithGoogle, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')
    const returnUrl = new URLSearchParams(location.search).get('return') ?? '/'

    if (!accessToken) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    // Magic link (and recovery): Supabase redirects with tokens in hash — store and refresh user
    if ((type === 'magiclink' || type === 'recovery') && refreshToken) {
      setTokens(accessToken, refreshToken)
      refreshUser()
        .then(() => navigate(returnUrl, { replace: true }))
        .catch(() => navigate('/login?error=auth_failed', { replace: true }))
      return
    }

    // Google OAuth: token in hash is Google ID token — exchange with backend
    loginWithGoogle(accessToken)
      .then(() => navigate(returnUrl, { replace: true }))
      .catch(() => navigate('/login?error=oauth_failed', { replace: true }))
  }, [loginWithGoogle, refreshUser, navigate, location.search])

  return <LoadingPage />
}
