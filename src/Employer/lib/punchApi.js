import { authHeaders } from '../../lib/hrApi'
import { getAddisNow, applyPunchStatus } from './workTime'

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

// Apply an attendance:update socket event. Only today's record for the
// logged-in employee affects the punch widgets — everything else is HR
// or another employee's row.
export function applyAttendanceUpdate(record) {
  if (!record) return
  const { dateKey } = getAddisNow()
  const isToday = record.date === dateKey
  if (!isToday) return

  // If the row belongs to another employee (HR pushed a full list),
  // ignore it — /punch is keyed to the logged-in user's profile.
  applyPunchStatus({
    checkedIn: Boolean(record.checkIn),
    checkIn: record.checkIn || null,
    checkedOut: Boolean(record.checkOut),
    checkOut: record.checkOut || null,
    isEmergency: record.status === 'Emergency Departure',
    employeeRemark: record.employeeRemark || null,
    hrStatus: record.hrStatus || null,
    hrNote: record.hrNote || null,
    hrUpdatedAt: record.hrUpdatedAt || null,
  })
}

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
