import api, { AI_REQUEST_TIMEOUT_MS, FILE_TRANSFER_TIMEOUT_MS } from './axios'

export const getResumes = () => api.get('/resumes/')
export const getResume = (resumeId) => api.get(`/resumes/${encodeURIComponent(resumeId)}/`)
export const deleteResume = (resumeId) => api.delete(`/resumes/${encodeURIComponent(resumeId)}/delete/`)
export const analyzeResume = (resumeId) => api.post(`/resumes/${encodeURIComponent(resumeId)}/analyze/`, undefined, { timeout: AI_REQUEST_TIMEOUT_MS })

export function uploadResume(file, onUploadProgress) {
  const body = new FormData()
  body.append('file', file)
  return api.post('/resumes/upload/', body, { onUploadProgress, timeout: FILE_TRANSFER_TIMEOUT_MS })
}
