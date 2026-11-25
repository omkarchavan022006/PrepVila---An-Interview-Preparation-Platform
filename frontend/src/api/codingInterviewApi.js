import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const generateCodingQuestion = (payload) => api.post('/coding-interview/generate/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const submitCodingSolution = (payload) => api.post('/coding-interview/submit/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getCodingInterviewHistory = () => api.get('/coding-interview/history/')
export const getCodingSubmission = (submissionId) => api.get(`/coding-interview/submission/${encodeURIComponent(submissionId)}/`)
