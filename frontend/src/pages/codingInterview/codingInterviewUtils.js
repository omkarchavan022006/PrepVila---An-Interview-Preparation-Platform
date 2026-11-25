import { getApiErrorMessage } from '../../utils/apiErrors'

export const codingLanguages = [
  ['python', 'Python'], ['javascript', 'JavaScript'], ['java', 'Java'], ['cpp', 'C++'],
  ['c', 'C'], ['csharp', 'C#'], ['go', 'Go'], ['php', 'PHP'],
]

export function apiError(error, writeOperation = false) {
  return getApiErrorMessage(error, { writeOperation })
}

export function hasUncertainOutcome(error) {
  return !error?.response || error.response.status === 500 || error.response.status >= 504
}

export function formatCodeDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
