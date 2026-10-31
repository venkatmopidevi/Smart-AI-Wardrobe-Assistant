import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('wardrobe_token')
    const saved = localStorage.getItem('wardrobe_user')
    if (token && saved) {
      try { setUser(JSON.parse(saved)) } catch { /* ignore */ }
    }
    // Verify token is still valid
    if (token) {
      authAPI.getMe()
        .then(res => { setUser(res.data); localStorage.setItem('wardrobe_user', JSON.stringify(res.data)) })
        .catch(() => { localStorage.removeItem('wardrobe_token'); localStorage.removeItem('wardrobe_user'); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const register = async (data) => {
    const res = await authAPI.register(data)
    localStorage.setItem('wardrobe_token', res.data.access_token)
    localStorage.setItem('wardrobe_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    toast.success(`Welcome, ${res.data.user.name}! 🎉`)
    return res.data
  }

  const login = async (data) => {
    const res = await authAPI.login(data)
    localStorage.setItem('wardrobe_token', res.data.access_token)
    localStorage.setItem('wardrobe_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    toast.success(`Welcome back, ${res.data.user.name}! 👋`)
    return res.data
  }

  const logout = async () => {
    try { await authAPI.logout() } catch { /* ignore */ }
    localStorage.removeItem('wardrobe_token')
    localStorage.removeItem('wardrobe_user')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateUser = (updated) => {
    setUser(updated)
    localStorage.setItem('wardrobe_user', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
