import { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('livepoll_user')
    return raw ? JSON.parse(raw) : null
  })

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password })
    localStorage.setItem('livepoll_token', data.token)
    localStorage.setItem('livepoll_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (name, email, password) => {
    await api.signup({ name, email, password })
    return login(email, password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem('livepoll_token')
    localStorage.removeItem('livepoll_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
