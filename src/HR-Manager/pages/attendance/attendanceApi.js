// ─────────────────────────────────────────────────────────────
// Attendance persistence — save the visible month to the API.
// Extracted from pages/Attendance.jsx so the page stays focused
// on state + layout.
//
// Save semantics:
//   Existing records  → PUT
//   New records       → POST
//   Cleared records   → DELETE
//   Weekends (WK)     → never stored
// ─────────────────────────────────────────────────────────────

import { authHeaders } from '../../../lib/hrApi'
import { buildRowsFromDatabase, getDateKey, getDaysInMonth } from './attendanceHelpers'

const API_URL = '/api/hr-manager'

export async function fetchMonthData(monthStart, monthEnd) {
  const [employeesResponse, attendanceResponse, leaveResponse] = await Promise.all([
    fetch(`${API_URL}/employees`, { headers: authHeaders() }),
    fetch(`${API_URL}/attendance?startDate=${monthStart}&endDate=${monthEnd}`, {
      headers: authHeaders(),
    }),
    fetch(`${API_URL}/leave`, { headers: authHeaders() }),
  ])

  if (!employeesResponse.ok) {
    throw new Error('Unable to load employees from the database')
  }

  if (!attendanceResponse.ok) {
    throw new Error('Unable to load attendance from the database')
  }

  if (!leaveResponse.ok) {
    throw new Error('Unable to load leave requests from the database')
  }

  const [employeeData, attendanceData, leaveData] = await Promise.all([
    employeesResponse.json(),
    attendanceResponse.json(),
    leaveResponse.json(),
  ])

  return {
    employees: Array.isArray(employeeData) ? employeeData : [],
    attendance: Array.isArray(attendanceData) ? attendanceData : [],
    leaves: Array.isArray(leaveData) ? leaveData : [],
  }
}

export async function fetchAttendanceMonth(monthStart, monthEnd) {
  const refreshedResponse = await fetch(
    `${API_URL}/attendance?startDate=${monthStart}&endDate=${monthEnd}`,
    { headers: authHeaders() },
  )

  if (!refreshedResponse.ok) {
    throw new Error(
      'Attendance was saved, but the updated records could not be reloaded',
    )
  }

  const refreshedData = await refreshedResponse.json()
  return Array.isArray(refreshedData) ? refreshedData : []
}

async function requestJson(url, options, fallbackMessage) {
  const response = await fetch(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || fallbackMessage)
  }
}

function buildPayload(record, row, dateKey) {
  return {
    employeeId: row.employeeKey,
    employeeName: row.name,
    department: row.department,
    date: dateKey,

    /*
     * If overtime/late was entered without
     * a status, use Present as the default.
     */
    status: record.code || 'P',

    checkIn: record.checkIn || null,
    checkOut: record.checkOut || null,
    late: Number(record.late || 0),
    earlyDeparture: Number(record.earlyDeparture || 0),

    regular:
      record.regular !== undefined
        ? Number(record.regular) || 0
        : record.code === 'P' || record.code === 'HD'
          ? 8
          : 0,

    overtime: Number(record.overtime || 0),
  }
}

export async function saveMonthAttendance({
  employees,
  databaseRecords,
  year,
  month,
  monthStart,
  monthEnd,
}) {
  const daysInMonth = getDaysInMonth(year, month)
  const currentRows = buildRowsFromDatabase(employees, databaseRecords, year, month)

  for (const row of currentRows) {
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = getDateKey(year, month, day)
      const record = row.attendance[dateKey]

      if (!record) continue

      // Never store automatic weekends.
      if (record.code === 'WK') continue

      const isEmpty =
        !record.code &&
        Number(record.overtime || 0) === 0 &&
        Number(record.late || 0) === 0

      // Cleared existing record → delete it.
      if (record.id && isEmpty) {
        await requestJson(
          `${API_URL}/attendance/${record.id}`,
          { method: 'DELETE', headers: authHeaders() },
          `Failed to delete attendance for ${row.name}`,
        )
        continue
      }

      // Completely empty new cells do not need a database record.
      if (!record.id && isEmpty) continue

      const payload = buildPayload(record, row, dateKey)

      // Existing record → UPDATE
      if (record.id) {
        await requestJson(
          `${API_URL}/attendance/${record.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload),
          },
          `Failed to update attendance for ${row.name}`,
        )
        continue
      }

      // New record → CREATE
      await requestJson(
        `${API_URL}/attendance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(payload),
        },
        `Failed to create attendance for ${row.name}`,
      )
    }
  }

  // Reload the month from the database after every successful save.
  return fetchAttendanceMonth(monthStart, monthEnd)
}
