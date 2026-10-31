import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wardrobe_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wardrobe_token')
      localStorage.removeItem('wardrobe_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)         => api.post('/auth/register', data),
  login:    (data)         => api.post('/auth/login', data),
  logout:   ()             => api.post('/auth/logout'),
  getMe:    ()             => api.get('/auth/me'),
  updateProfile: (data)    => api.put('/auth/profile', data),
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────
export const wardrobeAPI = {
  upload:        (formData)       => api.post('/wardrobe/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }),
  getItems:      (params)         => api.get('/wardrobe/items', { params }),
  getItem:       (id)             => api.get(`/wardrobe/items/${id}`),
  updateItem:    (id, data)       => api.put(`/wardrobe/items/${id}`, data),
  deleteItem:    (id)             => api.delete(`/wardrobe/items/${id}`),
  toggleFavorite:(id)             => api.post(`/wardrobe/items/${id}/favorite`),
  logWear:       (id)             => api.post(`/wardrobe/items/${id}/wear`),
  correctItem:   (id, data)       => api.post(`/wardrobe/items/${id}/correct`, data),
}

// ── Recommendations ───────────────────────────────────────────────────────────
export const recommendAPI = {
  byOccasion:     (occasion, city) => api.get('/recommendations/occasion', { params: { occasion, city } }),
  byWeather:      (city)           => api.get('/recommendations/weather', { params: { city } }),
  personalized:   (limit = 6)      => api.get('/recommendations/personalized', { params: { limit } }),
  colorCheck:     (item_ids)       => api.get('/recommendations/color-check', { params: { item_ids } }),
  history:        (page = 1)       => api.get('/recommendations/history', { params: { page } }),
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const chatAPI = {
  send:         (message, weather_city) => api.post('/chatbot/chat', { message, weather_city }),
  getHistory:   (limit = 30)            => api.get('/chatbot/history', { params: { limit } }),
  clearHistory: ()                      => api.delete('/chatbot/history'),
  tts:          (text)                  => api.post('/chatbot/tts', { text }, { responseType: 'blob' }),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  summary:             () => api.get('/analytics/summary'),
  insights:            () => api.get('/analytics/insights'),
  classificationStats: () => api.get('/analytics/classification'),
}

// ── Rating ────────────────────────────────────────────────────────────────────
export const ratingAPI = {
  analyze: (formData) => api.post('/rating/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  stats:     ()           => api.get('/admin/stats'),
  getUsers:  (page = 1)   => api.get('/admin/users', { params: { page } }),
  getClothes:(page = 1)   => api.get('/admin/clothes', { params: { page } }),
}

export default api
