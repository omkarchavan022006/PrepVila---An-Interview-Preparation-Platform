import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const startInterview = (payload) => api.post('/interviews/start/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const submitInterviewAnswer = (interviewId, answer) => api.post(`/interviews/${encodeURIComponent(interviewId)}/answer/`, { answer }, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getNextInterviewQuestion = (interviewId) => api.post(`/interviews/${encodeURIComponent(interviewId)}/next/`, undefined, { timeout: AI_REQUEST_TIMEOUT_MS })
export const completeInterview = (interviewId) => api.post(`/interviews/${encodeURIComponent(interviewId)}/complete/`)
export const getInterviewHistory = () => api.get('/interviews/history/')
export const getInterview = (interviewId) => api.get(`/interviews/${encodeURIComponent(interviewId)}/`)
