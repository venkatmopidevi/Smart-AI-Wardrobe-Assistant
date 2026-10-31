import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { wardrobeAPI } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Trash2, Heart, Eye, Filter, Search,
  Loader2, Star, X, Check, Plus, AlertTriangle,
  CheckCircle, AlertCircle, Edit3, RotateCcw, Sparkles,
  Tag, Palette, Shirt
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Supported categories & colors ────────────────────────────────────────────
const ALL_CATEGORIES = [
  'Shirt', 'T-Shirt', 'Polo Shirt', 'Hoodie', 'Sweater',
  'Jacket', 'Blazer', 'Jeans', 'Trouser', 'Shorts',
  'Shoes', 'Sneakers', 'Sandals', 'Belt', 'Cap', 'Tie',
  'Dress', 'Other',
]

const FILTER_CATEGORIES = ['All', ...ALL_CATEGORIES.slice(0, 12)]

const ALL_COLORS = [
  'Black', 'White', 'Grey', 'Navy Blue', 'Blue', 'Sky Blue',
  'Red', 'Maroon', 'Green', 'Olive', 'Yellow', 'Orange',
  'Brown', 'Beige', 'Cream', 'Purple', 'Pink',
]

const COLOR_HEX = {
  'Black': '#141414', 'White': '#FAFAFA', 'Grey': '#808080',
  'Navy Blue': '#1A237E', 'Blue': '#3F51B5', 'Sky Blue': '#87CEEB',
  'Red': '#DC3232', 'Maroon': '#800000', 'Green': '#4CAF50',
  'Olive': '#6B8E23', 'Yellow': '#FFEB3B', 'Orange': '#FF9800',
  'Brown': '#8B5A2B', 'Beige': '#F5F5DC', 'Cream': '#FFFDD0',
  'Purple': '#9C27B0', 'Pink': '#E91E63',
}

// ─── Confidence Status Badge ───────────────────────────────────────────────────
function ConfidenceBadge({ status, confidence }) {
  const pct = Math.round((confidence || 0) * 100)
  const cfg = {
    accepted: { label: 'AI Accepted', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40', bar: 'bg-emerald-500', icon: CheckCircle },
    needs_review: { label: 'Needs Review', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', bar: 'bg-amber-500', icon: AlertTriangle },
    manual_required: { label: 'Low Confidence', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40', bar: 'bg-red-500', icon: AlertCircle },
  }[status || 'manual_required']
  const Icon = cfg.icon
  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${cfg.color}`} />
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className={`text-lg font-bold ${cfg.color}`}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${cfg.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ─── Color Swatch ──────────────────────────────────────────────────────────────
function ColorSwatch({ name, hex, percentage }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-lg border border-white/20 shadow-sm flex-shrink-0"
        style={{ backgroundColor: hex || COLOR_HEX[name] || '#808080' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{name}</p>
        {percentage && (
          <div className="w-full h-1 bg-white/10 rounded-full mt-0.5">
            <div className="h-full rounded-full bg-white/40" style={{ width: `${Math.round(percentage * 100)}%` }} />
          </div>
        )}
      </div>
      {percentage && (
        <span className="text-xs text-slate-500 flex-shrink-0">{Math.round(percentage * 100)}%</span>
      )}
    </div>
  )
}

// ─── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }) {
  const [uploading, setUploading]     = useState(false)
  const [file, setFile]               = useState(null)
  const [preview, setPreview]         = useState(null)
  const [result, setResult]           = useState(null)
  const [name, setName]               = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [correcting, setCorrecting]   = useState(false)
  const [correctedCategory, setCorrectedCategory] = useState('')
  const [correctedColor, setCorrectedColor]       = useState('')
  const [correctionSaved, setCorrectionSaved]     = useState(false)
  const [success, setSuccess]         = useState(false)

  const onDrop = useCallback(accepted => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setShowCorrection(false)
    setCorrectionSaved(false)
    setSuccess(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file) { toast.error('Select an image first'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name)
      const res = await wardrobeAPI.upload(fd)
      setResult(res.data)
      const status = res.data.classification?.confidence_status
      if (status === 'accepted') {
        toast.success('AI classified with high confidence! 🎉')
      } else if (status === 'needs_review') {
        toast('Review the prediction below', { icon: '⚠️' })
      } else {
        toast('Low confidence — please correct manually', { icon: '✏️' })
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleCorrection = async () => {
    if (!correctedCategory || !correctedColor) {
      toast.error('Please select both category and color')
      return
    }
    setCorrecting(true)
    try {
      await wardrobeAPI.correctItem(result.item.id, {
        corrected_category: correctedCategory,
        corrected_color: correctedColor,
      })
      setCorrectionSaved(true)
      setShowCorrection(false)
      toast.success('Correction saved! Thank you for improving the AI 🤖')
    } catch (err) {
      toast.error('Failed to save correction')
    } finally {
      setCorrecting(false)
    }
  }

  const clf = result?.classification
  const item = result?.item

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl
          bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upload Clothing</h2>
              <p className="text-xs text-slate-400">AI Classification powered by EfficientNetB0</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          {!result && (
            <>
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden
                  ${isDragActive
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/20 hover:border-violet-400/50 hover:bg-white/3'
                  }`}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full max-h-72 object-contain rounded-xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl" />
                    <div className="absolute bottom-3 left-3 text-xs text-white/70">
                      Click to change image
                    </div>
                  </div>
                ) : (
                  <div className="py-14 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-slate-200 font-semibold text-lg mb-1">Drag & drop your clothing image</p>
                    <p className="text-slate-500 text-sm">or click to browse • JPG, PNG, WEBP up to 10MB</p>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="Custom name (optional — AI will auto-name)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
              />

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                id="classify-btn"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Preprocessing & classifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Classify with AI</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* ── Classification Result ─────────────────────────────────────── */}
          <AnimatePresence>
            {result && clf && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Image preview + result side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Preview */}
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-square bg-slate-800">
                    <img
                      src={preview}
                      alt="Classified"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Category + Style Cards */}
                  <div className="space-y-3">
                    {/* Category card */}
                    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-4 h-4 text-violet-400" />
                        <span className="text-xs text-violet-400 font-medium uppercase tracking-wider">Category</span>
                        {correctionSaved && <span className="text-xs text-emerald-400 ml-auto">✓ Corrected</span>}
                      </div>
                      <p className="text-xl font-bold text-white">{correctionSaved ? correctedCategory : clf.category}</p>
                    </div>

                    {/* Style card */}
                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Shirt className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-cyan-400 font-medium uppercase tracking-wider">Detected Style</span>
                      </div>
                      <p className="text-lg font-bold text-white capitalize">{clf.style}</p>
                      <p className="text-xs text-slate-400 mt-1">Formality: {Math.round(clf.formality_score * 100)}%</p>
                    </div>
                  </div>
                </div>

                {/* Confidence bar */}
                <ConfidenceBadge status={clf.confidence_status} confidence={clf.confidence} />

                {/* Colors */}
                {clf.dominant_colors?.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-semibold text-white">Detected Colors</span>
                      {clf.secondary_color && (
                        <span className="text-xs text-slate-400 ml-auto">
                          Secondary: <span className="text-slate-300">{clf.secondary_color}</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {clf.dominant_colors.slice(0, 3).map((c, i) => (
                        <ColorSwatch key={i} name={c.name} hex={c.hex} percentage={c.percentage} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Season */}
                {clf.season_suitability?.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {clf.season_suitability.map(s => (
                      <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300 border border-white/10 capitalize">{s}</span>
                    ))}
                  </div>
                )}

                {/* Manual Correction Section */}
                {!correctionSaved && (clf.confidence_status !== 'accepted') && !showCorrection && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      setShowCorrection(true)
                      setCorrectedCategory(clf.category)
                      setCorrectedColor(clf.dominant_colors?.[0]?.name || 'Unknown')
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                      border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20
                      transition-all text-sm font-medium"
                    id="correct-prediction-btn"
                  >
                    <Edit3 className="w-4 h-4" />
                    {clf.confidence_status === 'needs_review' ? 'Review & Correct Prediction' : 'Correct Prediction (Low Confidence)'}
                  </motion.button>
                )}

                {/* Correction Form */}
                <AnimatePresence>
                  {showCorrection && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-amber-400">✏️ Correct Prediction</p>
                          <button onClick={() => setShowCorrection(false)} className="text-slate-500 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Category</label>
                            <select
                              id="correction-category"
                              value={correctedCategory}
                              onChange={e => setCorrectedCategory(e.target.value)}
                              className="input text-sm py-2"
                            >
                              {ALL_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Primary Color</label>
                            <select
                              id="correction-color"
                              value={correctedColor}
                              onChange={e => setCorrectedColor(e.target.value)}
                              className="input text-sm py-2"
                            >
                              {ALL_COLORS.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={handleCorrection}
                          disabled={correcting}
                          id="save-correction-btn"
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                            bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all"
                        >
                          {correcting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save Correction
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success animation / Done button */}
                <AnimatePresence>
                  {(clf.confidence_status === 'accepted' || correctionSaved) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.25, 1] }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </motion.div>
                      <span className="text-sm font-semibold text-emerald-400">
                        {correctionSaved ? 'Correction saved & item updated!' : 'Classified with high confidence!'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => {
                      setFile(null); setPreview(null); setResult(null)
                      setShowCorrection(false); setCorrectionSaved(false)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                      border border-white/15 text-slate-400 hover:border-white/30 hover:text-white transition-all text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Upload Another
                  </button>
                  <button
                    onClick={() => { onSuccess(); onClose() }}
                    id="done-btn"
                    className="flex-1 btn-primary py-2.5 text-sm"
                  >
                    Done — View Wardrobe
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Clothing Card ─────────────────────────────────────────────────────────────
function ClothingCard({ item, onDelete, onFavorite, onWear }) {
  const [deleting, setDeleting] = useState(false)
  const dominant = item.dominant_colors?.[0]
  const statusColor = {
    accepted: 'bg-emerald-500',
    needs_review: 'bg-amber-500',
    manual_required: 'bg-red-500',
  }[item.confidence_status || 'manual_required'] || 'bg-slate-500'

  const handleDelete = async () => {
    if (!window.confirm('Delete this item?')) return
    setDeleting(true)
    try { await onDelete(item.id) } finally { setDeleting(false) }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="card group p-0 overflow-hidden cursor-default"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-dark-800">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = 'https://via.placeholder.com/200?text=?' }}
        />

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={() => onFavorite(item.id)} title="Favourite"
            className={`btn-icon ${item.is_favorite ? 'bg-pink-500/80 text-white' : ''}`}>
            <Heart className="w-4 h-4" fill={item.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => onWear(item.id)} title="Log wear" className="btn-icon">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} title="Delete" className="btn-icon text-red-400 hover:bg-red-500/20" disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {item.is_favorite && <span className="badge-danger text-xs px-2 py-0.5">❤️</span>}
          {item.was_corrected && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/80 text-white font-medium">✓</span>
          )}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} title={item.confidence_status} />
          <span className="badge badge-primary text-xs px-2 py-0.5">
            {Math.round((item.confidence_score || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-white text-sm truncate">{item.name || item.category}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="badge-info text-xs">{item.category}</span>
          <span className="badge-primary text-xs">{item.style}</span>
        </div>
        {dominant && (
          <div className="flex items-center gap-1.5 mt-2">
            <div
              className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
              style={{ backgroundColor: dominant.hex || COLOR_HEX[dominant.name] || '#808080' }}
            />
            <span className="text-xs text-slate-400">{dominant.name}</span>
            {item.secondary_color && (
              <>
                <span className="text-slate-600">·</span>
                <div
                  className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: COLOR_HEX[item.secondary_color] || '#808080' }}
                />
                <span className="text-xs text-slate-500">{item.secondary_color}</span>
              </>
            )}
          </div>
        )}
        <p className="text-xs text-slate-600 mt-1">Worn {item.wear_count}×</p>
      </div>
    </motion.div>
  )
}

// ─── Main Wardrobe Page ────────────────────────────────────────────────────────
export default function Wardrobe() {
  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [category, setCategory]     = useState('All')
  const [search, setSearch]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (category !== 'All') params.category = category
      const res = await wardrobeAPI.getItems(params)
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch { toast.error('Failed to load wardrobe') }
    finally { setLoading(false) }
  }, [category])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await wardrobeAPI.deleteItem(id)
    toast.success('Item deleted')
    setItems(prev => prev.filter(i => i.id !== id))
    setTotal(t => t - 1)
  }

  const handleFavorite = async (id) => {
    const res = await wardrobeAPI.toggleFavorite(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_favorite: res.data.is_favorite } : i))
    toast.success(res.data.is_favorite ? 'Added to favorites ❤️' : 'Removed from favorites')
  }

  const handleWear = async (id) => {
    await wardrobeAPI.logWear(id)
    toast.success('Outfit worn logged! 👕')
    setItems(prev => prev.map(i => i.id === id ? { ...i, wear_count: i.wear_count + 1 } : i))
  }

  const filtered = items.filter(i =>
    search === '' ||
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title mb-0">My Wardrobe</h1>
          <p className="page-subtitle">{total} item{total !== 1 ? 's' : ''} in your collection</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          id="upload-btn"
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Clothing
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search clothes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                category === c
                  ? 'bg-primary-600 border-primary-500 text-white'
                  : 'bg-white/5 border-white/15 text-slate-400 hover:border-white/30'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="skeleton aspect-square" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-20">
          <div className="text-6xl mb-4">👕</div>
          <h3 className="text-xl font-bold text-white mb-2">
            {total === 0 ? 'Your wardrobe is empty' : 'No items match your filter'}
          </h3>
          <p className="text-slate-400 mb-6">
            {total === 0 ? 'Upload your first clothing item to get started!' : 'Try adjusting your search or filters.'}
          </p>
          {total === 0 && (
            <button onClick={() => setShowUpload(true)} className="btn-primary">
              Upload First Item
            </button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {filtered.map(item => (
              <ClothingCard key={item.id} item={item}
                onDelete={handleDelete} onFavorite={handleFavorite} onWear={handleWear} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onSuccess={() => load()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
