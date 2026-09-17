import { useMemo, useState } from 'react'
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Download,
  FileText,
  Users,
} from 'lucide-react'

import { INITIAL_EMPLOYEES } from '../../Employer/data/employeeData'

const DEPARTMENTS = [
  'All Departments',
  'Engineering',
  'Human Resources',
  'Finance',
  'Marketing',
  'Sales',
  'Operations',
]

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
  if (employee.name) return employee.name

  const firstName = employee.firstName || ''
  const lastName = employee.lastName || ''

  return `${firstName} ${lastName}`.trim() || 'Unnamed Employee'
}

function getEmployeeId(employee) {
  return employee.employeeId || employee.id || 'N/A'
}

function getDepartment(employee) {
  return employee.department || 'Unassigned'
}

function getEmploymentType(employee) {
  return (
    employee.employmentType ||
    employee.employment_type ||
    'Permanent'
  )
}

function getStatus(employee) {
  return employee.employmentStatus || employee.status || 'Active'
}

function getSalary(employee) {
  const salary =
    employee.basicSalary ??
    employee.salary ??
    employee.basic_salary ??
    0

  const numericSalary = Number(salary)

  return Number.isFinite(numericSalary) ? numericSalary : 0
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
  }).format(value)
}

function getInitials(employee) {
  if (employee.initials) return employee.initials

  const name = getEmployeeName(employee)

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
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
        <h2 className="text-lg font-bold text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {children}
    </section>
  )
}

function HRReports() {
  const [department, setDepartment] = useState('All Departments')
  const [employmentType, setEmploymentType] = useState(
    'All Employment Types',
  )
  const [status, setStatus] = useState('All Statuses')

  const employees = Array.isArray(INITIAL_EMPLOYEES)
    ? INITIAL_EMPLOYEES
    : []

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
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
    })
  }, [employees, department, employmentType, status])

  const reportStats = useMemo(() => {
    const total = filteredEmployees.length

    const active = filteredEmployees.filter(
      (employee) => getStatus(employee) === 'Active',
    ).length

    const onLeave = filteredEmployees.filter(
      (employee) => getStatus(employee) === 'On Leave',
    ).length

    const resigned = filteredEmployees.filter(
      (employee) => getStatus(employee) === 'Resigned',
    ).length

    const totalPayroll = filteredEmployees.reduce(
      (sum, employee) => sum + getSalary(employee),
      0,
    )

    const averageSalary =
      total > 0 ? totalPayroll / total : 0

    return {
      total,
      active,
      onLeave,
      resigned,
      totalPayroll,
      averageSalary,
    }
  }, [filteredEmployees])

  const departmentReport = useMemo(() => {
    const counts = {}

    filteredEmployees.forEach((employee) => {
      const departmentName = getDepartment(employee)

      counts[departmentName] =
        (counts[departmentName] || 0) + 1
    })

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )
  }, [filteredEmployees])

  const employmentTypeReport = useMemo(() => {
    const counts = {}

    filteredEmployees.forEach((employee) => {
      const type = getEmploymentType(employee)

      counts[type] = (counts[type] || 0) + 1
    })

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )
  }, [filteredEmployees])

  const salaryReport = useMemo(() => {
    return [...filteredEmployees]
      .sort((a, b) => getSalary(b) - getSalary(a))
      .slice(0, 10)
  }, [filteredEmployees])

  const handleExport = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Employment Type',
      'Status',
      'Basic Salary',
    ]

    const rows = filteredEmployees.map((employee) => [
      getEmployeeId(employee),
      getEmployeeName(employee),
      getDepartment(employee),
      getEmploymentType(employee),
      getStatus(employee),
      getSalary(employee),
    ])

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'yanol-tech-hr-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-3">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                  HR Reports
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Workforce and employee analytics for Yanol Tech.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />

            <div>
              <h2 className="font-semibold text-slate-950">
                Report Filters
              </h2>

              <p className="text-xs text-slate-500">
                Filter the HR report by workforce category.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Department
              </span>

              <select
                value={department}
                onChange={(event) =>
                  setDepartment(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
              >
                {DEPARTMENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employment Type
              </span>

              <select
                value={employmentType}
                onChange={(event) =>
                  setEmploymentType(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
              >
                {EMPLOYMENT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employment Status
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
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

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Employees"
            value={reportStats.total}
            description="Employees in current report"
          />

          <StatCard
            icon={BriefcaseBusiness}
            label="Active Employees"
            value={reportStats.active}
            description="Currently active workforce"
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
            value={formatCurrency(reportStats.averageSalary)}
            description="Average basic salary"
          />
        </div>

        {/* Status Summary */}
        <ReportSection
          title="Employment Status Summary"
          description="Current employee status distribution."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Active
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {reportStats.active}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                On Leave
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {reportStats.onLeave}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Resigned
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {reportStats.resigned}
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Department + Employment Type */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ReportSection
            title="Employees by Department"
            description="Workforce distribution across departments."
          >
            {departmentReport.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No employees match the selected filters.
              </div>
            ) : (
              <div className="space-y-4">
                {departmentReport.map(
                  ([departmentName, count]) => {
                    const percentage =
                      reportStats.total > 0
                        ? (count / reportStats.total) * 100
                        : 0

                    return (
                      <div key={departmentName}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-700">
                            {departmentName}
                          </span>

                          <span className="text-sm font-semibold text-slate-950">
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
          </ReportSection>

          <ReportSection
            title="Employment Type"
            description="Employees grouped by employment arrangement."
          >
            {employmentTypeReport.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No employees match the selected filters.
              </div>
            ) : (
              <div className="space-y-3">
                {employmentTypeReport.map(
                  ([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {type}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Employment arrangement
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
                        {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </ReportSection>
        </div>

        {/* Salary Report */}
        <ReportSection
          title="Salary Overview"
          description="Employees ordered by basic salary."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee
                  </th>

                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>

                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employment Type
                  </th>

                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Basic Salary
                  </th>
                </tr>
              </thead>

              <tbody>
                {salaryReport.map((employee) => (
                  <tr
                    key={getEmployeeId(employee)}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                          {getInitials(employee)}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {getEmployeeName(employee)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {getEmployeeId(employee)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-sm text-slate-600">
                      {getDepartment(employee)}
                    </td>

                    <td className="px-3 py-4 text-sm text-slate-600">
                      {getEmploymentType(employee)}
                    </td>

                    <td className="px-3 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {getStatus(employee)}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(getSalary(employee))}
                    </td>
                  </tr>
                ))}

                {salaryReport.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
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

        {/* Phase 1 note */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <FileText className="h-5 w-5 text-slate-700" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-950">
                Phase 1 Report Foundation
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                These reports currently use the existing employee
                data available in the frontend. Database-powered
                attendance, leave, payroll, statutory calculations,
                historical reporting, and advanced Excel/PDF reports
                will be connected during the backend and production
                phases.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HRReports