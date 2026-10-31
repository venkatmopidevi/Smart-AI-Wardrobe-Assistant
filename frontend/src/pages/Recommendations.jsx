import { useState } from 'react'
import { recommendAPI } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, CloudSun, MapPin, Loader2, Star, Shirt, RefreshCw, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const OCCASIONS = [
  { id: 'casual',    label: 'Casual',     emoji: '😎', color: 'from-sky-500 to-blue-600' },
  { id: 'interview', label: 'Interview',  emoji: '💼', color: 'from-slate-500 to-slate-700' },
  { id: 'office',    label: 'Office',     emoji: '🏢', color: 'from-indigo-500 to-indigo-700' },
  { id: 'college',   label: 'College',    emoji: '🎓', color: 'from-violet-500 to-purple-600' },
  { id: 'party',     label: 'Party',      emoji: '🎉', color: 'from-pink-500 to-rose-600' },
  { id: 'wedding',   label: 'Wedding',    emoji: '💍', color: 'from-amber-500 to-orange-600' },
  { id: 'gym',       label: 'Gym',        emoji: '💪', color: 'from-emerald-500 to-teal-600' },
  { id: 'date',      label: 'Date',       emoji: '❤️', color: 'from-red-500 to-rose-600' },
]

function ScoreRing({ score, label, size = 'md' }) {
  const s = size === 'lg' ? 'w-28 h-28 text-3xl' : 'w-20 h-20 text-xl'
  const color = score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${s} rounded-full border-4 ${score >= 8 ? 'border-emerald-500/50' : score >= 6 ? 'border-amber-500/50' : 'border-red-500/50'} flex items-center justify-center bg-white/5`}>
        <span className={`font-black ${color}`}>{score?.toFixed(1)}</span>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

function OutfitCard({ outfit }) {
  if (!outfit) return null
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Scores */}
      <div className="card flex flex-wrap items-center justify-around gap-6 py-6">
        <ScoreRing score={outfit.compatibility_score} label="Color Match" size="lg" />
        <ScoreRing score={outfit.style_score}         label="Style Score"  size="lg" />
        <div className="text-center flex-1 min-w-[140px]">
          <p className="text-slate-400 text-sm mb-2">{outfit.occasion && `✨ ${outfit.occasion.toUpperCase()} OUTFIT`}</p>
          <p className="text-white font-medium leading-relaxed">{outfit.description}</p>
          {outfit.weather_context && (
            <div className="mt-3 flex items-center gap-1.5 justify-center text-sky-400 text-sm">
              <CloudSun className="w-4 h-4" /> {outfit.weather_context}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {outfit.items?.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }} className="card p-0 overflow-hidden">
            <div className="aspect-square bg-dark-800 relative overflow-hidden">
              <img src={item.image_url} alt={item.name}
                className="w-full h-full object-cover"
                onError={e => { e.target.src='https://via.placeholder.com/200?text=' + item.category }}
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <span className="badge badge-primary text-xs">{item.category}</span>
              </div>
            </div>
            <div className="p-3">
              <p className="font-semibold text-white text-sm truncate">{item.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-3 h-3 rounded-full border border-white/20"
                  style={{ backgroundColor: item.dominant_color === 'Navy Blue' ? '#1A237E' : '#6B7280' }} />
                <span className="text-xs text-slate-400">{item.dominant_color}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      {outfit.tips?.length > 0 && (
        <div className="card bg-primary-600/10 border-primary-500/20">
          <p className="text-primary-300 font-semibold mb-2">💡 Style Tips</p>
          <ul className="space-y-1">
            {outfit.tips.filter(Boolean).map((tip, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                <Star className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

export default function Recommendations() {
  const [selectedOccasion, setOccasion] = useState('')
  const [city, setCity]                 = useState('')
  const [useWeather, setUseWeather]     = useState(false)
  const [loading, setLoading]           = useState(false)
  const [outfit, setOutfit]             = useState(null)
  const [weather, setWeather]           = useState(null)

  const handleGenerate = async () => {
    if (!selectedOccasion) { toast.error('Pick an occasion first!'); return }
    setLoading(true); setOutfit(null)
    try {
      const res = await recommendAPI.byOccasion(selectedOccasion, useWeather && city ? city : undefined)
      if (res.data.success) {
        setOutfit(res.data.outfit)
        setWeather(res.data.weather)
        toast.success('Outfit generated! 🎉')
      } else {
        toast.error(res.data.message || 'Not enough clothes for this occasion.')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate outfit')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Outfit Recommendations</h1>
        <p className="page-subtitle">Let AI build the perfect outfit from your wardrobe</p>
      </div>

      {/* Occasion Picker */}
      <div className="card">
        <h2 className="section-title mb-4"><Sparkles className="w-5 h-5 text-primary-400" /> Choose an Occasion</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OCCASIONS.map(occ => (
            <button key={occ.id} id={`occ-${occ.id}`}
              onClick={() => setOccasion(occ.id)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                selectedOccasion === occ.id
                  ? 'border-primary-500 bg-primary-600/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}>
              <span className="text-3xl">{occ.emoji}</span>
              <span className="text-sm font-medium text-white">{occ.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Weather toggle */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0"><CloudSun className="w-5 h-5 text-sky-400" /> Weather-Based</h2>
          <button
            onClick={() => setUseWeather(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${useWeather ? 'bg-primary-600' : 'bg-white/20'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${useWeather ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        <AnimatePresence>
          {useWeather && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Enter your city (e.g. Mumbai, London)"
                  value={city} onChange={e => setCity(e.target.value)}
                  className="input pl-10" />
              </div>
              {weather && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-3 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center gap-3">
                  <CloudSun className="w-6 h-6 text-sky-400" />
                  <div>
                    <p className="text-white font-medium">{weather.city} — {weather.temperature}°C</p>
                    <p className="text-sky-300 text-sm">{weather.description} · {weather.condition}</p>
                  </div>
                  {weather.demo && <span className="badge badge-warning ml-auto">Demo</span>}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate button */}
      <button id="generate-outfit-btn" onClick={handleGenerate} disabled={loading || !selectedOccasion}
        className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3">
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating outfit...</>
          : <><Sparkles className="w-5 h-5" /> Generate My Outfit</>}
      </button>

      {/* Result */}
      <AnimatePresence>
        {outfit && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">✨ Your Outfit</h2>
              <button onClick={handleGenerate} className="btn-secondary text-sm flex items-center gap-1.5 py-2 px-4">
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
            </div>
            <OutfitCard outfit={outfit} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
