import { useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react'

const API_BASE = 'http://localhost:4000/api/hr-manager'

const EMPLOYEE_PENSION_RATE = 0.07
const EMPLOYER_PENSION_RATE = 0.11

// Workbook overtime rule:
// Overtime Hours × (Basic Salary ÷ 208) × 1.5
const STANDARD_MONTHLY_HOURS = 208
const OVERTIME_MULTIPLIER = 1.5

const PAYE_BRACKETS = [
  { min: 0, max: 2000, rate: 0, subtraction: 0 },
  { min: 2001, max: 4000, rate: 0.15, subtraction: 300 },
  { min: 4001, max: 7000, rate: 0.2, subtraction: 500 },
  { min: 7001, max: 10000, rate: 0.25, subtraction: 850 },
  { min: 10001, max: 14000, rate: 0.3, subtraction: 1350 },
  { min: 14001, max: Infinity, rate: 0.35, subtraction: 2050 },
]

const ATTENDANCE_CODES = {
  P: 'Present',
  A: 'Absent',
  SL: 'Sick Leave',
  AL: 'Annual Leave',
  ML: 'Maternity Leave',
  OL: 'Other Leave',
  PH: 'Public Holiday',
  WK: 'Weekend',
  HD: 'Half Day',
}

const emptyPayrollForm = {
  payrollMonth: '',
  overtimePay: 0,
  loanDeduction: 0,
  otherDeduction: 0,
}

function formatCurrency(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString()
}

function getMonthRange(month) {
  if (!month) {
    return {
      start: '',
      end: '',
    }
  }

  const [year, monthNumber] = month.split('-').map(Number)

  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 0)

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function getCurrentMonth() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function calculateIncomeTax(taxableIncome) {
  const income = Math.max(0, Number(taxableIncome || 0))

  const bracket =
    PAYE_BRACKETS.find(
      (item) => income >= item.min && income <= item.max,
    ) || PAYE_BRACKETS[PAYE_BRACKETS.length - 1]

  return Math.max(0, income * bracket.rate - bracket.subtraction)
}

function isExcludedFromStatutoryDeductions(employee) {
  const type = String(
    employee?.employmentType ||
      employee?.employment_type ||
      '',
  ).toLowerCase()

  return type === 'contractual' || type === 'intern'
}

function getEmployeeName(employee) {
  if (!employee) return 'Unknown Employee'

  if (employee.name) return employee.name

  const firstName =
    employee.firstName ||
    employee.first_name ||
    ''

  const lastName =
    employee.lastName ||
    employee.last_name ||
    ''

  return `${firstName} ${lastName}`.trim() || 'Unknown Employee'
}

function getEmployeeId(employee) {
  return (
    employee?.id ||
    employee?.employeeId ||
    employee?.employee_id ||
    ''
  )
}

function normalizeEmployee(employee) {
  return {
    ...employee,

    id: employee.id,
    employeeId:
      employee.employeeId ||
      employee.employee_id ||
      employee.id,

    name: getEmployeeName(employee),

    department:
      employee.department ||
      employee.departmentName ||
      employee.department_name ||
      '-',

    position:
      employee.position ||
      employee.jobTitle ||
      employee.job_title ||
      '-',

    employmentType:
      employee.employmentType ||
      employee.employment_type ||
      'Permanent',

    status:
      employee.status ||
      employee.employmentStatus ||
      employee.employment_status ||
      'Active',

    basicSalary: Number(
      employee.basicSalary ??
        employee.basic_salary ??
        employee.salary ??
        0,
    ),

    transportAllowance: Number(
      employee.transportAllowance ??
        employee.transport_allowance ??
        0,
    ),

    housingAllowance: Number(
      employee.housingAllowance ??
        employee.housing_allowance ??
        0,
    ),

    mealAllowance: Number(
      employee.mealAllowance ??
        employee.meal_allowance ??
        0,
    ),

    otherAllowance: Number(
      employee.otherAllowance ??
        employee.other_allowance ??
        0,
    ),
  }
}

function normalizePayroll(record) {
  return {
    ...record,

    id: record.id,

    employeeId:
      record.employeeId ||
      record.employee_id,

    payrollMonth:
      record.payrollMonth ||
      record.payroll_month,

    basicSalary: Number(
      record.basicSalary ??
        record.basic_salary ??
        0,
    ),

    transportAllowance: Number(
      record.transportAllowance ??
        record.transport_allowance ??
        0,
    ),

    housingAllowance: Number(
      record.housingAllowance ??
        record.housing_allowance ??
        0,
    ),

    mealAllowance: Number(
      record.mealAllowance ??
        record.meal_allowance ??
        0,
    ),

    otherAllowance: Number(
      record.otherAllowance ??
        record.other_allowance ??
        0,
    ),

    overtimePay: Number(
      record.overtimePay ??
        record.overtime_pay ??
        0,
    ),

    grossSalary: Number(
      record.grossSalary ??
        record.gross_salary ??
        0,
    ),

    pensionDeduction: Number(
      record.pensionDeduction ??
        record.pension_deduction ??
        0,
    ),

    incomeTax: Number(
      record.incomeTax ??
        record.income_tax ??
        0,
    ),

    loanDeduction: Number(
      record.loanDeduction ??
        record.loan_deduction ??
        0,
    ),

    otherDeduction: Number(
      record.otherDeduction ??
        record.other_deduction ??
        0,
    ),

    totalDeductions: Number(
      record.totalDeductions ??
        record.total_deductions ??
        0,
    ),

    netSalary: Number(
      record.netSalary ??
        record.net_salary ??
        0,
    ),

    employerPension: Number(
      record.employerPension ??
        record.employer_pension ??
        0,
    ),

    employerCost: Number(
      record.employerCost ??
        record.employer_cost ??
        0,
    ),
  }
}

function calculateOvertimePay(basicSalary, overtimeHours) {
  const salary = Number(basicSalary || 0)
  const hours = Number(overtimeHours || 0)

  if (salary <= 0 || hours <= 0) {
    return 0
  }

  const hourlyRate = salary / STANDARD_MONTHLY_HOURS

  return Number(
    (hours * hourlyRate * OVERTIME_MULTIPLIER).toFixed(2),
  )
}

function calculatePreview(employee, form) {
  const basicSalary = Number(employee?.basicSalary || 0)

  const transportAllowance = Number(
    employee?.transportAllowance || 0,
  )

  const housingAllowance = Number(
    employee?.housingAllowance || 0,
  )

  const mealAllowance = Number(
    employee?.mealAllowance || 0,
  )

  const otherAllowance = Number(
    employee?.otherAllowance || 0,
  )

  const overtimePay = Number(form?.overtimePay || 0)

  const loanDeduction = Number(
    form?.loanDeduction || 0,
  )

  const otherDeduction = Number(
    form?.otherDeduction || 0,
  )

  const grossSalary =
    basicSalary +
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance +
    overtimePay

  const excluded =
    isExcludedFromStatutoryDeductions(employee)

  const pensionDeduction = excluded
    ? 0
    : basicSalary * EMPLOYEE_PENSION_RATE

  const taxableIncome = Math.max(
    0,
    grossSalary - pensionDeduction,
  )

  const incomeTax = excluded
    ? 0
    : calculateIncomeTax(taxableIncome)

  const totalDeductions =
    pensionDeduction +
    incomeTax +
    loanDeduction +
    otherDeduction

  const netSalary =
    grossSalary - totalDeductions

  const employerPension = excluded
    ? 0
    : basicSalary * EMPLOYER_PENSION_RATE

  const employerCost =
    grossSalary + employerPension

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

function getAttendanceSummary(attendance) {
  const summary = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    overtimeHours: 0,
    lateMinutes: 0,
  }

  if (!Array.isArray(attendance)) {
    return summary
  }

  attendance.forEach((item) => {
    const code = String(
      item.status ||
        item.attendanceStatus ||
        item.attendance_status ||
        item.code ||
        '',
    ).toUpperCase()

    if (code === 'WK' || code === 'PH') {
      return
    }

    summary.workingDays += 1

    if (code === 'P') {
      summary.presentDays += 1
    }

    if (code === 'A') {
      summary.absentDays += 1
    }

    if (
      ['SL', 'AL', 'ML', 'OL'].includes(code)
    ) {
      summary.leaveDays += 1
    }

    summary.overtimeHours += Number(
      item.overtime ??
        item.overtimeHours ??
        item.overtime_hours ??
        0,
    )

    summary.lateMinutes += Number(
      item.late ??
        item.lateMinutes ??
        item.late_minutes ??
        0,
    )
  })

  return summary
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  step,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  )
}

function PayrollModal({
  employee,
  payroll,
  month,
  attendanceSummary,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    ...emptyPayrollForm,
    payrollMonth:
      payroll?.payrollMonth ||
      month ||
      getCurrentMonth(),

    // Overtime is always calculated from Attendance for the selected month.
    // A saved payroll overtime value must never override fresh attendance data.
    overtimePay: calculateOvertimePay(
      employee?.basicSalary,
      attendanceSummary?.overtimeHours,
    ),

    loanDeduction:
      payroll?.loanDeduction ?? 0,

    otherDeduction:
      payroll?.otherDeduction ?? 0,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const preview = useMemo(
    () => calculatePreview(employee, form),
    [employee, form],
  )

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!employee) {
      setError('Employee information is missing.')
      return
    }

    if (!form.payrollMonth) {
      setError('Payroll month is required.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload = {
        employeeId: getEmployeeId(employee),
        payrollMonth: form.payrollMonth,

        overtimePay: calculateOvertimePay(
          employee.basicSalary,
          attendanceSummary?.overtimeHours,
        ),

        loanDeduction: Number(
          form.loanDeduction || 0,
        ),

        otherDeduction: Number(
          form.otherDeduction || 0,
        ),
      }

      const isEditing = Boolean(payroll?.id)

      const response = await fetch(
        isEditing
          ? `${API_BASE}/payroll/${payroll.id}`
          : `${API_BASE}/payroll`,
        {
          method: isEditing ? 'PUT' : 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify(payload),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Unable to save payroll record.',
        )
      }

      onSaved(normalizePayroll(data))
    } catch (err) {
      console.error('Save payroll error:', err)

      setError(
        err.message ||
          'Unable to save payroll record.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {payroll
                ? 'Edit Payroll'
                : 'Generate Payroll'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {getEmployeeName(employee)}
              {' · '}
              {employee?.department || '-'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <SectionTitle>
              Payroll Period
            </SectionTitle>

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Payroll Month"
                type="month"
                value={form.payrollMonth}
                onChange={(value) =>
                  updateField(
                    'payrollMonth',
                    value,
                  )
                }
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">
                  Attendance Days
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {attendanceSummary.workingDays}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Working days
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">
                  Present / Leave
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {attendanceSummary.presentDays}
                  {' / '}
                  {attendanceSummary.leaveDays}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Present / Leave days
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>
              Additional Payroll Inputs
            </SectionTitle>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">
                  Overtime Hours (Attendance)
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {Number(attendanceSummary?.overtimeHours || 0).toFixed(2)} hrs
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Pulled automatically from Attendance.
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">
                  Overtime Pay (Auto)
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {formatCurrency(
                    calculateOvertimePay(
                      employee?.basicSalary,
                      attendanceSummary?.overtimeHours,
                    ),
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Attendance hours × hourly rate × 1.5.
                </div>
              </div>

              <Field
                label="Loan / Advance Deduction"
                type="number"
                min="0"
                step="0.01"
                value={form.loanDeduction}
                onChange={(value) =>
                  updateField(
                    'loanDeduction',
                    value,
                  )
                }
              />

              <Field
                label="Other Deduction"
                type="number"
                min="0"
                step="0.01"
                value={form.otherDeduction}
                onChange={(value) =>
                  updateField(
                    'otherDeduction',
                    value,
                  )
                }
              />
            </div>
          </div>

          <div>
            <SectionTitle>
              Salary Calculation
            </SectionTitle>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  Basic Salary
                </div>

                <div className="mt-1 font-bold text-slate-900">
                  {formatCurrency(
                    preview.basicSalary,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  Allowances
                </div>

                <div className="mt-1 font-bold text-slate-900">
                  {formatCurrency(
                    preview.transportAllowance +
                      preview.housingAllowance +
                      preview.mealAllowance +
                      preview.otherAllowance,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  Gross Salary
                </div>

                <div className="mt-1 font-bold text-slate-900">
                  {formatCurrency(
                    preview.grossSalary,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-white">
                <div className="text-xs text-slate-300">
                  Net Salary
                </div>

                <div className="mt-1 font-bold">
                  {formatCurrency(
                    preview.netSalary,
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>
              Deductions
            </SectionTitle>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Pension 7%
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.pensionDeduction,
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Income Tax
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.incomeTax,
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Loan / Advance
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.loanDeduction,
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Other
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.otherDeduction,
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              {saving
                ? 'Saving...'
                : payroll
                  ? 'Save Changes'
                  : 'Generate Payroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Payroll() {
  const [payrollMonth, setPayrollMonth] =
    useState(getCurrentMonth)

  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [payroll, setPayroll] = useState([])

  const [loading, setLoading] = useState(true)
  const [payrollLoading, setPayrollLoading] =
    useState(false)

  const [error, setError] = useState('')
  const [payrollError, setPayrollError] =
    useState('')

  const [modalOpen, setModalOpen] =
    useState(false)

  const [selectedEmployee, setSelectedEmployee] =
    useState(null)

  const [selectedPayroll, setSelectedPayroll] =
    useState(null)

  const [generating, setGenerating] =
    useState(false)

  const [deletingId, setDeletingId] =
    useState(null)

  async function loadEmployees() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_BASE}/employees`,
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to load employees.',
        )
      }

      const normalized = Array.isArray(data)
        ? data.map(normalizeEmployee)
        : []

      setEmployees(normalized)
    } catch (err) {
      console.error(
        'Load employees error:',
        err,
      )

      setError(
        err.message ||
          'Unable to load employees.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadAttendance() {
    if (!payrollMonth) return

    const { start, end } =
      getMonthRange(payrollMonth)

    try {
      const response = await fetch(
        `${API_BASE}/attendance?startDate=${start}&endDate=${end}`,
      )

      if (!response.ok) {
        return
      }

      const data = await response.json()

      setAttendance(
        Array.isArray(data) ? data : [],
      )
    } catch (err) {
      console.error(
        'Load attendance error:',
        err,
      )

      setAttendance([])
    }
  }

  /*
   * IMPORTANT:
   * Payroll records are loaded directly from the database.
   *
   * We do NOT rebuild payroll rows from employees here.
   * This is what makes saved payroll survive a page refresh.
   */
  async function loadSavedPayroll() {
    if (!payrollMonth) return

    try {
      setPayrollLoading(true)
      setPayrollError('')

      const response = await fetch(
        `${API_BASE}/payroll?payrollMonth=${encodeURIComponent(
          payrollMonth,
        )}`,
        {
          cache: 'no-store',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to load saved payroll.',
        )
      }

      const records = Array.isArray(data)
        ? data.map(normalizePayroll)
        : []

      setPayroll(records)
    } catch (err) {
      console.error(
        'Load payroll error:',
        err,
      )

      setPayroll([])

      setPayrollError(
        err.message ||
          'Saved payroll records could not be loaded from the database.',
      )
    } finally {
      setPayrollLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    loadAttendance()
  }, [payrollMonth])

  useEffect(() => {
    loadSavedPayroll()
  }, [payrollMonth])

  const activeEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const status = String(
          employee.status || '',
        ).toLowerCase()

        return (
          status === 'active' ||
          status === ''
        )
      }),
    [employees],
  )

  const payrollByEmployee = useMemo(() => {
    const map = new Map()

    payroll.forEach((record) => {
      map.set(
        String(record.employeeId),
        record,
      )
    })

    return map
  }, [payroll])

  const attendanceByEmployee = useMemo(() => {
    const map = new Map()

    employees.forEach((employee) => {
      const ids = [
        employee.id,
        employee.employeeId,
      ].filter(Boolean)

      const records = attendance.filter((item) => {
        const attendanceEmployeeId =
          item.employeeId || item.employee_id

        return ids.some(
          (id) =>
            String(attendanceEmployeeId) ===
            String(id),
        )
      })

      map.set(
        String(getEmployeeId(employee)),
        records,
      )

      if (employee.id) {
        map.set(String(employee.id), records)
      }

      if (employee.employeeId) {
        map.set(String(employee.employeeId), records)
      }
    })

    return map
  }, [employees, attendance])

  const employeeById = useMemo(() => {
    const map = new Map()

    employees.forEach((employee) => {
      map.set(
        String(getEmployeeId(employee)),
        employee,
      )
    })

    return map
  }, [employees])

  const rows = useMemo(() => {
    /*
     * Only saved database payroll records are displayed.
     *
     * Employees without a payroll record are intentionally
     * not inserted automatically. They are added by
     * "Generate Payroll".
     */
    return payroll.map((record) => {
      const employee =
        employeeById.get(
          String(record.employeeId),
        ) || null

      const attendanceForEmployee =
        attendanceByEmployee.get(
          String(record.employeeId),
        ) || []

      return {
        ...record,
        employee,
        attendanceSummary:
          getAttendanceSummary(
            attendanceForEmployee,
          ),
      }
    })
  }, [
    payroll,
    employeeById,
    attendanceByEmployee,
  ])

  const summary = useMemo(() => {
    const totalGross = payroll.reduce(
      (sum, item) =>
        sum + Number(item.grossSalary || 0),
      0,
    )

    const totalDeductions =
      payroll.reduce(
        (sum, item) =>
          sum +
          Number(item.totalDeductions || 0),
        0,
      )

    const totalNet = payroll.reduce(
      (sum, item) =>
        sum + Number(item.netSalary || 0),
      0,
    )

    const totalEmployerCost =
      payroll.reduce(
        (sum, item) =>
          sum +
          Number(item.employerCost || 0),
        0,
      )

    return {
      employees: payroll.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalEmployerCost,
    }
  }, [payroll])

  function openCreateModal(employee) {
    setSelectedEmployee(employee)
    setSelectedPayroll(null)
    setModalOpen(true)
  }

  function openEditModal(record) {
    const employee =
      employeeById.get(
        String(record.employeeId),
      ) || null

    if (!employee) {
      setPayrollError(
        'The employee linked to this payroll record could not be found.',
      )

      return
    }

    setSelectedEmployee(employee)
    setSelectedPayroll(record)
    setModalOpen(true)
  }

  function closeModal() {
    if (generating) return

    setModalOpen(false)
    setSelectedEmployee(null)
    setSelectedPayroll(null)
  }

  async function handleSaved(savedRecord) {
    /*
     * Update local state immediately after a successful
     * POST/PUT. Then reload from the database so the UI
     * and database stay synchronized.
     */
    setPayroll((current) => {
      const exists = current.some(
        (item) => item.id === savedRecord.id,
      )

      if (exists) {
        return current.map((item) =>
          item.id === savedRecord.id
            ? savedRecord
            : item,
        )
      }

      return [...current, savedRecord]
    })

    setModalOpen(false)
    setSelectedEmployee(null)
    setSelectedPayroll(null)

    await loadSavedPayroll()
  }

  async function generateAllPayroll() {
    if (!payrollMonth) {
      setPayrollError(
        'Please select a payroll month.',
      )

      return
    }

    if (!activeEmployees.length) {
      setPayrollError(
        'There are no active employees available for payroll.',
      )

      return
    }

    try {
      setGenerating(true)
      setPayrollError('')

      /*
       * IMPORTANT:
       * Only create records that do not already exist.
       *
       * Existing saved records are never overwritten by
       * a refresh or by Generate Payroll.
       */
      const employeesWithoutPayroll =
        activeEmployees.filter(
          (employee) =>
            !payrollByEmployee.has(
              String(getEmployeeId(employee)),
            ),
        )

      if (
        employeesWithoutPayroll.length === 0
      ) {
        await loadSavedPayroll()
        return
      }

      const results = []

      for (const employee of employeesWithoutPayroll) {
        const response = await fetch(
          `${API_BASE}/payroll`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              employeeId:
                getEmployeeId(employee),

              payrollMonth,

              overtimePay: calculateOvertimePay(
                employee.basicSalary,
                getAttendanceSummary(
                  attendanceByEmployee.get(
                    String(getEmployeeId(employee)),
                  ) || [],
                ).overtimeHours,
              ),

              loanDeduction: 0,

              otherDeduction: 0,
            }),
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              data?.message ||
              `Failed to generate payroll for ${getEmployeeName(
                employee,
              )}.`,
          )
        }

        results.push(normalizePayroll(data))
      }

      setPayroll((current) => [
        ...current,
        ...results,
      ])

      await loadSavedPayroll()
    } catch (err) {
      console.error(
        'Generate payroll error:',
        err,
      )

      setPayrollError(
        err.message ||
          'Unable to generate payroll.',
      )
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(record) {
    const employee =
      employeeById.get(
        String(record.employeeId),
      )

    const employeeName = getEmployeeName(
      employee,
    )

    const confirmed = window.confirm(
      `Delete the payroll record for ${employeeName} for ${record.payrollMonth}?`,
    )

    if (!confirmed) return

    try {
      setDeletingId(record.id)
      setPayrollError('')

      const response = await fetch(
        `${API_BASE}/payroll/${record.id}`,
        {
          method: 'DELETE',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to delete payroll record.',
        )
      }

      setPayroll((current) =>
        current.filter(
          (item) => item.id !== record.id,
        ),
      )

      await loadSavedPayroll()
    } catch (err) {
      console.error(
        'Delete payroll error:',
        err,
      )

      setPayrollError(
        err.message ||
          'Unable to delete payroll record.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  function moveMonth(offset) {
    const [year, month] =
      payrollMonth.split('-').map(Number)

    const next = new Date(
      year,
      month - 1 + offset,
      1,
    )

    setPayrollMonth(
      `${next.getFullYear()}-${String(
        next.getMonth() + 1,
      ).padStart(2, '0')}`,
    )
  }

  async function refreshPayroll() {
    await Promise.all([
      loadEmployees(),
      loadAttendance(),
      loadSavedPayroll(),
    ])
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CircleDollarSign
                size={24}
                className="text-slate-700"
              />

              <h1 className="text-2xl font-bold text-slate-900">
                Payroll Management
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Manage monthly salary calculations,
              deductions, net pay and employer cost.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
              title="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <input
              type="month"
              value={payrollMonth}
              onChange={(event) =>
                setPayrollMonth(
                  event.target.value,
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-500"
            />

            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
              title="Next month"
            >
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              onClick={refreshPayroll}
              disabled={loading || payrollLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  payrollLoading
                    ? 'animate-spin'
                    : ''
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={generateAllPayroll}
              disabled={
                generating ||
                payrollLoading ||
                loading
              }
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Calculator size={17} />
              )}

              {generating
                ? 'Generating...'
                : 'Generate Payroll'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {payrollError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {payrollError}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Payroll Employees
              </div>

              <Users
                size={19}
                className="text-slate-400"
              />
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {summary.employees}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Gross Payroll
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(
                summary.totalGross,
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Total Deductions
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(
                summary.totalDeductions,
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Net Payroll
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(
                summary.totalNet,
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Employer Cost
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(
                summary.totalEmployerCost,
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Payroll Rules
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current payroll calculations used by
                the HR payroll module.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                Employee Pension: 7%
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                Employer Pension: 11%
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                Contractual / Intern: Excluded
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                Overtime: Hours ÷ 208 × 1.5
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">
                    Taxable Income
                  </th>

                  <th className="px-3 py-2">
                    Rate
                  </th>

                  <th className="px-3 py-2">
                    Subtraction
                  </th>
                </tr>
              </thead>

              <tbody>
                {PAYE_BRACKETS.map(
                  (bracket, index) => (
                    <tr
                      key={`${bracket.min}-${index}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2 text-slate-700">
                        {bracket.max ===
                        Infinity
                          ? `${formatCurrency(
                              bracket.min,
                            )}+`
                          : `${formatCurrency(
                              bracket.min,
                            )} – ${formatCurrency(
                              bracket.max,
                            )}`}
                      </td>

                      <td className="px-3 py-2 font-medium text-slate-900">
                        {bracket.rate * 100}%
                      </td>

                      <td className="px-3 py-2 text-slate-700">
                        {formatCurrency(
                          bracket.subtraction,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Payroll Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Saved payroll records for{' '}
                <span className="font-medium text-slate-700">
                  {payrollMonth}
                </span>
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <span
                className={`h-2 w-2 rounded-full ${
                  payrollLoading
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
              />

              {payrollLoading
                ? 'Loading database...'
                : 'Database connected'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">
                    Employee
                  </th>

                  <th className="px-4 py-3">
                    Department
                  </th>

                  <th className="px-4 py-3 text-right">
                    Basic
                  </th>

                  <th className="px-4 py-3 text-right">
                    Allowances
                  </th>

                  <th className="px-4 py-3 text-right">
                    OT Hours
                  </th>

                  <th className="px-4 py-3 text-right">
                    Gross
                  </th>

                  <th className="px-4 py-3 text-right">
                    Pension
                  </th>

                  <th className="px-4 py-3 text-right">
                    Tax
                  </th>

                  <th className="px-4 py-3 text-right">
                    Deductions
                  </th>

                  <th className="px-4 py-3 text-right">
                    Net Salary
                  </th>

                  <th className="px-4 py-3 text-right">
                    Employer Cost
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ||
                payrollLoading ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-6 py-12 text-center"
                    >
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Loading payroll records...
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-6 py-14 text-center"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <CircleDollarSign
                          size={36}
                          className="text-slate-300"
                        />

                        <h3 className="mt-3 font-semibold text-slate-800">
                          No saved payroll records
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Generate payroll for this
                          month to create the database
                          records.
                        </p>

                        <button
                          type="button"
                          onClick={
                            generateAllPayroll
                          }
                          disabled={generating}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          <Calculator size={16} />

                          Generate Payroll
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const employee =
                      row.employee

                    const attendanceSummary =
                      row.attendanceSummary ||
                      {}

                    const allowanceTotal =
                      Number(
                        row.transportAllowance ||
                          0,
                      ) +
                      Number(
                        row.housingAllowance ||
                          0,
                      ) +
                      Number(
                        row.mealAllowance || 0,
                      ) +
                      Number(
                        row.otherAllowance || 0,
                      )

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {getEmployeeName(
                              employee,
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {employee?.employeeId ||
                              row.employeeId ||
                              '-'}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {employee?.department ||
                            '-'}
                        </td>

                        <td className="px-4 py-4 text-right font-medium text-slate-700">
                          {formatCurrency(
                            row.basicSalary,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-700">
                          {formatCurrency(
                            allowanceTotal,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-700">
                          <div className="inline-flex items-center gap-1">
                            <Clock3
                              size={14}
                              className="text-slate-400"
                            />

                            {Number(
                              attendanceSummary.overtimeHours ||
                                0,
                            ).toFixed(2)}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(
                            row.grossSalary,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-700">
                          {formatCurrency(
                            row.pensionDeduction,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-700">
                          {formatCurrency(
                            row.incomeTax,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-700">
                          {formatCurrency(
                            row.totalDeductions,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-slate-900">
                          {formatCurrency(
                            row.netSalary,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-slate-700">
                          {formatCurrency(
                            row.employerCost,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Saved
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  row,
                                )
                              }
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit payroll"
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  row,
                                )
                              }
                              disabled={
                                deletingId ===
                                row.id
                              }
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                              title="Delete payroll"
                            >
                              {deletingId ===
                              row.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={16}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Clock3 size={17} />
              Attendance
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Attendance overtime hours are pulled for
              the selected month and used to calculate
              overtime pay automatically.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Calculator size={17} />
              Calculation
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Gross salary includes basic salary,
              allowances and automatically calculated
              overtime pay from Attendance.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Save size={17} />
              Database
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Saved payroll records are loaded from
              PostgreSQL whenever the page is refreshed.
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <PayrollModal
          employee={selectedEmployee}
          payroll={selectedPayroll}
          month={payrollMonth}
          attendanceSummary={getAttendanceSummary(
            selectedEmployee
              ? attendanceByEmployee.get(
                  String(
                    getEmployeeId(
                      selectedEmployee,
                    ),
                  ),
                ) || []
              : [],
          )}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}