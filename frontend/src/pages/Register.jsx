import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const STYLES = ['casual','formal','sporty','bohemian','minimalist','streetwear','vintage','preppy']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', gender: '', age: '', location: '',
    fashion_preferences: [],
  })

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const toggleStyle = s => setForm(f => ({
    ...f,
    fashion_preferences: f.fashion_preferences.includes(s)
      ? f.fashion_preferences.filter(x => x !== s)
      : [...f.fashion_preferences, s],
  }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { toast.error('Name, email and password are required'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender || undefined,
      }
      await register(payload)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 py-12 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-black text-xl text-white">StyleAI</p>
              <p className="text-xs text-slate-500">Wardrobe Assistant</p>
            </div>
          </Link>
        </div>

        <div className="card-glass rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
          <p className="text-slate-400 mb-8">Start building your AI wardrobe today</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input id="reg-name" type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="John Doe" className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="input-label">Age</label>
                <input id="reg-age" type="number" name="age" value={form.age} onChange={handleChange}
                  placeholder="25" min="13" max="120" className="input" />
              </div>
            </div>

            <div>
              <label className="input-label">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-email" type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com" className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="input-label">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-password" type={showPw ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange}
                  placeholder="Min 6 characters" className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Gender</label>
                <select id="reg-gender" name="gender" value={form.gender} onChange={handleChange} className="input">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="input-label">City (for weather)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input id="reg-location" type="text" name="location" value={form.location} onChange={handleChange}
                    placeholder="Mumbai" className="input pl-10" />
                </div>
              </div>
            </div>

            {/* Style preferences */}
            <div>
              <label className="input-label">Fashion Style (optional)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STYLES.map(s => (
                  <button key={s} type="button" onClick={() => toggleStyle(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      form.fashion_preferences.includes(s)
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-white/5 border-white/15 text-slate-400 hover:border-white/30'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button id="reg-submit" type="submit" disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
