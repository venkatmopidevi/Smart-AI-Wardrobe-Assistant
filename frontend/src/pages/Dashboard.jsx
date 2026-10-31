import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI, recommendAPI, wardrobeAPI } from '../services/api'
import { motion } from 'framer-motion'
import {
  Shirt, Sparkles, BarChart3, Heart, TrendingUp,
  CloudSun, Star, ArrowRight, Loader2
} from 'lucide-react'
import { Link } from 'react-router-dom'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay }}
      className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? <span className="skeleton w-8 h-6 block" />}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary]     = useState(null)
  const [insights, setInsights]   = useState([])
  const [recentItems, setRecent]  = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.summary(),
      analyticsAPI.insights(),
      wardrobeAPI.getItems({ limit: 6 }),
    ]).then(([s, i, w]) => {
      setSummary(s.data)
      setInsights(i.data.insights || [])
      setRecent(w.data.items || [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { icon: Shirt,     label: 'Total Clothes',   value: summary?.total_clothes,   color: 'from-violet-500 to-purple-600' },
    { icon: Sparkles,  label: 'Total Outfits',   value: summary?.total_outfits,   color: 'from-blue-500 to-cyan-600'    },
    { icon: Heart,     label: 'Favorites',        value: summary?.favorites_count, color: 'from-pink-500 to-rose-600'    },
    { icon: TrendingUp,label: 'Times Worn',       value: summary?.total_wear_logs, color: 'from-emerald-500 to-teal-600' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div className="page-header">
        <h1 className="page-title">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
          <span className="gradient-text"> {user?.name?.split(' ')[0] || 'there'}! 👋</span>
        </h1>
        <p className="page-subtitle">Here's what's happening with your wardrobe today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} delay={i * 0.08} />)}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="section-title"><Sparkles className="w-5 h-5 text-primary-400" /> Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { to: '/wardrobe',        icon: Shirt,     label: 'Upload Clothes',        sub: 'Add new items to your wardrobe', color: 'from-violet-500 to-purple-600' },
            { to: '/recommendations', icon: Star,      label: 'Get Outfit Today',      sub: 'AI-curated outfit just for you',  color: 'from-blue-500 to-cyan-600'    },
            { to: '/chatbot',         icon: CloudSun,  label: 'Ask Style Assistant',   sub: 'Chat with Gemini AI stylist',    color: 'from-pink-500 to-rose-600'    },
          ].map((a, i) => (
            <motion.div key={i} initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.3 + i * 0.08 }}>
              <Link to={a.to} className="card group flex items-center gap-4 hover:border-primary-500/40 cursor-pointer">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{a.label}</p>
                  <p className="text-xs text-slate-400 truncate">{a.sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent wardrobe */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0"><Shirt className="w-5 h-5 text-primary-400" /> Recent Items</h2>
          <Link to="/wardrobe" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton aspect-square rounded-2xl" />)}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="card text-center py-12">
            <Shirt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Your wardrobe is empty</p>
            <Link to="/wardrobe" className="btn-primary mt-4 inline-block text-sm">Upload First Item</Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {recentItems.map((item, i) => (
              <motion.div key={item.id} initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: i * 0.05 }}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-primary-500/40 transition-all">
                <img src={item.image_url} alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={e => { e.target.src = 'https://via.placeholder.com/150?text=?'}}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-white text-xs font-medium truncate">{item.name || item.category}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Style insights */}
      {insights.length > 0 && (
        <div>
          <h2 className="section-title"><BarChart3 className="w-5 h-5 text-primary-400" /> Style Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.map((ins, i) => (
              <motion.div key={i} initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: i * 0.07 }}
                className="card">
                <div className="text-3xl mb-2">{ins.icon}</div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{ins.title}</p>
                <p className="font-bold text-white mb-2">{ins.value}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{ins.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
