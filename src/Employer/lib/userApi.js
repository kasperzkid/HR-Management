import { authHeaders } from '../../lib/hrApi'

const API_BASE = '/api/auth'

async function af(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.body ? { 'Content-Type': 'application/json' } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed: ${res.status}`)
    err.code = data.code
    throw err
  }
  return data
}

export const fetchMe = () => af('/me')

export const updateProfileApi = (payload) =>
  af('/profile', { method: 'PUT', body: JSON.stringify(payload) })

export const changePasswordApi = (payload) =>
  af('/password', { method: 'PUT', body: JSON.stringify(payload) })
