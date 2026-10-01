import { HR_SETTINGS } from '../data/settingsData'

// Excludes Saturdays and Sundays
export function networkdays(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0

  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) {
      count += 1
    }
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function monthsWorked(joinDate, asOf = new Date()) {
  const join = new Date(joinDate)
  if (isNaN(join.getTime())) return 0
  const cur = new Date(asOf)
  const months = (cur.getFullYear() - join.getFullYear()) * 12 + (cur.getMonth() - join.getMonth())
  return Math.max(0, months)
}

export function fullYearsWorked(joinDate, asOf = new Date()) {
  return Math.floor(monthsWorked(joinDate, asOf) / 12)
}

// Tenure-based annual entitlement:
// Year 1: prorated (16 × months / 12)
// Year 2+: 16 base + 1 day per every 2 full years
export function annualEntitlement(joinDate, asOf = new Date()) {
  const { baseEntitlement, extraDayPerFullYears } = HR_SETTINGS.leave
  const yrs = fullYearsWorked(joinDate, asOf)
  if (yrs < 1) {
    return Math.max(1, Math.round((baseEntitlement * monthsWorked(joinDate, asOf)) / 12))
  }
  return baseEntitlement + Math.floor(yrs / extraDayPerFullYears)
}

export function takenAnnualDays(employeeId, leaveRequests) {
  return (leaveRequests || [])
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        r.leaveType === 'Annual' &&
        r.approvalStatus === 'Approved'
    )
    .reduce((sum, r) => sum + (r.days || networkdays(r.startDate, r.endDate) || 0), 0)
}

export function calculateLeaveMetrics(activeEmployees, leaveRequests, asOf = new Date()) {
  let totalDaysTaken = 0
  let eligibleCount = 0
  let utilizationPercentages = []

  activeEmployees.forEach((emp) => {
    const entitled = annualEntitlement(emp.joinDate, asOf)
    const taken = takenAnnualDays(emp.employeeId, leaveRequests)
    totalDaysTaken += taken
    eligibleCount += 1
    if (entitled > 0) {
      utilizationPercentages.push((taken / entitled) * 100)
    }
  })

  const avgDaysTaken = eligibleCount > 0 ? Math.round((totalDaysTaken / eligibleCount) * 10) / 10 : 0
  const avgUtilizationRate =
    utilizationPercentages.length > 0
      ? Math.round(utilizationPercentages.reduce((a, b) => a + b, 0) / utilizationPercentages.length)
      : 0

  return {
    avgDaysTaken,
    avgUtilizationRate,
    totalDaysTaken,
    eligibleCount,
  }
}
