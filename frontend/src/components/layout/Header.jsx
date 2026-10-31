import { Menu, Bell, Sun, Moon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useState } from 'react'

const PAGE_TITLES = {
  '/dashboard':       { title: 'Dashboard',              subtitle: 'Your wardrobe at a glance' },
  '/wardrobe':        { title: 'My Wardrobe',            subtitle: 'Manage your clothing items' },
  '/recommendations': { title: 'Outfit Recommendations', subtitle: 'AI-powered style suggestions' },
  '/chatbot':         { title: 'AI Style Chatbot',       subtitle: 'Chat with your personal stylist' },
  '/analytics':       { title: 'Analytics',              subtitle: 'Insights about your style' },
  '/profile':         { title: 'Profile',                subtitle: 'Manage your account' },
  '/admin':           { title: 'Admin Dashboard',        subtitle: 'System management' },
}

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const info = PAGE_TITLES[pathname] || { title: 'StyleAI', subtitle: '' }

  return (
    <header className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-white/10 bg-dark-900/80 backdrop-blur-md sticky top-0 z-10">
      {/* Hamburger */}
      <button onClick={onMenuClick} className="btn-icon lg:hidden">
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-white truncate">{info.title}</h1>
        <p className="text-xs text-slate-500 hidden sm:block">{info.subtitle}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">AI Online</span>
        </div>
      </div>
    </header>
  )
}
