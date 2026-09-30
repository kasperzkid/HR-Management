/**
 * Editing an employee's attendance status.
 *
 * HR correcting a day is a small thing to ask for and easy to get wrong in a way
 * that quietly pays somebody for a day they were not there. The rules live here
 * rather than in the page so they can be checked without a browser.
 *
 * The status vocabulary is the page's existing one. It is deliberately limited
 * to the values Attendance.jsx already counts: a status nothing reads would
 * save without complaint and then vanish from every total.
 */

/**
 * The statuses HR can set.
 *
 * Deliberately just the two that mean something to payroll: the employee was
 * there, or was not. The page can *read* the finer-grained statuses (late,
 * checked in, on leave) but does not offer them here -- an admin correcting a
 * day is deciding whether somebody worked, and the leave codes belong to the
 * leave workflow rather than to a same-day correction.
 */
export const EDITABLE_STATUSES = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
]

/**
 * Statuses meaning the employee was not in the office. A record carrying one of
 * these must not keep punch times or hours: the live data already had absent
 * days sitting at 850 late minutes because the punch was never cleared, and
 * payroll reads regular/overtime hours from these records.
 */
export const NON_ATTENDING_STATUSES = new Set([
  'ABSENT',
  'A',
  'SL',
  'AL',
  'ML',
  'OL',
  'PH',
  'WK',
])

const LABELS = new Map(EDITABLE_STATUSES.map((s) => [s.value, s.label]))

/**
 * Folds the shapes that turn up in the data into one canonical status.
 *
 * Check-in writes "Present"/"Late" while everything that reads attendance
 * compares against "PRESENT"/"LATE", and "A" is an accepted alias for absent.
 * Without this an admin editing a freshly checked-in day would be offered a
 * blank status.
 */
export function normaliseStatus(status) {
  const text = status == null ? '' : String(status).trim().toUpperCase()
  if (!text) return ''
  if (text === 'A') return 'ABSENT'
  return text
}

export function statusLabel(status) {
  const value = normaliseStatus(status)
  if (!value) return 'No Record'
  return LABELS.get(value) || value
}

export function isAttending(status) {
  return !NON_ATTENDING_STATUSES.has(normaliseStatus(status))
}

/** "Present to Absent", or "Absent" when there was nothing there before. */
export function describeStatusChange(from, to) {
  const target = statusLabel(to)
  const source = statusLabel(from)
  if (!source || source === 'No Record') return `set to ${target}`
  if (source === target) return `${target} (unchanged)`
  return `${source} to ${target}`
}

/** Blank, whitespace and "null" are all the absence of a time. */
function cleanTime(value) {
  if (value == null) return ''
  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return ''
  // A punch is stored as HH:MM or HH:MM:SS; keep the first two parts so an
  // <input type="time"> value is never widened by a stale seconds field. The
  // digits are not required to be padded -- a value already in the database as
  // "9:5" is a real time, and dropping it would lose the punch rather than
  // tidying it.
  const match = text.match(/^(\d{1,2}):(\d{1,2})/)
  if (!match) return ''
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return ''
  return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`
}

function hours(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.round(number * 100) / 100
}

/**
 * The body to send for a status change.
 *
 * Every field is sent explicitly rather than omitted. The server merges with
 * "data.x ?? current.x", so an omitted field keeps its old value -- which is
 * exactly how an absent day ends up still holding yesterday's punch.
 *
 * `late` is sent as 0 on purpose: the server recomputes it from the check-in
 * time against the required time, and 0 is the correct floor for a day with no
 * punch.
 */
export function attendanceStatusPayload({ employeeId, date, status, checkIn, checkOut, regular, overtime }) {
  if (!employeeId) throw new Error('An employee is required to record attendance.')
  if (!date) throw new Error('A date is required to record attendance.')

  const next = normaliseStatus(status)
  if (!next) throw new Error('Choose an attendance status.')
  if (!LABELS.has(next)) {
    throw new Error(`"${status}" is not a status this page can set.`)
  }

  const attending = isAttending(next)

  return {
    employeeId,
    date,
    status: next,
    checkIn: attending ? cleanTime(checkIn) : '',
    checkOut: attending ? cleanTime(checkOut) : '',
    regular: attending ? hours(regular) : 0,
    overtime: attending ? hours(overtime) : 0,
    late: 0,
  }
}

/**
 * Seeds the editor from a record, so the form shows what is actually stored
 * rather than what the type would default to.
 */
export function statusFormFrom(record) {
  return {
    status: normaliseStatus(record?.status) || 'PRESENT',
    checkIn: cleanTime(record?.checkIn),
    checkOut: cleanTime(record?.checkOut),
    regular: record?.regular == null || record?.regular === '' ? '' : String(record.regular),
    overtime: record?.overtime == null || record?.overtime === '' ? '' : String(record.overtime),
  }
}
