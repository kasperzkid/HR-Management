import { authHeaders } from '../../lib/hrApi'

const API_BASE = '/api/employer'

async function ef(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(
      options.body ? { 'Content-Type': 'application/json' } : {}
    ),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed: ${res.status}`)
    err.code = data.code
    err.remainingMinutes = data.remainingMinutes
    throw err
  }
  return data
}

// ── Employees ────────────────────────────────────────────────
export const fetchEmployees = () => ef('/employees')

// ── Attendance ───────────────────────────────────────────────
// Optional { month, year } limits the rows to that calendar month so
// the payroll / payslip previews match the period actually selected.
export const fetchAttendance = ({ month, year } = {}) => {
  const params = new URLSearchParams()
  if (month && year) {
    const padded = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    params.set('startDate', `${year}-${padded}-01`)
    params.set('endDate', `${year}-${padded}-${String(lastDay).padStart(2, '0')}`)
  }
  const qs = params.toString()
  return ef(`/attendance${qs ? `?${qs}` : ''}`)
}

// ── Payroll run history (real PayrollRecord rows) ────────────
export const fetchPayrollRecords = () => ef('/payroll').then((d) => d?.records || [])

// ── Leave requests ───────────────────────────────────────────
export const fetchLeaveRequests = () => ef('/leave')
export const createLeaveRequest = (payload) =>
  ef('/leave', { method: 'POST', body: JSON.stringify(payload) })
