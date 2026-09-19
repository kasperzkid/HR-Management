// ─────────────────────────────────────────────────────────────
// WORK TIME RULES (UTC+3 — Addis Ababa)
// Work day:          Mon–Fri, 08:00 → 17:30
// Check-in window:   08:00 → 14:00 (disabled after 14:00)
// Check-out:         ONLY accepted at/after 17:30 — enforced by
//                    the backend (server/controllers/punch.controller.js)
// Weekend:           Sat/Sun — check-in & check-out disabled
// Emergency:         check-out with mandatory remark, notifies HR
//                    (Attendance section only)
// ─────────────────────────────────────────────────────────────
export const WORK_START_MINUTES = 8 * 60 // 08:00
export const CHECK_IN_CUTOFF_MINUTES = 14 * 60 // 14:00 — last moment to check in
export const WORK_END_MINUTES = 17 * 60 + 30 // 17:30
export const WORK_END_LABEL = '17:30'
export const WORK_END_DISPLAY = '5:30 PM'

function getAddisNow() {
  // Build a Date representing "now" in UTC+3 regardless of the browser TZ
  const now = new Date()
  const addis = new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000)
  return {
    now,
    addis,
    day: addis.getDay(), // 0 = Sunday … 6 = Saturday
    minutes: addis.getHours() * 60 + addis.getMinutes(),
    dateKey: addis.toISOString().slice(0, 10),
    timeLabel: addis.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export function isWorkDay(day) {
  return day >= 1 && day <= 5 // Monday → Friday
}

export function isWithinCheckInWindow(minutes) {
  return minutes >= WORK_START_MINUTES && minutes <= CHECK_IN_CUTOFF_MINUTES
}

export function isCheckOutTime(minutes) {
  return minutes >= WORK_END_MINUTES
}

// "2h 45m" style label for time until check-out unlocks
export function remainingLabel(minutes) {
  const remaining = Math.max(0, WORK_END_MINUTES - minutes)
  const h = Math.floor(remaining / 60)
  const m = remaining % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export { getAddisNow }

// ─────────────────────────────────────────────────────────────
// Shared punch status — one store consumed by the header widget
// and the Attendance page (emergency button + status cards) so
// they never disagree. Backend is the source of truth.
// ─────────────────────────────────────────────────────────────
const listeners = new Set()
let state = {
  loaded: false,
  checkedIn: false,
  checkInAt: null,
  checkedOut: false,
  checkOutAt: null,
}

export function getPunchState() {
  return state
}

export function setPunchState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn(state))
}

export function applyPunchStatus(status) {
  setPunchState({
    loaded: true,
    checkedIn: Boolean(status.checkedIn),
    checkInAt: status.checkIn || null,
    checkedOut: Boolean(status.checkedOut),
    checkOutAt: status.checkOut || null,
  })
}

export function subscribePunch(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
