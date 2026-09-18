// ─────────────────────────────────────────────────────────────
// Leave page helpers — date math, entitlement rules, formatters.
// Extracted from pages/Leave.jsx so the page file stays focused
// on state + layout.
// ─────────────────────────────────────────────────────────────

export const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Other Leave',
]

export const STATUSES = ['Pending', 'Approved', 'Rejected']

export const DEPARTMENTS = [
  'All Departments',
  'Engineering',
  'Human Resources',
  'Finance',
  'Operations',
  'Sales',
  'Marketing',
  'IT',
]

export function getEmployeeName(employee) {
  return (
    employee?.name ||
    [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
    'Unknown Employee'
  )
}

export function getEmployeeId(employee) {
  return employee?.employeeId || employee?.id || ''
}

export function getDepartment(employee) {
  return employee?.department || 'Unassigned'
}

export function formatDate(value) {
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
export function calculateWorkingDays(startDate, endDate) {
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

export function calculateAnnualEntitlement(joinDate) {
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

export function getInitials(name) {
  if (!name) return '??'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function getStatusClass(status) {
  if (status === 'Approved') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }

  if (status === 'Rejected') {
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return 'bg-amber-50 text-amber-700 border-amber-200'
}

export function getLeaveTypeClass(type) {
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

export function hasOverlap(request, requests, excludeId = '') {
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

// Shared styling for inline select filters (also used by the modal)
export const inputClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export const selectClass =
  'h-9 pl-2.5 pr-7 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium'
