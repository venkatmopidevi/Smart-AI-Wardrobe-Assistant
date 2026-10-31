import { useEffect, useState } from 'react'
import { adminAPI } from '../services/api'
import { motion } from 'framer-motion'
import {
  Users, Shirt, MessageSquare, TrendingUp,
  ShieldCheck, Loader2, RefreshCw, BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const TooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' },
}

export default function Admin() {
  const [stats, setStats]   = useState(null)
  const [users, setUsers]   = useState([])
  const [clothes, setClothes] = useState([])
  const [tab, setTab]       = useState('overview')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, u, c] = await Promise.all([
        adminAPI.stats(), adminAPI.getUsers(), adminAPI.getClothes(),
      ])
      setStats(s.data); setUsers(u.data.users || []); setClothes(c.data.items || [])
    } catch { toast.error('Failed to load admin data') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  const statCards = [
    { icon: Users,        label: 'Total Users',     value: stats?.total_users,      color: 'from-violet-500 to-purple-600' },
    { icon: Shirt,        label: 'Total Clothes',   value: stats?.total_clothes,    color: 'from-blue-500 to-cyan-600'    },
    { icon: TrendingUp,   label: 'Outfits Made',    value: stats?.total_outfits,    color: 'from-emerald-500 to-teal-600' },
    { icon: MessageSquare,label: 'Chat Messages',   value: stats?.total_chats,      color: 'from-pink-500 to-rose-600'    },
  ]

  const chartData = [
    { name: 'Users',   value: stats?.total_users   || 0 },
    { name: 'Clothes', value: stats?.total_clothes  || 0 },
    { name: 'Outfits', value: stats?.total_outfits  || 0 },
    { name: 'Chats',   value: stats?.total_chats    || 0 },
    { name: 'Wears',   value: stats?.total_wear_logs|| 0 },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title mb-0 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary-400" /> Admin Dashboard
          </h1>
          <p className="page-subtitle">System overview and management</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm flex items-center gap-2 py-2 px-4">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.08 }} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value ?? 0}</p>
              <p className="text-sm text-slate-400">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {['overview', 'users', 'clothes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all capitalize
              ${tab === t ? 'bg-primary-600/20 border border-b-transparent border-white/10 text-primary-300' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card">
          <h3 className="section-title"><BarChart3 className="w-5 h-5 text-primary-400" /> System Overview</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip {...TooltipStyle} />
              <Bar dataKey="value" fill="#6366f1" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 text-center mt-2">
            Data as of {stats?.generated_at ? new Date(stats.generated_at).toLocaleString() : 'now'}
          </p>
        </motion.div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card overflow-hidden p-0">
          <div className="p-5 border-b border-white/10">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" /> All Users ({users.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Name','Email','Gender','Admin','Clothes','Joined'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-600/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-white font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 capitalize">{u.gender || '–'}</td>
                    <td className="px-4 py-3">
                      {u.is_admin ? <span className="badge-danger">Admin</span> : <span className="badge-info">User</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{u.total_clothes}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center text-slate-500 py-8">No users yet</p>}
          </div>
        </motion.div>
      )}

      {/* Clothes tab */}
      {tab === 'clothes' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Shirt className="w-5 h-5 text-primary-400" /> All Clothing Items ({clothes.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {clothes.map(item => (
              <div key={item.id} className="card p-0 overflow-hidden">
                <div className="aspect-square bg-dark-800">
                  <img src={item.image_url} alt={item.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src='https://via.placeholder.com/120?text=?' }}
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-white truncate">{item.name || item.category}</p>
                  <p className="text-xs text-slate-500 truncate">uid: {item.user_id?.slice(-6)}</p>
                </div>
              </div>
            ))}
            {clothes.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-8">No clothing items yet</div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
