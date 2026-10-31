import { useState, useEffect, useRef } from 'react'
import { chatAPI } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Mic, MicOff, Volume2, VolumeX, Trash2,
  Loader2, Bot, User, Sparkles, MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'

const QUICK_PROMPTS = [
  "What should I wear for an interview tomorrow?",
  "Suggest an outfit for a casual day out",
  "What colors go with navy blue?",
  "How to dress for a wedding?",
  "Give me a party outfit suggestion",
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
        ${isUser ? 'bg-primary-600' : 'bg-gradient-to-br from-violet-600 to-pink-600'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={isUser ? 'bubble-user' : 'bubble-bot'}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-primary-200' : 'text-slate-500'}`}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

export default function Chatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [city, setCity]         = useState('')
  const [listening, setListening] = useState(false)
  const [ttsEnabled, setTts]    = useState(false)
  const bottomRef               = useRef(null)
  const recognitionRef          = useRef(null)

  // Load history
  useEffect(() => {
    chatAPI.getHistory().then(res => {
      setMessages(res.data.messages || [])
    }).catch(console.error)
  }, [])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await chatAPI.send(msg, city || undefined)
      const botMsg = { role: 'model', content: res.data.reply, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, botMsg])

      // TTS
      if (ttsEnabled) {
        try {
          const blob = await chatAPI.tts(res.data.reply)
          const url = URL.createObjectURL(blob.data)
          new Audio(url).play()
        } catch { /* TTS unavailable */ }
      }
    } catch (err) {
      toast.error('Failed to get response')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // Voice input (Web Speech API)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { toast.error('Speech recognition not supported in this browser'); return }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = e => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setListening(false)
      toast.success('Voice captured! Press send.')
    }
    recognition.onerror = () => { setListening(false); toast.error('Voice recognition failed') }
    recognition.onend = () => setListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
    toast('Listening... Speak now', { icon: '🎙️' })
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return
    await chatAPI.clearHistory()
    setMessages([])
    toast.success('Chat cleared')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto animate-fade-in">
      {/* Header controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">StyleAI Assistant</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Online
            </p>
          </div>
        </div>
        <div className="relative">
          <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input type="text" placeholder="City (for weather context)"
            value={city} onChange={e => setCity(e.target.value)}
            className="input pl-7 py-2 text-sm w-44" />
        </div>
        <button onClick={() => setTts(v => !v)} title="Toggle voice response"
          className={`btn-icon ${ttsEnabled ? 'bg-primary-600/40 text-primary-300' : ''}`}>
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button onClick={clearHistory} className="btn-icon text-red-400 hover:bg-red-500/20">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mb-4 animate-float shadow-glow-lg">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">StyleAI at your service!</h3>
            <p className="text-slate-400 text-sm max-w-sm">Ask me anything about fashion, outfit ideas, color matching, or let me suggest an outfit from your wardrobe.</p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)}
                  className="px-3 py-2 bg-white/5 border border-white/15 hover:border-primary-500/40 hover:bg-primary-600/10 rounded-xl text-xs text-slate-300 transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex-shrink-0 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bubble-bot flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
              <span className="text-sm text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea id="chat-input"
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about outfit ideas, color matching, fashion tips..."
            rows={1} style={{ resize: 'none' }}
            className="input pr-12 py-3 min-h-[48px] max-h-32 overflow-y-auto leading-relaxed"
          />
        </div>
        <button onClick={toggleListening}
          className={`btn-icon w-12 h-12 flex-shrink-0 ${listening ? 'bg-red-500/40 text-red-400 animate-pulse' : ''}`}>
          {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button id="chat-send" onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="btn-primary w-12 h-12 flex-shrink-0 flex items-center justify-center p-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-center text-xs text-slate-600 mt-2">Powered by Google Gemini · Press Enter to send</p>
    </div>
  )
}
