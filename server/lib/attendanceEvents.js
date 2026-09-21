// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// Realtime attendance events. Every punch (check-in / check-out /
// emergency check-out) is pushed to HR managers, and every HR status
// change is pushed back to the affected employee.
//
// Socket rooms are keyed by auth user id (`user:${userId}`), while
// attendance rows reference the Employee table — so we resolve the
// auth user via the employee email (same matching as punch.controller).
// ------------------------------------------------------------------

import prisma from '../db.js'
import { io } from '../socket.js'

const HR_ROLES = ['HR_MANAGER', 'EMPLOYER']

// Serialised shape shared by every attendance:update event.
export function serializeAttendance(record) {
  if (!record) return null
  return {
    id: record.id,
    employeeId: record.employeeId,
    employeeName: record.employeeName,
    department: record.department,
    date: record.date,
    status: record.status,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    late: record.late,
    earlyDeparture: record.earlyDeparture,
    regular: record.regular,
    overtime: record.overtime,
    employeeRemark: record.employeeRemark || null,
    isEmergency: record.status === 'Emergency Departure',
    hrStatus: record.hrStatus || null,
    hrNote: record.hrNote || null,
    hrUpdatedAt: record.hrUpdatedAt || null,
  }
}

// Auth user ids allowed to see attendance updates (HR dashboard).
async function attendanceViewerIds() {
  const viewers = await prisma.user.findMany({
    where: { role: { in: HR_ROLES } },
    select: { id: true },
  })
  return viewers.map((v) => v.id)
}

// Resolve the auth user id linked to an Employee row by email.
async function authUserIdForEmployee(employeeId) {
  if (!employeeId) return null
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  })
  const email = (employee?.email || '').toLowerCase()
  if (!email) return null

  // SQLite has no case-insensitive filter — normalise in JS instead.
  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  const user = users.find((u) => (u.email || '').toLowerCase() === email)
  return user ? user.id : null
}

// Employee punched (check-in / check-out / emergency) → notify HR.
export async function emitAttendanceToHr(record) {
  try {
    const payload = { record: serializeAttendance(record) }
    const viewerIds = await attendanceViewerIds()
    viewerIds.forEach((id) => io.to(`user:${id}`).emit('attendance:update', payload))
  } catch (err) {
    console.error('emitAttendanceToHr failed:', err)
  }
}

// HR changed the attendance status → notify the affected employee.
export async function emitAttendanceToEmployee(record) {
  try {
    const payload = { record: serializeAttendance(record) }
    const userId = await authUserIdForEmployee(record.employeeId)
    if (userId) io.to(`user:${userId}`).emit('attendance:update', payload)
  } catch (err) {
    console.error('emitAttendanceToEmployee failed:', err)
  }
}
