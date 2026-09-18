// ─────────────────────────────────────────────────────────────
// WORK TIME RULES (UTC+3 — Addis Ababa)
// Work day:          Mon–Fri, 08:00 → 17:30
// Check-in window:   08:00 → 14:00 (disabled after 14:00)
// Check-out:         becomes available exactly at 17:30
// Weekend:           Sat/Sun — check-in & check-out disabled
// Emergency:         check-out with mandatory remark, notifies HR
//                    (available from the Attendance section)
// ─────────────────────────────────────────────────────────────
export const WORK_START_MINUTES = 8 * 60 // 08:00
export const CHECK_IN_CUTOFF_MINUTES = 14 * 60 // 14:00 — last moment to check in
export const WORK_END_MINUTES = 17 * 60 + 30 // 17:30

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
  // Check-out becomes available AT 17:30 (and remains afterwards so a
  // missed exact-time punch can still be closed out the same day)
  return minutes >= WORK_END_MINUTES
}

export { getAddisNow }

// ─────────────────────────────────────────────────────────────
// Shared punch state — one store consumed by the header widget
// and the Attendance page punch card so they never disagree.
// ─────────────────────────────────────────────────────────────
const listeners = new Set()
let state = {
  checkedIn: false,
  checkInAt: null,
  checkedOut: false,
  checkOutAt: null,
  lastEvent: null, // { type, date, time, isEmergency }
}

export function getPunchState() {
  return state
}

export function setPunchState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn(state))
}

export function recordPunch(event) {
  const { type, time } = event
  if (type === 'check-in') {
    setPunchState({ checkedIn: true, checkInAt: time, checkedOut: false, checkOutAt: null })
  } else if (type === 'check-out' || type === 'emergency-check-out') {
    setPunchState({ checkedOut: true, checkOutAt: time })
  }
  state = { ...state, lastEvent: event }
  listeners.forEach((fn) => fn(state))
}

export function subscribePunch(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
