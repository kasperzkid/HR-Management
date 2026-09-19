import { useMemo, useState } from 'react'
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  FileText,
  Users,
} from 'lucide-react'

import { useEmployees } from '../../Employer/hooks/useEmployees'
import LuxuryDataTable from '../components/LuxuryDataTable'

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

const selectClass =
  'h-9 pl-2.5 pr-7 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium'

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
    <div className="rounded-2xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
            {description}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 dark:bg-[#1c2026] p-3">
          <Icon className="h-5 w-5 text-slate-700 dark:text-gray-300" />
        </div>
      </div>
    </div>
  )
}

function ReportSection({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950 dark:text-gray-100">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
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

  const { employees } = useEmployees()

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

  const resetFilters = () => {
    setDepartment('All Departments')
    setEmploymentType('All Employment Types')
    setStatus('All Statuses')
  }

  const salaryColumns = useMemo(
    () => [
      {
        key: 'employee',
        header: 'Employee',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1c2026] text-xs font-bold text-slate-700 dark:text-gray-300">
              {getInitials(row)}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                {getEmployeeName(row)}
              </p>

              <p className="text-xs text-slate-400 dark:text-gray-500">
                {getEmployeeId(row)}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        render: (row) => (
          <span className="text-sm text-slate-600 dark:text-gray-400">
            {getDepartment(row)}
          </span>
        ),
      },
      {
        key: 'employmentType',
        header: 'Employment Type',
        render: (row) => (
          <span className="text-sm text-slate-600 dark:text-gray-400">
            {getEmploymentType(row)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <span className="rounded-full bg-slate-100 dark:bg-[#1c2026] px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-gray-300">
            {getStatus(row)}
          </span>
        ),
      },
      {
        key: 'salary',
        header: 'Basic Salary',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="text-sm font-semibold text-slate-900 dark:text-gray-100 tabular-nums">
            {formatCurrency(getSalary(row))}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="min-h-full bg-[#F3F4F6] dark:bg-[#0f1115] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-3">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-950 dark:text-gray-100 sm:text-3xl">
                  HR Reports
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                  Workforce and employee analytics for Yanol Tech.
                </p>
              </div>
            </div>
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
            <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-4">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Active
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">
                {reportStats.active}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-4">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                On Leave
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">
                {reportStats.onLeave}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-4">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Resigned
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">
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
              <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-6 text-center text-sm text-slate-500 dark:text-gray-400">
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
                          <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                            {departmentName}
                          </span>

                          <span className="text-sm font-semibold text-slate-950 dark:text-gray-100">
                            {count}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#252a32]">
                          <div
                            className="h-full rounded-full bg-slate-800 dark:bg-gray-500"
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
              <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-6 text-center text-sm text-slate-500 dark:text-gray-400">
                No employees match the selected filters.
              </div>
            ) : (
              <div className="space-y-3">
                {employmentTypeReport.map(
                  ([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-[#262b31] p-4"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-gray-200">
                          {type}
                        </p>

                        <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
                          Employment arrangement
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-100 dark:bg-[#1c2026] px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-gray-300">
                        {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </ReportSection>
        </div>

        {/* Salary Report (LuxuryDataTable) */}
        <LuxuryDataTable
          title="Salary Overview"
          subtitle="Employees ordered by basic salary (top 10)."
          countBadge={salaryReport.length}
          columns={salaryColumns}
          data={salaryReport}
          searchable
          searchKeys={['employeeId', 'name', 'department', 'employmentType', 'status']}
          searchPlaceholder="Search by name, ID, department..."
          exportable
          exportFilename="HR_Reports"
          paginated
          defaultPageSize={10}
          emptyMessage="No employees match the selected filters."
          onResetFilters={resetFilters}
          filterControls={
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-gray-400 font-medium whitespace-nowrap">
                  Department:
                </span>
                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className={selectClass}
                >
                  {DEPARTMENTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-gray-400 font-medium whitespace-nowrap">
                  Employment Type:
                </span>
                <select
                  value={employmentType}
                  onChange={(event) => setEmploymentType(event.target.value)}
                  className={selectClass}
                >
                  {EMPLOYMENT_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-gray-400 font-medium whitespace-nowrap">
                  Status:
                </span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={selectClass}
                >
                  {STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </>
          }
        />

        {/* Phase 1 note */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="rounded-lg bg-slate-100 dark:bg-[#1c2026] p-2">
              <FileText className="h-5 w-5 text-slate-700 dark:text-gray-300" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-950 dark:text-gray-100">
                Phase 1 Report Foundation
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-gray-400">
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
