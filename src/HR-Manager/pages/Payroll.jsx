import { useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  Edit3,
  FileText,
  Search,
  Users,
  X,
} from 'lucide-react'

const API_BASE = 'http://localhost:4000/api/hr-manager'

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
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search employee, ID or department..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={department}
            onChange={(event) =>
              setDepartment(
                event.target.value,
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {departments.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">
                Employee Payroll
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredPayroll.length}{' '}
                employee(s) shown
              </p>
            </div>

            <div className="text-xs font-medium text-slate-500">
              <span>
                Period: {payrollMonth}
              </span>

              {attendanceLoading && (
                <span className="ml-3 text-blue-600">
                  Loading attendance...
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1700px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4">
                    Employee
                  </th>

                  <th className="px-4 py-4">
                    Working
                  </th>

                  <th className="px-4 py-4">
                    Present
                  </th>

                  <th className="px-4 py-4">
                    Absent
                  </th>

                  <th className="px-4 py-4">
                    Leave
                  </th>

                  <th className="px-4 py-4">
                    OT Hours
                  </th>

                  <th className="px-4 py-4">
                    Basic
                  </th>

                  <th className="px-4 py-4">
                    Transport
                  </th>

                  <th className="px-4 py-4">
                    Housing
                  </th>

                  <th className="px-4 py-4">
                    Meal
                  </th>

                  <th className="px-4 py-4">
                    Other
                  </th>

                  <th className="px-4 py-4">
                    Overtime
                  </th>

                  <th className="px-4 py-4">
                    Gross
                  </th>

                  <th className="px-4 py-4">
                    Deductions
                  </th>

                  <th className="px-4 py-4">
                    Net Salary
                  </th>

                  <th className="px-4 py-4">
                    Employer Cost
                  </th>

                  <th className="px-4 py-4 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="17"
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      Loading employees from database...
                    </td>
                  </tr>
                ) : (
                  filteredPayroll.map(
                    (record) => {
                      const calculation =
                        calculatePayroll(
                          record,
                        )

                      return (
                        <tr
                          key={
                            record.employeeKey
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                                {
                                  record.initials
                                }
                              </div>

                              <div>
                                <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                                  {
                                    record.employeeName
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  {
                                    record.employeeId
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                            {
                              record.workingDays
                            }
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
                            {
                              record.presentDays
                            }
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-red-600">
                            {
                              record.absentDays
                            }
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                            {
                              record.leaveDays
                            }
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                            {Number(
                              record.overtimeHours ||
                                0,
                            ).toFixed(2)}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.basicSalary,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.transportAllowance,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.housingAllowance,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.mealAllowance,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.otherAllowance,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.overtime,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              calculation.gross,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-red-600">
                            {formatCurrency(
                              calculation.deductions,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-bold text-emerald-600">
                            {formatCurrency(
                              calculation.netSalary,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              calculation.employerCost,
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingRecord(
                                  record,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    },
                  )
                )}
              </tbody>
            </table>
          </div>

          {!loading &&
            filteredPayroll.length ===
              0 && (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" />

                <h3 className="mt-3 font-semibold text-slate-900">
                  No payroll records found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search or department filter.
                </p>
              </div>
            )}
        </div>

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