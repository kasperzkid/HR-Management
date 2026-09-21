// ─────────────────────────────────────────────────────────────
// HR Payroll math — Ethiopian PAYE brackets, pension rates,
// overtime and gross/net computation. Extracted from Payroll.jsx.
// ─────────────────────────────────────────────────────────────

import {
  calculateTieredOvertimePay,
  tieredOvertimeHours,
} from '../../../lib/overtime'

export const API_BASE = '/api/hr-manager'

export const EMPLOYEE_PENSION_RATE = 0.07
export const EMPLOYER_PENSION_RATE = 0.11

// Workbook overtime rule:
// Overtime Hours × (Basic Salary ÷ 208) × 1.5
export const STANDARD_MONTHLY_HOURS = 208
export const OVERTIME_MULTIPLIER = 1.5

export const PAYE_BRACKETS = [
  { min: 0, max: 2000, rate: 0, subtraction: 0 },
  { min: 2001, max: 4000, rate: 0.15, subtraction: 300 },
  { min: 4001, max: 7000, rate: 0.2, subtraction: 500 },
  { min: 7001, max: 10000, rate: 0.25, subtraction: 850 },
  { min: 10001, max: 14000, rate: 0.3, subtraction: 1350 },
  { min: 14001, max: Infinity, rate: 0.35, subtraction: 2050 },
]

export const ATTENDANCE_CODES = {
  PRESENT: 'P',
  ABSENT: 'A',
  SICK_LEAVE: 'SL',
  ANNUAL_LEAVE: 'AL',
  MATERNITY_LEAVE: 'ML',
  OTHER_LEAVE: 'OL',
  PUBLIC_HOLIDAY: 'PH',
  WEEKEND: 'WK',
  HALF_DAY: 'HD',
}

const LEAVE_CODES = new Set([
  ATTENDANCE_CODES.SICK_LEAVE,
  ATTENDANCE_CODES.ANNUAL_LEAVE,
  ATTENDANCE_CODES.MATERNITY_LEAVE,
  ATTENDANCE_CODES.OTHER_LEAVE,
])

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export function getMonthRange(monthValue) {
  const [year, month] = monthValue.split('-').map(Number)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function moveMonthOffset(monthValue, offset) {
  const [year, month] = monthValue.split('-').map(Number)
  const next = new Date(year, month - 1 + offset, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

export function calculateIncomeTax(taxableIncome) {
  const income = Math.max(0, Number(taxableIncome || 0))
  const bracket =
    PAYE_BRACKETS.find((item) => income >= item.min && income <= item.max) ||
    PAYE_BRACKETS[PAYE_BRACKETS.length - 1]
  return Math.max(0, income * bracket.rate - bracket.subtraction)
}

export function isExcludedFromStatutoryDeductions(employee) {
  const type = String(
    employee?.employmentType ||
      employee?.employment_type ||
      employee?.roleType ||
      '',
  ).toLowerCase()
  return type === 'contractual' || type === 'intern'
}

export function getEmployeeName(employee) {
  if (!employee) return 'Unknown Employee'
  if (employee.name) return employee.name
  const firstName = employee.firstName || employee.first_name || ''
  const lastName = employee.lastName || employee.last_name || ''
  return `${firstName} ${lastName}`.trim() || 'Unknown Employee'
}

export function getEmployeeId(employee) {
  return employee?.id || employee?.employeeId || employee?.employee_id || ''
}

export function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function calculateOvertimePay(basicSalary, overtimeHours) {
  const salary = Number(basicSalary || 0)
  const hours = Number(overtimeHours || 0)
  if (salary <= 0 || hours <= 0) return 0
  const hourlyRate = salary / STANDARD_MONTHLY_HOURS
  return Number((hours * hourlyRate * OVERTIME_MULTIPLIER).toFixed(2))
}

export { calculateTieredOvertimePay, tieredOvertimeHours }

export function calculatePreview(employee, form) {
  const basicSalary = Number(employee?.basicSalary || 0)
  const transportAllowance = Number(employee?.transportAllowance || 0)
  const housingAllowance = Number(employee?.housingAllowance || 0)
  const mealAllowance = Number(employee?.mealAllowance || 0)
  const otherAllowance = Number(employee?.otherAllowance || 0)
  const overtimePay = Number(form?.overtimePay || 0)
  const loanDeduction = Number(form?.loanDeduction || 0)
  const otherDeduction = Number(form?.otherDeduction || 0)

  const grossSalary =
    basicSalary + transportAllowance + housingAllowance + mealAllowance + otherAllowance + overtimePay

  const excluded = isExcludedFromStatutoryDeductions(employee)
  const pensionDeduction = excluded ? 0 : basicSalary * EMPLOYEE_PENSION_RATE
  const taxableIncome = Math.max(0, grossSalary - pensionDeduction)
  const incomeTax = excluded ? 0 : calculateIncomeTax(taxableIncome)
  const totalDeductions = pensionDeduction + incomeTax + loanDeduction + otherDeduction
  const netSalary = grossSalary - totalDeductions
  const employerPension = excluded ? 0 : basicSalary * EMPLOYER_PENSION_RATE
  const employerCost = grossSalary + employerPension

  return {
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    overtimePay,
    grossSalary,
    pensionDeduction,
    incomeTax,
    loanDeduction,
    otherDeduction,
    totalDeductions,
    netSalary,
    employerPension,
    employerCost,
  }
}

export function getAttendanceSummary(records) {
  const summary = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    overtimeHours: 0,
    lateMinutes: 0,
  }

  for (const record of records || []) {
    const status = String(
      record.status ||
        record.attendanceStatus ||
        record.attendance_status ||
        record.code ||
        '',
    )
      .trim()
      .toUpperCase()

    if (status !== ATTENDANCE_CODES.WEEKEND && status !== ATTENDANCE_CODES.PUBLIC_HOLIDAY) {
      summary.workingDays += 1
    }

    if (status === ATTENDANCE_CODES.PRESENT) {
      summary.presentDays += 1
    }

    if (status === ATTENDANCE_CODES.ABSENT) {
      summary.absentDays += 1
    }

    if (LEAVE_CODES.has(status)) {
      summary.leaveDays += 1
    }

    summary.overtimeHours += Number(record.overtime || record.overtimeHours || record.overtime_hours || 0)
    summary.lateMinutes += Number(record.late || record.lateMinutes || record.late_minutes || 0)
  }

  const tiers = tieredOvertimeHours(records || [])

  return {
    ...summary,
    overtimeHours: Number(summary.overtimeHours.toFixed(2)),
    regularOvertimeHours: Number(tiers.regular.toFixed(2)),
    nightOvertimeHours: Number(tiers.night.toFixed(2)),
    restDayOvertimeHours: Number(tiers.restDay.toFixed(2)),
    holidayOvertimeHours: Number(tiers.holiday.toFixed(2)),
  }
}

export function normalizePayroll(record) {
  return {
    ...record,
    employeeId: record.employeeId || record.employee_id,
    payrollMonth: record.payrollMonth || record.payroll_month,
    basicSalary: Number(record.basicSalary ?? record.basic_salary ?? 0),
    transportAllowance: Number(record.transportAllowance ?? record.transport_allowance ?? 0),
    housingAllowance: Number(record.housingAllowance ?? record.housing_allowance ?? 0),
    mealAllowance: Number(record.mealAllowance ?? record.meal_allowance ?? 0),
    otherAllowance: Number(record.otherAllowance ?? record.other_allowance ?? 0),
    overtimePay: Number(record.overtimePay ?? record.overtime_pay ?? 0),
    grossSalary: Number(record.grossSalary ?? record.gross_salary ?? 0),
    pensionDeduction: Number(record.pensionDeduction ?? record.pension_deduction ?? 0),
    incomeTax: Number(record.incomeTax ?? record.income_tax ?? 0),
    loanDeduction: Number(record.loanDeduction ?? record.loan_deduction ?? 0),
    otherDeduction: Number(record.otherDeduction ?? record.other_deduction ?? 0),
    totalDeductions: Number(record.totalDeductions ?? record.total_deductions ?? 0),
    netSalary: Number(record.netSalary ?? record.net_salary ?? 0),
    employerPension: Number(record.employerPension ?? record.employer_pension ?? 0),
    employerCost: Number(record.employerCost ?? record.employer_cost ?? 0),
  }
}
