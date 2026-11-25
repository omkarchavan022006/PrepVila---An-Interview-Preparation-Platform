import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AUTH_REQUIRED_EVENT,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from '../api/axios'
import * as authApi from '../api/authApi'
import { AuthContext } from './auth-context'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(readStoredUser)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionValidationError, setSessionValidationError] = useState('')

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    setToken(null)
    setUser(null)
    setSessionValidationError('')
  }, [])

  useEffect(() => {
    const onUnauthorized = () => clearSession()
    window.addEventListener(AUTH_REQUIRED_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onUnauthorized)
  }, [clearSession])

  const refreshProfile = useCallback(async () => {
    try {
      const response = await authApi.getProfile()
      setUser(response.data)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data))
      setSessionValidationError('')
      return response.data
    } catch (error) {
      if (error.response?.status === 401) clearSession()
      else setSessionValidationError('The profile could not be verified. Your saved session was kept; check your connection and retry.')
      throw error
    }
  }, [clearSession])

  useEffect(() => {
    let active = true
    async function initializeSession() {
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        await refreshProfile()
      } catch {
        // Keep a cached user and token on network/server failures. A 401 clears them.
      } finally {
        if (active) setIsLoading(false)
      }
    }
    initializeSession()
    return () => { active = false }
  }, [token, refreshProfile])

  const saveSession = useCallback((data) => {
    if (!data?.token || !data?.user) throw new Error('The server returned an incomplete authentication response.')
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
    setSessionValidationError('')
    setToken(data.token)
    setUser(data.user)
  }, [])

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials)
    saveSession(data)
    return data.user
  }, [saveSession])

  const register = useCallback(async (details) => {
    const { data } = await authApi.register(details)
    saveSession(data)
    return data.user
  }, [saveSession])

  const logout = useCallback(async () => {
    try {
      if (token) await authApi.logout()
    } finally {
      clearSession()
    }
  }, [token, clearSession])

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    sessionValidationError,
    refreshProfile,
    login,
    register,
    logout,
  }), [user, token, isLoading, sessionValidationError, refreshProfile, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

