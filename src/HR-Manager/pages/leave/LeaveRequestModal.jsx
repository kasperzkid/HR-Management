import { AlertTriangle, CalendarDays, Check, FileText, Users, X } from 'lucide-react'
import {
  LEAVE_TYPES,
  STATUSES,
  getDepartment,
  getEmployeeId,
  getEmployeeName,
  getInitials,
  calculateWorkingDays,
  hasOverlap,
  inputClassName,
} from './leaveHelpers'

export function Field({
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

export function SectionTitle({ icon: Icon, title, description }) {
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

export function StatCard({
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

export default function LeaveRequestModal({
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
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white dark:bg-[#15181d] shadow-2xl border border-slate-200 dark:border-[#262b31]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">
              {editingRequest
                ? 'Edit Leave Request'
                : 'New Leave Request'}
            </h2>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-gray-400">
              Enter the leave request details below.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] dark:hover:text-gray-200 cursor-pointer"
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
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-slate-700 dark:text-gray-300 shadow-2xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={Boolean(invalidDates) || numberOfDays <= 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
