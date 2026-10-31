import { useEffect, useState } from 'react'
import { analyticsAPI } from '../services/api'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  BarChart3, Shirt, Sparkles, TrendingUp, Loader2, Star,
  Target, Edit3, Zap, CheckCircle
} from 'lucide-react'

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']

const TooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' },
  cursor: { fill: 'rgba(99,102,241,0.1)' },
}

const COLOR_HEX_MAP = {
  'Black': '#141414', 'White': '#FAFAFA', 'Grey': '#808080',
  'Navy Blue': '#1A237E', 'Blue': '#3F51B5', 'Sky Blue': '#87CEEB',
  'Red': '#DC3232', 'Maroon': '#800000', 'Green': '#4CAF50',
  'Olive': '#6B8E23', 'Yellow': '#FFEB3B', 'Orange': '#FF9800',
  'Brown': '#8B5A2B', 'Beige': '#F5F5DC', 'Cream': '#FFFDD0',
  'Purple': '#9C27B0', 'Pink': '#E91E63',
}

function ChartCard({ title, icon: Icon, children, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`card ${className}`}>
      <h3 className="section-title mb-5">
        <Icon className="w-5 h-5 text-primary-400" /> {title}
      </h3>
      {children}
    </motion.div>
  )
}

function MetricCard({ icon: Icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

export default function Analytics() {
  const [data, setData]         = useState(null)
  const [insights, setInsights] = useState([])
  const [clf, setClf]           = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.summary(),
      analyticsAPI.insights(),
      analyticsAPI.classificationStats(),
    ])
      .then(([s, i, c]) => {
        setData(s.data)
        setInsights(i.data.insights || [])
        setClf(c.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-3" />
          <p className="text-slate-400">Loading your analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) return <div className="card text-center py-20 text-slate-400">No analytics data yet. Upload some clothes!</div>

  const categoryData = Object.entries(data.category_distribution || {}).map(([name, value]) => ({ name, value }))
  const styleData    = Object.entries(data.style_distribution || {}).map(([name, value]) => ({ name, value }))
  const colorData    = (data.favorite_colors || []).slice(0, 7)
  const activityData = data.monthly_activity || []

  const confDist = clf?.confidence_distribution || {}
  const confDistData = [
    { name: 'Accepted (≥90%)', value: confDist.accepted || 0,        fill: '#10b981' },
    { name: 'Review (80-89%)', value: confDist.needs_review || 0,    fill: '#f59e0b' },
    { name: 'Manual (<80%)',   value: confDist.manual_required || 0,  fill: '#ef4444' },
  ]

  const stats = [
    { icon: Shirt,      label: 'Total Clothes', value: data.total_clothes,   color: 'from-violet-500 to-purple-600' },
    { icon: Sparkles,   label: 'Outfits Made',  value: data.total_outfits,   color: 'from-blue-500 to-cyan-600'    },
    { icon: TrendingUp, label: 'Times Worn',     value: data.total_wear_logs, color: 'from-emerald-500 to-teal-600' },
    { icon: Star,       label: 'Favorites',      value: data.favorites_count, color: 'from-pink-500 to-rose-600'    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Deep insights into your wardrobe & AI classification performance</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <MetricCard key={i} icon={s.icon} label={s.label} value={s.value ?? 0} color={s.color} delay={i * 0.08} />
        ))}
      </div>

      {/* ── AI Classification Dashboard ─────────────────────────────────────── */}
      {clf && clf.total_items > 0 && (
        <div className="space-y-4">
          <h2 className="section-title">
            <Zap className="w-5 h-5 text-primary-400" /> AI Classification Performance
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Target}      label="Avg AI Confidence" value={`${clf.avg_confidence_pct ?? 0}%`}   sub="Across all items"      color="from-violet-500 to-indigo-600"  delay={0}    />
            <MetricCard icon={Edit3}       label="Correction Rate"   value={`${clf.correction_rate ?? 0}%`}      sub={`${clf.total_corrections} corrections`} color="from-amber-500 to-orange-600"   delay={0.08} />
            <MetricCard icon={CheckCircle} label="High Confidence"   value={confDist.accepted ?? 0}              sub="Items auto-accepted"   color="from-emerald-500 to-teal-600"   delay={0.16} />
            <MetricCard icon={Shirt}       label="Top Category"      value={clf.most_uploaded_category ?? '—'}   sub="Most uploaded"         color="from-pink-500 to-rose-600"      delay={0.24} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confidence distribution */}
            <ChartCard title="Confidence Distribution" icon={Target}>
              <div className="space-y-3">
                {confDistData.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-sm text-slate-400 flex-1">{d.name}</span>
                    <span className="text-sm font-semibold text-white">{d.value}</span>
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full rounded-full" style={{
                        width: `${clf.total_items ? (d.value / clf.total_items) * 100 : 0}%`,
                        background: d.fill
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              {clf.most_common_color && (
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl border border-white/20 flex-shrink-0 shadow-lg"
                    style={{ backgroundColor: COLOR_HEX_MAP[clf.most_common_color] || '#808080' }} />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Most Common Color</p>
                    <p className="font-semibold text-white">{clf.most_common_color}</p>
                  </div>
                </div>
              )}
            </ChartCard>

            {/* Confidence trend */}
            <ChartCard title="Confidence Trend (Recent Items)" icon={TrendingUp}>
              {(clf.confidence_trend || []).length === 0 ? (
                <p className="text-slate-500 text-center py-8">Upload items to see confidence trend</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={clf.confidence_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                    <Tooltip {...TooltipStyle} formatter={v => [`${v}%`, 'Confidence']} />
                    <Line type="monotone" dataKey="confidence" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                    <Line dataKey={() => 90} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} dot={false} name="≥90% threshold" />
                    <Line dataKey={() => 80} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} dot={false} name="≥80% threshold" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Most corrected categories */}
          {clf.correction_breakdown?.length > 0 && (
            <ChartCard title="Most Corrected Categories" icon={Edit3}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {clf.correction_breakdown.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3 text-center">
                    <p className="text-lg font-bold text-amber-400">{c.corrections}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{c.category}</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Clothing Categories" icon={Shirt}>
          {categoryData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip {...TooltipStyle} />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Favourite Colors" icon={BarChart3}>
          {colorData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={colorData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {colorData.map((entry, i) => (
                    <Cell key={i} fill={COLOR_HEX_MAP[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TooltipStyle} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Monthly Wear Activity" icon={TrendingUp}>
          {activityData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Start wearing clothes to see activity</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip {...TooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Style Distribution" icon={Sparkles}>
          {styleData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={styleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={70} />
                <Tooltip {...TooltipStyle} />
                <Bar dataKey="value" fill="#ec4899" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Most worn items */}
      {data.most_worn_items?.length > 0 && (
        <ChartCard title="Most Worn Items" icon={TrendingUp}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {data.most_worn_items.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10">
                  <img src={item.image_url} alt={item.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src = 'https://via.placeholder.com/64?text=?' }}
                  />
                  <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-bl-lg flex items-center justify-center">
                    {i + 1}
                  </div>
                </div>
                <p className="text-xs text-white font-medium truncate w-full">{item.name || item.category}</p>
                <p className="text-xs text-slate-500">{item.wear_count}× worn</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Style Insights */}
      {insights.length > 0 && (
        <div>
          <h2 className="section-title"><Star className="w-5 h-5 text-primary-400" /> AI Style Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((ins, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} className="card">
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
