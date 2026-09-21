import {
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  Users,
  Eye,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'

import { useEmployees } from '../../Employer/hooks/useEmployees'
import LuxuryDataTable from '../components/LuxuryDataTable'

function HRDashboard() {
  const navigate = useNavigate()
  const { employees, loading } = useEmployees()

  const totalEmployees = employees.length

  const activeEmployees = employees.filter(
    (employee) =>
      employee.employmentStatus === 'Active' ||
      employee.status === 'Active'
  ).length

  const onLeaveEmployees = employees.filter(
    (employee) =>
      employee.employmentStatus === 'On Leave' ||
      employee.status === 'On Leave'
  ).length

  const departments = new Set(
    employees
      .map((employee) => employee.department)
      .filter(Boolean)
  ).size

  const stats = [
    {
      title: 'Total Employees',
      value: totalEmployees,
      description: 'Employees in the company',
      icon: Users,
    },
    {
      title: 'Active Employees',
      value: activeEmployees,
      description: 'Currently active',
      icon: CalendarCheck,
    },
    {
      title: 'On Leave',
      value: onLeaveEmployees,
      description: 'Currently on leave',
      icon: Clock3,
    },
    {
      title: 'Departments',
      value: departments,
      description: 'Active departments',
      icon: Users,
    },
  ]

  const columns = [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      render: (employee) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1c2026] text-xs font-bold text-slate-700 dark:text-gray-300">
            {employee.initials ||
              employee.name
                ?.split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() ||
              'EM'}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
              {employee.name || 'Unnamed Employee'}
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {employee.employeeId || employee.id || '-'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (employee) => (
        <span className="text-sm text-slate-600 dark:text-gray-300">
          {employee.department || '-'}
        </span>
      ),
    },
    {
      key: 'jobTitle',
      header: 'Position',
      render: (employee) => (
        <span className="text-sm text-slate-600 dark:text-gray-300">
          {employee.jobTitle || '-'}
        </span>
      ),
    },
    {
      key: 'employmentStatus',
      header: 'Status',
      render: (employee) => {
        const status =
          employee.employmentStatus || employee.status || 'Unknown'
        const color =
          status === 'Active'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
            : status === 'On Leave'
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60'
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#1c2026] dark:text-gray-300 dark:border-[#262b31]'
        return (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${color}`}
          >
            {status}
          </span>
        )
      },
    },
  ]

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0d10] dark:text-gray-200">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
            Human Resources
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-gray-100">
            HR Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            Overview of your company's workforce and HR activities.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/hr-manager/reports')}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer dark:bg-[#3a4149] dark:hover:bg-[#262b31]"
        >
          View Reports
          <ArrowUpRight size={15} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-gray-100">
                    {stat.value}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-[#1c2026] dark:text-gray-300">
                  <Icon size={20} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-gray-400">
                {stat.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* Main dashboard area */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Workforce overview */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2 dark:border-[#262b31] dark:bg-[#14181e]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-gray-100">
                Workforce Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Current employee distribution.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-5 dark:bg-[#1c2026]">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Total Workforce
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">
                {totalEmployees}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-5 dark:bg-[#1c2026]">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Active
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">
                {activeEmployees}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-5 dark:bg-[#1c2026]">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                On Leave
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">
                {onLeaveEmployees}
              </p>
            </div>
          </div>

          {/* Simple workforce bar */}
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">
                Active workforce
              </span>

              <span className="text-slate-500">
                {totalEmployees > 0
                  ? Math.round(
                      (activeEmployees / totalEmployees) * 100
                    )
                  : 0}
                %
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{
                  width: `${
                    totalEmployees > 0
                      ? (activeEmployees / totalEmployees) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Common HR tasks.
          </p>

          <div className="mt-5 space-y-3">
            <a
              href="/hr-manager/employees"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Manage Employees
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View and manage employee records
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-slate-400"
              />
            </a>

            <a
              href="/hr-manager/attendance"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Attendance
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Review attendance records
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-slate-400 dark:text-gray-500"
              />
            </a>

            <a
              href="/hr-manager/leave"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-[#262b31] dark:hover:bg-[#1c2026]"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                  Leave Requests
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  Review employee leave
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-slate-400 dark:text-gray-500"
              />
            </a>
          </div>
        </section>
      </div>

      {/* Recent Employees (Luxury) */}
      <section className="mt-6">
        <LuxuryDataTable
          title="Recent Employees"
          subtitle="Employees currently available in the shared data."
          countBadge={employees.length}
          columns={columns}
          data={employees}
          searchable
          searchKeys={['name', 'employeeId', 'department', 'jobTitle', 'employmentStatus']}
          searchPlaceholder="Search recent employees..."
          exportable
          exportFilename="HR_Recent_Employees"
          paginated
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 20]}
          emptyMessage="No employee records available."
          primaryAction={{
            label: 'View Profile',
            icon: Eye,
            onClick: () => navigate('/hr-manager/employees'),
          }}
        />
      </section>
    </div>
  )
}

export default HRDashboard