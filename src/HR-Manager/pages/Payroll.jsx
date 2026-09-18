import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '../../lib/hrApi'
import {
  Calculator,
  Edit3,
  FileText,
  Users,
  X,
} from 'lucide-react'
import LuxuryDataTable from '../components/LuxuryDataTable'

const selectClass =
  'h-9 pl-2.5 pr-7 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium'

const API_BASE = '/api/hr-manager'

const PENSION_RATE = 0.07
const EMPLOYER_PENSION_RATE = 0.11

const ATTENDANCE_CODES = {
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

function getEmployeeName(employee) {
  if (employee.name) {
    return employee.name
  }

  return [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(' ')
}

function getEmployeeId(employee, index) {
  return (
    employee.employeeId ||
    employee.id ||
    `EMP-${String(index + 1).padStart(3, '0')}`
  )
}

function getSalary(employee) {
  const salary = Number(
    employee.basicSalary ??
      employee.salary ??
      0,
  )

  return Number.isFinite(salary) ? salary : 0
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function getMonthRange(monthValue) {
  const [year, month] = monthValue
    .split('-')
    .map(Number)

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`

  const lastDay = new Date(
    year,
    month,
    0,
  ).getDate()

  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(
    lastDay,
  ).padStart(2, '0')}`

  return {
    startDate,
    endDate,
  }
}

function createPayrollRecord(employee, index) {
  const basicSalary = getSalary(employee)
  const employeeName = getEmployeeName(employee)

  return {
    employeeKey:
      employee.id ||
      employee.employeeId ||
      index,

    employeeDbId:
      employee.id ||
      employee.employeeId ||
      '',

    employeeId: getEmployeeId(
      employee,
      index,
    ),

    employeeName,

    initials: getInitials(
      employeeName,
    ),

    department:
      employee.department ||
      'Unassigned',

    basicSalary,

    transportAllowance:
      Number(
        employee.transportAllowance,
      ) || 0,

    housingAllowance:
      Number(
        employee.housingAllowance,
      ) || 0,

    mealAllowance:
      Number(
        employee.mealAllowance,
      ) || 0,

    otherAllowance:
      Number(
        employee.otherAllowance,
      ) || 0,

    overtime: 0,

    overtimeHours: 0,

    lateMinutes: 0,

    workingDays: 0,

    presentDays: 0,

    absentDays: 0,

    leaveDays: 0,

    pension: Number(
      (
        basicSalary *
        PENSION_RATE
      ).toFixed(2),
    ),

    incomeTax: 0,

    loanAdvance:
      Number(
        employee.loanDeductions,
      ) || 0,

    otherDeduction:
      Number(
        employee.otherDeductions,
      ) || 0,
  }
}

function calculatePayroll(record) {
  const gross =
    Number(record.basicSalary || 0) +
    Number(record.transportAllowance || 0) +
    Number(record.housingAllowance || 0) +
    Number(record.mealAllowance || 0) +
    Number(record.otherAllowance || 0) +
    Number(record.overtime || 0)

  const deductions =
    Number(record.pension || 0) +
    Number(record.incomeTax || 0) +
    Number(record.loanAdvance || 0) +
    Number(record.otherDeduction || 0)

  const netSalary =
    gross - deductions

  const employerPension =
    Number(record.basicSalary || 0) *
    EMPLOYER_PENSION_RATE

  const employerCost =
    gross + employerPension

  return {
    gross,
    deductions,
    netSalary,
    employerPension,
    employerCost,
  }
}

function getAttendanceSummary(records) {
  const summary = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    overtimeHours: 0,
    lateMinutes: 0,
  }

  for (const record of records) {
    const status =
      String(record.status || '')
        .trim()
        .toUpperCase()

    if (status !== ATTENDANCE_CODES.WEEKEND) {
      summary.workingDays += 1
    }

    if (
      status ===
      ATTENDANCE_CODES.PRESENT
    ) {
      summary.presentDays += 1
    }

    if (
      status ===
      ATTENDANCE_CODES.ABSENT
    ) {
      summary.absentDays += 1
    }

    if (LEAVE_CODES.has(status)) {
      summary.leaveDays += 1
    }

    summary.overtimeHours +=
      Number(record.overtime) || 0

    summary.lateMinutes +=
      Number(record.late) || 0
  }

  return {
    ...summary,
    overtimeHours: Number(
      summary.overtimeHours.toFixed(2),
    ),
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function PayrollModal({
  record,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    ...record,
  })

  function updateField(
    field,
    value,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const numericFields = [
      'basicSalary',
      'transportAllowance',
      'housingAllowance',
      'mealAllowance',
      'otherAllowance',
      'overtime',
      'pension',
      'incomeTax',
      'loanAdvance',
      'otherDeduction',
    ]

    const cleaned = {
      ...form,
    }

    numericFields.forEach(
      (field) => {
        cleaned[field] =
          Number(form[field]) || 0
      },
    )

    onSave(cleaned)
  }

  const calculation =
    calculatePayroll(form)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Edit Payroll
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {record.employeeName} ·{' '}
              {record.employeeId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Earnings
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['basicSalary', 'Basic Salary'],
                [
                  'transportAllowance',
                  'Transport Allowance',
                ],
                [
                  'housingAllowance',
                  'Housing Allowance',
                ],
                [
                  'mealAllowance',
                  'Meal Allowance',
                ],
                [
                  'otherAllowance',
                  'Other Allowance',
                ],
                [
                  'overtime',
                  'Overtime',
                ],
              ].map(
                ([field, label]) => (
                  <div key={field}>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {label}
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form[field]
                      }
                      onChange={(event) =>
                        updateField(
                          field,
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ),
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Attendance Summary
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Working Days
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {record.workingDays}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Present Days
                </p>

                <p className="mt-1 text-lg font-bold text-emerald-600">
                  {record.presentDays}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Absent Days
                </p>

                <p className="mt-1 text-lg font-bold text-red-600">
                  {record.absentDays}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Leave Days
                </p>

                <p className="mt-1 text-lg font-bold text-blue-600">
                  {record.leaveDays}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Overtime Hours
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {record.overtimeHours}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Late Minutes
                </p>

                <p className="mt-1 text-lg font-bold text-amber-600">
                  {record.lateMinutes}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Deductions
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['pension', 'Pension'],
                ['incomeTax', 'Income Tax'],
                [
                  'loanAdvance',
                  'Loan / Advance',
                ],
                [
                  'otherDeduction',
                  'Other Deduction',
                ],
              ].map(
                ([field, label]) => (
                  <div key={field}>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {label}
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form[field]
                      }
                      onChange={(event) =>
                        updateField(
                          field,
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Payroll Calculation
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">
                  Gross Salary
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {formatCurrency(
                    calculation.gross,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Total Deductions
                </p>

                <p className="mt-1 text-lg font-bold text-red-600">
                  {formatCurrency(
                    calculation.deductions,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Net Salary
                </p>

                <p className="mt-1 text-lg font-bold text-emerald-600">
                  {formatCurrency(
                    calculation.netSalary,
                  )}
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-slate-700 dark:text-gray-300 shadow-2xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 cursor-pointer"
            >
              Save Payroll
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Payroll() {
  const [employees, setEmployees] =
    useState([])

  const [attendance, setAttendance] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [attendanceLoading, setAttendanceLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [attendanceError, setAttendanceError] =
    useState('')

  const [payroll, setPayroll] =
    useState([])

  const [search, setSearch] =
    useState('')

  const [department, setDepartment] =
    useState('All Departments')

  const [payrollMonth, setPayrollMonth] =
    useState(() => {
      const date = new Date()

      return `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`
    })

  const [editingRecord, setEditingRecord] =
    useState(null)

  useEffect(() => {
    async function loadEmployees() {
      try {
        setLoading(true)
        setError('')

        const response =
          await fetch(
            `${API_BASE}/employees`,
            {
              headers: authHeaders(),
            },
          )

        if (!response.ok) {
          throw new Error(
            'Failed to load employees',
          )
        }

        const data =
          await response.json()

        setEmployees(
          Array.isArray(data)
            ? data
            : [],
        )
      } catch (loadError) {
        console.error(
          'Load employees error:',
          loadError,
        )

        setError(
          'Unable to load employees from the database.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadEmployees()
  }, [])

  useEffect(() => {
    async function loadAttendance() {
      if (!payrollMonth) {
        return
      }

      try {
        setAttendanceLoading(true)
        setAttendanceError('')

        const {
          startDate,
          endDate,
        } = getMonthRange(
          payrollMonth,
        )

        const response =
          await fetch(
            `${API_BASE}/attendance?startDate=${startDate}&endDate=${endDate}`,
            {
              headers: authHeaders(),
            },
          )

        if (!response.ok) {
          throw new Error(
            'Failed to load attendance',
          )
        }

        const data =
          await response.json()

        setAttendance(
          Array.isArray(data)
            ? data
            : [],
        )
      } catch (loadError) {
        console.error(
          'Load attendance error:',
          loadError,
        )

        setAttendance([])

        setAttendanceError(
          'Attendance data could not be loaded for this payroll period.',
        )
      } finally {
        setAttendanceLoading(false)
      }
    }

    loadAttendance()
  }, [payrollMonth])

  const departments = useMemo(() => {
    return [
      'All Departments',
      ...Array.from(
        new Set(
          employees
            .map(
              (employee) =>
                employee.department,
            )
            .filter(Boolean),
        ),
      ),
    ]
  }, [employees])

  useEffect(() => {
    const attendanceByEmployee =
      new Map()

    for (const record of attendance) {
      const employeeId =
        String(
          record.employeeId || '',
        )

      if (!employeeId) {
        continue
      }

      if (
        !attendanceByEmployee.has(
          employeeId,
        )
      ) {
        attendanceByEmployee.set(
          employeeId,
          [],
        )
      }

      attendanceByEmployee
        .get(employeeId)
        .push(record)
    }

    const nextPayroll =
      employees.map(
        (employee, index) => {
          const record =
            createPayrollRecord(
              employee,
              index,
            )

          const employeeDatabaseId =
            String(
              employee.id || '',
            )

          const employeeBusinessId =
            String(
              employee.employeeId ||
                '',
            )

          const employeeAttendance =
            attendance.filter(
              (item) => {
                const attendanceEmployeeId =
                  String(
                    item.employeeId ||
                      '',
                  )

                return (
                  attendanceEmployeeId ===
                    employeeDatabaseId ||
                  attendanceEmployeeId ===
                    employeeBusinessId
                )
              },
            )

          const summary =
            getAttendanceSummary(
              employeeAttendance,
            )

          return {
            ...record,

            workingDays:
              summary.workingDays,

            presentDays:
              summary.presentDays,

            absentDays:
              summary.absentDays,

            leaveDays:
              summary.leaveDays,

            overtimeHours:
              summary.overtimeHours,

            lateMinutes:
              summary.lateMinutes,

            overtime:
              0,
          }
        },
      )

    setPayroll(nextPayroll)
  }, [
    employees,
    attendance,
    payrollMonth,
  ])

  const filteredPayroll =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase()

      return payroll.filter(
        (record) => {
          const matchesSearch =
            !query ||
            record.employeeName
              .toLowerCase()
              .includes(query) ||
            record.employeeId
              .toLowerCase()
              .includes(query) ||
            record.department
              .toLowerCase()
              .includes(query)

          const matchesDepartment =
            department ===
              'All Departments' ||
            record.department ===
              department

          return (
            matchesSearch &&
            matchesDepartment
          )
        },
      )
    }, [
      payroll,
      search,
      department,
    ])

  const summary = useMemo(() => {
    return payroll.reduce(
      (total, record) => {
        const calculation =
          calculatePayroll(record)

        return {
          employees:
            total.employees + 1,

          gross:
            total.gross +
            calculation.gross,

          deductions:
            total.deductions +
            calculation.deductions,

          net:
            total.net +
            calculation.netSalary,

          employerCost:
            total.employerCost +
            calculation.employerCost,

          overtimeHours:
            total.overtimeHours +
            Number(
              record.overtimeHours || 0,
            ),

          lateMinutes:
            total.lateMinutes +
            Number(
              record.lateMinutes || 0,
            ),
        }
      },
      {
        employees: 0,
        gross: 0,
        deductions: 0,
        net: 0,
        employerCost: 0,
        overtimeHours: 0,
        lateMinutes: 0,
      },
    )
  }, [payroll])

  function savePayroll(updatedRecord) {
    setPayroll((current) =>
      current.map((record) =>
        record.employeeKey ===
        updatedRecord.employeeKey
          ? updatedRecord
          : record,
      ),
    )

    setEditingRecord(null)
  }

  function resetFilters() {
    setSearch('')
    setDepartment('All Departments')
  }

  const columns = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (record) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-[#1c2026] dark:text-gray-300">
            {record.initials}
          </div>

          <div>
            <p className="whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-gray-100">
              {record.employeeName}
            </p>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
              {record.employeeId}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'workingDays',
      header: 'Working',
      render: (record) => (
        <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">
          {record.workingDays}
        </span>
      ),
    },
    {
      key: 'presentDays',
      header: 'Present',
      render: (record) => (
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {record.presentDays}
        </span>
      ),
    },
    {
      key: 'absentDays',
      header: 'Absent',
      render: (record) => (
        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
          {record.absentDays}
        </span>
      ),
    },
    {
      key: 'leaveDays',
      header: 'Leave',
      render: (record) => (
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {record.leaveDays}
        </span>
      ),
    },
    {
      key: 'overtimeHours',
      header: 'OT Hours',
      render: (record) => (
        <span className="text-sm font-semibold text-slate-700 dark:text-gray-300 tabular-nums">
          {Number(record.overtimeHours || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'basicSalary',
      header: 'Basic',
      align: 'right',
      render: (record) => (
        <span className="text-sm text-slate-700 dark:text-gray-300 tabular-nums">
          {formatCurrency(record.basicSalary)}
        </span>
      ),
    },
    {
      key: 'transportAllowance',
      header: 'Transport',
      align: 'right',
      render: (record) => (
        <span className="text-sm text-slate-700 dark:text-gray-300 tabular-nums">
          {formatCurrency(record.transportAllowance)}
        </span>
      ),
    },
    {
      key: 'housingAllowance',
      header: 'Housing',
      align: 'right',
      render: (record) => (
        <span className="text-sm text-slate-700 dark:text-gray-300 tabular-nums">
          {formatCurrency(record.housingAllowance)}
        </span>
      ),
    },
    {
      key: 'mealAllowance',
      header: 'Meal',
      align: 'right',
      render: (record) => (
        <span className="text-sm text-slate-700 dark:text-gray-300 tabular-nums">
          {formatCurrency(record.mealAllowance)}
        </span>
      ),
    },
    {
      key: 'otherAllowance',
      header: 'Other',
      align: 'right',
      render: (record) => (
        <span className="text-sm text-slate-700 dark:text-gray-300 tabular-nums">
          {formatCurrency(record.otherAllowance)}
        </span>
      ),
    },
    {
      key: 'overtime',
      header: 'Overtime',
      align: 'right',
      render: (record) => (
        <span className="text-sm text-slate-700 dark:text-gray-300 tabular-nums">
          {formatCurrency(record.overtime)}
        </span>
      ),
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      render: (record) => (
        <span className="text-sm font-semibold text-slate-900 dark:text-gray-100 tabular-nums">
          {formatCurrency(calculatePayroll(record).gross)}
        </span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      render: (record) => (
        <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
          {formatCurrency(calculatePayroll(record).deductions)}
        </span>
      ),
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      align: 'right',
      render: (record) => (
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {formatCurrency(calculatePayroll(record).netSalary)}
        </span>
      ),
    },
    {
      key: 'employerCost',
      header: 'Employer Cost',
      align: 'right',
      render: (record) => (
        <span className="text-sm font-semibold text-slate-900 dark:text-gray-100 tabular-nums">
          {formatCurrency(calculatePayroll(record).employerCost)}
        </span>
      ),
    },
  ]

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              HR Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Payroll Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review employee earnings, deductions and net salary.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <FileText className="h-5 w-5 text-slate-500" />

            <div>
              <p className="text-xs text-slate-400">
                Payroll Period
              </p>

              <input
                type="month"
                value={payrollMonth}
                onChange={(event) =>
                  setPayrollMonth(
                    event.target.value,
                  )
                }
                className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {attendanceError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {attendanceError}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Employees"
            value={summary.employees}
            description="Employees in payroll"
          />

          <StatCard
            icon={Calculator}
            label="Gross Payroll"
            value={formatCurrency(
              summary.gross,
            )}
            description="Total employee earnings"
          />

          <StatCard
            icon={FileText}
            label="Deductions"
            value={formatCurrency(
              summary.deductions,
            )}
            description="Total employee deductions"
          />

          <StatCard
            icon={Users}
            label="Net Payroll"
            value={formatCurrency(
              summary.net,
            )}
            description="Total amount payable"
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Overtime Hours
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {summary.overtimeHours.toFixed(
                2,
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              From saved attendance records
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Late Minutes
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {summary.lateMinutes}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              From saved attendance records
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-2xs transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <LuxuryDataTable
          title="Employee Payroll"
          subtitle={`${filteredPayroll.length} employee(s) shown · Period: ${payrollMonth}`}
          countBadge={filteredPayroll.length}
          columns={columns}
          data={filteredPayroll}
          searchable
          searchKeys={['employeeName', 'employeeId', 'department']}
          searchPlaceholder="Search by employee name, ID or department..."
          exportable
          exportFilename="HR_Payroll"
          paginated
          defaultPageSize={10}
          loading={loading}
          emptyMessage="No payroll records found for this period."
          onResetFilters={resetFilters}
          filterControls={
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Department:
              </span>

              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className={selectClass}
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          }
          headerActions={
            <div className="flex flex-wrap items-center gap-2.5">
              {attendanceLoading && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  Loading attendance...
                </span>
              )}
            </div>
          }
          primaryAction={{
            label: 'Edit Payroll',
            icon: Edit3,
            onClick: (record) => setEditingRecord(record),
          }}
        />

        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex gap-3">
            <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                Payroll calculation — Phase 2
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Payroll now reads employee and attendance data from the
                shared database. Attendance summaries include working,
                present, absent and leave days, overtime hours and late
                minutes. Ethiopian statutory tax, pension, taxable
                benefits and final payroll compliance rules will be
                implemented in the business-logic phase.
              </p>
            </div>
          </div>
        </div>
      </div>

      {editingRecord && (
        <PayrollModal
          record={editingRecord}
          onClose={() =>
            setEditingRecord(null)
          }
          onSave={savePayroll}
        />
      )}
    </div>
  )
}

export default Payroll