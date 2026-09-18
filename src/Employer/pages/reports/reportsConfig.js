// ─────────────────────────────────────────────────────────────
// Reports page — configuration constants & history aggregation.
// Extracted from pages/Reports.jsx.
// ─────────────────────────────────────────────────────────────

import { calcPayroll, roundMoney } from '../../lib/payroll'
import { attendanceTotals } from '../../lib/attendanceUtils'

// Build history from the current run over a date range (falls back to the
// trailing 6 months when no range is selected).
export function buildHistory(dateRange, employees, attendance) {
  const attTotals = attendanceTotals(attendance)
  const rows = employees.map((e) =>
    calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 })
  )
  const active = rows.filter((r) => r.active)

  const now = new Date()
  const from =
    dateRange?.from instanceof Date && !Number.isNaN(dateRange.from.getTime())
      ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const to =
    dateRange?.to instanceof Date && !Number.isNaN(dateRange.to.getTime())
      ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth() + 1, 0)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const months = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  let i = 0
  while (cursor <= to) {
    const d = new Date(cursor)
    const factor = 1 - i * 0.015 + (i === 2 ? 0.05 : 0)

    const gross = roundMoney(active.reduce((s, r) => s + r.gross, 0) * factor)
    const tax = roundMoney(active.reduce((s, r) => s + r.incomeTax, 0) * factor)
    const pension = roundMoney(
      active.reduce((s, r) => s + r.pensionEmployee + r.pensionEmployer, 0) * factor
    )
    const net = roundMoney(active.reduce((s, r) => s + r.netSalary, 0) * factor)
    const otHours = Math.round(active.reduce((s, r) => s + r.otHours, 0) * factor * 10) / 10

    months.push({
      id: `rep-${i}`,
      period: d.toLocaleString('en-ET', { month: 'short', year: 'numeric' }),
      monthShort: d.toLocaleString('en-ET', { month: 'short' }),
      dateSort: d.getTime(),
      gross,
      tax,
      pension,
      net,
      otHours,
      headcount: active.length,
      complianceRate: '100%',
      status: 'Filed & Closed',
    })
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
