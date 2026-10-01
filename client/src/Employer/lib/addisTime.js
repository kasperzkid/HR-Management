// ─────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH FOR "NOW" IN THE EMPLOYEE PORTAL.
//
// The backend (server/controllers/employer.controller.js) decides
// today's attendance date and the current punch time with
// Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa' }).
//
// Anything on the client that needs "which attendance day is it" or
// "what time is it for attendance" MUST use this module, otherwise
// the browser and the server disagree and today's check-in /
// check-out record is never found — which makes the punch buttons
// look unavailable even though the punch was recorded.
//
// The previous implementation shifted a Date by
// (3h + getTimezoneOffset()) and then read .toISOString() / .getHours().
// That is only correct on a machine whose clock is UTC. For a user
// in Addis Ababa it reports the PREVIOUS day after 21:00, so the
// header keeps offering "Check In" for an employee who already
// checked in, and "Check Out" never becomes available.
//
// Intl with an explicit timeZone is used instead: it is independent
// of the device clock and always agrees with the server.
// ─────────────────────────────────────────────────────────────

export const ADDIS_TIME_ZONE = 'Africa/Addis_Ababa'

const partsFormatter = new Intl.DateTimeFormat(
  'en-CA',
  {
    timeZone: ADDIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  },
)

export function getAddisParts(now = new Date()) {
  const values = {}

  for (const part of partsFormatter.formatToParts(
    now,
  )) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

// YYYY-MM-DD in Addis Ababa — matches Attendance.date on the server.
export function getAddisDateKey(now = new Date()) {
  return getAddisParts(now).date
}

// HH:MM (24h) in Addis Ababa — matches Attendance.checkIn/.checkOut.
export function getAddisTimeKey(now = new Date()) {
  return getAddisParts(now).time
}

// Convert standard 24-hour time (minutes since midnight) to Ethiopian time.
// Ethiopian time is 6 hours behind: 6:00 AM standard = 12:00 ቀን (Day),
// 7:00 AM = 1:00 ቀን, 12:00 PM = 6:00 ቀን, 6:00 PM = 12:00 ሌሊት (Night),
// 12:00 AM = 6:00 ሌሊት.
export function toEthiopianTime(minutes) {
  if (!Number.isFinite(minutes)) return { hour: 0, minute: 0, period: 'ቀን' }

  const standardHour = Math.floor(minutes / 60) % 24
  const mins = minutes % 60

  // Ethiopian hour = (standard hour - 6 + 24) % 12, with 0 → 12
  const ethHour = ((standardHour - 6 + 24) % 12) || 12

  // Day periods in Ethiopian time:
  // 12:00 AM – 5:59 AM standard → ሌሊት (Night) — Ethiopian 6:00–11:59
  // 6:00 AM – 11:59 AM standard → ቀን (Day/Morning) — Ethiopian 12:00–5:59
  // 12:00 PM – 5:59 PM standard → ከሰዓት (Afternoon) — Ethiopian 6:00–11:59
  // 6:00 PM – 11:59 PM standard → ሌሊት (Night/Evening) — Ethiopian 12:00–5:59
  let period
  if (standardHour >= 6 && standardHour < 12) {
    period = 'ቀን'        // Morning/Day
  } else if (standardHour >= 12 && standardHour < 18) {
    period = 'ከሰዓት'     // Afternoon
  } else if (standardHour >= 18 && standardHour < 24) {
    period = 'ምሽት'      // Evening
  } else {
    period = 'ሌሊት'      // Night
  }

  return { hour: ethHour, minute: mins, period }
}

export function formatClockLabel(minutes) {
  if (!Number.isFinite(minutes)) return ''

  const { hour, minute, period } = toEthiopianTime(minutes)

  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

// Day of week for an Addis calendar date, derived from the date key
// itself so it can never drift with the device timezone.
export function getAddisDayOfWeek(dateKey) {
  const [year, month, day] = String(dateKey || '')
    .split('-')
    .map(Number)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return new Date().getDay()
  }

  return new Date(
    Date.UTC(year, month - 1, day),
  ).getUTCDay()
}

export function getAddisNow(now = new Date()) {
  const { date, time } = getAddisParts(now)

  const [hour, minute] = time
    .split(':')
    .map(Number)

  const minutes =
    hour * 60 + minute

  return {
    now,
    dateKey: date,
    timeKey: time,
    timeLabel: formatClockLabel(minutes),
    minutes,
    day: getAddisDayOfWeek(date),
  }
}