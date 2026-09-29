// ─────────────────────────────────────────────────────────────
// Shared overtime-tier helpers — Labour Proclamation No. 1156/2019,
// Art. 68. Consumed by BOTH portals so the employer preview and the
// HR payroll run never disagree with the server controller.
//
// The raw hours are recorded per attendance row by the punch clock
// (server/controllers/punch.controller.js). At payroll time every
// row's overtime hours are classified into a tier (holiday / night /
// rest-day / regular) and paid at the tier multiplier:
//   Daytime normal OT     1.25×   (6:00 AM – 10:00 PM)
//   Night shift / rest day 1.5×
//   Public holiday         2.0×
// ─────────────────────────────────────────────────────────────

export const STANDARD_MONTHLY_HOURS = 208

export const OT_MULTIPLIERS = {
  regular: 1.25,
  night: 1.5,
  restDay: 1.5,
  holiday: 2.0,
}

export const OT_TIER_LABELS = {
  regular: 'Regular (daytime)',
  night: 'Night shift',
  restDay: 'Weekly rest day',
  holiday: 'Public holiday',
}

const NIGHT_START_MINUTES = 22 * 60 // 10:00 PM
const NIGHT_END_MINUTES = 6 * 60 // 6:00 AM

function toMinutes(time) {
  if (time == null || time === '') return null
  const [h, m] = String(time).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function dayOfWeek(date) {
  if (!date) return -1
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? -1 : d.getDay() // 0 Sun … 6 Sat
}

// Classify a single attendance record's overtime tier.
// Priority: public holiday > weekly rest day > night shift > regular.
export function overtimeTierOf(record) {
  if (!record) return 'regular'

  const code = String(
    record.status || record.attendanceStatus || record.attendance_status || record.code || '',
  )
    .trim()
    .toUpperCase()

  if (code === 'PH') return 'holiday'

  const day = dayOfWeek(record.date)
  if (day === 0 || day === 6) return 'restDay'

  const checkIn = toMinutes(record.checkIn)
  const checkOut = toMinutes(record.checkOut)
  if (
    (checkIn !== null && checkIn < NIGHT_END_MINUTES) ||
    (checkOut !== null && checkOut >= NIGHT_START_MINUTES)
  ) {
    return 'night'
  }

  return 'regular'
}

// Aggregate per-tier overtime hours across a month's attendance rows.
// Returns { regular, night, restDay, holiday, total }.
export function tieredOvertimeHours(records = []) {
  const hours = { regular: 0, night: 0, restDay: 0, holiday: 0 }

  for (const record of records) {
    const h = Number(
      record?.overtime ?? record?.overtimeHours ?? record?.overtime_hours ?? 0,
    )
    if (!(h > 0)) continue
    hours[overtimeTierOf(record)] += h
  }

  hours.total = hours.regular + hours.night + hours.restDay + hours.holiday
  return hours
}

// Weighted OT pay: Σ(tier hours × tier multiplier) × hourly rate.
// Falls back to a single flat multiplier when no per-tier breakdown is
// available (callers that only carry total OT hours).
export function calculateTieredOvertimePay(basicSalary, hours) {
  const salary = Number(basicSalary || 0)
  if (!(salary > 0)) return 0

  const hoursObj = hours && typeof hours === 'object' ? hours : {}
  const weighted =
    Number(hoursObj.regular || 0) * OT_MULTIPLIERS.regular +
    Number(hoursObj.night || 0) * OT_MULTIPLIERS.night +
    Number(hoursObj.restDay || 0) * OT_MULTIPLIERS.restDay +
    Number(hoursObj.holiday || 0) * OT_MULTIPLIERS.holiday

  // Fallback for callers that only carry a flat total (or no tiers yet).
  let hoursValue = weighted
  if (!(hoursValue > 0)) {
    const flatTotal = hoursObj.total ?? hoursObj.totalOtHours
    hoursValue = Number(flatTotal ?? (typeof hours === 'number' ? hours : 0)) || 0
  }

  const hourlyRate = salary / STANDARD_MONTHLY_HOURS
  return Number((hoursValue * hourlyRate).toFixed(2))
}