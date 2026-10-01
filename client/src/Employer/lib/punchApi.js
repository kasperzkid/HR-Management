import { authHeaders } from '../../lib/hrApi'

import {
  getAddisDateKey,
  getAddisTimeKey,
} from './addisTime'

const API_BASE = '/api/employer'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(
      options.body
        ? {
            'Content-Type': 'application/json',
          }
        : {},
    ),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      data?.message || `Request failed: ${response.status}`,
    )

    error.code = data?.code
    error.distanceMeters = data?.distanceMeters
    error.remainingMinutes = data?.remainingMinutes
    error.allowedRadiusMeters = data?.allowedRadiusMeters

    // Echo back the windows the server rejected against, so the UI can
    // explain itself using the same numbers the server applied.
    error.checkInStart = data?.checkInStart
    error.checkInEnd = data?.checkInEnd
    error.checkOutTime = data?.checkOutTime
    error.checkOutEndTime = data?.checkOutEndTime

    throw error
  }

  return data
}

/* =========================================================
   EMPLOYEE CHECK-IN
   ========================================================= */

export async function employeeCheckIn({
  latitude,
  longitude,
  checkIn,
  date,
} = {}) {
  return request('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({
      latitude,
      longitude,
      checkIn,
      date,
    }),
  })
}

/* =========================================================
   EMPLOYEE CHECK-OUT
   ========================================================= */

export async function employeeCheckOut({
  latitude,
  longitude,
  checkOut,
  date,
} = {}) {
  return request('/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify({
      latitude,
      longitude,
      checkOut,
      date,
    }),
  })
}

/* =========================================================
   PUNCH WIDGET - CHECK IN
   ========================================================= */

export async function punchCheckInApi(coords = {}) {
  return employeeCheckIn({
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    checkIn: coords?.checkIn,
    date: coords?.date,
  })
}

/* =========================================================
   PUNCH WIDGET - CHECK OUT
   ========================================================= */

export async function punchCheckOutApi(coords = {}) {
  return employeeCheckOut({
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    checkOut: coords?.checkOut,
    date: coords?.date,
  })
}

/* =========================================================
   FETCH CURRENT EMPLOYEE ATTENDANCE
   ========================================================= */

export async function fetchMyAttendance(options = {}) {
  const params = new URLSearchParams()

  if (options.startDate) {
    params.set('startDate', options.startDate)
  }

  if (options.endDate) {
    params.set('endDate', options.endDate)
  }

  if (options.month) {
    params.set('month', options.month)
  }

  if (options.year) {
    params.set('year', options.year)
  }

  const query = params.toString()

  return request(
    `/attendance${query ? `?${query}` : ''}`,
  )
}

export async function fetchAttendanceConfigApi() {
  return request('/attendance/config')
}

/* =========================================================
   FETCH TODAY'S PUNCH STATUS

   /attendance/status resolves "today" on the server in Addis
   Ababa and returns today's record together with the HR
   attendance configuration, so the header widget and the
   Attendance page always render the windows the admin actually
   saved, and never have to re-derive the date locally.

   This replaced composing the answer from a raw attendance list
   plus a client-side "today" (new Date().toISOString()), which
   looked at the wrong day for any device whose clock was not UTC
   — leaving an employee who had already checked in staring at a
   disabled "Check In", and a check-out that never became
   available.
   ========================================================= */

export async function fetchPunchStatusApi() {
  const data = await request('/attendance/status')

  const record = data?.record || null

  return {
    ...data,

    record,
    attendance: record,

    // Kept under both names so older consumers keep working.
    attendanceConfig: data?.attendanceConfig || null,

    checkedIn: Boolean(
      data?.checkedIn ?? record?.checkIn,
    ),

    checkedOut: Boolean(
      data?.checkedOut ?? record?.checkOut,
    ),

    checkIn:
      data?.checkIn ??
      record?.checkIn ??
      null,

    checkOut:
      data?.checkOut ??
      record?.checkOut ??
      null,

    hrStatus: record?.status || null,
    hrNote: record?.reviewRemarks || null,
    hrUpdatedAt: record?.reviewedAt || null,
  }
}

/* =========================================================
   EMERGENCY CHECK-OUT
   ========================================================= */

export async function emergencyCheckOutApi(
  reason,
  coords = {},
) {
  // Addis Ababa, not the device clock — this must be the same day
  // and time the server uses to find today's record.
  const date = getAddisDateKey()

  const checkOut = getAddisTimeKey()

  return request(
    '/attendance/emergency-check-out',
    {
      method: 'POST',
      body: JSON.stringify({
        reason,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        distanceMeters: coords?.distanceMeters,
        date,
        checkOut,
      }),
    },
  )
}

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default {
  employeeCheckIn,
  employeeCheckOut,
  punchCheckInApi,
  punchCheckOutApi,
  fetchPunchStatusApi,
  fetchMyAttendance,
  fetchAttendanceConfigApi,
  emergencyCheckOutApi,
}