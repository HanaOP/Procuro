import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('procuro_auth')
    if (stored) {
      const { token } = JSON.parse(stored)
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // ignore
  }
  return config
})

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('procuro_auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
