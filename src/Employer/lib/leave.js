import { SETTINGS } from '../data/settingsData'

// Days between two dates (inclusive of both)
export function diffDays(start, end) {
  const ms = new Date(end) - new Date(start)
  return Math.round(ms / 86400000)
}

// NETWORKDAYS(start, end) — excludes Saturday & Sunday
export function networkdays(start, end) {
  const startD = new Date(start)
  const endD = new Date(end)
  let count = 0
  const cursor = new Date(startD)
  while (cursor <= endD) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function monthsWorked(joinDate, asOf = new Date()) {
  const join = new Date(joinDate)
  // Missing or invalid join date (e.g. placeholder user with no employee
  // record) counts as no tenure — keeps leave math at 0 instead of NaN.
  if (isNaN(join.getTime())) return 0
  const months = (asOf.getFullYear() - join.getFullYear()) * 12 + (asOf.getMonth() - join.getMonth())
  return Math.max(0, months)
}

function fullYearsWorked(joinDate, asOf = new Date()) {
  return Math.floor(monthsWorked(joinDate, asOf) / 12)
}

// Tenure-based annual entitlement, per the reference workbook:
//   < 1 year: prorated 16 × months_worked / 12
//   ≥ 1 year: 16 + 1 day per 2 full years
export function annualEntitlement(joinDate, asOf = new Date()) {
  const { baseEntitlement, extraDayPerFullYears } = SETTINGS.leave
  const yrs = fullYearsWorked(joinDate, asOf)
  if (yrs < 1) {
    return Math.round((baseEntitlement * monthsWorked(joinDate, asOf)) / 12)
  }
  return baseEntitlement + Math.floor(yrs / extraDayPerFullYears)
}

// Normalize leave-type labels so "Annual" and "Annual Leave" are treated equally
function normalizeLeaveType(type) {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/\s+leave$/, '')
}

// Approved leave days between start/end for a given user's joins
export function takenDays(requestsForEmployee, type = 'Annual Leave') {
  const target = normalizeLeaveType(type)
  return requestsForEmployee
    .filter(
      (r) =>
        normalizeLeaveType(r.leaveType) === target &&
        r.approvalStatus === 'Approved'
    )
    .reduce((sum, r) => sum + (r.days ?? networkdays(r.startDate, r.endDate)), 0)
}

export function leaveBalance(joinDate, requestsForEmployee, asOf = new Date()) {
  const entitled = annualEntitlement(joinDate, asOf)
  const annualTaken = takenDays(requestsForEmployee)
  const sickTaken = takenDays(requestsForEmployee, 'Sick')
  return {
    entitled,
    taken: annualTaken,
    remaining: Math.max(0, entitled - annualTaken),
    sickDaysUsed: sickTaken,
    sickDaysTotal: SETTINGS.leave.sickDaysPerYear,
    sickRemaining: SETTINGS.leave.sickDaysPerYear - sickTaken,
  }
}

// The most recent APPROVED leave request covering `today` (if any).
// Also reports `daysLeft` — working days remaining on the leave.
export function activeLeave(requestsForEmployee, asOf = new Date()) {
  if (!Array.isArray(requestsForEmployee)) return null
  const today = asOf.toISOString().slice(0, 10)
  const match =
    requestsForEmployee
      .filter((r) => r.approvalStatus === 'Approved')
      .filter((r) => {
        const start = r.startDate || ''
        const end = r.endDate || r.startDate || ''
        return start <= today && today <= end
      })
      .sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')))[0] || null
  if (!match) return null
  return { ...match, daysLeft: diffDays(today, match.endDate || match.startDate) + 1 }
}

// Flag two APPROVED requests with overlapping date ranges for the same employee
export function findOverlaps(requests) {
  const overlaps = []
  for (let i = 0; i < requests.length; i += 1) {
    for (let j = i + 1; j < requests.length; j += 1) {
      const a = requests[i]
      const b = requests[j]
      if (a.employeeId !== b.employeeId) continue
      if (a.approvalStatus !== 'Approved' || b.approvalStatus !== 'Approved') continue
      const aStart = new Date(a.startDate)
      const aEnd = new Date(a.endDate)
      const bStart = new Date(b.startDate)
      const bEnd = new Date(b.endDate)
      if (aStart <= bEnd && bStart <= aEnd) {
        overlaps.push([a.id, b.id])
      }
    }
  }
  return overlaps
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('en-ET', { day: '2-digit', month: 'short', year: 'numeric' })
}