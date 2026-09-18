// Aggregate per-employee hours from attendance records
export function attendanceTotals(attendance) {
  const map = {}
  ;(attendance || []).forEach((a) => {
    const key = a.employeeId
    map[key] = map[key] || { days: 0, totalHours: 0, totalOtHours: 0, absences: 0 }
    const agg = map[key]
    if (a.status === 'Present' || a.status === 'On Leave') {
      agg.days += 1
      agg.totalHours += a.regular || 0
      agg.totalOtHours += a.overtime || 0
    } else {
      agg.absences += 1
    }
  })
  return map
}
