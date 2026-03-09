import { api, setTokens, clearTokens, getRefreshToken, ApiError } from './api'
import { User } from '../types'

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: { id: string; email: string }
}

export interface SignUpResponse {
  access_token?: string
  refresh_token?: string
  user?: { id: string; email: string }
  message?: string
}

export const authService = {
  async signUp(email: string, password: string, displayName?: string): Promise<SignUpResponse> {
    const data = await api.post<SignUpResponse>('/auth/signup', {
      email,
      password,
      display_name: displayName || undefined,
    })
    if (data.access_token && data.refresh_token) {
      setTokens(data.access_token, data.refresh_token)
    }
    return data
  },

  async loginWithGoogle(accessToken: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/google', { access_token: accessToken })
    setTokens(data.access_token, data.refresh_token)
    return data
  },

  async loginWithEmail(email: string, password?: string): Promise<AuthResponse | { message: string }> {
    const data = await api.post<AuthResponse | { message: string }>('/auth/email', { email, password })
    if ('access_token' in data) {
      setTokens(data.access_token, data.refresh_token)
    }
    return data
  },

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new ApiError(401, 'No refresh token available')

    const data = await api.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken })
    setTokens(data.access_token, data.refresh_token)
    return data
  },

  async getUser(): Promise<User> {
    const data = await api.get<{ user: User }>('/auth/user')
    return data.user
  },

  async updatePreferences(prefs: {
    theme?: 'light' | 'dark'
    display_name?: string
    notification_preferences?: Record<string, boolean>
  }): Promise<User> {
    const data = await api.put<{ user: User }>('/auth/user/preferences', prefs)
    return data.user
  },

  logout(): void {
    clearTokens()
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },
}
