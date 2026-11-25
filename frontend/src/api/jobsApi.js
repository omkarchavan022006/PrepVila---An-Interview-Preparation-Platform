import api from './axios'

export const getJobs = (params) => api.get('/jobs/', { params })
export const getJob = (jobId) => api.get(`/jobs/${encodeURIComponent(jobId)}/`)
export const createJob = (job) => api.post('/jobs/', job)
export const updateJob = (jobId, job) => api.put(`/jobs/${encodeURIComponent(jobId)}/`, job)
export const deleteJob = (jobId) => api.delete(`/jobs/${encodeURIComponent(jobId)}/`)
