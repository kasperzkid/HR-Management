// ─────────────────────────────────────────────────────────────
// Shared attendance-status helpers.
// Consumed by BOTH portals:
//   • src/Employer/**  — punch flow + HR-status feedback banner
//   • src/HR-Manager/** — dashboard panel & attendance grid
// The database stores these as Attendance.status / .hrStatus.
// ─────────────────────────────────────────────────────────────

// Statuses set by punches / HR grid codes.
export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
  SICK_LEAVE: 'Sick Leave',
  ON_LEAVE: 'On Leave',
  EMERGENCY_DEPARTURE: 'Emergency Departure',
}

// Codes shown in the HR attendance grid.
export const CODE_LABELS_MAP = {
  P: 'Present',
  A: 'Absent',
  SL: 'Sick Leave',
  AL: 'Annual Leave',
  ML: 'Maternity Leave',
  OL: 'Other Leave',
  PH: 'Public Holiday',
  WK: 'Weekend',
  HD: 'Half Day',
  ED: 'Emergency Departure',
}

// DB values come from two writers (punch clock writes full labels,
// the HR grid writes codes) — normalise everything to labels.
export function normalizeStatusLabel(status) {
  const raw = String(status || '').trim()
  if (!raw) return ''
  if (CODE_LABELS_MAP[raw]) return CODE_LABELS_MAP[raw]

  const lower = raw.toLowerCase()
  if (lower === 'emergency departure' || lower === 'ed') {
    return ATTENDANCE_STATUS.EMERGENCY_DEPARTURE
  }
  if (lower === 'sick leave' || lower === 'sl') return ATTENDANCE_STATUS.SICK_LEAVE
  if (lower === 'annual leave' || lower === 'al') return ATTENDANCE_STATUS.ON_LEAVE
  if (lower === 'maternity leave' || lower === 'ml') return ATTENDANCE_STATUS.ON_LEAVE
  if (lower === 'other leave' || lower === 'ol') return ATTENDANCE_STATUS.ON_LEAVE
  if (lower === 'on leave') return ATTENDANCE_STATUS.ON_LEAVE
  if (lower === 'half day' || lower === 'hd') return 'Half Day'
  if (lower === 'present' || lower === 'p') return ATTENDANCE_STATUS.PRESENT
  if (lower === 'absent' || lower === 'a') return ATTENDANCE_STATUS.ABSENT
  if (lower === 'late') return ATTENDANCE_STATUS.LATE
  if (lower === 'weekend' || lower === 'wk') return 'Weekend'
  if (lower === 'public holiday' || lower === 'ph') return 'Public Holiday'
  return raw
}

export function isEmergencyStatus(status) {
  return normalizeStatusLabel(status) === ATTENDANCE_STATUS.EMERGENCY_DEPARTURE
}

// ── HR review statuses ───────────────────────────────────────
export const HR_STATUSES = ['Acknowledged', 'Approved', 'Absent', 'Rejected', 'Pending Review']

export const HR_STATUS_CLASSES = {
  Acknowledged: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Approved: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  Absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  'Pending Review': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
}

export function hrStatusClass(status) {
  return (
    HR_STATUS_CLASSES[status] ||
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#1c2026] dark:text-slate-300 dark:border-[#262b31]'
  )
}

// Employee-facing tone for a punch/HR status.
export function punchStatusTone(status) {
  const label = normalizeStatusLabel(status)
  if (label === ATTENDANCE_STATUS.EMERGENCY_DEPARTURE) return 'amber'
  if (label === ATTENDANCE_STATUS.ABSENT) return 'rose'
  if (label === ATTENDANCE_STATUS.LATE) return 'amber'
  return 'emerald'
}
