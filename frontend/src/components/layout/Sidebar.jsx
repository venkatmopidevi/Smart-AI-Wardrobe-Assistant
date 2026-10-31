import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Shirt, Sparkles, MessageSquare,
  BarChart3, User, ShieldCheck, LogOut, X, Zap
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/wardrobe',        icon: Shirt,           label: 'Wardrobe' },
  { to: '/recommendations', icon: Sparkles,         label: 'Outfits' },
  { to: '/chatbot',         icon: MessageSquare,    label: 'AI Chatbot' },
  { to: '/analytics',       icon: BarChart3,        label: 'Analytics' },
  { to: '/profile',         icon: User,             label: 'Profile' },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <aside className={`
      fixed lg:relative z-30 inset-y-0 left-0
      w-64 flex flex-col
      bg-dark-900/95 backdrop-blur-xl border-r border-white/10
      transform transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">StyleAI</p>
            <p className="text-xs text-slate-500 mt-0.5">Wardrobe Assistant</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden btn-icon">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User snippet */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.is_admin && (
          <NavLink
            to="/admin"
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}
