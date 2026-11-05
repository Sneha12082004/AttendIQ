import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request interceptor — inject JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('attendiq_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data || '')
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — handle 401
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API] Response ${response.status}`, response.data)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('attendiq_token')
      localStorage.removeItem('attendiq_user')
      window.location.href = '/login'
    }

    if (import.meta.env.DEV) {
      console.error(`[API] Error ${error.response?.status}`, error.response?.data)
    }

    return Promise.reject(error)
  },
)

export default apiClient
