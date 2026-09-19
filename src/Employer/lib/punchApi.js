import { authHeaders } from '../../lib/hrApi'

// Punch clock API — hits the employer backend which enforces all
// work-time rules (check-in 08:00–14:00, check-out only at 17:30 UTC+3).

async function punchFetch(path, options = {}) {
  const res = await fetch(`/api/employer${path}`, {
    ...options,
    headers: authHeaders(
      options.body ? { 'Content-Type': 'application/json' } : {}
    ),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed: ${res.status}`)
    err.code = data.code
    err.remainingMinutes = data.remainingMinutes
    err.status = data
    throw err
  }
  return data
}

export const fetchPunchStatusApi = () => punchFetch('/punch')

export const punchCheckInApi = (coords = {}) =>
  punchFetch('/punch/check-in', {
    method: 'POST',
    body: JSON.stringify(coords),
  })

export const punchCheckOutApi = (coords = {}) =>
  punchFetch('/punch/check-out', {
    method: 'POST',
    body: JSON.stringify(coords),
  })

export const emergencyCheckOutApi = (remark, coords = {}) =>
  punchFetch('/punch/check-out', {
    method: 'POST',
    body: JSON.stringify({ emergency: true, remark, ...coords }),
  })
