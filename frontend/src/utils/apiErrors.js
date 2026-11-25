function firstMessage(value) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  if (typeof value.error === 'string') return value.error
  if (typeof value.detail === 'string') return value.detail
  for (const entry of Object.values(value)) {
    const message = Array.isArray(entry) ? entry.find((item) => typeof item === 'string') : entry
    if (typeof message === 'string') return message
  }
  return ''
}

export function getApiErrorMessage(error, { writeOperation = false } = {}) {
  const status = error?.response?.status
  const responseMessage = firstMessage(error?.response?.data)

  if (status === 400 || status === 422) return responseMessage || 'Please review the submitted information.'
  if (status === 401) return responseMessage || 'Your session has expired. Sign in again to continue.'
  if (status === 403) return responseMessage || 'You do not have access to this action.'
  if (status === 404) return responseMessage || 'The requested record could not be found.'
  if (status === 429) return responseMessage || 'The AI service is busy. Wait a moment before trying again.'
  if (status === 503) return responseMessage || 'The AI or data service is temporarily unavailable.'
  if (status === 502) return responseMessage || 'The server could not complete this AI request.'
  if (status >= 500) {
    const outcome = writeOperation ? ' The result may have been saved; check history before retrying.' : ''
    return `${responseMessage || 'The server could not complete this request.'}${outcome}`
  }

  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) {
    return writeOperation
      ? 'The request timed out. Its outcome is uncertain; check saved history before retrying.'
      : 'The request timed out. Please try again.'
  }
  if (!error?.response) {
    return writeOperation
      ? 'The server could not be reached. The request outcome is uncertain; check saved history before retrying.'
      : 'Could not reach the server. Check your connection and try again.'
  }
  return responseMessage || 'The request could not be completed.'
}
