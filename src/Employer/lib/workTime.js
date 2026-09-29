// ─────────────────────────────────────────────────────────────
// WORK TIME RULES (UTC+3 — Addis Ababa)
// Work day:          Mon–Fri
//
// All times below are DYNAMIC — configured by the HR admin
// via Settings > Attendance, Work Hours & Office Geofence.
// Defaults:
//   Check-in window:   08:00 → 08:30
//   08:00–08:30:       Present (P)
//   After 08:30:       Absent (A) + late minutes
//   Before 08:00:      Check-in disabled
//   Check-out:         Accepted at/after 17:30
//
// Weekend:           Sat/Sun — check-in & check-out disabled
// Emergency:         check-out with mandatory remark, notifies HR
//                    (Attendance section only)
// ─────────────────────────────────────────────────────────────

import { setGeoConfig } from './geo'

export function parseTimeToMinutes(timeStr, defaultMinutes = 0) {
  if (!timeStr) return defaultMinutes
  const parts = String(timeStr).split(':').map(Number)
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return defaultMinutes
  }
  return parts[0] * 60 + parts[1]
}

export function formatMinutesToDisplay(minutes) {
  if (!Number.isFinite(minutes)) return ''
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 || 12
  return `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`
}

let attendanceConfig = {
  checkInStartTime: '08:00',
  requiredCheckInTime: '08:30',
  checkOutStartTime: '17:30',
  checkOutEndTime: '19:00',
  geoRestrictionEnabled: true,
  officeLatitude: 8.999654748138806,
  officeLongitude: 38.820610900000005,
  allowedRadiusMeters: 100,
}

export function setAttendanceConfig(newConfig = {}) {
  if (!newConfig) return
  attendanceConfig = {
    ...attendanceConfig,
    ...newConfig,
  }
  setGeoConfig(newConfig)
  listeners.forEach((fn) => fn(state))
}

export function getAttendanceConfig() {
  return attendanceConfig
}

export function getWorkStartMinutes() {
  return parseTimeToMinutes(attendanceConfig.checkInStartTime, 8 * 60)
}

export function getCheckInCutoffMinutes() {
  return parseTimeToMinutes(attendanceConfig.requiredCheckInTime, 8 * 60 + 30)
}

export function getWorkEndMinutes() {
  return parseTimeToMinutes(attendanceConfig.checkOutStartTime, 17 * 60 + 30)
}

export function getCheckOutEndMinutes() {
  return parseTimeToMinutes(attendanceConfig.checkOutEndTime, 19 * 60)
}

export function getWorkStartDisplay() {
  return formatMinutesToDisplay(getWorkStartMinutes())
}

export function getCheckInCutoffDisplay() {
  return formatMinutesToDisplay(getCheckInCutoffMinutes())
}

export function getWorkEndDisplay() {
  return formatMinutesToDisplay(getWorkEndMinutes())
}

export function getCheckOutEndDisplay() {
  return formatMinutesToDisplay(getCheckOutEndMinutes())
}

// @deprecated — use getWorkStartMinutes() instead (reads HR admin config)
export const WORK_START_MINUTES = 8 * 60
// @deprecated — use getCheckInCutoffMinutes() instead (reads HR admin config)
export const CHECK_IN_CUTOFF_MINUTES = 8 * 60 + 30
// @deprecated — use getWorkEndMinutes() instead (reads HR admin config)
export const WORK_END_MINUTES = 17 * 60 + 30
// @deprecated — use attendanceConfig.checkOutStartTime instead
export const WORK_END_LABEL = '17:30'
// @deprecated — use getWorkEndDisplay() instead (reads HR admin config)
export const WORK_END_DISPLAY = '5:30 PM'

function getAddisNow() {
  const now = new Date()
  const addis = new Date(
    now.getTime() +
      (3 * 60 + now.getTimezoneOffset()) * 60000,
  )

  return {
    now,
    addis,
    day: addis.getDay(),
    minutes: addis.getHours() * 60 + addis.getMinutes(),
    dateKey: addis.toISOString().slice(0, 10),
    timeLabel: addis.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export function isWorkDay(day) {
  return day >= 1 && day <= 5
}

export function isWithinCheckInWindow(minutes) {
  return minutes >= getWorkStartMinutes() && minutes <= getCheckInCutoffMinutes()
}

export function isCheckInOpen(minutes) {
  return minutes >= getWorkStartMinutes()
}

export function isLateCheckIn(minutes) {
  return minutes > getCheckInCutoffMinutes()
}

export function getLateMinutes(minutes) {
  return isLateCheckIn(minutes) ? minutes - getCheckInCutoffMinutes() : 0
}

export function isCheckOutTime(minutes) {
  return minutes >= getWorkEndMinutes()
}

export function isWithinCheckOutWindow(minutes) {
  return minutes >= getWorkEndMinutes() && minutes <= getCheckOutEndMinutes()
}

export function remainingLabel(minutes) {
  const remaining = Math.max(0, getWorkEndMinutes() - minutes)
  const h = Math.floor(remaining / 60)
  const m = remaining % 60
  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m}m`
}

export {
  getAddisNow,
}

// ─────────────────────────────────────────────────────────────
// Shared punch status — one store consumed by the header widget
// and the Attendance page (emergency button + status cards) so
// they never disagree. Backend is the source of truth.
//
// Also carries the HR-adjusted status of today's record so the
// employee sees HR feedback (Acknowledged / Absent / …) live.
// ─────────────────────────────────────────────────────────────

const listeners =
  new Set()

let state = {
  loaded: false,

  checkedIn: false,

  checkInAt: null,

  checkedOut: false,

  checkOutAt: null,

  isEmergency: false,

  employeeRemark: null,

  hrStatus: null,

  hrNote: null,

  hrUpdatedAt: null,

  onLeave: null,
}

export function getPunchState() {
  return state
}

export function setPunchState(
  patch,
) {
  state = {
    ...state,
    ...patch,
  }

  listeners.forEach(
    (fn) => fn(state),
  )
}

export function applyPunchStatus(
  status,
) {
  if (status?.attendanceConfig) {
    setAttendanceConfig(status.attendanceConfig)
  }

  setPunchState({
    loaded: true,

    checkedIn:
      Boolean(
        status.checkedIn,
      ),

    checkInAt:
      status.checkIn ||
      null,

    checkedOut:
      Boolean(
        status.checkedOut,
      ),

    checkOutAt:
      status.checkOut ||
      null,

    isEmergency:
      Boolean(
        status.isEmergency,
      ),

    employeeRemark:
      status.employeeRemark ||
      null,

    hrStatus:
      status.hrStatus ||
      null,

    hrNote:
      status.hrNote ||
      null,

    hrUpdatedAt:
      status.hrUpdatedAt ||
      null,

    onLeave:
      status.onLeave ||
      null,
  })
}

export function subscribePunch(
  fn,
) {
  listeners.add(fn)

  return () =>
    listeners.delete(fn)
}
