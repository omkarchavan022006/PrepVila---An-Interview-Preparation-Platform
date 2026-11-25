import { getApiErrorMessage } from '../../utils/apiErrors'

export function getFeedbackError(error, writeOperation = false) {
  const status = error.response?.status
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 429 || status === 503) return error.response?.data?.error || 'The AI service is temporarily unavailable. Please wait, then try again.'
  if (status === 502) return error.response?.data?.error || 'The server could not generate this report right now.'
  if (status === 404) return error.response?.data?.error || 'The interview or report could not be found.'
  if (status === 400) {
    const body = error.response?.data
    if (typeof body?.error === 'string') return body.error
    if (body && typeof body === 'object') return Object.values(body).flat().filter(Boolean).join(' ')
  }
  return getApiErrorMessage(error, { writeOperation })
}

export const isUncertainFeedbackRequest = (error) => !error.response || error.response.status === 500 || error.response.status >= 504 || ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)

export function formatFeedbackDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
