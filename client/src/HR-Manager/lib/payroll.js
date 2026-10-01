import { HR_SETTINGS } from '../data/settingsData'

// ─────────────────────────────────────────────────────────────
// TAX CALCULATION — Ethiopian Income Tax (Proc. No. 1395/2025)
// Tax = (Taxable Income × Bracket Rate) − Deduction
// ─────────────────────────────────────────────────────────────
export function lookupTax(taxable, brackets = HR_SETTINGS.taxBrackets) {
  if (!taxable || taxable <= 0) return 0
  const bracket = brackets.find((b) => taxable >= b.min && taxable <= b.max)
  if (!bracket) return 0
  const tax = taxable * bracket.rate - bracket.deduction
  return Math.max(0, Math.round((tax + Number.EPSILON) * 100) / 100)
}

// Contractual & Intern staff: tax and pension forced to zero per policy
export function isExempt(employmentType) {
  return employmentType === 'Contractual' || employmentType === 'Intern'
}

export function hourlyRate(basicSalary, stdHours = HR_SETTINGS.standardMonthlyHours) {
  if (!basicSalary || basicSalary <= 0) return 0
  return basicSalary / stdHours
}

export function overtimePay(otHours, basicSalary, multiplier = HR_SETTINGS.overtimeMultiplier) {
  if (!otHours || otHours <= 0 || !basicSalary || basicSalary <= 0) return 0
  return Math.round((otHours * hourlyRate(basicSalary) * multiplier + Number.EPSILON) * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// PAYROLL LINE CALCULATION FOR AN EMPLOYEE
// ─────────────────────────────────────────────────────────────
export function calcEmployeePayroll(employee, attendanceSummary = { totalOtHours: 0 }) {
  const {
    basicSalary = 0,
    transportAllowance = 0,
    housingAllowance = 0,
    mealAllowance = 0,
    otherAllowance = 0,
    employmentType = 'Permanent',
    employmentStatus = 'Active',
    otherDeductions = 0,
    loanDeductions = 0,
  } = employee

  const otHours = attendanceSummary?.totalOtHours || 0
  const ot = overtimePay(otHours, basicSalary)
  const exempt = isExempt(employmentType)

  // Allowances are treated as 100% taxable per standard Ethiopian payroll practice
  const totalAllowances =
    (transportAllowance || 0) +
    (housingAllowance || 0) +
    (mealAllowance || 0) +
    (otherAllowance || 0)

  const gross = Math.round((basicSalary + totalAllowances + ot + Number.EPSILON) * 100) / 100
  const taxableIncome = gross

  const incomeTax = exempt ? 0 : lookupTax(taxableIncome)

  // Pension is computed strictly on basic salary, excluding allowances
  const pensionEmployee = exempt ? 0 : Math.round((basicSalary * HR_SETTINGS.pension.employeeRate + Number.EPSILON) * 100) / 100
  const pensionEmployer = exempt ? 0 : Math.round((basicSalary * HR_SETTINGS.pension.employerRate + Number.EPSILON) * 100) / 100
  const totalPension = Math.round((pensionEmployee + pensionEmployer + Number.EPSILON) * 100) / 100

  const totalDeductions = Math.round((incomeTax + pensionEmployee + (otherDeductions || 0) + (loanDeductions || 0) + Number.EPSILON) * 100) / 100
  const netSalary = Math.round((gross - totalDeductions + Number.EPSILON) * 100) / 100

  return {
    employeeId: employee.employeeId,
    name: employee.name,
    department: employee.department,
    employmentType,
    employmentStatus,
    active: employmentStatus === 'Active',
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    totalAllowances,
    otHours,
    otPay: ot,
    gross,
    taxableIncome,
    incomeTax,
    pensionEmployee,
    pensionEmployer,
    totalPension,
    otherDeductions,
    loanDeductions,
    totalDeductions,
    netSalary,
    exempt,
  }
}

export function formatETB(amount, includeCents = true) {
  const val = Number(amount) || 0
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    currencyDisplay: 'code',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0,
  }).format(val)
}

export function formatNumber(val) {
  return new Intl.NumberFormat('en-ET').format(val || 0)
}

export function roundMoney(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
