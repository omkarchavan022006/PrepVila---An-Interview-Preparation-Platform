import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const generateInterviewFeedback = (interviewId) => api.post('/interview-feedback/generate/', { interview_id: interviewId }, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getInterviewFeedbackHistory = () => api.get('/interview-feedback/history/')
export const getInterviewFeedback = (feedbackId) => api.get(`/interview-feedback/${encodeURIComponent(feedbackId)}/`)
