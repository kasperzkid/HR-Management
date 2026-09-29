import { overtimeTierOf } from '../../lib/overtime'

// Normalize DB single-letter status codes to canonical labels.
// DB codes: P=Present, PH=Present+Half-day, A=Absent, AL=Annual Leave,
// SL=Sick Leave, ML=Medical Leave, OL=Other Leave.
// Also handles full-word values produced by the punch controller.
function normalizeStatus(raw) {
  const s = String(raw || '').trim().toUpperCase()
  if (s === 'P' || s === 'PRESENT') return 'present'
  if (s === 'PH') return 'present' // half-day counts as a working day
  if (s === 'A' || s === 'ABSENT') return 'absent'
  if (s === 'SL' || s === 'SICK' || s === 'SICK_LEAVE' || s === 'SICKLEAVE' || s === 'SICK LEAVE') return 'sick'
  if (s === 'AL' || s === 'ANNUAL_LEAVE' || s === 'ANNUALLEAVE' || s === 'ON_LEAVE' || s === 'ANNUAL LEAVE') return 'on_leave'
  if (s === 'ML' || s === 'MEDICAL_LEAVE' || s === 'MEDICALLEAVE' || s === 'MEDICAL LEAVE') return 'on_leave'
  if (s === 'OL' || s === 'OTHER_LEAVE' || s === 'OTHERLEAVE' || s === 'OTHER LEAVE') return 'on_leave'
  return 'unknown'
}

// Aggregate per-employee hours from attendance records
export function attendanceTotals(attendance) {
  const map = {}
  ;(attendance || []).forEach((a) => {
    const key = a.employeeId
    map[key] = map[key] || { days: 0, totalHours: 0, totalOtHours: 0, otRegular: 0, otNight: 0, otRestDay: 0, otHoliday: 0, absences: 0 }
    const agg = map[key]
    const st = normalizeStatus(a.status)
    if (st === 'present' || st === 'on_leave') {
      agg.days += 1
      agg.totalHours += a.regular || 0
    } else {
      agg.absences += 1
    }
    const ot = a.overtime || 0
    if (ot > 0) {
      agg.totalOtHours += ot
      const tier = overtimeTierOf(a)
      if (tier === 'night') agg.otNight += ot
      else if (tier === 'restDay') agg.otRestDay += ot
      else if (tier === 'holiday') agg.otHoliday += ot
      else agg.otRegular += ot
    }
  })
  return map
}
