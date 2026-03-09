import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LoadingPage } from '../../components/ui/Spinner'

export default function GoogleCallback() {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = params.get('access_token')

    if (!accessToken) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    loginWithGoogle(accessToken)
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login?error=oauth_failed', { replace: true }))
  }, [loginWithGoogle, navigate])

  return <LoadingPage />
}
