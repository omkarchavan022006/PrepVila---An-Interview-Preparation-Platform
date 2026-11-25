export function getInterviewError(error) {
  const status = error.response?.status
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 429 || status === 503) return error.response?.data?.error || 'The AI service is temporarily unavailable. Please wait a moment and try again.'
  if (status === 502) return error.response?.data?.error || 'The AI service could not complete this step. Your current interview is still available.'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'The request timed out. Check the interview status before retrying this action.'
  if (!error.response) return 'The server could not be reached. Check the interview status before retrying this action.'
  return error.response.data?.error || error.response.data?.detail || 'The request could not be completed.'
}

export function isUncertainRequest(error) {
  return !error.response || ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)
}

export function formatInterviewDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
