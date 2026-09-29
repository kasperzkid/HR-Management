import { authHeaders } from '../../lib/hrApi'

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
========================================================= */

export async function fetchPunchStatusApi() {
  const today = new Date().toISOString().slice(0, 10)

  const [response, config] = await Promise.all([
    fetchMyAttendance({
      startDate: today,
      endDate: today,
    }).catch(() => []),
    fetchAttendanceConfigApi().catch(() => null),
  ])

  const records = Array.isArray(response)
    ? response
    : response?.records ||
      response?.attendance ||
      []

  const record =
    records.find(
      (item) => item?.date === today,
    ) || null

  return {
    record,
    attendance: record,
    attendanceConfig: config,

    checkedIn: Boolean(record?.checkIn),
    checkedOut: Boolean(record?.checkOut),

    checkIn: record?.checkIn || null,
    checkOut: record?.checkOut || null,

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
  const date = new Date()
    .toISOString()
    .slice(0, 10)

  const checkOut = new Date()
    .toTimeString()
    .slice(0, 5)

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
  emergencyCheckOutApi,
}