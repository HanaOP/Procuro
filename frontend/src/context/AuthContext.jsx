import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // { user_id, name, email, role }
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('procuro_auth')
      if (stored) {
        console.log('🔐 Found auth in localStorage, hydrating...')
        const { user: storedUser, token: storedToken } = JSON.parse(stored)
        if (storedUser && storedToken) {
          setUser(storedUser)
          setToken(storedToken)
          console.log('✅ Auth hydration successful for:', storedUser.email)
        } else {
          console.warn('⚠️ Auth data in localStorage is incomplete')
          localStorage.removeItem('procuro_auth')
        }
      } else {
        console.log('ℹ️ No auth found in localStorage')
      }
    } catch (err) {
      console.error('❌ Failed to parse auth data from localStorage:', err)
      localStorage.removeItem('procuro_auth')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback((userData, tokenValue) => {
    setUser(userData)
    setToken(tokenValue)
    localStorage.setItem('procuro_auth', JSON.stringify({ user: userData, token: tokenValue }))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('procuro_auth')
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
