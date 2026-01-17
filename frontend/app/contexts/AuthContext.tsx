'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
const API_URL = process.env.NEXT_PUBLIC_API_URL

type AuthContextType = {
  user: any
  isAuthenticated: boolean
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
        headers: {
          "ngrok-skip-browser-warning": "true",
        }
      });

      if (!res.ok) {
        setUser(null)
        return
      }

      const data = await res.json()
      setUser(data)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    setUser(null)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        refresh,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}