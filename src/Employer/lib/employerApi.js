import { authHeaders } from '../../lib/hrApi'

const API_BASE = '/api/employer'

async function ef(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
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
    throw err
  }
  return data
}

// ── Employees ────────────────────────────────────────────────
export const fetchEmployees = () => ef('/employees')

// ── Attendance ───────────────────────────────────────────────
export const fetchAttendance = () => ef('/attendance')

// ── Leave requests ───────────────────────────────────────────
export const fetchLeaveRequests = () => ef('/leave')
export const createLeaveRequest = (payload) =>
  ef('/leave', { method: 'POST', body: JSON.stringify(payload) })
