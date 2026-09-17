import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  FileText,
  Filter,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'

const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Other Leave',
]

const STATUSES = ['Pending', 'Approved', 'Rejected']

const DEPARTMENTS = [
  'All Departments',
  'Engineering',
  'Human Resources',
  'Finance',
  'Operations',
  'Sales',
  'Marketing',
  'IT',
]

const INITIAL_EMPLOYEES = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: 'Abebe Kebede',
    department: 'Engineering',
    jobTitle: 'Software Engineer',
    joinDate: '2024-01-15',
    employmentStatus: 'Active',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: 'Sara Mohammed',
    department: 'Human Resources',
    jobTitle: 'HR Specialist',
    joinDate: '2023-06-12',
    employmentStatus: 'Active',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: 'Daniel Tesfaye',
    department: 'Finance',
    jobTitle: 'Accountant',
    joinDate: '2022-03-20',
    employmentStatus: 'Active',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    name: 'Hanna Bekele',
    department: 'Operations',
    jobTitle: 'Operations Officer',
    joinDate: '2025-02-01',
    employmentStatus: 'Active',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    name: 'Yonas Alemu',
    department: 'Sales',
    jobTitle: 'Sales Executive',
    joinDate: '2024-08-10',
    employmentStatus: 'Active',
  },
]

const INITIAL_LEAVE_REQUESTS = [
  {
    id: 'LR0001',
    employeeId: 'EMP001',
    employeeName: 'Abebe Kebede',
    department: 'Engineering',
    leaveType: 'Annual Leave',
    requestDate: '2026-07-20',
    startDate: '2026-08-03',
    endDate: '2026-08-07',
    days: 5,
    approvalStatus: 'Approved',
    approvedBy: 'HR Manager',
    approvedDate: '2026-07-21',
    remarks: 'Family trip',
  },
  {
    id: 'LR0002',
    employeeId: 'EMP001',
    employeeName: 'Abebe Kebede',
    department: 'Engineering',
    leaveType: 'Sick Leave',
    requestDate: '2026-08-12',
    startDate: '2026-08-12',
    endDate: '2026-08-12',
    days: 1,
    approvalStatus: 'Approved',
    approvedBy: 'HR Manager',
    approvedDate: '2026-08-12',
    remarks: 'Flu',
  },
  {
    id: 'LR0003',
    employeeId: 'EMP002',
    employeeName: 'Sara Mohammed',
    department: 'Human Resources',
    leaveType: 'Annual Leave',
    requestDate: '2026-08-10',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    days: 5,
    approvalStatus: 'Pending',
    approvedBy: '',
    approvedDate: '',
    remarks: 'Awaiting approval',
  },
]

const EMPTY_FORM = {
  employeeId: '',
  leaveType: 'Annual Leave',
  requestDate: new Date().toISOString().slice(0, 10),
  startDate: '',
  endDate: '',
  approvalStatus: 'Pending',
  approvedBy: '',
  approvedDate: '',
  remarks: '',
}

function getEmployeeName(employee) {
  return (
    employee?.name ||
    [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
    'Unknown Employee'
  )
}

function getEmployeeId(employee) {
  return employee?.employeeId || employee?.id || ''
}

function getDepartment(employee) {
  return employee?.department || 'Unassigned'
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/*
 * The workbook uses NETWORKDAYS for Number of Days.
 * This implementation mirrors the weekday behavior:
 * Monday-Friday count as working days.
 */
function calculateWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) return 0

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0
  }

  if (end < start) return 0

  let days = 0
  const current = new Date(start)

  while (current <= end) {
    const day = current.getDay()

    if (day !== 0 && day !== 6) {
      days += 1
    }

    current.setDate(current.getDate() + 1)
  }

  return days
}

function calculateAnnualEntitlement(joinDate) {
  if (!joinDate) return 16

  const joined = new Date(`${joinDate}T00:00:00`)

  if (Number.isNaN(joined.getTime())) return 16

  const today = new Date()

  if (joined > today) return 0

  let years =
    today.getFullYear() -
    joined.getFullYear()

  let months =
    today.getMonth() -
    joined.getMonth()

  if (today.getDate() < joined.getDate()) {
    months -= 1
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  /*
   * Mirrors the workbook's structure:
   * Less than one year:
   *   16 days annual entitlement prorated by completed months.
   *
   * One year and beyond:
   *   16 days plus one additional day for each completed
   *   two-year period after the first year.
   */
  if (years < 1) {
    return Number(((16 * months) / 12).toFixed(1))
  }

  return 16 + Math.floor((years - 1) / 2)
}

function getInitials(name) {
  if (!name) return '??'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getStatusClass(status) {
  if (status === 'Approved') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }

  if (status === 'Rejected') {
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function getLeaveTypeClass(type) {
  if (type === 'Annual Leave') {
    return 'bg-blue-50 text-blue-700'
  }

  if (type === 'Sick Leave') {
    return 'bg-red-50 text-red-700'
  }

  if (type === 'Maternity Leave') {
    return 'bg-purple-50 text-purple-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function hasOverlap(request, requests, excludeId = '') {
  if (
    !request.employeeId ||
    !request.startDate ||
    !request.endDate ||
    request.approvalStatus !== 'Approved'
  ) {
    return false
  }

  const start = new Date(`${request.startDate}T00:00:00`)
  const end = new Date(`${request.endDate}T00:00:00`)

  return requests.some((existing) => {
    if (existing.id === excludeId) return false
    if (existing.employeeId !== request.employeeId) return false
    if (existing.approvalStatus !== 'Approved') return false
    if (!existing.startDate || !existing.endDate) return false

    const existingStart = new Date(`${existing.startDate}T00:00:00`)
    const existingEnd = new Date(`${existing.endDate}T00:00:00`)

    return existingStart <= end && existingEnd >= start
  })
}

function Field({
  label,
  children,
  required = false,
  hint = '',
  className = '',
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {hint && (
        <p className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}

const inputClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
        <Icon size={18} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {title}
        </h3>

        {description && (
          <p className="mt-0.5 text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function LeaveRequestModal({
  open,
  form,
  employees,
  requests,
  editingRequest,
  onClose,
  onChange,
  onSave,
}) {
  if (!open) return null

  const selectedEmployee = employees.find(
    (employee) =>
      getEmployeeId(employee) === form.employeeId,
  )

  const numberOfDays = calculateWorkingDays(
    form.startDate,
    form.endDate,
  )

  const overlap = hasOverlap(
    {
      ...form,
      approvalStatus: form.approvalStatus,
    },
    requests,
    editingRequest?.id || '',
  )

  const invalidDates =
    form.startDate &&
    form.endDate &&
    form.endDate < form.startDate

  const isApproved = form.approvalStatus === 'Approved'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingRequest
                ? 'Edit Leave Request'
                : 'New Leave Request'}
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Enter the leave request details below.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6">
          <div className="space-y-7">
            <section>
              <SectionTitle
                icon={Users}
                title="Employee Information"
                description="Select the employee requesting leave."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Employee"
                  required
                >
                  <select
                    value={form.employeeId}
                    onChange={(event) =>
                      onChange(
                        'employeeId',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    required
                  >
                    <option value="">
                      Select employee
                    </option>

                    {employees.map((employee) => (
                      <option
                        key={getEmployeeId(employee)}
                        value={getEmployeeId(employee)}
                      >
                        {getEmployeeId(employee)} —{' '}
                        {getEmployeeName(employee)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Department">
                  <input
                    value={
                      selectedEmployee
                        ? getDepartment(selectedEmployee)
                        : ''
                    }
                    className={`${inputClassName} bg-slate-50`}
                    readOnly
                    placeholder="Auto-filled"
                  />
                </Field>
              </div>

              {selectedEmployee && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {getInitials(
                      getEmployeeName(selectedEmployee),
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {getEmployeeName(selectedEmployee)}
                    </p>

                    <p className="text-xs text-slate-500">
                      {selectedEmployee.jobTitle ||
                        'Employee'}{' '}
                      · {getDepartment(selectedEmployee)}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section>
              <SectionTitle
                icon={CalendarDays}
                title="Leave Details"
                description="The number of days is calculated using working days."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Leave Type"
                  required
                >
                  <select
                    value={form.leaveType}
                    onChange={(event) =>
                      onChange(
                        'leaveType',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    required
                  >
                    {LEAVE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Request Date"
                  required
                >
                  <input
                    type="date"
                    value={form.requestDate}
                    onChange={(event) =>
                      onChange(
                        'requestDate',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    required
                  />
                </Field>

                <Field
                  label="Start Date"
                  required
                >
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      onChange(
                        'startDate',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    required
                  />
                </Field>

                <Field
                  label="End Date"
                  required
                >
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(event) =>
                      onChange(
                        'endDate',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    required
                  />
                </Field>

                <Field
                  label="Number of Days"
                  hint="Weekends are excluded."
                >
                  <div className="flex h-[42px] items-center rounded-lg border border-blue-100 bg-blue-50 px-3 text-sm font-semibold text-blue-700">
                    {invalidDates
                      ? 'Invalid dates'
                      : numberOfDays > 0
                        ? `${numberOfDays} working ${
                            numberOfDays === 1
                              ? 'day'
                              : 'days'
                          }`
                        : '—'}
                  </div>
                </Field>

                <Field label="Overlap Check">
                  <div
                    className={`flex h-[42px] items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                      overlap
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {overlap ? (
                      <>
                        <AlertTriangle size={16} />
                        CHECK — overlapping approved leave
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        OK
                      </>
                    )}
                  </div>
                </Field>
              </div>
            </section>

            <section>
              <SectionTitle
                icon={FileText}
                title="Approval"
                description="Only approved leave is counted against the employee balance."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Approval Status"
                  required
                >
                  <select
                    value={form.approvalStatus}
                    onChange={(event) =>
                      onChange(
                        'approvalStatus',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    required
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Approved By">
                  <input
                    value={form.approvedBy}
                    onChange={(event) =>
                      onChange(
                        'approvedBy',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                    placeholder="HR Manager"
                  />
                </Field>

                <Field label="Approval Date">
                  <input
                    type="date"
                    value={form.approvedDate}
                    onChange={(event) =>
                      onChange(
                        'approvedDate',
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Remarks">
                  <textarea
                    value={form.remarks}
                    onChange={(event) =>
                      onChange(
                        'remarks',
                        event.target.value,
                      )
                    }
                    rows={3}
                    className={`${inputClassName} resize-none`}
                    placeholder="Add remarks..."
                  />
                </Field>
              </div>

              {isApproved && overlap && (
                <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="font-semibold">
                      Overlapping approved leave detected
                    </p>

                    <p className="mt-1 text-xs leading-5">
                      This request overlaps another approved
                      leave request for the same employee.
                      Review the dates before approving.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={Boolean(invalidDates) || numberOfDays <= 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={17} />
              {editingRequest
                ? 'Save Changes'
                : 'Create Leave Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LeaveBalancePanel({
  employees,
  requests,
  selectedEmployeeId,
  onSelectEmployee,
}) {
  const balances = useMemo(() => {
    return employees.map((employee) => {
      const employeeId = getEmployeeId(employee)

      const employeeRequests = requests.filter(
        (request) =>
          request.employeeId === employeeId &&
          request.approvalStatus === 'Approved',
      )

      const annualTaken = employeeRequests
        .filter(
          (request) =>
            request.leaveType === 'Annual Leave',
        )
        .reduce(
          (total, request) =>
            total + Number(request.days || 0),
          0,
        )

      const sickUsed = employeeRequests
        .filter(
          (request) =>
            request.leaveType === 'Sick Leave',
        )
        .reduce(
          (total, request) =>
            total + Number(request.days || 0),
          0,
        )

      const entitled = calculateAnnualEntitlement(
        employee.joinDate,
      )

      return {
        employee,
        employeeId,
        employeeName: getEmployeeName(employee),
        entitled,
        taken: annualTaken,
        remaining: entitled - annualTaken,
        sickUsed,
      }
    })
  }, [employees, requests])

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">
              Employee Leave Balance
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Annual leave balance based on approved requests.
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <CalendarDays size={18} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee ID
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee Name
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Entitled
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Taken
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Remaining
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sick Used
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {balances.map((balance) => {
              const selected =
                selectedEmployeeId === balance.employeeId

              return (
                <tr
                  key={balance.employeeId}
                  onClick={() =>
                    onSelectEmployee(
                      selected
                        ? ''
                        : balance.employeeId,
                    )
                  }
                  className={`cursor-pointer transition hover:bg-slate-50 ${
                    selected ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-sm font-medium text-blue-600">
                    {balance.employeeId}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {getInitials(
                          balance.employeeName,
                        )}
                      </div>

                      <span className="text-sm font-medium text-slate-800">
                        {balance.employeeName}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-3 text-right text-sm text-slate-700">
                    {balance.entitled}
                  </td>

                  <td className="px-5 py-3 text-right text-sm text-slate-700">
                    {balance.taken}
                  </td>

                  <td
                    className={`px-5 py-3 text-right text-sm font-semibold ${
                      balance.remaining < 0
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {balance.remaining}
                  </td>

                  <td className="px-5 py-3 text-right text-sm text-slate-700">
                    {balance.sickUsed}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {balances.length === 0 && (
        <div className="p-8 text-center text-sm text-slate-500">
          No employees available.
        </div>
      )}
    </div>
  )
}

export default function Leave() {
  const [employees] = useState(INITIAL_EMPLOYEES)
  const [requests, setRequests] = useState(
    INITIAL_LEAVE_REQUESTS,
  )

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState('All Statuses')
  const [leaveTypeFilter, setLeaveTypeFilter] =
    useState('All Leave Types')
  const [departmentFilter, setDepartmentFilter] =
    useState('All Departments')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRequest, setEditingRequest] =
    useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState('')

  const filteredRequests = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return requests.filter((request) => {
      const matchesSearch =
        !searchValue ||
        request.id.toLowerCase().includes(searchValue) ||
        request.employeeId
          .toLowerCase()
          .includes(searchValue) ||
        request.employeeName
          .toLowerCase()
          .includes(searchValue) ||
        request.department
          .toLowerCase()
          .includes(searchValue)

      const matchesStatus =
        statusFilter === 'All Statuses' ||
        request.approvalStatus === statusFilter

      const matchesLeaveType =
        leaveTypeFilter === 'All Leave Types' ||
        request.leaveType === leaveTypeFilter

      const matchesDepartment =
        departmentFilter === 'All Departments' ||
        request.department === departmentFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLeaveType &&
        matchesDepartment
      )
    })
  }, [
    requests,
    search,
    statusFilter,
    leaveTypeFilter,
    departmentFilter,
  ])

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(
        (request) =>
          request.approvalStatus === 'Pending',
      ).length,
      approved: requests.filter(
        (request) =>
          request.approvalStatus === 'Approved',
      ).length,
      rejected: requests.filter(
        (request) =>
          request.approvalStatus === 'Rejected',
      ).length,
    }
  }, [requests])

  const selectedBalance = useMemo(() => {
    if (!selectedEmployeeId) return null

    const employee = employees.find(
      (item) =>
        getEmployeeId(item) === selectedEmployeeId,
    )

    if (!employee) return null

    const approvedRequests = requests.filter(
      (request) =>
        request.employeeId === selectedEmployeeId &&
        request.approvalStatus === 'Approved',
    )

    const annualTaken = approvedRequests
      .filter(
        (request) =>
          request.leaveType === 'Annual Leave',
      )
      .reduce(
        (total, request) =>
          total + Number(request.days || 0),
        0,
      )

    const sickUsed = approvedRequests
      .filter(
        (request) =>
          request.leaveType === 'Sick Leave',
      )
      .reduce(
        (total, request) =>
          total + Number(request.days || 0),
        0,
      )

    const entitled = calculateAnnualEntitlement(
      employee.joinDate,
    )

    return {
      employee,
      entitled,
      taken: annualTaken,
      remaining: entitled - annualTaken,
      sickUsed,
    }
  }, [employees, requests, selectedEmployeeId])

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function openCreateModal() {
    setEditingRequest(null)

    setForm({
      ...EMPTY_FORM,
      requestDate: new Date()
        .toISOString()
        .slice(0, 10),
    })

    setModalOpen(true)
  }

  function openEditModal(request) {
    setEditingRequest(request)

    setForm({
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      requestDate: request.requestDate,
      startDate: request.startDate,
      endDate: request.endDate,
      approvalStatus: request.approvalStatus,
      approvedBy: request.approvedBy || '',
      approvedDate: request.approvedDate || '',
      remarks: request.remarks || '',
    })

    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingRequest(null)
    setForm(EMPTY_FORM)
  }

  function saveRequest(event) {
    event.preventDefault()

    const employee = employees.find(
      (item) =>
        getEmployeeId(item) === form.employeeId,
    )

    if (!employee) {
      window.alert('Please select an employee.')
      return
    }

    if (!form.startDate || !form.endDate) {
      window.alert(
        'Please select the start and end dates.',
      )
      return
    }

    if (form.endDate < form.startDate) {
      window.alert(
        'End Date cannot be before Start Date.',
      )
      return
    }

    const days = calculateWorkingDays(
      form.startDate,
      form.endDate,
    )

    if (days <= 0) {
      window.alert(
        'The selected period contains no working days.',
      )
      return
    }

    const requestForCheck = {
      ...form,
      approvalStatus: form.approvalStatus,
    }

    if (
      hasOverlap(
        requestForCheck,
        requests,
        editingRequest?.id || '',
      )
    ) {
      const proceed = window.confirm(
        'This request overlaps another approved leave request for the same employee. Continue anyway?',
      )

      if (!proceed) return
    }

    let approvedBy = form.approvedBy
    let approvedDate = form.approvedDate

    if (form.approvalStatus === 'Approved') {
      if (!approvedBy) {
        approvedBy = 'HR Manager'
      }

      if (!approvedDate) {
        approvedDate = new Date()
          .toISOString()
          .slice(0, 10)
      }
    }

    const nextRequest = {
      id:
        editingRequest?.id ||
        `LR${String(
          Math.max(
            0,
            ...requests.map((request) => {
              const numeric = Number(
                request.id.replace('LR', ''),
              )

              return Number.isNaN(numeric)
                ? 0
                : numeric
            }),
          ) + 1,
        ).padStart(4, '0')}`,
      employeeId: form.employeeId,
      employeeName: getEmployeeName(employee),
      department: getDepartment(employee),
      leaveType: form.leaveType,
      requestDate: form.requestDate,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      approvalStatus: form.approvalStatus,
      approvedBy,
      approvedDate,
      remarks: form.remarks,
    }

    if (editingRequest) {
      setRequests((current) =>
        current.map((request) =>
          request.id === editingRequest.id
            ? nextRequest
            : request,
        ),
      )
    } else {
      setRequests((current) => [
        nextRequest,
        ...current,
      ])
    }

    closeModal()
  }

  function updateStatus(request, status) {
    const approved =
      status === 'Approved'

    setRequests((current) =>
      current.map((item) => {
        if (item.id !== request.id) {
          return item
        }

        return {
          ...item,
          approvalStatus: status,
          approvedBy: approved
            ? item.approvedBy || 'HR Manager'
            : '',
          approvedDate: approved
            ? item.approvedDate ||
              new Date()
                .toISOString()
                .slice(0, 10)
            : '',
        }
      }),
    )
  }

  function approveRequest(request) {
    const overlap = hasOverlap(
      {
        ...request,
        approvalStatus: 'Approved',
      },
      requests,
      request.id,
    )

    if (overlap) {
      const proceed = window.confirm(
        'This request overlaps another approved leave request for the same employee. Approve anyway?',
      )

      if (!proceed) return
    }

    updateStatus(request, 'Approved')
  }

  function rejectRequest(request) {
    updateStatus(request, 'Rejected')
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('All Statuses')
    setLeaveTypeFilter('All Leave Types')
    setDepartmentFilter('All Departments')
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={16} />
              <span>HR Management</span>
              <span>/</span>
              <span className="text-slate-700">
                Leave
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Leave Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage employee leave requests, approvals,
              overlaps, and leave balances.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            New Leave Request
          </button>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Total Requests"
            value={stats.total}
            description="All leave requests"
          />

          <StatCard
            icon={Clock3}
            label="Pending"
            value={stats.pending}
            description="Awaiting approval"
          />

          <StatCard
            icon={Check}
            label="Approved"
            value={stats.approved}
            description="Approved requests"
          />

          <StatCard
            icon={XCircle}
            label="Rejected"
            value={stats.rejected}
            description="Rejected requests"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={17} className="text-slate-500" />

            <h2 className="text-sm font-semibold text-slate-800">
              Filter Leave Requests
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search request ID, employee, department..."
                className={`${inputClassName} pl-9`}
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className={inputClassName}
              >
                <option>All Statuses</option>

                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div>
              <select
                value={leaveTypeFilter}
                onChange={(event) =>
                  setLeaveTypeFilter(event.target.value)
                }
                className={inputClassName}
              >
                <option>All Leave Types</option>

                {LEAVE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value)
                }
                className={inputClassName}
              >
                {DEPARTMENTS.map((department) => (
                  <option key={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(search ||
            statusFilter !== 'All Statuses' ||
            leaveTypeFilter !== 'All Leave Types' ||
            departmentFilter !== 'All Departments') && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Leave Requests */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Leave Requests
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredRequests.length} request
                {filteredRequests.length === 1
                  ? ''
                  : 's'} shown
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Approved leave affects balance
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Request ID
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Leave Type
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Request Date
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Leave Period
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Days
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Approved By
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Approval Date
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Overlap?
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => {
                  const overlap = hasOverlap(
                    request,
                    requests,
                    request.id,
                  )

                  return (
                    <tr
                      key={request.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {request.id}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                            {getInitials(
                              request.employeeName,
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {request.employeeName}
                            </p>

                            <p className="text-xs text-slate-500">
                              {request.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {request.department}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getLeaveTypeClass(
                            request.leaveType,
                          )}`}
                        >
                          {request.leaveType}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDate(
                          request.requestDate,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">
                          {formatDate(request.startDate)}
                        </div>

                        <div className="text-xs text-slate-400">
                          to {formatDate(request.endDate)}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-slate-800">
                          {request.days}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            request.approvalStatus,
                          )}`}
                        >
                          {request.approvalStatus}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {request.approvedBy || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDate(
                          request.approvedDate,
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {overlap ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                            <AlertTriangle size={13} />
                            CHECK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <Check size={13} />
                            OK
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {request.approvalStatus ===
                            'Pending' && (
                            <>
                              <button
                                type="button"
                                title="Approve"
                                onClick={() =>
                                  approveRequest(
                                    request,
                                  )
                                }
                                className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"
                              >
                                <Check size={17} />
                              </button>

                              <button
                                type="button"
                                title="Reject"
                                onClick={() =>
                                  rejectRequest(
                                    request,
                                  )
                                }
                                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                              >
                                <XCircle size={17} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            title="Edit"
                            onClick={() =>
                              openEditModal(request)
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Edit3 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-4 text-slate-400">
                <FileText size={25} />
              </div>

              <h3 className="font-semibold text-slate-800">
                No leave requests found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Try changing your filters or create a
                new leave request.
              </p>
            </div>
          )}
        </div>

        {/* Balance + selected employee details */}
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <LeaveBalancePanel
            employees={employees}
            requests={requests}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
          />

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <UserCheck size={18} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Leave Balance Details
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Select an employee from the balance
                    table.
                  </p>
                </div>
              </div>
            </div>

            {selectedBalance ? (
              <div className="p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                    {getInitials(
                      getEmployeeName(
                        selectedBalance.employee,
                      ),
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      {getEmployeeName(
                        selectedBalance.employee,
                      )}
                    </p>

                    <p className="text-xs text-slate-500">
                      {getEmployeeId(
                        selectedBalance.employee,
                      )}{' '}
                      ·{' '}
                      {getDepartment(
                        selectedBalance.employee,
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="text-sm text-slate-500">
                      Entitled (Annual)
                    </span>

                    <span className="font-semibold text-slate-900">
                      {selectedBalance.entitled}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="text-sm text-slate-500">
                      Taken (Approved)
                    </span>

                    <span className="font-semibold text-slate-900">
                      {selectedBalance.taken}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
                    <span className="text-sm text-emerald-700">
                      Remaining
                    </span>

                    <span className="font-bold text-emerald-700">
                      {selectedBalance.remaining}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="text-sm text-slate-500">
                      Sick Days Used
                    </span>

                    <span className="font-semibold text-slate-900">
                      {selectedBalance.sickUsed}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-700">
                  Only leave requests with{' '}
                  <strong>Approved</strong> status are
                  included in the balance calculations.
                </div>
              </div>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 rounded-full bg-slate-100 p-4 text-slate-400">
                  <Users size={25} />
                </div>

                <p className="text-sm font-medium text-slate-700">
                  No employee selected
                </p>

                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  Click an employee in the balance table
                  to see detailed leave balance information.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Workbook logic note */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Leave calculation rules
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Number of Days uses working days, weekends
                are excluded, and only Approved leave is
                counted against the annual leave balance.
                Approved overlapping requests are flagged
                for review.
              </p>
            </div>
          </div>
        </div>
      </div>

      <LeaveRequestModal
        open={modalOpen}
        form={form}
        employees={employees}
        requests={requests}
        editingRequest={editingRequest}
        onClose={closeModal}
        onChange={updateForm}
        onSave={saveRequest}
      />
    </div>
  )
}