import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { ratingAPI } from '../services/api'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, MapPin, Calendar, Save, Loader2,
  Upload, Star, Sparkles, Shield, Edit3, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'

const STYLES = ['casual','formal','sporty','bohemian','minimalist','streetwear','vintage','preppy']

function ScoreBar({ label, score, color = 'bg-primary-500' }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm font-bold text-white">{score?.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full ${color} rounded-full`} />
      </div>
    </div>
  )
}

function OutfitRater() {
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  const onDrop = useCallback(accepted => {
    const f = accepted[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f)); setResult(null)
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] }, maxFiles: 1,
  })

  const analyze = async () => {
    if (!file) { toast.error('Upload an image first'); return }
    setLoading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await ratingAPI.analyze(fd)
      setResult(res.data)
      toast.success('Outfit analyzed! 🎨')
    } catch { toast.error('Analysis failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="card space-y-5">
      <h3 className="section-title mb-0"><Camera className="w-5 h-5 text-pink-400" /> Outfit Rater</h3>
      <p className="text-sm text-slate-400">Upload a selfie or outfit photo to get an AI style score.</p>

      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/20 hover:border-white/40'}`}>
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
        ) : (
          <><Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Drop your outfit photo here</p></>
        )}
      </div>

      <button onClick={analyze} disabled={!file || loading}
        className="btn-primary w-full flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Analyzing...' : 'Analyze Outfit'}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-4">
            {/* Overall score */}
            <div className="flex items-center justify-center gap-6 py-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-center">
                <div className="text-5xl font-black gradient-text">{result.rating?.overall_score?.toFixed(1)}</div>
                <div className="text-slate-400 text-sm mt-1">Overall Score</div>
              </div>
              <div className="text-left space-y-1">
                {result.rating?.feedback?.split('.').filter(Boolean).slice(0,2).map((s,i) => (
                  <p key={i} className="text-sm text-slate-300">• {s.trim()}.</p>
                ))}
              </div>
            </div>

            {/* Score bars */}
            <div className="space-y-3">
              <ScoreBar label="Color Coordination" score={result.rating?.color_score}    color="bg-violet-500" />
              <ScoreBar label="Formality"           score={result.rating?.formality_score} color="bg-blue-500" />
              <ScoreBar label="Style Score"         score={result.rating?.style_score}    color="bg-pink-500" />
            </div>

            {/* Suggestions */}
            {result.rating?.suggestions?.length > 0 && (
              <div className="p-4 bg-primary-600/10 border border-primary-500/20 rounded-xl">
                <p className="text-primary-300 font-semibold mb-2">💡 Improvement Tips</p>
                <ul className="space-y-1">
                  {result.rating.suggestions.map((s,i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <Star className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Occasion suitability */}
            {result.rating?.occasion_suitability && (
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-2">Occasion Suitability</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.rating.occasion_suitability).map(([occ, score]) => (
                    <div key={occ} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                      <span className="text-xs text-slate-400 capitalize">{occ}</span>
                      <span className={`text-xs font-bold ${score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                        {score?.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    gender: user?.gender || '',
    age: user?.age || '',
    location: user?.location || '',
    fashion_preferences: user?.fashion_preferences || [],
  })

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const toggleStyle = s => setForm(f => ({
    ...f,
    fashion_preferences: f.fashion_preferences.includes(s)
      ? f.fashion_preferences.filter(x => x !== s)
      : [...f.fashion_preferences, s],
  }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authAPI.updateProfile({ ...form, age: form.age ? parseInt(form.age) : undefined })
      updateUser(res.data)
      setEditing(false)
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-2 card space-y-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl font-black text-white shadow-glow flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
              <p className="text-slate-400">{user?.email}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {user?.is_admin && <span className="badge-danger flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>}
                <span className="badge-primary">{user?.fashion_preferences?.[0] || 'No style set'}</span>
              </div>
            </div>
            <button onClick={() => setEditing(e => !e)} className="btn-secondary text-sm flex items-center gap-1.5 py-2 px-4">
              <Edit3 className="w-3.5 h-3.5" /> {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'name',     label: 'Full Name',  icon: User,     type: 'text',   placeholder: 'John Doe' },
              { name: 'age',      label: 'Age',         icon: Calendar, type: 'number', placeholder: '25' },
              { name: 'location', label: 'City',        icon: MapPin,   type: 'text',   placeholder: 'Mumbai' },
            ].map(field => (
              <div key={field.name}>
                <label className="input-label">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={field.type} name={field.name}
                    value={form[field.name]} onChange={handleChange}
                    disabled={!editing} placeholder={field.placeholder}
                    className={`input pl-10 ${!editing ? 'opacity-60 cursor-default' : ''}`}
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="input-label">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                disabled={!editing} className={`input ${!editing ? 'opacity-60 cursor-default' : ''}`}>
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non_binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="input-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="email" value={user?.email || ''} disabled className="input pl-10 opacity-60 cursor-default" />
            </div>
          </div>

          {/* Style preferences */}
          <div>
            <label className="input-label">Fashion Preferences</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {STYLES.map(s => (
                <button key={s} type="button"
                  onClick={() => editing && toggleStyle(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                    ${form.fashion_preferences?.includes(s)
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-white/5 border-white/15 text-slate-400'}
                    ${editing ? 'hover:border-white/30 cursor-pointer' : 'cursor-default'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {editing && (
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Stats mini */}
          <div className="card">
            <h3 className="section-title mb-4"><Star className="w-4 h-4 text-primary-400" /> Wardrobe Stats</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Clothes', value: user?.total_clothes ?? 0 },
                { label: 'Total Outfits', value: user?.total_outfits ?? 0 },
                { label: 'Member Since',  value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '–' },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-400">{s.label}</span>
                  <span className="text-sm font-semibold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Outfit Rater */}
          <OutfitRater />
        </div>
      </div>
    </div>
  )
}
