export function getAuthErrorMessage(error, action) {
  const status = error.response?.status
  const data = error.response?.data

  if (action === 'register' && (status === 409 || data?.error === 'Email is already registered')) {
    return 'That email is already registered. Try logging in instead.'
  }

  if (typeof data?.error === 'string') return data.error
  if (typeof data?.detail === 'string') return data.detail
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (!error.response) return 'Unable to reach the server. Check your connection and try again.'
  if (action === 'login' && status === 401) return 'Invalid email or password.'

  return action === 'login'
    ? 'Unable to log in right now. Please try again.'
    : 'Unable to create your account right now. Please try again.'
}

export function isDuplicateEmailError(error) {
  return error.response?.status === 409 || error.response?.data?.error === 'Email is already registered'
}
