import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Download,
  FileText,
  Users,
} from 'lucide-react'

import { PageTitle } from '../../components/ui'

const API_URL = 'http://localhost:4000/api/hr-manager'

const EMPLOYMENT_TYPES = [
  'All Employment Types',
  'Permanent',
  'Contractual',
  'Intern',
]

const STATUSES = [
  'All Statuses',
  'Active',
  'On Leave',
  'Resigned',
]

function getEmployeeName(employee) {
  return employee.name || 'Unnamed Employee'
}

function getEmployeeId(employee) {
  return employee.employeeId || employee.id || 'N/A'
}

function getDepartment(employee) {
  return employee.department || 'Unassigned'
}

function getEmploymentType(employee) {
  return employee.employmentType || 'Permanent'
}

function getStatus(employee) {
  return employee.employmentStatus || 'Active'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(month) {
  if (!month) return ''
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  )
}

function ReportSection({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function csvDownload(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n')

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

function HRReports() {
  const [month, setMonth] = useState(getCurrentMonth)
  const [department, setDepartment] = useState('All Departments')
  const [employmentType, setEmploymentType] = useState('All Employment Types')
  const [status, setStatus] = useState('All Statuses')

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      setApiError('')

      try {
        const response = await fetch(
          `${API_URL}/reports?payrollMonth=${encodeURIComponent(month)}`,
        )

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.message || 'Failed to load HR reports.',
          )
        }

        if (!cancelled) {
          setReport(data)
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(
            error.message || 'Unable to load HR reports.',
          )
          setReport(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadReports()

    return () => {
      cancelled = true
    }
  }, [month])

  const employees = report?.employees || []
  const backendMetrics = report?.metrics || {}
  const backendDepartments = report?.departmentHeadcount || []
  const alerts = report?.alerts || {}
  const alertTotal = Number(report?.alertTotal || 0)

  const departments = useMemo(
    () => [
      'All Departments',
      ...Array.from(
        new Set(
          employees
            .map(getDepartment)
            .filter(Boolean),
        ),
      ),
    ],
    [employees],
  )

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const departmentMatches =
          department === 'All Departments' ||
          getDepartment(employee) === department

        const employmentTypeMatches =
          employmentType === 'All Employment Types' ||
          getEmploymentType(employee) === employmentType

        const statusMatches =
          status === 'All Statuses' ||
          getStatus(employee) === status

        return (
          departmentMatches &&
          employmentTypeMatches &&
          statusMatches
        )
      }),
    [
      employees,
      department,
      employmentType,
      status,
    ],
  )

  const filteredRows = useMemo(() => {
    return filteredEmployees.map((employee) => ({
      ...employee,
      attendance: employee.attendance || {
        present: 0,
        absent: 0,
        leave: 0,
        overtimeHours: 0,
        lateMinutes: 0,
      },
      payroll: employee.payroll || null,
    }))
  }, [filteredEmployees])

  const stats = useMemo(() => {
    const total = filteredRows.length

    const active = filteredRows.filter(
      (employee) =>
        getStatus(employee) === 'Active',
    ).length

    const onLeave = filteredRows.filter(
      (employee) =>
        getStatus(employee) === 'On Leave',
    ).length

    const resigned = filteredRows.filter(
      (employee) =>
        getStatus(employee) === 'Resigned',
    ).length

    const basicSalary = filteredRows.reduce(
      (sum, employee) =>
        sum + Number(employee.basicSalary || 0),
      0,
    )

    const grossPayroll = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.payroll?.grossSalary || 0),
      0,
    )

    const netPayroll = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.payroll?.netSalary || 0),
      0,
    )

    const overtimePay = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.payroll?.overtimePay || 0),
      0,
    )

    const overtimeHours = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(
          employee.attendance?.overtimeHours || 0,
        ),
      0,
    )

    const present = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.attendance?.present || 0),
      0,
    )

    const absent = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.attendance?.absent || 0),
      0,
    )

    const leave = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.attendance?.leave || 0),
      0,
    )

    const lateMinutes = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(
          employee.attendance?.lateMinutes || 0,
        ),
      0,
    )

    return {
      total,
      active,
      onLeave,
      resigned,
      averageSalary:
        total > 0 ? basicSalary / total : 0,
      grossPayroll,
      netPayroll,
      overtimePay,
      overtimeHours,
      present,
      absent,
      leave,
      lateMinutes,
    }
  }, [filteredRows])

  const departmentReport = useMemo(() => {
    const counts = {}

    filteredRows.forEach((employee) => {
      const name = getDepartment(employee)
      counts[name] = (counts[name] || 0) + 1
    })

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )
  }, [filteredRows])

  const employmentTypeReport = useMemo(() => {
    const counts = {}

    filteredRows.forEach((employee) => {
      const type = getEmploymentType(employee)
      counts[type] = (counts[type] || 0) + 1
    })

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )
  }, [filteredRows])

  const salaryReport = useMemo(
    () =>
      [...filteredRows]
        .sort(
          (a, b) =>
            Number(b.basicSalary || 0) -
            Number(a.basicSalary || 0),
        )
        .slice(0, 10),
    [filteredRows],
  )

  function handleExport() {
    const rows = filteredRows.map(
      (employee) => [
        getEmployeeId(employee),
        getEmployeeName(employee),
        getDepartment(employee),
        getEmploymentType(employee),
        getStatus(employee),
        Number(
          employee.basicSalary || 0,
        ).toFixed(2),
        Number(
          employee.payroll?.grossSalary || 0,
        ).toFixed(2),
        Number(
          employee.attendance?.overtimeHours || 0,
        ).toFixed(2),
        Number(
          employee.payroll?.overtimePay || 0,
        ).toFixed(2),
        Number(
          employee.payroll?.netSalary || 0,
        ).toFixed(2),
      ],
    )

    csvDownload(
      `yanol-tech-hr-report-${month}.csv`,
      [
        'Employee ID',
        'Employee Name',
        'Department',
        'Employment Type',
        'Status',
        'Basic Salary',
        'Gross Payroll',
        'Overtime Hours',
        'Overtime Pay',
        'Net Salary',
      ],
      rows,
    )
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageTitle
          eyebrow="HR Reports"
          title="Workforce Reports"
          description="Database-backed workforce, attendance and payroll analytics for Yanol Tech."
          action={
            <button type="button" onClick={handleExport} disabled={loading || filteredRows.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" />
              Export Report
            </button>
          }
          className="mb-8"
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />

            <div>
              <h2 className="font-semibold text-slate-950">
                Report Filters
              </h2>

              <p className="text-xs text-slate-500">
                The selected month is loaded through the consolidated HR Reports API.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payroll Month
              </span>

              <input
                type="month"
                value={month}
                onChange={(event) =>
                  setMonth(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Department
              </span>

              <select
                value={department}
                onChange={(event) =>
                  setDepartment(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employment Type
              </span>

              <select
                value={employmentType}
                onChange={(event) =>
                  setEmploymentType(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {EMPLOYMENT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employment Status
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {!loading && report && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Reports connected to the consolidated database API for{' '}
            <strong>
              {formatMonth(
                report.period?.payrollMonth || month,
              )}
            </strong>
            .
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading live HR reports...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Users}
                label="Employees"
                value={stats.total}
                description="Matching employees"
              />

              <StatCard
                icon={BriefcaseBusiness}
                label="Active Employees"
                value={stats.active}
                description="Currently active"
              />

              <StatCard
                icon={Building2}
                label="Departments"
                value={departmentReport.length}
                description="Departments represented"
              />

              <StatCard
                icon={FileText}
                label="Average Salary"
                value={formatCurrency(
                  stats.averageSalary,
                )}
                description="Average basic salary"
              />
            </div>

            <ReportSection
              title={`Payroll Summary — ${formatMonth(month)}`}
              description="Payroll values are supplied by the HR Reports backend and originate from database payroll records."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Gross Payroll
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      stats.grossPayroll,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Backend total:{' '}
                    {formatCurrency(
                      backendMetrics.totalMonthlyGrossPayroll,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Net Payroll
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      stats.netPayroll,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Backend total:{' '}
                    {formatCurrency(
                      backendMetrics.totalNetPayroll,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Income Tax
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      backendMetrics.totalIncomeTax,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Employee Pension
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      backendMetrics.totalEmployeePension,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Overtime Hours
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {stats.overtimeHours.toFixed(2)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Backend total:{' '}
                    {Number(
                      backendMetrics.totalOvertimeHours || 0,
                    ).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Overtime Pay
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {formatCurrency(
                      stats.overtimePay,
                    )}
                  </p>
                </div>
              </div>
            </ReportSection>

            <ReportSection
              title="Attendance Summary"
              description={`Attendance data supplied by the consolidated HR Reports API for ${formatMonth(month)}.`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Present', stats.present],
                  ['Absent', stats.absent],
                  ['Leave', stats.leave],
                  ['Late Minutes', stats.lateMinutes],
                  [
                    'OT Hours',
                    stats.overtimeHours.toFixed(2),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <p className="text-sm text-slate-500">
                      {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </ReportSection>

            <ReportSection
              title="Employment Status Summary"
              description="Current employee status distribution from the employee database."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Active
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {stats.active}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    On Leave
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {stats.onLeave}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Resigned
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {stats.resigned}
                  </p>
                </div>
              </div>
            </ReportSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReportSection
                title="Employees by Department"
                description="Filtered employee distribution. Backend headcount is also available from the reporting API."
              >
                {departmentReport.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No matching employees.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {departmentReport.map(
                      ([name, count]) => {
                        const percentage =
                          stats.total > 0
                            ? (count / stats.total) *
                              100
                            : 0

                        return (
                          <div key={name}>
                            <div className="mb-2 flex justify-between">
                              <span className="text-sm font-medium text-slate-700">
                                {name}
                              </span>

                              <span className="text-sm font-semibold">
                                {count}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-800"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                )}

                {backendDepartments.length > 0 && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Backend Active Headcount
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {backendDepartments.map(
                        (item) => (
                          <span
                            key={item.department}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                          >
                            {item.department}: {item.count}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </ReportSection>

              <ReportSection
                title="Employment Type"
                description="Employees grouped by employment arrangement."
              >
                <div className="space-y-3">
                  {employmentTypeReport.map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                      >
                        <span className="font-medium text-slate-800">
                          {type}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold">
                          {count}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </ReportSection>
            </div>

            <ReportSection
              title="Data Quality & Validation"
              description="Validation checks generated by the HR Reports backend based on the workbook reporting requirements."
            >
              {alertTotal === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <FileText className="h-5 w-5 text-emerald-700" />
                  </div>

                  <div>
                    <p className="font-semibold text-emerald-800">
                      No validation alerts
                    </p>

                    <p className="text-sm text-emerald-700">
                      The current reporting checks did not find any flagged records.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(alerts)
                    .filter(
                      ([, value]) =>
                        Number(value || 0) > 0,
                    )
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                          <div>
                            <p className="text-sm font-semibold text-amber-900">
                              {key}
                            </p>

                            <p className="mt-1 text-2xl font-bold text-amber-800">
                              {value}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ReportSection>

            <ReportSection
              title="Salary & Payroll Overview"
              description="Top basic salaries with payroll values supplied by the consolidated reports API."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {[
                        'Employee',
                        'Department',
                        'Status',
                        'Basic Salary',
                        'OT Hours',
                        'Gross',
                        'Net',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {salaryReport.map(
                      (employee) => {
                        const id =
                          getEmployeeId(employee)

                        return (
                          <tr
                            key={id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {getEmployeeName(
                                  employee,
                                )}
                              </p>

                              <p className="text-xs text-slate-400">
                                {id}
                              </p>
                            </td>

                            <td className="px-3 py-4 text-sm text-slate-600">
                              {getDepartment(
                                employee,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm text-slate-600">
                              {getStatus(
                                employee,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm font-semibold">
                              {formatCurrency(
                                employee.basicSalary,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm font-semibold">
                              {Number(
                                employee
                                  .attendance
                                  ?.overtimeHours ||
                                  0,
                              ).toFixed(2)}
                            </td>

                            <td className="px-3 py-4 text-sm font-semibold">
                              {formatCurrency(
                                employee.payroll
                                  ?.grossSalary ||
                                  0,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm font-bold text-emerald-700">
                              {formatCurrency(
                                employee.payroll
                                  ?.netSalary ||
                                  0,
                              )}
                            </td>
                          </tr>
                        )
                      },
                    )}

                    {salaryReport.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-8 text-center text-sm text-slate-500"
                        >
                          No employees match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ReportSection>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
              <strong className="text-slate-700">
                Reporting architecture:
              </strong>{' '}
              this page uses one consolidated{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">
                /api/hr-manager/reports
              </code>{' '}
              request. The backend combines Employees, Attendance, Leave and Payroll data according to the HR workbook reporting logic.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default HRReports
