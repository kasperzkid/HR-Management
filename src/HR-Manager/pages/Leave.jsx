import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
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
  Save,
} from 'lucide-react'

import { PageTitle, Table } from '../../components/ui'

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

const POLLING_INTERVAL = 15000

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
    employeeId:
      employee.employeeId ||
      employee.id ||
      '',
    department:
      employee.department ||
      '—',
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
      request.employee?.id ||
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
      request.leaveType ||
      'Annual Leave',

    requestDate:
      request.requestDate ||
      '',

    startDate:
      request.startDate ||
      '',

    endDate:
      request.endDate ||
      '',

    days:
      Number(request.days || 0),

    approvalStatus:
      request.approvalStatus ||
      'Pending',

    approvedBy:
      request.approvedBy ||
      '',

    approvedDate:
      request.approvedDate ||
      '',

    remarks:
      request.remarks ||
      '',

    balance:
      request.balance === null ||
      request.balance === undefined
        ? null
        : Number(request.balance),
  }
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
  disabled = false,
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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

function calculateWorkingDays(
  startDate,
  endDate,
) {
  if (!startDate || !endDate) {
    return 0
  }

  const start = new Date(
    `${startDate}T00:00:00`,
  )

  const end = new Date(
    `${endDate}T00:00:00`,
  )

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return 0
  }

  let count = 0

  const current = new Date(start)

  while (current <= end) {
    const day = current.getDay()

    if (day !== 0 && day !== 6) {
      count += 1
    }

    current.setDate(
      current.getDate() + 1,
    )
  }

  return count
}

function getTodayString() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

/*
 * ============================================================
 * REVIEW MODAL
 * ============================================================
 *
 * Pending requests are reviewed here.
 *
 * HR cannot change employee-submitted:
 * - Employee
 * - Leave type
 * - Request date
 * - Start date
 * - End date
 * - Days
 *
 * HR can:
 * - Approve
 * - Reject
 * - Add HR review remarks
 */
function ReviewModal({
  open,
  request,
  saving,
  error,
  reviewRemarks,
  onRemarksChange,
  onClose,
  onApprove,
  onReject,
}) {
  if (!open || !request) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                HR Review
              </p>

              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Pending
              </span>
            </div>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Review Leave Request
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Request {request.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <SectionTitle
              icon={UserCheck}
              title="Employee Information"
              description="Information submitted by the employee."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Employee
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {request.employeeName}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {request.employeeId}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Department
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {request.department}
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle
              icon={CalendarDays}
              title="Leave Details"
              description="The HR reviewer cannot modify employee-submitted dates."
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Leave Type
                </p>

                <span
                  className={`mt-2 inline-flex rounded-lg px-2.5 py-1.5 text-xs font-semibold ${getLeaveTypeClasses(
                    request.leaveType,
                  )}`}
                >
                  {request.leaveType}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Request Date
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {request.requestDate || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Working Days
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {formatNumber(request.days)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Start Date
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {request.startDate || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  End Date
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {request.endDate || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Current Status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                    request.approvalStatus,
                  )}`}
                >
                  {request.approvalStatus}
                </span>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle
              icon={FileText}
              title="Employee Remarks"
              description="Additional information submitted with the request."
            />

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {request.remarks ||
                  'No employee remarks were provided.'}
              </p>
            </div>
          </section>

          <section>
            <Field label="HR Review Remark">
              <textarea
                rows={4}
                value={reviewRemarks}
                onChange={(event) =>
                  onRemarksChange(
                    event.target.value,
                  )
                }
                placeholder="Enter an approval or rejection remark..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10"
              />
            </Field>
          </section>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onReject}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle size={17} />

              {saving
                ? 'Processing...'
                : 'Reject Request'}
            </button>

            <button
              type="button"
              onClick={onApprove}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#4755AE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={17} />

              {saving
                ? 'Processing...'
                : 'Approve Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/*
 * ============================================================
 * EDIT MODAL
 * ============================================================
 *
 * This modal is available ONLY after a request has already
 * been Approved or Rejected.
 *
 * HR can correct/change the request after review.
 *
 * This does NOT create a new request.
 */
function EditLeaveModal({
  open,
  request,
  employees,
  saving,
  error,
  form,
  onChange,
  onClose,
  onSave,
}) {
  if (!open || !request) {
    return null
  }

  const calculatedDays =
    calculateWorkingDays(
      form.startDate,
      form.endDate,
    )

  const selectedEmployee =
    employees.find(
      (employee) =>
        getEmployeeId(employee) ===
        form.employeeId,
    )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                HR Administration
              </p>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(
                  request.approvalStatus,
                )}`}
              >
                {request.approvalStatus}
              </span>
            </div>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Edit Leave Request
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Request {request.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              Editing an already reviewed request
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-700">
              Changes to an approved leave request may affect the employee's leave balance and attendance records. The system will synchronize those changes through the HR leave workflow.
            </p>
          </div>

          <section>
            <SectionTitle
              icon={UserCheck}
              title="Employee Information"
              description="HR may correct the employee assigned to this existing request."
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
                  disabled={saving}
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

              <Field label="Department">
                <input
                  value={
                    selectedEmployee?.department ||
                    form.department ||
                    '—'
                  }
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 outline-none"
                />
              </Field>
            </div>
          </section>

          <section>
            <SectionTitle
              icon={CalendarDays}
              title="Leave Details"
              description="Update the existing request information."
            />

            <div className="grid gap-4 sm:grid-cols-2">
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
                  disabled={saving}
                >
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
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10 disabled:bg-slate-50"
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
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10 disabled:bg-slate-50"
                />
              </Field>

              <Field
                label="End Date"
                required
              >
                <input
                  type="date"
                  value={form.endDate}
                  min={
                    form.startDate ||
                    undefined
                  }
                  onChange={(event) =>
                    onChange(
                      'endDate',
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10 disabled:bg-slate-50"
                />
              </Field>

              <Field label="Calculated Working Days">
                <input
                  value={formatNumber(
                    calculatedDays,
                  )}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                />
              </Field>

              <Field
                label="Approval Status"
                required
              >
                <SelectField
                  value={form.approvalStatus}
                  onChange={(event) =>
                    onChange(
                      'approvalStatus',
                      event.target.value,
                    )
                  }
                  disabled={saving}
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
            </div>
          </section>

          <section>
            <SectionTitle
              icon={FileText}
              title="Remarks"
              description="HR can update the remarks attached to this existing request."
            />

            <Field label="Remarks">
              <textarea
                rows={5}
                value={form.remarks}
                onChange={(event) =>
                  onChange(
                    'remarks',
                    event.target.value,
                  )
                }
                disabled={saving}
                placeholder="Enter leave request remarks..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10 disabled:bg-slate-50"
              />
            </Field>
          </section>

          {form.approvalStatus ===
            'Approved' && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-800">
                Approved request
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                Saving this request as Approved will keep it in the employee's approved leave balance and synchronize the corresponding attendance records.
              </p>
            </div>
          )}

          {form.approvalStatus ===
            'Rejected' && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">
                Rejected request
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                A rejected request does not count against the employee's approved leave balance.
              </p>
            </div>
          )}

          {form.approvalStatus ===
            'Pending' && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">
                Returned to Pending
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                This request will return to the HR review queue and must be reviewed again.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#4755AE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />

              {saving
                ? 'Saving Changes...'
                : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Leave() {
  const [employees, setEmployees] =
    useState([])

  const [requests, setRequests] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [
    departmentFilter,
    setDepartmentFilter,
  ] = useState(ALL_OPTION)

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(ALL_OPTION)

  const [
    leaveTypeFilter,
    setLeaveTypeFilter,
  ] = useState(ALL_OPTION)

  /*
   * ============================================================
   * REVIEW STATE
   * ============================================================
   */

  const [
    reviewModalOpen,
    setReviewModalOpen,
  ] = useState(false)

  const [
    reviewingRequest,
    setReviewingRequest,
  ] = useState(null)

  const [
    reviewRemarks,
    setReviewRemarks,
  ] = useState('')

  /*
   * ============================================================
   * EDIT STATE
   * ============================================================
   */

  const [
    editModalOpen,
    setEditModalOpen,
  ] = useState(false)

  const [
    editingRequest,
    setEditingRequest,
  ] = useState(null)

  const [
    editForm,
    setEditForm,
  ] = useState({
    employeeId: '',
    department: '',
    leaveType: 'Annual Leave',
    requestDate: '',
    startDate: '',
    endDate: '',
    approvalStatus: 'Pending',
    remarks: '',
  })

  const [
    editError,
    setEditError,
  ] = useState('')

  /*
   * ============================================================
   * NEW REQUEST NOTIFICATION STATE
   * ============================================================
   */

  const knownRequestIdsRef =
    useRef(new Set())

  const initialLoadRef =
    useRef(true)

  const [
    newRequestIds,
    setNewRequestIds,
  ] = useState(new Set())

  const [
    newRequestCount,
    setNewRequestCount,
  ] = useState(0)

  const [
    notificationVisible,
    setNotificationVisible,
  ] = useState(false)

  const [
    notificationRequest,
    setNotificationRequest,
  ] = useState(null)

  /*
   * ============================================================
   * API
   * ============================================================
   */

  async function fetchEmployees() {
    const response = await fetch(
      `${API_BASE}/employees`,
      {
        cache: 'no-store',
      },
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to load employees',
      )
    }

    return Array.isArray(data)
      ? data
      : data.employees || []
  }

  async function fetchLeaveRequests() {
    const response = await fetch(
      `${API_BASE}/leave`,
      {
        cache: 'no-store',
      },
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to load leave requests',
      )
    }

    return Array.isArray(data)
      ? data
      : data.leaveRequests || []
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
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(payload),
      },
    )

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to update leave request',
      )
    }

    return data
  }

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  async function loadInitialData() {
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

      const normalizedEmployees =
        employeeData.map(
          normalizeEmployee,
        )

      const normalizedRequests =
        requestData.map(
          normalizeLeaveRequest,
        )

      setEmployees(
        normalizedEmployees,
      )

      setRequests(
        normalizedRequests,
      )

      knownRequestIdsRef.current =
        new Set(
          normalizedRequests.map(
            (request) => request.id,
          ),
        )

      initialLoadRef.current = false
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

  /*
   * ============================================================
   * BACKGROUND REFRESH / NEW REQUEST DETECTION
   * ============================================================
   */

  async function refreshLeaveRequests({
    notify = false,
  } = {}) {
    try {
      const requestData =
        await fetchLeaveRequests()

      const normalizedRequests =
        requestData.map(
          normalizeLeaveRequest,
        )

      const incomingRequests =
        normalizedRequests.filter(
          (request) =>
            request.approvalStatus ===
              'Pending' &&
            !knownRequestIdsRef.current.has(
              request.id,
            ),
        )

      normalizedRequests.forEach(
        (request) => {
          knownRequestIdsRef.current.add(
            request.id,
          )
        },
      )

      setRequests(
        normalizedRequests,
      )

      if (
        notify &&
        !initialLoadRef.current &&
        incomingRequests.length > 0
      ) {
        const incomingIds =
          new Set(
            incomingRequests.map(
              (request) =>
                request.id,
            ),
          )

        setNewRequestIds(
          (current) => {
            const next =
              new Set(current)

            incomingIds.forEach(
              (id) =>
                next.add(id),
            )

            return next
          },
        )

        setNewRequestCount(
          (current) =>
            current +
            incomingRequests.length,
        )

        setNotificationRequest(
          incomingRequests[
            incomingRequests.length - 1
          ],
        )

        setNotificationVisible(
          true,
        )
      }

      return normalizedRequests
    } catch (err) {
      console.error(
        'Refresh leave requests error:',
        err,
      )
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        refreshLeaveRequests({
          notify: true,
        })
      }, POLLING_INTERVAL)

    return () => {
      window.clearInterval(
        interval,
      )
    }
  }, [])

  /*
   * Refresh immediately when the HR user returns
   * to this browser tab.
   */
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        refreshLeaveRequests({
          notify: true,
        })
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [])

  /*
   * ============================================================
   * FILTER OPTIONS
   * ============================================================
   */

  const departments =
    useMemo(() => {
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

  const filteredRequests =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase()

      return requests.filter(
        (request) => {
          const matchesSearch =
            !query ||
            String(
              request.employeeId ||
                '',
            )
              .toLowerCase()
              .includes(query) ||
            String(
              request.employeeName ||
                '',
            )
              .toLowerCase()
              .includes(query) ||
            String(
              request.department ||
                '',
            )
              .toLowerCase()
              .includes(query) ||
            String(
              request.id || '',
            )
              .toLowerCase()
              .includes(query)

          const matchesDepartment =
            departmentFilter ===
              ALL_OPTION ||
            request.department ===
              departmentFilter

          const matchesStatus =
            statusFilter ===
              ALL_OPTION ||
            request.approvalStatus ===
              statusFilter

          const matchesLeaveType =
            leaveTypeFilter ===
              ALL_OPTION ||
            request.leaveType ===
              leaveTypeFilter

          return (
            matchesSearch &&
            matchesDepartment &&
            matchesStatus &&
            matchesLeaveType
          )
        },
      )
    }, [
      requests,
      search,
      departmentFilter,
      statusFilter,
      leaveTypeFilter,
    ])

  /*
   * ============================================================
   * KPIs
   * ============================================================
   */

  const pendingCount =
    requests.filter(
      (request) =>
        request.approvalStatus ===
        'Pending',
    ).length

  const approvedCount =
    requests.filter(
      (request) =>
        request.approvalStatus ===
        'Approved',
    ).length

  const rejectedCount =
    requests.filter(
      (request) =>
        request.approvalStatus ===
        'Rejected',
    ).length

  const totalApprovedDays =
    requests
      .filter(
        (request) =>
          request.approvalStatus ===
          'Approved',
      )
      .reduce(
        (total, request) =>
          total +
          Number(request.days || 0),
        0,
      )

  /*
   * ============================================================
   * EMPLOYEE BALANCE SECTION
   * ============================================================
   */

  const [
    selectedEmployee,
    setSelectedEmployee,
  ] = useState(null)

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

  /*
   * ============================================================
   * REVIEW
   * ============================================================
   */

  function openReviewModal(
    request,
  ) {
    setReviewingRequest(request)
    setReviewRemarks('')
    setError('')
    setReviewModalOpen(true)

    setNewRequestIds(
      (current) => {
        const next = new Set(current)

        next.delete(request.id)

        return next
      },
    )

    setNotificationCountAfterSeen(
      request.id,
    )
  }

  function setNotificationCountAfterSeen(
    requestId,
  ) {
    setNewRequestCount(
      (current) =>
        Math.max(
          current -
            (newRequestIds.has(
              requestId,
            )
              ? 1
              : 0),
          0,
        ),
    )
  }

  function closeReviewModal() {
    if (saving) {
      return
    }

    setReviewModalOpen(false)
    setReviewingRequest(null)
    setReviewRemarks('')
    setError('')
  }

  /*
   * ============================================================
   * EDIT
   * ============================================================
   */

  function openEditModal(
    request,
  ) {
    setEditingRequest(request)

    const employee =
      employees.find(
        (item) =>
          getEmployeeId(item) ===
          request.employeeId,
      )

    setEditForm({
      employeeId:
        request.employeeId ||
        '',
      department:
        employee?.department ||
        request.department ||
        '',
      leaveType:
        request.leaveType ||
        'Annual Leave',
      requestDate:
        request.requestDate ||
        getTodayString(),
      startDate:
        request.startDate ||
        '',
      endDate:
        request.endDate ||
        '',
      approvalStatus:
        request.approvalStatus ||
        'Pending',
      remarks:
        request.remarks ||
        '',
    })

    setEditError('')
    setError('')
    setEditModalOpen(true)
  }

  function closeEditModal() {
    if (saving) {
      return
    }

    setEditModalOpen(false)
    setEditingRequest(null)
    setEditError('')
  }

  function handleEditFieldChange(
    field,
    value,
  ) {
    setEditForm(
      (current) => {
        const next = {
          ...current,
          [field]: value,
        }

        if (field === 'employeeId') {
          const employee =
            employees.find(
              (item) =>
                getEmployeeId(item) ===
                value,
            )

          next.department =
            employee?.department ||
            ''
        }

        return next
      },
    )
  }

  async function saveEditedRequest() {
    if (!editingRequest) {
      return
    }

    setEditError('')

    if (!editForm.employeeId) {
      setEditError(
        'Please select an employee.',
      )
      return
    }

    if (!editForm.leaveType) {
      setEditError(
        'Please select a leave type.',
      )
      return
    }

    if (!editForm.requestDate) {
      setEditError(
        'Please select the request date.',
      )
      return
    }

    if (!editForm.startDate) {
      setEditError(
        'Please select the start date.',
      )
      return
    }

    if (!editForm.endDate) {
      setEditError(
        'Please select the end date.',
      )
      return
    }

    if (
      editForm.endDate <
      editForm.startDate
    ) {
      setEditError(
        'The end date cannot be before the start date.',
      )
      return
    }

    const calculatedDays =
      calculateWorkingDays(
        editForm.startDate,
        editForm.endDate,
      )

    if (calculatedDays <= 0) {
      setEditError(
        'The selected date range contains no working days.',
      )
      return
    }

    if (
      !APPROVAL_STATUSES.includes(
        editForm.approvalStatus,
      )
    ) {
      setEditError(
        'Please select a valid approval status.',
      )
      return
    }

    setSaving(true)

    try {
      const isApproved =
        editForm.approvalStatus ===
        'Approved'

      const payload = {
        employeeId:
          editForm.employeeId,

        employeeName:
          employees.find(
            (employee) =>
              getEmployeeId(
                employee,
              ) ===
              editForm.employeeId,
          )?.name ||
          editingRequest.employeeName,

        department:
          editForm.department ||
          '—',

        leaveType:
          editForm.leaveType,

        requestDate:
          editForm.requestDate,

        startDate:
          editForm.startDate,

        endDate:
          editForm.endDate,

        days: calculatedDays,

        approvalStatus:
          editForm.approvalStatus,

        approvedBy: isApproved
          ? 'HR Manager'
          : null,

        approvedDate: isApproved
          ? getTodayString()
          : null,

        remarks:
          editForm.remarks.trim() ||
          null,
      }

      await updateLeaveRequest(
        editingRequest.id,
        payload,
      )

      const updatedRequests =
        await fetchLeaveRequests()

      const normalizedRequests =
        updatedRequests.map(
          normalizeLeaveRequest,
        )

      setRequests(
        normalizedRequests,
      )

      knownRequestIdsRef.current =
        new Set(
          normalizedRequests.map(
            (item) => item.id,
          ),
        )

      setEditModalOpen(false)
      setEditingRequest(null)
      setEditError('')
    } catch (err) {
      console.error(
        'Edit leave request error:',
        err,
      )

      setEditError(
        err.message ||
          'Failed to save leave request changes.',
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ============================================================
   * APPROVE / REJECT
   * ============================================================
   */

  async function updateStatus(
    request,
    approvalStatus,
  ) {
    setSaving(true)
    setError('')

    try {
      const approved =
        approvalStatus ===
        'Approved'

      const remarks =
        reviewRemarks.trim()

      await updateLeaveRequest(
        request.id,
        {
          approvalStatus,

          approvedBy: approved
            ? 'HR Manager'
            : null,

          approvedDate: approved
            ? getTodayString()
            : null,

          remarks:
            remarks ||
            request.remarks ||
            null,
        },
      )

      const updatedRequests =
        await fetchLeaveRequests()

      const normalizedRequests =
        updatedRequests.map(
          normalizeLeaveRequest,
        )

      setRequests(
        normalizedRequests,
      )

      knownRequestIdsRef.current =
        new Set(
          normalizedRequests.map(
            (item) => item.id,
          ),
        )

      setNewRequestIds(
        (current) => {
          const next =
            new Set(current)

          next.delete(request.id)

          return next
        },
      )

      setNewRequestCount(
        (current) =>
          Math.max(
            current -
              (newRequestIds.has(
                request.id,
              )
                ? 1
                : 0),
            0,
          ),
      )

      setReviewModalOpen(false)
      setReviewingRequest(null)
      setReviewRemarks('')
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

  async function approveRequest() {
    if (!reviewingRequest) {
      return
    }

    await updateStatus(
      reviewingRequest,
      'Approved',
    )
  }

  async function rejectRequest() {
    if (!reviewingRequest) {
      return
    }

    await updateStatus(
      reviewingRequest,
      'Rejected',
    )
  }

  /*
   * ============================================================
   * NOTIFICATIONS
   * ============================================================
   */

  function dismissNotification() {
    setNotificationVisible(false)
    setNotificationRequest(null)
  }

  function clearNewRequestNotifications() {
    setNewRequestIds(
      new Set(),
    )

    setNewRequestCount(0)

    setNotificationVisible(false)
    setNotificationRequest(null)
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-950">
      <main className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">

        {/* =====================================================
            NEW REQUEST NOTIFICATION
        ====================================================== */}

        {notificationVisible &&
          notificationRequest && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-lg">
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4755AE]">
                  <Bell size={20} />

                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    !
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-950">
                      New Leave Request
                    </p>

                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4755AE]">
                      Requires Review
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {
                        notificationRequest.employeeName
                      }
                    </span>{' '}
                    submitted a{' '}
                    <span className="font-semibold text-slate-900">
                      {
                        notificationRequest.leaveType
                      }
                    </span>{' '}
                    request for{' '}
                    <span className="font-semibold text-slate-900">
                      {formatNumber(
                        notificationRequest.days,
                      )}{' '}
                      days
                    </span>
                    .
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {
                      notificationRequest.startDate
                    }{' '}
                    →{' '}
                    {
                      notificationRequest.endDate
                    }
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openReviewModal(
                          notificationRequest,
                        )
                      }
                      className="rounded-lg bg-[#4755AE] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3d4998]"
                    >
                      Review Request
                    </button>

                    <button
                      type="button"
                      onClick={
                        dismissNotification
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    dismissNotification
                  }
                  className="shrink-0 text-slate-400 transition hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

        {/* =====================================================
            HEADER
        ====================================================== */}

        <PageTitle
          eyebrow="Leave Management"
          title="Manage Employee Leave"
          description="Review, approve, reject, and administer employee-submitted leave requests."
          action={
            <div className="flex items-center gap-2">
              {newRequestCount > 0 && (
                <button
                  type="button"
                  onClick={clearNewRequestNotifications}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <Check size={16} />
                  Mark New as Seen
                </button>
              )}
              <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                HR Review Inbox
              </div>
            </div>
          }
          className="mb-8"
        />

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error &&
          !reviewModalOpen &&
          !editModalOpen && (
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
          <div
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              pendingCount > 0
                ? 'border-amber-200 ring-1 ring-amber-100'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Review
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {pendingCount}
                </p>

                {pendingCount > 0 && (
                  <p className="mt-1 text-xs font-medium text-amber-600">
                    Requires HR action
                  </p>
                )}
              </div>

              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={20} />

                {pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
            </div>
          </div>

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
            LEAVE REQUEST INBOX
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  Employee Requests
                </p>

                {pendingCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </div>

              <h2 className="mt-1 text-lg font-bold">
                Leave Review Inbox
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Employee-submitted requests awaiting HR review.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Automatically checking for new requests
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
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#4755AE]" />

                <p className="text-sm font-medium text-slate-500">
                  Loading employee leave requests...
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
                Employee-submitted leave requests will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[1280px]">
                <Table.Header>
                  <Table.Row className="border-b border-slate-100 bg-slate-50/60 text-left">
                    <Table.Head className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Request
                    </Table.Head>

                    <Table.Head className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Employee
                    </Table.Head>

                    <Table.Head className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Leave Type
                    </Table.Head>

                    <Table.Head className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Dates
                    </Table.Head>

                    <Table.Head className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Days
                    </Table.Head>

                    <Table.Head className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </Table.Head>

                    <Table.Head className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      HR Action
                    </Table.Head>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {filteredRequests.map(
                    (request) => {
                      const isNew =
                        newRequestIds.has(
                          request.id,
                        )

                      return (
                        <Table.Row
                          key={
                            request.id
                          }
                          className={`border-b border-slate-50 transition ${
                            isNew
                              ? 'bg-indigo-50/40 hover:bg-indigo-50/70'
                              : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <Table.Cell className="px-5 py-4">
                            <div className="flex items-start gap-2">
                              {isNew && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                              )}

                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {request.id}
                                  </p>

                                  {isNew && (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600">
                                      New
                                    </span>
                                  )}
                                </div>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  Requested{' '}
                                  {request.requestDate ||
                                    '—'}
                                </p>
                              </div>
                            </div>
                          </Table.Cell>

                          <Table.Cell className="px-5 py-4">
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
                                    name:
                                      request.employeeName,
                                  },
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {
                                    request.employeeName
                                  }
                                </p>

                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-400">
                                    {
                                      request.employeeId
                                    }
                                  </span>

                                  <span className="text-slate-300">
                                    •
                                  </span>

                                  <span className="text-xs text-slate-400">
                                    {
                                      request.department
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Table.Cell>

                          <Table.Cell className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-semibold ${getLeaveTypeClasses(
                                request.leaveType,
                              )}`}
                            >
                              {
                                request.leaveType
                              }
                            </span>
                          </Table.Cell>

                          <Table.Cell className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {
                                request.startDate
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              to{' '}
                              {
                                request.endDate
                              }
                            </p>
                          </Table.Cell>

                          <Table.Cell className="px-5 py-4">
                            <span className="text-sm font-bold text-slate-900">
                              {formatNumber(
                                request.days,
                              )}
                            </span>

                            <span className="ml-1 text-xs text-slate-400">
                              days
                            </span>
                          </Table.Cell>

                          <Table.Cell className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                                request.approvalStatus,
                              )}`}
                            >
                              {
                                request.approvalStatus
                              }
                            </span>
                          </Table.Cell>

                          <Table.Cell className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {request.approvalStatus ===
                              'Pending' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openReviewModal(
                                      request,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isNew
                                      ? 'bg-[#4755AE] text-white hover:bg-[#3d4998]'
                                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <UserCheck
                                    size={
                                      15
                                    }
                                  />

                                  Review
                                </button>
                              ) : (
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
                                  className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-[#4755AE] transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Edit3
                                    size={
                                      15
                                    }
                                  />

                                  Edit
                                </button>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      )
                    },
                  )}
                </Table.Body>
              </Table>
            </div>
          )}
        </section>

        {/* =====================================================
            EMPLOYEE LEAVE BALANCE
            KEEPING THE BOTTOM SECTION
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
                    selectedEmployee
                      ? getEmployeeId(
                          selectedEmployee,
                        )
                      : ''
                  }
                  onChange={(event) => {
                    const employee =
                      employees.find(
                        (item) =>
                          getEmployeeId(
                            item,
                          ) ===
                          event.target.value,
                      )

                    setSelectedEmployee(
                      employee ||
                        null,
                    )
                  }}
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
                  <Table className="w-full min-w-[800px]">
                    <Table.Header>
                      <Table.Row className="border-b border-slate-100 text-left">
                        <Table.Head className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Request
                        </Table.Head>

                        <Table.Head className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Leave Type
                        </Table.Head>

                        <Table.Head className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Start
                        </Table.Head>

                        <Table.Head className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          End
                        </Table.Head>

                        <Table.Head className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Days
                        </Table.Head>

                        <Table.Head className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Status
                        </Table.Head>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      {selectedEmployeeRequests.length ===
                      0 ? (
                        <Table.Row>
                          <Table.Cell
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-slate-400"
                          >
                            No leave requests for this employee.
                          </Table.Cell>
                        </Table.Row>
                      ) : (
                        selectedEmployeeRequests.map(
                          (request) => (
                            <Table.Row
                              key={
                                request.id
                              }
                              className="border-b border-slate-50"
                            >
                              <Table.Cell className="px-4 py-3 text-sm font-semibold text-slate-700">
                                {
                                  request.id
                                }
                              </Table.Cell>

                              <Table.Cell className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getLeaveTypeClasses(
                                    request.leaveType,
                                  )}`}
                                >
                                  {
                                    request.leaveType
                                  }
                                </span>
                              </Table.Cell>

                              <Table.Cell className="px-4 py-3 text-sm text-slate-600">
                                {
                                  request.startDate
                                }
                              </Table.Cell>

                              <Table.Cell className="px-4 py-3 text-sm text-slate-600">
                                {
                                  request.endDate
                                }
                              </Table.Cell>

                              <Table.Cell className="px-4 py-3 text-sm font-semibold text-slate-700">
                                {formatNumber(
                                  request.days,
                                )}
                              </Table.Cell>

                              <Table.Cell className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                                    request.approvalStatus,
                                  )}`}
                                >
                                  {
                                    request.approvalStatus
                                  }
                                </span>
                              </Table.Cell>
                            </Table.Row>
                          ),
                        )
                      )}
                    </Table.Body>
                  </Table>
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
            HR REVIEW WORKFLOW
            KEEPING THE BOTTOM SECTION
        ====================================================== */}

        <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#4755AE] shadow-sm">
              <Bell size={17} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                HR Leave Review Workflow
              </h3>

              <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                <li>
                  • Employees submit their leave requests from the Employee Dashboard.
                </li>

                <li>
                  • Submitted requests automatically appear in this HR review inbox.
                </li>

                <li>
                  • The HR dashboard checks for new requests automatically every 15 seconds.
                </li>

                <li>
                  • New requests are highlighted and generate an HR notification.
                </li>

                <li>
                  • HR reviews the request before approving or rejecting it.
                </li>

                <li>
                  • Once a request is Approved or Rejected, an Edit button becomes available.
                </li>

                <li>
                  • Editing an existing approved request can update the employee, leave type, dates, status, or remarks.
                </li>

                <li>
                  • Returning an edited request to Pending sends it back into the HR review workflow.
                </li>

                <li>
                  • HR cannot create a brand-new leave request from this screen.
                </li>

                <li>
                  • Only Approved leave counts against the employee leave balance.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* =======================================================
          REVIEW MODAL
      ======================================================== */}

      <ReviewModal
        open={reviewModalOpen}
        request={reviewingRequest}
        saving={saving}
        error={error}
        reviewRemarks={
          reviewRemarks
        }
        onRemarksChange={
          setReviewRemarks
        }
        onClose={
          closeReviewModal
        }
        onApprove={
          approveRequest
        }
        onReject={
          rejectRequest
        }
      />

      {/* =======================================================
          EDIT MODAL
      ======================================================== */}

      <EditLeaveModal
        open={editModalOpen}
        request={editingRequest}
        employees={employees}
        saving={saving}
        error={editError}
        form={editForm}
        onChange={
          handleEditFieldChange
        }
        onClose={
          closeEditModal
        }
        onSave={
          saveEditedRequest
        }
      />
    </div>
  )
}

export default Leave