// ─────────────────────────────────────────────────────────────
// Reports page — configuration constants & history aggregation.
// Extracted from pages/Reports.jsx.
// ─────────────────────────────────────────────────────────────

import { calcPayroll, roundMoney } from '../../lib/payroll'
import { attendanceTotals } from '../../lib/attendanceUtils'

// Aggregate real PayrollRecord rows into per-month history over a date
// range (falls back to the trailing 6 months when no range is selected).
// The current month merges certified records with the live computed run
// so in-progress periods stay up to date.
export function buildHistory(dateRange, employees, attendance, payrollRecords = []) {
  const attTotals = attendanceTotals(attendance)
  const rows = employees.map((e) =>
    calcPayroll(e, attTotals[e.id] || attTotals[e.employeeId] || { totalOtHours: 0 })
  )
  const active = rows.filter((r) => r.active)

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const from =
    dateRange?.from instanceof Date && !Number.isNaN(dateRange.from.getTime())
      ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const to =
    dateRange?.to instanceof Date && !Number.isNaN(dateRange.to.getTime())
      ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth() + 1, 0)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const fromKey = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`
  const toKey = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}`

  // Group certified records by month key.
  const byMonth = new Map()
  for (const rec of payrollRecords) {
    const key = String(rec.payrollMonth || '')
    if (!key || key < fromKey || key > toKey) continue
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key).push(rec)
  }

  // Walk every month in the range; include months that have certified
  // records OR are the current (live) month.
  const months = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  let i = 0
  while (cursor <= to) {
    const d = new Date(cursor)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthRows = byMonth.get(key)
    const isCurrentMonth = key === currentMonthKey

    if (monthRows || isCurrentMonth) {
      let gross
      let tax
      let pension
      let net
      let otHours
      let headcount

      if (monthRows) {
        gross = monthRows.reduce((s, r) => s + (r.grossSalary || 0), 0)
        tax = monthRows.reduce((s, r) => s + (r.incomeTax || 0), 0)
        pension = monthRows.reduce(
          (s, r) => s + (r.pensionDeduction || 0) + (r.employerPension || 0),
          0,
        )
        net = monthRows.reduce((s, r) => s + (r.netSalary || 0), 0)
        otHours = monthRows.reduce((s, r) => s + (r.overtimePay || 0), 0)
        headcount = monthRows.length
      }

      if (isCurrentMonth) {
        // Overlay the live computed run for the in-progress period.
        const liveGross = active.reduce((s, r) => s + r.gross, 0)
        const liveNet = active.reduce((s, r) => s + r.netSalary, 0)
        const liveTax = active.reduce((s, r) => s + r.incomeTax, 0)
        const livePension = active.reduce(
          (s, r) => s + r.pensionEmployee + r.pensionEmployer,
          0,
        )
        const liveOtHours = active.reduce((s, r) => s + (r.otHours || 0), 0)
        if (monthRows) {
          gross = roundMoney(Math.max(gross, liveGross))
          net = roundMoney(Math.max(net, liveNet))
          tax = roundMoney(Math.max(tax, liveTax))
          pension = roundMoney(Math.max(pension, livePension))
          otHours = Math.max(otHours, liveOtHours)
          headcount = Math.max(headcount, active.length)
        } else {
          gross = roundMoney(liveGross)
          tax = roundMoney(liveTax)
          pension = roundMoney(livePension)
          net = roundMoney(liveNet)
          otHours = Math.round(liveOtHours * 10) / 10
          headcount = active.length
        }
      } else {
        gross = roundMoney(gross)
        tax = roundMoney(tax)
        pension = roundMoney(pension)
        net = roundMoney(net)
        otHours = Math.round(otHours * 10) / 10
      }

      months.push({
        id: `rep-${key}`,
        period: d.toLocaleString('en-ET', { month: 'short', year: 'numeric' }),
        monthShort: d.toLocaleString('en-ET', { month: 'short' }),
        dateSort: d.getTime(),
        gross,
        tax,
        pension,
        net,
        otHours,
        headcount,
        complianceRate: '100%',
        status: isCurrentMonth ? 'Live — In Progress' : 'Filed & Closed',
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
    i += 1
  }
  return months
}

export const REPORT_TABS = [
  { id: 'payroll', label: 'Payroll', icon: null },
  { id: 'attendance', label: 'Attendance', icon: null },
  { id: 'leave', label: 'Leave', icon: null },
  { id: 'paymentTax', label: 'Payroll & Tax', icon: null },
]

export const CHART_METRICS = [
  { id: 'net', label: 'Net Pay' },
  { id: 'gross', label: 'Gross' },
  { id: 'tax', label: 'Tax' },
  { id: 'pension', label: 'Pension' },
  { id: 'otHours', label: 'OT Hours' },
]

export const METRIC_LABELS = {
  net: 'Net Pay',
  gross: 'Gross Pay',
  tax: 'Income Tax',
  pension: 'Pension (18%)',
  otHours: 'OT Hours',
}

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: 12,
}

export const STATUS_CHIP = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  Absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
  'Sick Leave': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  Pending: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
}

export function fmtDate(d) {
  return d
    ? new Date(d).toLocaleDateString('en-ET', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
}
