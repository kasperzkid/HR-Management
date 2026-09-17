import {
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  Users,
} from 'lucide-react'

import { INITIAL_EMPLOYEES } from '../../Employer/data/employeeData'

function HRDashboard() {
  const employees = Array.isArray(INITIAL_EMPLOYEES)
    ? INITIAL_EMPLOYEES
    : []

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

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Human Resources
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            HR Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Overview of your company's workforce and HR activities.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          View Reports
          <ArrowUpRight size={17} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    {stat.value}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon size={20} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {stat.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* Main dashboard area */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Workforce overview */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Workforce Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current employee distribution.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                Total Workforce
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {totalEmployees}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                Active
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {activeEmployees}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                On Leave
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
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
                className="text-slate-400"
              />
            </a>

            <a
              href="/hr-manager/leave"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Leave Requests
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Review employee leave
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-slate-400"
              />
            </a>
          </div>
        </section>
      </div>

      {/* Recent Employees */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Recent Employees
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Employees currently available in the shared data.
            </p>
          </div>

          <a
            href="/hr-manager/employees"
            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            View all
          </a>
        </div>

        {employees.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No employee records available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Position
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {employees.slice(0, 5).map((employee) => (
                  <tr
                    key={employee.id || employee.employeeId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
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
                          <p className="text-sm font-semibold text-slate-900">
                            {employee.name || 'Unnamed Employee'}
                          </p>

                          <p className="text-xs text-slate-500">
                            {employee.employeeId || employee.id || '-'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {employee.department || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {employee.jobTitle || '-'}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {employee.employmentStatus ||
                          employee.status ||
                          'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default HRDashboard