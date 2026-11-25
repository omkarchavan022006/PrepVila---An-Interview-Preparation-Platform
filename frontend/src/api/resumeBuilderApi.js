import api, { AI_REQUEST_TIMEOUT_MS, FILE_TRANSFER_TIMEOUT_MS } from './axios'

export const generateResume = (payload) => api.post('/resume-builder/generate/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getResumeBuilderHistory = () => api.get('/resume-builder/history/')
export const deleteGeneratedResume = (resumeId) => api.delete(`/resume-builder/${encodeURIComponent(resumeId)}/delete/`)

function safeFilename(value, fallback = 'generated-resume.pdf') {
  const filename = String(value || fallback).split(/[\\/]/).pop().replace(/[<>:"|?*]/g, '_').trim()
  return filename || fallback
}

function filenameFromDisposition(value) {
  if (!value) return ''
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) {
    try { return decodeURIComponent(encoded[1].replace(/^"|"$/g, '')) } catch { return '' }
  }
  return value.match(/filename="?([^";]+)"?/i)?.[1]?.trim() || ''
}

async function errorMessageFromBlob(blob) {
  if (!(blob instanceof Blob)) return ''
  const text = await blob.text()
  try {
    const data = JSON.parse(text)
    return data?.error || data?.detail || (data?.details && JSON.stringify(data.details)) || ''
  } catch {
    return ''
  }
}

export async function downloadGeneratedResume(resumeId, fallbackFilename) {
  let response
  try {
    response = await api.get(`/resume-builder/download/${encodeURIComponent(resumeId)}/`, { responseType: 'blob', timeout: FILE_TRANSFER_TIMEOUT_MS })
  } catch (error) {
    const message = await errorMessageFromBlob(error.response?.data).catch(() => '')
    const downloadError = new Error(message || `Could not download the resume${error.response?.status ? ` (HTTP ${error.response.status})` : '.'}`)
    downloadError.status = error.response?.status
    downloadError.code = error.code
    throw downloadError
  }

  const blob = response.data
  const contentType = String(response.headers['content-type'] || blob?.type || '').split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/pdf') {
    const message = await errorMessageFromBlob(blob).catch(() => '')
    throw new Error(message || 'The server response was not a PDF file.')
  }
  if (!(blob instanceof Blob) || await blob.slice(0, 5).text() !== '%PDF-') {
    throw new Error('The downloaded file did not contain a valid PDF document.')
  }

  return {
    blob,
    filename: safeFilename(filenameFromDisposition(response.headers['content-disposition']) || fallbackFilename),
    contentType,
  }
}

export function saveResumeFile(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeFilename(filename)
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
