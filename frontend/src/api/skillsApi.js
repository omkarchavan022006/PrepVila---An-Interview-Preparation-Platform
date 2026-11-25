import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const analyzeSkillGap = ({ resume_id, job_id }) => api.post('/skills/analyze/', { resume_id, job_id }, { timeout: AI_REQUEST_TIMEOUT_MS })
