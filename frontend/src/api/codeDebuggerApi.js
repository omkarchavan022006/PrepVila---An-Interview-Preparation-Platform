import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const analyzeCode = (payload) => api.post('/code-debugger/analyze/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getCodeDebugHistory = () => api.get('/code-debugger/history/')
export const getCodeDebugReport = (debugId) => api.get(`/code-debugger/${encodeURIComponent(debugId)}/`)
