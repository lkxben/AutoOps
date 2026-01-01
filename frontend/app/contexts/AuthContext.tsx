'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

type AuthContextType = {
  token: string | null
  user: any
  login: (token: string, user: any) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'auth'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setToken(parsed.token)
        setUser(parsed.user)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (token && user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ token, user }))
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
  }, [token, user])

  const login = (newToken: string, newUser: any) => {
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}