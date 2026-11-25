import axios from 'axios'

export const TOKEN_STORAGE_KEY = 'ai-interview-token'
export const USER_STORAGE_KEY = 'ai-interview-user'
export const AUTH_REQUIRED_EVENT = 'ai-interview:unauthorized'
export const DEFAULT_API_TIMEOUT_MS = 20000
export const AI_REQUEST_TIMEOUT_MS = 90000
export const FILE_TRANSFER_TIMEOUT_MS = 60000

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:8000/api'
  : 'https://prep-vila-an-interview-preparation-nu.vercel.app/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  timeout: DEFAULT_API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`

  // Let the browser set the multipart boundary for FormData requests.
  if (config.data instanceof FormData) delete config.headers['Content-Type']
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

export default api
