import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Plus,
  Search,
  X,
} from 'lucide-react'

import { INITIAL_EMPLOYEES } from '../../Employer/data/employeeData'

const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Bereavement Leave',
  'Unpaid Leave',
  'Other',
]

const LEAVE_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
]

const DEPARTMENTS = [
  'All Departments',
  ...Array.from(
    new Set(
      INITIAL_EMPLOYEES
        .map((employee) => employee.department)
        .filter(Boolean),
    ),
  ),
]

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

function getToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0
  }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (end < start) {
    return 0
  }

  return (
    Math.floor(
      (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1
  )
}

function formatDate(dateString) {
  if (!dateString) {
    return '-'
  }

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  )
}

function statusClasses(status) {
  switch (status) {
    case 'Approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'

    case 'Rejected':
      return 'border-red-200 bg-red-50 text-red-700'

    case 'Cancelled':
      return 'border-slate-200 bg-slate-100 text-slate-600'

    case 'Pending':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700'
  }
}

function createInitialRequests() {
  const employees = INITIAL_EMPLOYEES.slice(0, 3)

  return employees.map((employee, index) => {
    const startDate = addDays(getToday(), index + 2)
    const endDate = addDays(startDate, index === 0 ? 2 : 1)

    return {
      id: `LR-${String(index + 1).padStart(3, '0')}`,
      employeeKey: employee.id || employee.employeeId || index,
      employeeId: getEmployeeId(employee, index),
      employeeName: getEmployeeName(employee),
      department: employee.department || 'Unassigned',
      leaveType:
        LEAVE_TYPES[index % LEAVE_TYPES.length],
      requestDate: getToday(),
      startDate,
      endDate,
      days: calculateDays(startDate, endDate),
      status:
        index === 0
          ? 'Pending'
          : index === 1
            ? 'Approved'
            : 'Rejected',
      approvedBy:
        index === 1 ? 'HR Manager' : '',
      approvedDate:
        index === 1 ? getToday() : '',
      remarks:
        index === 0
          ? 'Waiting for HR review.'
          : '',
      balance: 18 - index * 3,
    }
  })
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
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

function LeaveModal({
  request,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(request)

  const firstEmployee =
    INITIAL_EMPLOYEES[0]

  const [form, setForm] = useState(
    request || {
      id: '',
      employeeKey:
        firstEmployee?.id ||
        firstEmployee?.employeeId ||
        0,
      employeeId: firstEmployee
        ? getEmployeeId(firstEmployee, 0)
        : '',
      employeeName: firstEmployee
        ? getEmployeeName(firstEmployee)
        : '',
      department:
        firstEmployee?.department ||
        'Unassigned',
      leaveType: 'Annual Leave',
      requestDate: getToday(),
      startDate: getToday(),
      endDate: addDays(getToday(), 1),
      days: 2,
      status: 'Pending',
      approvedBy: '',
      approvedDate: '',
      remarks: '',
      balance: 18,
    },
  )

  function updateField(field, value) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      }

      if (
        field === 'startDate' ||
        field === 'endDate'
      ) {
        next.days = calculateDays(
          field === 'startDate'
            ? value
            : current.startDate,
          field === 'endDate'
            ? value
            : current.endDate,
        )
      }

      return next
    })
  }

  function handleEmployeeChange(event) {
    const employeeIndex = Number(
      event.target.value,
    )

    const employee =
      INITIAL_EMPLOYEES[employeeIndex]

    if (!employee) {
      return
    }

    setForm((current) => ({
      ...current,
      employeeKey:
        employee.id ||
        employee.employeeId ||
        employeeIndex,
      employeeId: getEmployeeId(
        employee,
        employeeIndex,
      ),
      employeeName:
        getEmployeeName(employee),
      department:
        employee.department ||
        'Unassigned',
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (
      !form.employeeName ||
      !form.startDate ||
      !form.endDate ||
      !form.days
    ) {
      return
    }

    if (
      new Date(`${form.endDate}T00:00:00`) <
      new Date(`${form.startDate}T00:00:00`)
    ) {
      return
    }

    const savedRequest = {
      ...form,
      id:
        form.id ||
        `LR-${Date.now()}`,
      days: calculateDays(
        form.startDate,
        form.endDate,
      ),
      approvedBy:
        form.status === 'Approved'
          ? form.approvedBy || 'HR Manager'
          : '',
      approvedDate:
        form.status === 'Approved'
          ? form.approvedDate || getToday()
          : '',
    }

    onSave(savedRequest)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {isEditing
                ? 'Edit Leave Request'
                : 'New Leave Request'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create or update an employee leave request.
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
          className="space-y-5 p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Employee
            </label>

            <select
              value={String(
                INITIAL_EMPLOYEES.findIndex(
                  (employee) =>
                    (employee.id ||
                      employee.employeeId) ===
                    form.employeeKey,
                ),
              )}
              onChange={handleEmployeeChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {INITIAL_EMPLOYEES.map(
                (employee, index) => (
                  <option
                    key={
                      employee.id ||
                      employee.employeeId ||
                      index
                    }
                    value={index}
                  >
                    {getEmployeeName(employee)} —{' '}
                    {getEmployeeId(
                      employee,
                      index,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Leave Type
              </label>

              <select
                value={form.leaveType}
                onChange={(event) =>
                  updateField(
                    'leaveType',
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {LEAVE_TYPES.map(
                  (leaveType) => (
                    <option
                      key={leaveType}
                      value={leaveType}
                    >
                      {leaveType}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {LEAVE_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Start Date
              </label>

              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  updateField(
                    'startDate',
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                End Date
              </label>

              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  updateField(
                    'endDate',
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Leave Days
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {form.days || 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Available Balance
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {form.balance || 0} days
              </p>
            </div>
          </div>

          {form.status === 'Approved' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Approved By
                </label>

                <input
                  type="text"
                  value={form.approvedBy}
                  onChange={(event) =>
                    updateField(
                      'approvedBy',
                      event.target.value,
                    )
                  }
                  placeholder="HR Manager"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Approval Date
                </label>

                <input
                  type="date"
                  value={
                    form.approvedDate ||
                    getToday()
                  }
                  onChange={(event) =>
                    updateField(
                      'approvedDate',
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Remarks
            </label>

            <textarea
              rows="3"
              value={form.remarks}
              onChange={(event) =>
                updateField(
                  'remarks',
                  event.target.value,
                )
              }
              placeholder="Optional remarks..."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

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
              {isEditing
                ? 'Save Changes'
                : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Leave() {
  const [requests, setRequests] = useState(
    createInitialRequests,
  )

  const [search, setSearch] = useState('')
  const [department, setDepartment] =
    useState('All Departments')
  const [statusFilter, setStatusFilter] =
    useState('All Statuses')
  const [leaveTypeFilter, setLeaveTypeFilter] =
    useState('All Leave Types')

  const [showModal, setShowModal] =
    useState(false)

  const [editingRequest, setEditingRequest] =
    useState(null)

  const summary = useMemo(
    () => ({
      total: requests.length,

      pending: requests.filter(
        (request) =>
          request.status === 'Pending',
      ).length,

      approved: requests.filter(
        (request) =>
          request.status === 'Approved',
      ).length,

      rejected: requests.filter(
        (request) =>
          request.status === 'Rejected',
      ).length,
    }),
    [requests],
  )

  const filteredRequests = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        request.employeeName
          .toLowerCase()
          .includes(query) ||
        request.employeeId
          .toLowerCase()
          .includes(query) ||
        request.department
          .toLowerCase()
          .includes(query)

      const matchesDepartment =
        department === 'All Departments' ||
        request.department === department

      const matchesStatus =
        statusFilter === 'All Statuses' ||
        request.status === statusFilter

      const matchesLeaveType =
        leaveTypeFilter === 'All Leave Types' ||
        request.leaveType ===
          leaveTypeFilter

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus &&
        matchesLeaveType
      )
    })
  }, [
    requests,
    search,
    department,
    statusFilter,
    leaveTypeFilter,
  ])

  function saveRequest(request) {
    setRequests((current) => {
      const exists = current.some(
        (item) => item.id === request.id,
      )

      if (exists) {
        return current.map((item) =>
          item.id === request.id
            ? request
            : item,
        )
      }

      return [request, ...current]
    })

    setShowModal(false)
    setEditingRequest(null)
  }

  function updateRequestStatus(
    id,
    status,
  ) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              status,
              approvedBy:
                status === 'Approved'
                  ? 'HR Manager'
                  : '',
              approvedDate:
                status === 'Approved'
                  ? getToday()
                  : '',
            }
          : request,
      ),
    )
  }

  function resetFilters() {
    setSearch('')
    setDepartment('All Departments')
    setStatusFilter('All Statuses')
    setLeaveTypeFilter('All Leave Types')
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              HR Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Leave Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage employee leave requests, approvals and balances.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingRequest(null)
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New Leave Request
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            label="Total Requests"
            value={summary.total}
            description="Leave requests recorded"
          />

          <StatCard
            icon={Clock3}
            label="Pending"
            value={summary.pending}
            description="Awaiting HR action"
          />

          <StatCard
            icon={Check}
            label="Approved"
            value={summary.approved}
            description="Approved leave requests"
          />

          <StatCard
            icon={X}
            label="Rejected"
            value={summary.rejected}
            description="Rejected requests"
          />
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-bold text-slate-950">
              Leave Filters
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Search and filter employee leave records.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px_190px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search employee..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={department}
              onChange={(event) =>
                setDepartment(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {DEPARTMENTS.map(
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

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="All Statuses">
                All Statuses
              </option>

              {LEAVE_STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ),
              )}
            </select>

            <select
              value={leaveTypeFilter}
              onChange={(event) =>
                setLeaveTypeFilter(
                  event.target.value,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="All Leave Types">
                All Leave Types
              </option>

              {LEAVE_TYPES.map(
                (leaveType) => (
                  <option
                    key={leaveType}
                    value={leaveType}
                  >
                    {leaveType}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-950">
              Leave Requests
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {filteredRequests.length} request(s) shown
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4">
                    Employee
                  </th>

                  <th className="px-5 py-4">
                    Leave Type
                  </th>

                  <th className="px-5 py-4">
                    Period
                  </th>

                  <th className="px-5 py-4">
                    Days
                  </th>

                  <th className="px-5 py-4">
                    Balance
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(
                  (request) => (
                    <tr
                      key={request.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {request.employeeName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {request.employeeId} ·{' '}
                          {request.department}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {request.leaveType}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {formatDate(
                            request.startDate,
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          to{' '}
                          {formatDate(
                            request.endDate,
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        {request.days}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {request.balance} days
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                            request.status,
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {request.status ===
                            'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  updateRequestStatus(
                                    request.id,
                                    'Approved',
                                  )
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateRequestStatus(
                                    request.id,
                                    'Rejected',
                                  )
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingRequest(
                                request,
                              )
                              setShowModal(true)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="px-6 py-12 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-3 font-semibold text-slate-900">
                No leave requests found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your filters or create a new request.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Phase 1 Leave Management
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Leave requests are currently stored in browser memory.
                Leave balances, approval history, working-day calculations
                and permanent database storage will be connected during
                the backend and business-logic phases.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <LeaveModal
          request={editingRequest}
          onClose={() => {
            setShowModal(false)
            setEditingRequest(null)
          }}
          onSave={saveRequest}
        />
      )}
    </div>
  )
}

export default Leave