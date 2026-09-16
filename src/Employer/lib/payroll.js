import { SETTINGS } from '../data/settingsData'

// ─────────────────────────────────────────────────────────────
// TAX BRACKETS (Monthly, ETB) — Proclamation No. 1395/2025
// Tax = Taxable × Rate − Deduction
// ─────────────────────────────────────────────────────────────
export const TAX_BRACKETS = SETTINGS.taxBrackets

export function lookupTax(taxable, brackets = TAX_BRACKETS) {
  if (taxable <= 0) return 0
  const bracket = brackets.find((b) => taxable >= b.min && taxable <= b.max)
  if (!bracket) return 0
  return taxable * bracket.rate - bracket.deduction
}

// Employment types that are force-exempt from tax & pension per company policy
export function isExempt(employmentType) {
  return employmentType === 'Contractual' || employmentType === 'Intern'
}

export function hourlyRate(basic, stdHours = SETTINGS.standardMonthlyHours) {
  return basic / stdHours
}

// Single flat multiplier default (simplification per source workbook).
// Real law (Art. 68, Proc. 1156/2019) has three tiers — see SETTINGS.overtimeTiers.
export function overtimePay(otHours, basic, multiplier) {
  const m = multiplier ?? SETTINGS.overtimeMultiplier
  return otHours * hourlyRate(basic) * m
}

// ─────────────────────────────────────────────────────────────
// FULL EMPLOYEE PAYROLL CALCULATION
// ─────────────────────────────────────────────────────────────
export function calcPayroll(employee, attendance) {
  const {
    basicSalary = 0,
    transportAllowance = 0,
    housingAllowance = 0,
    mealAllowance = 0,
    otherAllowance = 0,
    employmentType = 'Permanent',
  } = employee

  const otHours = attendance?.totalOtHours ?? 0
  const exempt = isExempt(employmentType)

  const gross =
    basicSalary +
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance +
    overtimePay(otHours, basicSalary)

  // Allowances treated as 100% taxable by default
  const taxableIncome = gross

  const incomeTax = exempt ? 0 : lookupTax(taxableIncome)

  // Pension computed on basic salary only
  const employeePension = exempt ? 0 : basicSalary * SETTINGS.pension.employeeRate
  const employerPension = exempt ? 0 : basicSalary * SETTINGS.pension.employerRate

  const otherDeductions = employee.otherDeductions ?? 0
  const loanDeductions = employee.loanDeductions ?? 0
  const totalDeductions = incomeTax + employeePension + otherDeductions + loanDeductions

  const netSalary = gross - totalDeductions

  return {
    employeeId: employee.employeeId,
    name: employee.name,
    department: employee.department,
    employmentType,
    status: employee.employmentStatus ?? employee.status,
    active: (employee.employmentStatus ?? employee.status) === 'Active',
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    otHours,
    otRate: hourlyRate(basicSalary),
    otPay: overtimePay(otHours, basicSalary),
    gross,
    taxableIncome,
    incomeTax,
    pensionEmployee: employeePension,
    pensionEmployer: employerPension,
    otherDeductions,
    loanDeductions,
    totalDeductions,
    netSalary,
    exempt,
  }
}

// ─────────────────────────────────────────────────────────────
// REVERSE CALCULATOR: desired net → required basic salary
// Walks back through the tax brackets and pension rate.
// Assumes no allowances, no OT, Permanent employee.
// ─────────────────────────────────────────────────────────────
export function netToBasic(desiredNet) {
  const { employeeRate } = SETTINGS.pension

  // Given a candidate basic salary (no allowances, no OT), compute net:
  //   gross = basic, net = gross − tax(gross) − gross × employeeRate
  const netFor = (basic) => basic - lookupTax(basic) - basic * employeeRate

  // Upper bound: basic where tax is at max bracket + enough headroom
  let low = 0
  let high = Math.max(desiredNet * 4, 200000)
  let guess = high

  for (let i = 0; i < 120; i += 1) {
    const candidate = (low + high) / 2
    const net = netFor(candidate)
    if (Math.abs(net - desiredNet) < 0.5) {
      guess = candidate
      return roundMoney(guess)
    }
    if (net < desiredNet) low = candidate
    else high = candidate
  }
  return roundMoney(guess)
}

export function formatETB(amount) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function roundMoney(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}