import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import Landing        from './pages/Landing'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Dashboard      from './pages/Dashboard'
import Wardrobe       from './pages/Wardrobe'
import Recommendations from './pages/Recommendations'
import Chatbot        from './pages/Chatbot'
import Analytics      from './pages/Analytics'
import Profile        from './pages/Profile'
import Admin          from './pages/Admin'
import AppLayout      from './components/layout/AppLayout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner w-10 h-10" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected — inside app shell */}
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route path="/dashboard"       element={<Dashboard />} />
            <Route path="/wardrobe"        element={<Wardrobe />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/chatbot"         element={<Chatbot />} />
            <Route path="/analytics"       element={<Analytics />} />
            <Route path="/profile"         element={<Profile />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AppLayout /></AdminRoute>}>
            <Route index element={<Admin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
