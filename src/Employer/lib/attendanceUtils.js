import { overtimeTierOf } from '../../lib/overtime'

// Aggregate per-employee hours from attendance records
export function attendanceTotals(attendance) {
  const map = {}
  ;(attendance || []).forEach((a) => {
    const key = a.employeeId
    map[key] = map[key] || { days: 0, totalHours: 0, totalOtHours: 0, otRegular: 0, otNight: 0, otRestDay: 0, otHoliday: 0, absences: 0 }
    const agg = map[key]
    if (a.status === 'Present' || a.status === 'On Leave') {
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