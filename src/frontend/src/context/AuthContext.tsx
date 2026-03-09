import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User } from '../types'
import { authService } from '../services/authService'
import { ApiError } from '../services/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password?: string) => Promise<void>
  loginWithGoogle: (accessToken: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setUser(null)
      return
    }
    try {
      const u = await authService.getUser()
      setUser(u)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try {
          await authService.refreshToken()
          const u = await authService.getUser()
          setUser(u)
        } catch {
          authService.logout()
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = async (email: string, password?: string) => {
    const result = await authService.loginWithEmail(email, password)
    if ('access_token' in result) {
      await refreshUser()
    }
  }

  const loginWithGoogle = async (accessToken: string) => {
    await authService.loginWithGoogle(accessToken)
    await refreshUser()
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
