export function getResumeBuilderError(error) {
  const status = error.response?.status ?? error.status
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 429 || status === 503) return error.response?.data?.error || error.message || 'The AI service is temporarily unavailable. Please wait and try again.'
  if (status === 502) return error.response?.data?.error || error.message || 'The server could not generate the resume right now.'
  if (status === 404) return error.response?.data?.error || error.message || 'The generated resume could not be found.'
  if (status === 400) {
    const body = error.response?.data
    if (typeof body?.error === 'string') return body.error
    if (body?.details && typeof body.details === 'object') {
      const messages = Object.values(body.details).flatMap((value) => Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item : item?.message) : [])
      if (messages.length) return messages.join(' ')
    }
    return error.message || 'Check the required resume fields and try again.'
  }
  if (status >= 500) return error.response?.data?.error || error.message || 'The service could not complete this request.'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'The request timed out. Please check your connection and try again.'
  if (!error.response && !error.status) return error.message || 'The server could not be reached. Check your connection and try again.'
  return error.response?.data?.error || error.response?.data?.detail || error.message || 'The request could not be completed.'
}

export function formatResumeBuilderDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function createObjectUrl(blob) {
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url) {
  if (url) URL.revokeObjectURL(url)
}
