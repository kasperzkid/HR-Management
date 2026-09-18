// ─────────────────────────────────────────────────────────────
// SETTINGS — single source of truth for config (mirrors the
// workbook "Settings" sheet). Changing values here is intended to
// be the only edit needed when law changes.
//
// NOTE: figures are from the reference workbook and should be
// verified against the official Negarit Gazeta before live use.
// ─────────────────────────────────────────────────────────────

export const SETTINGS = {
  company: {
    name: 'YANOLTECH SOLUTIONS PLC',
    shortName: 'YANOLTECH',
    address: 'Bole sub,w07,A.A, Ethiopia',
    phone: '0942497990',
    email: 'payroll@yanol.com',
    tin: '',
  },

  standardMonthlyHours: 208, // 26 working days × 8 hrs

  // Income tax brackets (Monthly, ETB) — Proclamation No. 1395/2025
  taxBrackets: [
    { min: 0, max: 2000, rate: 0, deduction: 0 },
    { min: 2001, max: 4000, rate: 0.15, deduction: 300 },
    { min: 4001, max: 7000, rate: 0.2, deduction: 500 },
    { min: 7001, max: 10000, rate: 0.25, deduction: 850 },
    { min: 10001, max: 14000, rate: 0.3, deduction: 1350 },
    { min: 14001, max: Infinity, rate: 0.35, deduction: 2050 },
  ],

  // Pension — on basic salary only
  pension: {
    employeeRate: 0.07, // 7%
    employerRate: 0.11, // 11%
  },

  // Overtime — single flat multiplier (simplification per source).
  // Real law (Art. 68, Proc. 1156/2019):
  //   1.25x normal daytime, 1.5x night/weekly-rest-day, 2.0x public holiday
  overtimeMultiplier: 1.25,
  overtimeTiers: [
    { label: 'Normal daytime', multiplier: 1.25 },
    { label: 'Night / weekly rest day', multiplier: 1.5 },
    { label: 'Public holiday', multiplier: 2.0 },
  ],

  // Annual leave accrual
  leave: {
    baseEntitlement: 16, // days per year
    extraDayPerFullYears: 2, // 1 extra day per 2 full years
    sickDaysPerYear: 10,
  },

  departments: [
    'Engineering',
    'Design',
    'Human Resources',
    'Finance & Accounting',
    'Sales & Marketing',
    'Operations',
  ],

  employmentTypes: ['Permanent', 'Contractual', 'Intern'],
  employmentStatuses: ['Active', 'On Leave', 'Resigned', 'Terminated'],
  leaveTypes: ['Annual', 'Sick', 'Maternity', 'Paternity', 'Unpaid', 'Study'],
  attendanceStatuses: ['Present', 'Absent', 'Sick Leave', 'On Leave'],
  approvalStatuses: ['Pending', 'Approved', 'Rejected'],
  genders: ['Male', 'Female'],
}

export const ALLOWANCE_FIELDS = [
  { key: 'transportAllowance', label: 'Transport', taxable: true },
  { key: 'housingAllowance', label: 'Housing', taxable: true },
  { key: 'mealAllowance', label: 'Meal', taxable: true },
  { key: 'otherAllowance', label: 'Other', taxable: true },
]

export const DEDUCTION_TYPES = ['Other', 'Loan']

export function getDefaultSettings() {
  return JSON.parse(JSON.stringify(SETTINGS))
}