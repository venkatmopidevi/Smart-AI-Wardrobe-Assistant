import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap, Shirt, Brain, CloudSun, MessageSquare, BarChart3,
  Star, ChevronRight, Sparkles, Shield, Mic
} from 'lucide-react'

const FEATURES = [
  { icon: Shirt,        color: 'from-violet-500 to-purple-600',  title: 'Digital Wardrobe',       desc: 'Upload your clothes and let AI classify, color-extract, and organize your entire wardrobe.' },
  { icon: Brain,        color: 'from-blue-500 to-cyan-600',      title: 'AI Classification',      desc: 'OpenCV + ML pipeline auto-detects clothing category, dominant color, and style instantly.' },
  { icon: CloudSun,     color: 'from-amber-500 to-orange-600',   title: 'Weather-Based Outfits',  desc: 'Real-time weather integration suggests temperature-appropriate outfits every morning.' },
  { icon: Sparkles,     color: 'from-pink-500 to-rose-600',      title: 'Smart Recommendations',  desc: 'Content-based AI filtering learns your preferences and builds personalized outfit combos.' },
  { icon: MessageSquare,color: 'from-emerald-500 to-teal-600',   title: 'AI Fashion Chatbot',     desc: 'Powered by Google Gemini — ask anything about style and get expert fashion advice.' },
  { icon: Mic,          color: 'from-indigo-500 to-blue-600',    title: 'Voice Assistant',        desc: 'Speak your query — speech-to-text + AI + voice reply for a hands-free style experience.' },
  { icon: Star,         color: 'from-yellow-500 to-amber-600',   title: 'Outfit Rating',          desc: 'Upload a selfie and get an AI-powered style score with actionable improvement tips.' },
  { icon: BarChart3,    color: 'from-rose-500 to-pink-600',      title: 'Analytics Dashboard',    desc: 'Deep insights into wear patterns, favourite colors, most-used items, and outfit history.' },
]

const STATS = [
  { value: '10+',  label: 'AI Features'        },
  { value: '50+',  label: 'Supported Styles'   },
  { value: '99%',  label: 'Classification Acc.' },
  { value: '24/7', label: 'AI Availability'    },
]

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-950 text-white overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-dark-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">StyleAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"    className="btn-secondary py-2 px-5 text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary  py-2 px-5 text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Glow blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-accent-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Powered by Google Gemini &amp; Computer Vision
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-tight mb-6">
            Your AI-Powered
            <span className="block gradient-text">Wardrobe Assistant</span>
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your clothes, get AI outfit recommendations based on weather &amp; occasion,
            chat with a Gemini-powered stylist, and discover your personal style — all in one app.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 shadow-glow-lg">
              Start for Free <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-4">
              Sign In
            </Link>
          </motion.div>
        </div>

        {/* Hero visual — mock UI card */}
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="relative max-w-4xl mx-auto mt-20">
          <div className="card-glass p-8 rounded-3xl">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {['👔 Navy Shirt', '👖 Black Jeans', '👟 White Shoes'].map((item, i) => (
                <div key={i} className="bg-white/8 rounded-2xl p-4 flex flex-col items-center gap-2 border border-white/10">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-2xl">
                    {item.split(' ')[0]}
                  </div>
                  <span className="text-xs text-slate-400 text-center">{item.slice(3)}</span>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-primary-600/30 to-accent-600/20 border border-primary-500/30 rounded-2xl p-4 flex items-center gap-4">
              <Sparkles className="w-8 h-8 text-primary-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">AI Recommendation Ready</p>
                <p className="text-xs text-slate-400">Perfect interview outfit · Compatibility: 9.2/10</p>
              </div>
              <div className="ml-auto bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">9.2 ✨</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section className="py-16 border-y border-white/10 bg-white/3">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" variants={fadeUp}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
              <div className="text-4xl font-black gradient-text mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Everything You Need</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete AI-powered fashion ecosystem in one beautiful app.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" variants={fadeUp}
                transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                className="card group cursor-default">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} viewport={{ once: true }}
            className="card-glass rounded-3xl p-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6 shadow-glow-lg animate-float">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-black mb-4">Ready to Elevate Your Style?</h2>
            <p className="text-slate-400 mb-8">Join thousands of users who've transformed their wardrobe with AI.</p>
            <Link to="/register" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
              Get Started Free <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-slate-400">StyleAI — Smart Wardrobe Assistant</span>
        </div>
        <p>Built with React · FastAPI · MongoDB · Google Gemini · OpenCV</p>
      </footer>
    </div>
  )
}
