import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const generateFollowupQuestions = (payload) => api.post('/followup-questions/generate/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getFollowupHistory = () => api.get('/followup-questions/history/')
export const getFollowupDetail = (followupId) => api.get(`/followup-questions/${encodeURIComponent(followupId)}/`)
