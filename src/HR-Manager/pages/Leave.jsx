import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  FileText,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'

const API_BASE = 'http://localhost:4000/api/hr-manager'

const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Other Leave',
]

const APPROVAL_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
]

const ALL_OPTION = 'All'

const emptyForm = {
  employeeId: '',
  leaveType: 'Annual Leave',
  requestDate: new Date().toISOString().slice(0, 10),
  startDate: '',
  endDate: '',
  days: 0,
  approvalStatus: 'Pending',
  approvedBy: '',
  approvedDate: '',
  remarks: '',
  balance: '',
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getEmployeeName(employee) {
  if (employee?.name) {
    return employee.name
  }

  return [
    employee?.firstName,
    employee?.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Unnamed Employee'
}

function getEmployeeId(employee) {
  return employee?.employeeId || employee?.id || ''
}

function getEmployeeInitials(employee) {
  if (employee?.initials) {
    return employee.initials
  }

  return getEmployeeName(employee)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function normalizeEmployee(employee) {
  const name = getEmployeeName(employee)

  return {
    ...employee,
    name,
    employeeId: employee.employeeId || employee.id || '',
    department: employee.department || '—',
    annualLeaveEntitled: Number(
      employee.annualLeaveEntitled || 0,
    ),
    annualLeaveTaken: Number(
      employee.annualLeaveTaken || 0,
    ),
  }
}

function normalizeLeaveRequest(request) {
  return {
    ...request,
    id: request.id,
    employeeId:
      request.employeeId ||
      request.employee?.employeeId ||
      '',
    employeeName:
      request.employeeName ||
      request.employee?.name ||
      'Unnamed Employee',
    department:
      request.department ||
      request.employee?.department ||
      '—',
    leaveType:
      request.leaveType || 'Annual Leave',
    requestDate:
      request.requestDate || '',
    startDate:
      request.startDate || '',
    endDate:
      request.endDate || '',
    days: Number(request.days || 0),
    approvalStatus:
      request.approvalStatus || 'Pending',
    approvedBy:
      request.approvedBy || '',
    approvedDate:
      request.approvedDate || '',
    remarks:
      request.remarks || '',
    balance:
      request.balance === null ||
      request.balance === undefined
        ? null
        : Number(request.balance),
  }
}

/*
 * Workbook rule:
 * Count weekdays only.
 *
 * Monday-Friday = working day
 * Saturday-Sunday = weekend
 */
function calculateWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0
  }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return 0
  }

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

function rangesOverlap(
  startA,
  endA,
  startB,
  endB,
) {
  if (
    !startA ||
    !endA ||
    !startB ||
    !endB
  ) {
    return false
  }

  return (
    startA <= endB &&
    endA >= startB
  )
}

function getStatusClasses(status) {
  if (status === 'Approved') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'Rejected') {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-amber-50 text-amber-700'
}

function getLeaveTypeClasses(type) {
  if (type === 'Annual Leave') {
    return 'bg-indigo-50 text-indigo-700'
  }

  if (type === 'Sick Leave') {
    return 'bg-rose-50 text-rose-700'
  }

  if (type === 'Maternity Leave') {
    return 'bg-purple-50 text-purple-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function Field({
  label,
  children,
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4755AE]">
        <Icon size={18} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">
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

function SelectField({
  value,
  onChange,
  children,
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
      >
        {children}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
}

function LeaveModal({
  open,
  form,
  employees,
  editing,
  saving,
  error,
  overlapWarning,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) {
    return null
  }

  const selectedEmployee = employees.find(
    (employee) =>
      getEmployeeId(employee) === form.employeeId,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Leave Management
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {editing
                ? 'Edit Leave Request'
                : 'New Leave Request'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="p-6"
        >
          <div className="space-y-7">
            <section>
              <SectionTitle
                icon={UserCheck}
                title="Employee Information"
                description="Select the employee requesting leave."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Employee"
                  required
                >
                  <SelectField
                    value={form.employeeId}
                    onChange={(event) =>
                      onChange(
                        'employeeId',
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Select employee
                    </option>

                    {employees.map((employee) => (
                      <option
                        key={employee.id || employee.employeeId}
                        value={getEmployeeId(employee)}
                      >
                        {getEmployeeId(employee)} —{' '}
                        {getEmployeeName(employee)}
                      </option>
                    ))}
                  </SelectField>
                </Field>

                <Field label="Department">
                  <input
                    readOnly
                    value={
                      selectedEmployee?.department || ''
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 outline-none"
                  />
                </Field>
              </div>
            </section>

            <section>
              <SectionTitle
                icon={CalendarDays}
                title="Leave Details"
                description="Working days are calculated using weekdays only."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Leave Type"
                  required
                >
                  <SelectField
                    value={form.leaveType}
                    onChange={(event) =>
                      onChange(
                        'leaveType',
                        event.target.value,
                      )
                    }
                  >
                    {LEAVE_TYPES.map((type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ))}
                  </SelectField>
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
                  />
                </Field>

                <Field label="Approval Status">
                  <SelectField
                    value={form.approvalStatus}
                    onChange={(event) =>
                      onChange(
                        'approvalStatus',
                        event.target.value,
                      )
                    }
                  >
                    {APPROVAL_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </SelectField>
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
                  />
                </Field>

                <Field label="Number of Working Days">
                  <input
                    readOnly
                    value={form.days}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                  />
                </Field>
              </div>

              {overlapWarning && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {overlapWarning}
                </div>
              )}
            </section>

            <section>
              <SectionTitle
                icon={FileText}
                title="Approval & Remarks"
                description="Approval information and additional notes."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Approved By">
                  <input
                    value={form.approvedBy}
                    onChange={(event) =>
                      onChange(
                        'approvedBy',
                        event.target.value,
                      )
                    }
                    placeholder="HR Manager"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Remarks">
                    <textarea
                      rows={4}
                      value={form.remarks}
                      onChange={(event) =>
                        onChange(
                          'remarks',
                          event.target.value,
                        )
                      }
                      placeholder="Additional remarks..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
                    />
                  </Field>
                </div>
              </div>
            </section>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#4755AE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save Changes'
                  : 'Create Leave Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Leave() {
  const [employees, setEmployees] = useState([])
  const [requests, setRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] =
    useState(ALL_OPTION)
  const [statusFilter, setStatusFilter] =
    useState(ALL_OPTION)
  const [leaveTypeFilter, setLeaveTypeFilter] =
    useState(ALL_OPTION)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRequest, setEditingRequest] =
    useState(null)

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState('')

  const [form, setForm] = useState(emptyForm)

  async function fetchEmployees() {
    const response = await fetch(
      `${API_BASE}/employees`,
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to load employees',
      )
    }

    return data
  }

  async function fetchLeaveRequests() {
    const response = await fetch(
      `${API_BASE}/leave`,
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to load leave requests',
      )
    }

    return data
  }

  async function createLeaveRequest(payload) {
    const response = await fetch(
      `${API_BASE}/leave`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to create leave request',
      )
    }

    return data
  }

  async function updateLeaveRequest(
    id,
    payload,
  ) {
    const response = await fetch(
      `${API_BASE}/leave/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to update leave request',
      )
    }

    return data
  }

  async function deleteLeaveRequest(id) {
    const response = await fetch(
      `${API_BASE}/leave/${id}`,
      {
        method: 'DELETE',
      },
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to delete leave request',
      )
    }

    return data
  }

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [
        employeeData,
        requestData,
      ] = await Promise.all([
        fetchEmployees(),
        fetchLeaveRequests(),
      ])

      setEmployees(
        employeeData.map(normalizeEmployee),
      )

      setRequests(
        requestData.map(
          normalizeLeaveRequest,
        ),
      )
    } catch (err) {
      console.error(
        'Load leave data error:',
        err,
      )

      setError(
        err.message ||
          'Failed to load leave data',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const departments = useMemo(() => {
    return [
      ALL_OPTION,
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

  const filteredRequests = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        String(
          request.employeeId || '',
        )
          .toLowerCase()
          .includes(query) ||
        String(
          request.employeeName || '',
        )
          .toLowerCase()
          .includes(query) ||
        String(
          request.department || '',
        )
          .toLowerCase()
          .includes(query) ||
        String(
          request.id || '',
        )
          .toLowerCase()
          .includes(query)

      const matchesDepartment =
        departmentFilter === ALL_OPTION ||
        request.department ===
          departmentFilter

      const matchesStatus =
        statusFilter === ALL_OPTION ||
        request.approvalStatus ===
          statusFilter

      const matchesLeaveType =
        leaveTypeFilter === ALL_OPTION ||
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
    departmentFilter,
    statusFilter,
    leaveTypeFilter,
  ])

  const pendingCount = requests.filter(
    (request) =>
      request.approvalStatus === 'Pending',
  ).length

  const approvedCount = requests.filter(
    (request) =>
      request.approvalStatus === 'Approved',
  ).length

  const rejectedCount = requests.filter(
    (request) =>
      request.approvalStatus === 'Rejected',
  ).length

  const totalApprovedDays = requests
    .filter(
      (request) =>
        request.approvalStatus === 'Approved',
    )
    .reduce(
      (total, request) =>
        total + Number(request.days || 0),
      0,
    )

  const selectedEmployee =
    employees.find(
      (employee) =>
        getEmployeeId(employee) ===
        selectedEmployeeId,
    ) || null

  const selectedEmployeeRequests =
    selectedEmployee
      ? requests.filter(
          (request) =>
            request.employeeId ===
            getEmployeeId(
              selectedEmployee,
            ),
        )
      : []

  const selectedEmployeeApprovedAnnual =
    selectedEmployeeRequests
      .filter(
        (request) =>
          request.approvalStatus ===
            'Approved' &&
          request.leaveType ===
            'Annual Leave',
      )
      .reduce(
        (total, request) =>
          total +
          Number(request.days || 0),
        0,
      )

  const selectedEmployeeApprovedSick =
    selectedEmployeeRequests
      .filter(
        (request) =>
          request.approvalStatus ===
            'Approved' &&
          request.leaveType ===
            'Sick Leave',
      )
      .reduce(
        (total, request) =>
          total +
          Number(request.days || 0),
        0,
      )

  const selectedEmployeeEntitlement =
    Number(
      selectedEmployee?.annualLeaveEntitled ||
        0,
    )

  const selectedEmployeeRemaining =
    Math.max(
      selectedEmployeeEntitlement -
        selectedEmployeeApprovedAnnual,
      0,
    )

  const overlapWarning = useMemo(() => {
    if (
      !form.employeeId ||
      !form.startDate ||
      !form.endDate
    ) {
      return ''
    }

    const overlappingRequest =
      requests.find((request) => {
        if (
          request.id ===
          editingRequest?.id
        ) {
          return false
        }

        if (
          request.employeeId !==
          form.employeeId
        ) {
          return false
        }

        if (
          request.approvalStatus !==
          'Approved'
        ) {
          return false
        }

        return rangesOverlap(
          form.startDate,
          form.endDate,
          request.startDate,
          request.endDate,
        )
      })

    if (!overlappingRequest) {
      return ''
    }

    return `This date range overlaps an approved leave request (${overlappingRequest.id}).`
  }, [
    form.employeeId,
    form.startDate,
    form.endDate,
    requests,
    editingRequest,
  ])

  function openAddModal() {
    setEditingRequest(null)

    setForm({
      ...emptyForm,
      requestDate: new Date()
        .toISOString()
        .slice(0, 10),
    })

    setError('')
    setModalOpen(true)
  }

  function openEditModal(request) {
    setEditingRequest(request)

    setForm({
      employeeId:
        request.employeeId || '',
      leaveType:
        request.leaveType ||
        'Annual Leave',
      requestDate:
        request.requestDate ||
        new Date()
          .toISOString()
          .slice(0, 10),
      startDate:
        request.startDate || '',
      endDate:
        request.endDate || '',
      days:
        Number(request.days || 0),
      approvalStatus:
        request.approvalStatus ||
        'Pending',
      approvedBy:
        request.approvedBy || '',
      approvedDate:
        request.approvedDate || '',
      remarks:
        request.remarks || '',
      balance:
        request.balance === null ||
        request.balance ===
          undefined
          ? ''
          : request.balance,
    })

    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) {
      return
    }

    setModalOpen(false)
    setEditingRequest(null)
    setForm(emptyForm)
    setError('')
  }

  function handleFormChange(
    field,
    value,
  ) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      }

      if (
        field === 'startDate' ||
        field === 'endDate'
      ) {
        next.days =
          calculateWorkingDays(
            field === 'startDate'
              ? value
              : current.startDate,
            field === 'endDate'
              ? value
              : current.endDate,
          )
      }

      if (
        field === 'approvalStatus'
      ) {
        if (value === 'Approved') {
          next.approvedBy =
            current.approvedBy ||
            'HR Manager'

          next.approvedDate =
            current.approvedDate ||
            new Date()
              .toISOString()
              .slice(0, 10)
        }

        if (value === 'Pending') {
          next.approvedBy = ''
          next.approvedDate = ''
        }
      }

      return next
    })
  }

  async function saveRequest(
    event,
  ) {
    event.preventDefault()

    setSaving(true)
    setError('')

    try {
      if (!form.employeeId) {
        throw new Error(
          'Please select an employee.',
        )
      }

      if (!form.leaveType) {
        throw new Error(
          'Please select a leave type.',
        )
      }

      if (!form.requestDate) {
        throw new Error(
          'Request date is required.',
        )
      }

      if (
        !form.startDate ||
        !form.endDate
      ) {
        throw new Error(
          'Start date and end date are required.',
        )
      }

      if (
        form.endDate <
        form.startDate
      ) {
        throw new Error(
          'End date cannot be before start date.',
        )
      }

      const days =
        calculateWorkingDays(
          form.startDate,
          form.endDate,
        )

      if (days <= 0) {
        throw new Error(
          'The selected dates contain no working days.',
        )
      }

      if (overlapWarning) {
        throw new Error(
          overlapWarning,
        )
      }

      const employee =
        employees.find(
          (item) =>
            getEmployeeId(item) ===
            form.employeeId,
        )

      if (!employee) {
        throw new Error(
          'Selected employee was not found.',
        )
      }

      const payload = {
        employeeId:
          getEmployeeId(employee),

        leaveType:
          form.leaveType,

        requestDate:
          form.requestDate,

        startDate:
          form.startDate,

        endDate:
          form.endDate,

        days,

        approvalStatus:
          form.approvalStatus ||
          'Pending',

        approvedBy:
          form.approvalStatus ===
          'Approved'
            ? form.approvedBy ||
              'HR Manager'
            : null,

        approvedDate:
          form.approvalStatus ===
          'Approved'
            ? form.approvedDate ||
              new Date()
                .toISOString()
                .slice(0, 10)
            : null,

        remarks:
          form.remarks || null,

        balance:
          form.balance === '' ||
          form.balance === null ||
          form.balance ===
            undefined
            ? null
            : Number(form.balance),
      }

      if (editingRequest) {
        await updateLeaveRequest(
          editingRequest.id,
          payload,
        )
      } else {
        await createLeaveRequest(
          payload,
        )
      }

      const updatedRequests =
        await fetchLeaveRequests()

      setRequests(
        updatedRequests.map(
          normalizeLeaveRequest,
        ),
      )

      closeModal()
    } catch (err) {
      console.error(
        'Save leave request error:',
        err,
      )

      setError(
        err.message ||
          'Failed to save leave request.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(
    request,
    approvalStatus,
  ) {
    setSaving(true)
    setError('')

    try {
      const approved =
        approvalStatus === 'Approved'

      await updateLeaveRequest(
        request.id,
        {
          approvalStatus,
          approvedBy: approved
            ? 'HR Manager'
            : null,
          approvedDate: approved
            ? new Date()
                .toISOString()
                .slice(0, 10)
            : null,
        },
      )

      const updatedRequests =
        await fetchLeaveRequests()

      setRequests(
        updatedRequests.map(
          normalizeLeaveRequest,
        ),
      )
    } catch (err) {
      console.error(
        'Update leave status error:',
        err,
      )

      setError(
        err.message ||
          'Failed to update leave request.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function approveRequest(
    request,
  ) {
    await updateStatus(
      request,
      'Approved',
    )
  }

  async function rejectRequest(
    request,
  ) {
    await updateStatus(
      request,
      'Rejected',
    )
  }

  async function handleDelete(
    request,
  ) {
    const confirmed =
      window.confirm(
        `Delete leave request ${request.id}? This action cannot be undone.`,
      )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await deleteLeaveRequest(
        request.id,
      )

      const updatedRequests =
        await fetchLeaveRequests()

      setRequests(
        updatedRequests.map(
          normalizeLeaveRequest,
        ),
      )
    } catch (err) {
      console.error(
        'Delete leave request error:',
        err,
      )

      setError(
        err.message ||
          'Failed to delete leave request.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-950">
      <main className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              HR Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Leave Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage leave requests, approvals and employee leave balances.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex w-fit items-center gap-2 rounded-xl bg-[#4755AE] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998]"
          >
            <CalendarDays size={17} />
            New Leave Request
          </button>
        </header>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
              className="shrink-0 text-red-400 hover:text-red-700"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* =====================================================
            KPI CARDS
        ====================================================== */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Requests
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {requests.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-[#4755AE]">
                <FileText size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {pendingCount}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Approved
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {approvedCount}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Check size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Approved Leave Days
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatNumber(
                    totalApprovedDays,
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <CalendarDays size={20} />
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FILTERS
        ====================================================== */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,1.5fr)_repeat(3,minmax(150px,1fr))]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search employee, ID or request..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
              />
            </div>

            <SelectField
              value={departmentFilter}
              onChange={(event) =>
                setDepartmentFilter(
                  event.target.value,
                )
              }
            >
              {departments.map(
                (department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department ===
                    ALL_OPTION
                      ? 'All Departments'
                      : department}
                  </option>
                ),
              )}
            </SelectField>

            <SelectField
              value={leaveTypeFilter}
              onChange={(event) =>
                setLeaveTypeFilter(
                  event.target.value,
                )
              }
            >
              <option value={ALL_OPTION}>
                All Leave Types
              </option>

              {LEAVE_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ),
              )}
            </SelectField>

            <SelectField
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <option value={ALL_OPTION}>
                All Statuses
              </option>

              {APPROVAL_STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ),
              )}
            </SelectField>
          </div>
        </section>

        {/* =====================================================
            LEAVE REQUESTS
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Leave Requests
              </p>

              <h2 className="mt-1 text-lg font-bold">
                Requests & Approvals
              </h2>
            </div>

            <p className="text-sm text-slate-500">
              {filteredRequests.length}{' '}
              request
              {filteredRequests.length ===
              1
                ? ''
                : 's'}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#4755AE]" />

                <p className="text-sm font-medium text-slate-500">
                  Loading leave data...
                </p>
              </div>
            </div>
          ) : filteredRequests.length ===
            0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarDays size={24} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                No leave requests found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Create a leave request or adjust your filters to see records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Request
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Employee
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Leave Type
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Dates
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Days
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Approved By
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map(
                    (request) => (
                      <tr
                        key={request.id}
                        className="border-b border-slate-50 transition hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {request.id}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Requested{' '}
                            {request.requestDate ||
                              '—'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-[#4755AE]">
                              {getEmployeeInitials(
                                employees.find(
                                  (
                                    employee,
                                  ) =>
                                    getEmployeeId(
                                      employee,
                                    ) ===
                                    request.employeeId,
                                ) || {
                                  name: request.employeeName,
                                },
                              )}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {request.employeeName}
                              </p>

                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-400">
                                  {request.employeeId ||
                                    '—'}
                                </span>

                                <span className="text-slate-300">
                                  •
                                </span>

                                <span className="text-xs text-slate-400">
                                  {request.department ||
                                    '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-semibold ${getLeaveTypeClasses(
                              request.leaveType,
                            )}`}
                          >
                            {request.leaveType}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {request.startDate ||
                              '—'}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            to{' '}
                            {request.endDate ||
                              '—'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-slate-900">
                            {formatNumber(
                              request.days,
                            )}
                          </span>

                          <span className="ml-1 text-xs text-slate-400">
                            days
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              request.approvalStatus,
                            )}`}
                          >
                            {request.approvalStatus}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-700">
                            {request.approvedBy ||
                              '—'}
                          </p>

                          {request.approvedDate && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {request.approvedDate}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            {request.approvalStatus ===
                              'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    approveRequest(
                                      request,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  title="Approve request"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                                >
                                  <Check
                                    size={16}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    rejectRequest(
                                      request,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  title="Reject request"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                >
                                  <XCircle
                                    size={16}
                                  />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  request,
                                )
                              }
                              disabled={
                                saving
                              }
                              title="Edit request"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  request,
                                )
                              }
                              disabled={
                                saving
                              }
                              title="Delete request"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <X
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =====================================================
            EMPLOYEE LEAVE BALANCE
        ====================================================== */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-[#4755AE]">
                <Users size={18} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  Employee Leave Balance
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  Balance Summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Only approved leave is counted against the employee balance.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-5 max-w-md">
              <Field label="Select Employee">
                <SelectField
                  value={
                    selectedEmployeeId
                  }
                  onChange={(event) =>
                    setSelectedEmployeeId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select employee
                  </option>

                  {employees.map(
                    (employee) => (
                      <option
                        key={
                          employee.id ||
                          employee.employeeId
                        }
                        value={getEmployeeId(
                          employee,
                        )}
                      >
                        {getEmployeeId(
                          employee,
                        )}{' '}
                        —{' '}
                        {getEmployeeName(
                          employee,
                        )}
                      </option>
                    ),
                  )}
                </SelectField>
              </Field>
            </div>

            {selectedEmployee ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Annual Entitled
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {formatNumber(
                        selectedEmployeeEntitlement,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      working days
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Annual Taken
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {formatNumber(
                        selectedEmployeeApprovedAnnual,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      approved
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                      Remaining
                    </p>

                    <p className="mt-2 text-xl font-bold text-emerald-700">
                      {formatNumber(
                        selectedEmployeeRemaining,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-emerald-600/70">
                      annual leave
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                      Sick Days Used
                    </p>

                    <p className="mt-2 text-xl font-bold text-rose-700">
                      {formatNumber(
                        selectedEmployeeApprovedSick,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-rose-600/70">
                      approved
                    </p>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Request
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Leave Type
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Start
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          End
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Days
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedEmployeeRequests.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-slate-400"
                          >
                            No leave requests for this employee.
                          </td>
                        </tr>
                      ) : (
                        selectedEmployeeRequests.map(
                          (request) => (
                            <tr
                              key={
                                request.id
                              }
                              className="border-b border-slate-50"
                            >
                              <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                {request.id}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getLeaveTypeClasses(
                                    request.leaveType,
                                  )}`}
                                >
                                  {
                                    request.leaveType
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-600">
                                {
                                  request.startDate
                                }
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-600">
                                {
                                  request.endDate
                                }
                              </td>

                              <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                {formatNumber(
                                  request.days,
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                                    request.approvalStatus,
                                  )}`}
                                >
                                  {
                                    request.approvalStatus
                                  }
                                </span>
                              </td>
                            </tr>
                          ),
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <Users
                  size={24}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  Select an employee
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  The employee's annual and sick leave balances will appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            WORKBOOK LOGIC NOTE
        ====================================================== */}

        <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#4755AE] shadow-sm">
              <Clock3 size={17} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Leave calculation rules
              </h3>

              <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                <li>
                  • Number of leave days uses working days only.
                </li>

                <li>
                  • Saturday and Sunday are excluded from the day count.
                </li>

                <li>
                  • Only Approved leave counts against the employee leave balance.
                </li>

                <li>
                  • Approved overlapping leave requests are prevented.
                </li>

                <li>
                  • Leave data is now persisted through the Prisma/API layer.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <LeaveModal
        open={modalOpen}
        form={form}
        employees={employees}
        editing={Boolean(editingRequest)}
        saving={saving}
        error={error}
        overlapWarning={overlapWarning}
        onClose={closeModal}
        onChange={handleFormChange}
        onSubmit={saveRequest}
      />
    </div>
  )
}

export default Leave