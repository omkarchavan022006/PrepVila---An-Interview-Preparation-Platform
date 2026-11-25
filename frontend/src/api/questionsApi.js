import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const generateQuestions = (payload) => api.post('/questions/generate/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getQuestionHistory = () => api.get('/questions/history/')
export const getQuestionGeneration = (generationId) => api.get(`/questions/${encodeURIComponent(generationId)}/`)
