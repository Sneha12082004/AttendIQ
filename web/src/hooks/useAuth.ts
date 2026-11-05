import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User, LoginCredentials, AuthResponse } from '../types'
import { authApi } from '../api/auth'

const TOKEN_KEY = 'attendiq_token'
const USER_KEY = 'attendiq_user'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(getStoredUser)
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true)
    setError(null)
    try {
      const response: AuthResponse = await authApi.login(credentials)
      localStorage.setItem(TOKEN_KEY, response.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(response.user))
      setToken(response.access_token)
      setUser(response.user)
      return response.user
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            'Login failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await authApi.logout()
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
      setLoading(false)
      navigate('/login')
    }
  }, [navigate])

  const isAuthenticated = !!token && !!user
  const isFaculty = user?.role === 'faculty'
  const isAdmin = user?.role === 'admin'

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        setToken(e.newValue)
        if (!e.newValue) {
          setUser(null)
          navigate('/login')
        }
      }
      if (e.key === USER_KEY) {
        setUser(e.newValue ? (JSON.parse(e.newValue) as User) : null)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [navigate])

  return {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    isFaculty,
    isAdmin,
  }
}
