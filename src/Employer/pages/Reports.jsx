import { useState, useMemo } from 'react'
import {
  FileBarChart2,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Users,
  DollarSign,
  ShieldCheck,
  BarChart3,
  CalendarDays,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Hourglass,
  XCircle,
  Landmark,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { ALL_LEAVE } from '../data/leaveData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import LuxuryDataTable from '../components/LuxuryDataTable'

// Build synthetic history by scaling current run over past periods (3, 6, or 12).
function buildHistory(monthsCount = 6) {
  const attTotals = attendanceTotals(ATTENDANCE)
  const rows = INITIAL_EMPLOYEES.map((e) =>
    calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 })
  )
  const active = rows.filter((r) => r.active)

  const months = []
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
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
  }
  return months
}

const REPORT_TABS = [
  { id: 'payroll', label: 'Payroll', icon: BarChart3 },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'leave', label: 'Leave', icon: CalendarDays },
  { id: 'paymentTax', label: 'Payroll & Tax', icon: Wallet },
]

const CHART_METRICS = [
  { id: 'net', label: 'Net Pay' },
  { id: 'gross', label: 'Gross' },
  { id: 'tax', label: 'Tax' },
  { id: 'pension', label: 'Pension' },
  { id: 'otHours', label: 'OT Hours' },
]

const METRIC_LABELS = {
  net: 'Net Pay',
  gross: 'Gross Pay',
  tax: 'Income Tax',
  pension: 'Pension (18%)',
  otHours: 'OT Hours',
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: 12,
}

const STATUS_CHIP = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  Absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
  'Sick Leave': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  Pending: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
}

function Reports() {
  const [timeRange, setTimeRange] = useState(6) // 3, 6, or 12 months
  const [selectedDept, setSelectedDept] = useState('All')
  const [activeReportTab, setActiveReportTab] = useState('payroll') // payroll, attendance, leave, paymentTax
  const [chartMetric, setChartMetric] = useState('net') // net, gross, tax, pension, otHours

  const history = useMemo(() => buildHistory(timeRange), [timeRange])

  const departments = useMemo(() => {
    const set = new Set()
    INITIAL_EMPLOYEES.forEach((e) => set.add(e.department))
    return ['All', ...Array.from(set)]
  }, [])

  // Department cost breakdown
  const deptCosts = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    const map = {}
    INITIAL_EMPLOYEES.forEach((e) => {
      if (selectedDept !== 'All' && e.department !== selectedDept) return
      const r = calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 })
      if (!r.active) return
      if (!map[e.department]) {
        map[e.department] = { gross: 0, net: 0, tax: 0, pension: 0, count: 0, otHours: 0 }
      }
      map[e.department].gross += r.gross
      map[e.department].net += r.netSalary
      map[e.department].tax += r.incomeTax
      map[e.department].pension += r.pensionEmployee + r.pensionEmployer
      map[e.department].otHours += r.otHours || 0
      map[e.department].count += 1
    })
    Object.values(map).forEach((m) => {
      m.gross = roundMoney(m.gross)
      m.net = roundMoney(m.net)
      m.tax = roundMoney(m.tax)
      m.pension = roundMoney(m.pension)
      m.otHours = Math.round(m.otHours * 10) / 10
    })
    return map
  }, [selectedDept])

  const currentPeriodSummary = history[history.length - 1] || {
    gross: 0,
    tax: 0,
    pension: 0,
    net: 0,
    headcount: 0,
  }
  const prevPeriodSummary = history[history.length - 2] || currentPeriodSummary
  const netGrowth = prevPeriodSummary.net
    ? (((currentPeriodSummary.net - prevPeriodSummary.net) / prevPeriodSummary.net) * 100).toFixed(1)
    : '0.0'

  const totalGrossSum = history.reduce((s, h) => s + h.gross, 0)
  const totalNetSum = history.reduce((s, h) => s + h.net, 0)
  const totalTaxSum = history.reduce((s, h) => s + h.tax, 0)
  const totalPensionSum = history.reduce((s, h) => s + h.pension, 0)

  // ── Per-employee current-run rows (shared by Payment & Tax tab) ──
  const employeeRows = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    return INITIAL_EMPLOYEES.map((e) =>
      calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 })
    )
  }, [])

  const paymentTaxRows = useMemo(
    () =>
      employeeRows.filter(
        (r) => r.active && (selectedDept === 'All' || r.department === selectedDept)
      ),
    [employeeRows, selectedDept]
  )

  const paymentTaxTotals = useMemo(() => {
    const pick = (key) => roundMoney(paymentTaxRows.reduce((s, r) => s + (r[key] || 0), 0))
    return {
      gross: pick('gross'),
      tax: pick('incomeTax'),
      pensionEmp: pick('pensionEmployee'),
      pensionEmplr: pick('pensionEmployer'),
      net: pick('netSalary'),
    }
  }, [paymentTaxRows])

  // ── Attendance tab data ──
  const attendanceMetrics = useMemo(() => {
    let totalPresent = 0
    let totalAbsent = 0
    let totalSick = 0
    let totalOt = 0
    let totalLate = 0
    ATTENDANCE.forEach((a) => {
      if (a.status === 'Present') totalPresent += 1
      else if (a.status === 'Absent') totalAbsent += 1
      else if (a.status === 'Sick Leave') totalSick += 1
      totalOt += a.overtime || 0
      totalLate += a.late ? 1 : 0
    })
    return {
      present: totalPresent,
      absent: totalAbsent,
      sick: totalSick,
      overtime: Math.round(totalOt * 10) / 10,
      late: totalLate,
    }
  }, [])

  const attendanceRows = useMemo(
    () => ATTENDANCE.filter((a) => selectedDept === 'All' || a.department === selectedDept),
    [selectedDept]
  )

  // ── Leave tab data ──
  const leaveMetrics = useMemo(() => {
    const approved = ALL_LEAVE.filter((l) => l.approvalStatus === 'Approved').length
    const pending = ALL_LEAVE.filter((l) => l.approvalStatus === 'Pending').length
    const rejected = ALL_LEAVE.filter((l) => l.approvalStatus === 'Rejected').length
    const totalDays = ALL_LEAVE.reduce((s, l) => s + (l.days || 0), 0)
    return { approved, pending, rejected, totalDays }
  }, [])

  const leaveRows = useMemo(
    () => ALL_LEAVE.filter((l) => selectedDept === 'All' || l.department === selectedDept),
    [selectedDept]
  )

  // ── Export helpers (current tab → XLSX / PDF) ──
  const exportState = useMemo(() => {
    if (activeReportTab === 'attendance') {
      return {
        filename: `Attendance_Report_${selectedDept.replace(/\s+/g, '_')}`,
        sheet: 'Attendance Register',
        headers: ['Date', 'Employee ID', 'Employee', 'Department', 'Check In', 'Check Out', 'Regular Hrs', 'OT Hrs', 'Status'],
        rows: attendanceRows.map((a) => [
          a.date, a.employeeId, a.employeeName, a.department, a.checkIn || '', a.checkOut || '',
          a.regular ?? 0, a.overtime || 0, a.status,
        ]),
      }
    }
    if (activeReportTab === 'leave') {
      return {
        filename: `Leave_Report_${selectedDept.replace(/\s+/g, '_')}`,
        sheet: 'Leave Register',
        headers: ['Employee ID', 'Employee', 'Department', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Remarks'],
        rows: leaveRows.map((l) => [
          l.employeeId, l.employeeName, l.department, l.leaveType, l.startDate, l.endDate,
          l.days, l.approvalStatus, l.remarks || '',
        ]),
      }
    }
    if (activeReportTab === 'paymentTax') {
      return {
        filename: `Payroll_Tax_Register_${selectedDept.replace(/\s+/g, '_')}`,
        sheet: 'Payroll & Tax',
        headers: ['Employee ID', 'Employee', 'Department', 'Type', 'Gross Pay', 'PAYE Tax', 'Pension 7%', "Pension 11% (Empl'r)", 'Net Transfer'],
        rows: paymentTaxRows.map((r) => [
          r.employeeId, r.name, r.department, r.employmentType, r.gross, r.incomeTax,
          r.pensionEmployee, r.pensionEmployer, r.netSalary,
        ]),
      }
    }
    return {
      filename: `Payroll_Run_History_${timeRange}M`,
      sheet: 'Run History',
      headers: ['Period', 'Headcount', 'Gross Pay', 'Income Tax', 'Pension (18%)', 'Net Disbursement', 'Status'],
      rows: history.map((h) => [h.period, h.headcount, h.gross, h.tax, h.pension, h.net, h.status]),
    }
  }, [activeReportTab, attendanceRows, leaveRows, paymentTaxRows, history, timeRange, selectedDept])

  const exportXlsx = () => {
    const aoa = [exportState.headers, ...exportState.rows]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = exportState.headers.map((h, i) => ({
      wch: Math.max(
        h.length + 2,
        ...exportState.rows.map((r) => String(r[i] ?? '').length + 2),
      ),
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, exportState.sheet)
    XLSX.writeFile(wb, `${exportState.filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPdf = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    const html = `<!DOCTYPE html>
<html>
  <head>
    <title>${esc(exportState.filename)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
      h2 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
      p { margin: 0; font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
      th { background: #f8fafc; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; }
      td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) { background-color: #f8fafc; }
    </style>
  </head>
  <body>
    <h2>Yanol Technology PLC — Statutory &amp; Financial Report</h2>
    <p>${esc(exportState.sheet)} · Department: ${esc(selectedDept === 'All' ? 'All Departments' : selectedDept)} · Exported ${new Date().toLocaleString('en-ET')}</p>
    <table>
      <thead><tr>${exportState.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${exportState.rows
          .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table>
    <script>window.onload = function() { window.print(); window.close(); }</script>
  </body>
</html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const [exportOpen, setExportOpen] = useState(false)

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-ET', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const KpiCard = ({ label, value, sub, icon: Icon, iconCls, valueCls = 'text-gray-950 dark:text-gray-100' }) => (
    <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
        <span className="text-xs font-semibold">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-black tabular-nums ${valueCls}`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & GLOBAL CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] flex items-center justify-center shadow-xs">
            <FileBarChart2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">
              Statutory &amp; Financial Reports
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Historical payroll trends, tax/pension remittances, workforce utilization &amp; department allocations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range selector */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-[#1c2026] p-1 border border-gray-200 dark:border-[#262b31]">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setTimeRange(m)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeRange === m
                    ? 'bg-white dark:bg-[#252a32] text-gray-950 dark:text-gray-100 shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-gray-100'
                }`}
              >
                {m}M
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] rounded-xl px-3 py-1.5 shadow-2xs">
            <Filter size={13} className="text-gray-400 dark:text-gray-500" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs font-semibold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Export dropdown: XLSX / PDF */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="px-3.5 py-1.5 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-52 p-1.5 rounded-xl z-40 bg-white dark:bg-[#1c2026] shadow-xl border border-gray-200 dark:border-[#262b31] ring-1 ring-black/5">
                  <button
                    type="button"
                    onClick={() => { setExportOpen(false); exportXlsx() }}
                    className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold cursor-pointer transition-colors text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-gray-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Excel (.xlsx)
                      <span className="block text-[10px] font-normal text-gray-400 dark:text-gray-500">Formatted multi-column ledger</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportOpen(false); exportPdf() }}
                    className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold cursor-pointer transition-colors text-gray-700 hover:bg-rose-50 hover:text-rose-800 dark:text-gray-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  >
                    <FileText size={15} className="text-rose-500 dark:text-rose-400 shrink-0" />
                    <span>
                      PDF / Print
                      <span className="block text-[10px] font-normal text-gray-400 dark:text-gray-500">Formal report folio</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. REPORT SECTION TABS (Qirb-Alga ReportsSection schema)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 dark:bg-[#1c2026] rounded-2xl p-1.5 border border-gray-200 dark:border-[#262b31] w-max max-w-full">
        {REPORT_TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveReportTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                activeReportTab === t.id
                  ? 'bg-white dark:bg-[#252a32] text-emerald-600 dark:text-emerald-400 font-black shadow-lg'
                  : 'text-gray-500 dark:text-gray-400 font-bold hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-[#252a32]/60'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════
          TAB 1: PAYROLL
         ═════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'payroll' && (
        <>
          {/* Executive KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Latest Net Disbursement"
              value={formatETB(currentPeriodSummary.net)}
              sub={
                <span className="flex items-center gap-1.5 mt-1">
                  <span className={`font-bold inline-flex items-center gap-0.5 ${Number(netGrowth) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(netGrowth) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {netGrowth}%
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">vs previous period</span>
                </span>
              }
              icon={DollarSign}
              iconCls="bg-emerald-50 text-emerald-600"
            />

            <KpiCard
              label={`Cumulative Gross (${timeRange}M)`}
              value={formatETB(totalGrossSum)}
              sub="Basic wages + Allowances + OT"
              icon={BarChart3}
              iconCls="bg-indigo-50 text-indigo-600"
            />

            <KpiCard
              label="Statutory Tax Remitted"
              value={formatETB(totalTaxSum)}
              sub="Ministry of Revenues · Proc. 1395/2025"
              icon={ShieldCheck}
              iconCls="bg-rose-50 text-rose-600"
              valueCls="text-rose-700 dark:text-rose-400"
            />

            <KpiCard
              label="Pension Funds (18%)"
              value={formatETB(totalPensionSum)}
              sub="POESSA / PSSSA · Proc. 715/2011"
              icon={ShieldCheck}
              iconCls="bg-teal-50 text-teal-600"
              valueCls="text-teal-700 dark:text-teal-400"
            />
          </div>

          {/* Trajectory chart (recharts) */}
          <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100 flex items-center gap-2">
                  <TrendingUp size={15} className="text-gray-500 dark:text-gray-400" />
                  <span>{timeRange}-Month Financial &amp; Workforce Trajectory</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Comparative disbursement analysis across trailing reporting periods
                </p>
              </div>

              {/* Metric switcher */}
              <div className="flex flex-wrap items-center bg-gray-100 dark:bg-[#1c2026] p-1 rounded-xl border border-gray-200 dark:border-[#262b31] self-start sm:self-auto">
                {CHART_METRICS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setChartMetric(m.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      chartMetric === m.id
                        ? 'bg-gray-950 text-white dark:bg-[#252a32] dark:text-gray-100 shadow-2xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-gray-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={history} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" strokeOpacity={0.25} />
                  <XAxis dataKey="monthShort" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    tickFormatter={(v) =>
                      chartMetric === 'otHours' ? `${v}h` : `ETB ${(v / 1000).toFixed(0)}k`
                    }
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(val, key) => {
                      if (key === 'headcount') return [val, 'Headcount']
                      if (chartMetric === 'otHours') return [`${val}h`, METRIC_LABELS[chartMetric]]
                      return [formatETB(val), METRIC_LABELS[chartMetric]]
                    }}
                    labelFormatter={(label) => history.find((h) => h.monthShort === label)?.period || label}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey={chartMetric}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#reportAreaGrad)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="headcount"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                    activeDot={{ r: 4.5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  {METRIC_LABELS[chartMetric]} (left axis)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 rounded bg-indigo-500" />
                  Headcount (right axis)
                </span>
              </div>
              <span>Currency: ETB · Ethiopian Fiscal Year 2018 / 2026</span>
            </div>
          </div>

          {/* Department Cost Allocation */}
          <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                  Department Cost Allocation &amp; Headcount
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-semibold dark:text-gray-400">
                {Object.keys(deptCosts).length} Active Cost Centers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {Object.entries(deptCosts).map(([dept, m]) => {
                const shareOfGross = totalGrossSum
                  ? ((m.gross * (timeRange / 6)) / totalGrossSum) * 100
                  : 0

                return (
                  <div
                    key={dept}
                    className="rounded-xl border border-gray-200/80 dark:border-[#262b31] bg-gray-50/40 dark:bg-[#181c22]/60 p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-950 dark:text-gray-100 text-xs">{dept}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60">
                        {m.count} staff
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Gross Cost</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                          {formatETB(m.gross)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Net Disbursement</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatETB(m.net)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                        <span>Share of Payroll</span>
                        <span className="font-semibold">{shareOfGross.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-[#262b31] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 dark:bg-gray-200 rounded-full"
                          style={{ width: `${Math.min(100, shareOfGross)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payroll Run History Ledger */}
          <section id="historical-payroll-ledger">
            <LuxuryDataTable
              title="Payroll Run History Ledger"
              subtitle={`Trailing ${timeRange}-month certified run statements with statutory filing status`}
              countBadge={`${history.length} periods`}
              data={history}
              searchable={true}
              searchPlaceholder="Search periods (e.g. Sep 2026)..."
              searchKeys={['period', 'complianceRate', 'status']}
              exportable={true}
              exportFilename={`Payroll_Run_History_${timeRange}M`}
              columns={[
                {
                  key: 'period',
                  header: 'Period',
                  sortable: true,
                  render: (h) => (
                    <span className="font-bold text-gray-950 dark:text-gray-100">{h.period}</span>
                  ),
                },
                {
                  key: 'headcount',
                  header: 'Headcount',
                  sortable: true,
                  align: 'center',
                  render: (h) => (
                    <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                      {h.headcount} active
                    </span>
                  ),
                },
                {
                  key: 'gross',
                  header: 'Gross Pay',
                  sortable: true,
                  align: 'right',
                  render: (h) => (
                    <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">
                      {formatETB(h.gross)}
                    </span>
                  ),
                  exportValue: (h) => h.gross,
                },
                {
                  key: 'tax',
                  header: 'Income Tax',
                  sortable: true,
                  align: 'right',
                  render: (h) => (
                    <span className="tabular-nums text-rose-700 dark:text-rose-400 font-semibold">
                      {formatETB(h.tax)}
                    </span>
                  ),
                  exportValue: (h) => h.tax,
                },
                {
                  key: 'pension',
                  header: 'Pension (18%)',
                  sortable: true,
                  align: 'right',
                  render: (h) => (
                    <span className="tabular-nums text-teal-700 dark:text-teal-400 font-semibold">
                      {formatETB(h.pension)}
                    </span>
                  ),
                  exportValue: (h) => h.pension,
                },
                {
                  key: 'net',
                  header: 'Net Disbursement',
                  sortable: true,
                  align: 'right',
                  render: (h) => (
                    <span className="tabular-nums font-black text-gray-950 dark:text-gray-100 bg-emerald-50/60 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                      {formatETB(h.net)}
                    </span>
                  ),
                  exportValue: (h) => h.net,
                },
                {
                  key: 'status',
                  header: 'Statutory Status',
                  sortable: true,
                  align: 'center',
                  render: (h) => (
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
                      {h.status}
                    </span>
                  ),
                },
              ]}
              dropdownActions={[
                {
                  label: 'View Detailed Ledger',
                  onClick: (h) => alert(`Viewing ledger for ${h.period}: Gross ${formatETB(h.gross)}, Net ${formatETB(h.net)}`),
                },
                {
                  label: 'Download Bank Advice',
                  onClick: (h) => alert(`Bank advice file generated for ${h.period}`),
                },
              ]}
            />
          </section>
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 2: ATTENDANCE
         ═════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'attendance' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Present Entries"
              value={attendanceMetrics.present}
              sub="Check-ins logged this month"
              icon={CheckCircle2}
              iconCls="bg-emerald-50 text-emerald-600"
              valueCls="text-emerald-700 dark:text-emerald-400"
            />
            <KpiCard
              label="Absences"
              value={attendanceMetrics.absent}
              sub="Unexcused absence records"
              icon={XCircle}
              iconCls="bg-rose-50 text-rose-600"
              valueCls="text-rose-700 dark:text-rose-400"
            />
            <KpiCard
              label="Sick Leave"
              value={attendanceMetrics.sick}
              sub="Statutory sick-day logs"
              icon={CalendarDays}
              iconCls="bg-blue-50 text-blue-600"
              valueCls="text-blue-700 dark:text-blue-400"
            />
            <KpiCard
              label="Overtime Hours"
              value={`${attendanceMetrics.overtime}h`}
              sub={`${attendanceMetrics.late} late arrivals · Proc. 1156/2019`}
              icon={Clock}
              iconCls="bg-purple-50 text-purple-600"
              valueCls="text-purple-700 dark:text-purple-400"
            />
          </div>

          <LuxuryDataTable
            title="Attendance Log Register"
            subtitle="Daily check-in / check-out records with derived regular & overtime hours"
            countBadge={`${attendanceRows.length} entries`}
            data={attendanceRows}
            searchable={true}
            searchPlaceholder="Search employee, department..."
            searchKeys={['employeeName', 'employeeId', 'department', 'status']}
            exportable={true}
            exportFilename="Attendance_Report"
            columns={[
              {
                key: 'date',
                header: 'Date',
                sortable: true,
                render: (a) => (
                  <span className="font-mono text-gray-700 dark:text-gray-300">{fmtDate(a.date)}</span>
                ),
                exportValue: (a) => a.date,
              },
              {
                key: 'employeeName',
                header: 'Employee',
                sortable: true,
                render: (a) => (
                  <span className="font-bold text-gray-950 dark:text-gray-100">{a.employeeName}</span>
                ),
              },
              {
                key: 'department',
                header: 'Department',
                sortable: true,
                render: (a) => (
                  <span className="text-gray-600 dark:text-gray-400">{a.department}</span>
                ),
              },
              {
                key: 'checkIn',
                header: 'Check In',
                align: 'center',
                render: (a) => (
                  <span className="font-mono text-gray-700 dark:text-gray-300">{a.checkIn || '—'}</span>
                ),
                exportValue: (a) => a.checkIn || '',
              },
              {
                key: 'checkOut',
                header: 'Check Out',
                align: 'center',
                render: (a) => (
                  <span className="font-mono text-gray-700 dark:text-gray-300">{a.checkOut || '—'}</span>
                ),
                exportValue: (a) => a.checkOut || '',
              },
              {
                key: 'regular',
                header: 'Regular Hrs',
                sortable: true,
                align: 'right',
                render: (a) => (
                  <span className="tabular-nums text-gray-800 dark:text-gray-200">{a.regular ?? 0}h</span>
                ),
                exportValue: (a) => a.regular ?? 0,
              },
              {
                key: 'overtime',
                header: 'OT Hrs',
                sortable: true,
                align: 'right',
                render: (a) => (
                  <span className="tabular-nums font-semibold text-purple-700 dark:text-purple-400">
                    {a.overtime ? `${a.overtime}h` : '—'}
                  </span>
                ),
                exportValue: (a) => a.overtime || 0,
              },
              {
                key: 'status',
                header: 'Status',
                align: 'center',
                sortable: true,
                render: (a) => (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      STATUS_CHIP[a.status] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#1c2026] dark:text-gray-400 dark:border-[#33383f]'
                    }`}
                  >
                    {a.status}
                  </span>
                ),
              },
            ]}
            emptyMessage="No attendance records for the selected department."
          />
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 3: LEAVE
         ═════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'leave' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Approved Requests"
              value={leaveMetrics.approved}
              sub="Counted against balances"
              icon={CheckCircle2}
              iconCls="bg-emerald-50 text-emerald-600"
              valueCls="text-emerald-700 dark:text-emerald-400"
            />
            <KpiCard
              label="Pending Review"
              value={leaveMetrics.pending}
              sub="Awaiting HR decision"
              icon={Hourglass}
              iconCls="bg-amber-50 text-amber-600"
              valueCls="text-amber-700 dark:text-amber-400"
            />
            <KpiCard
              label="Rejected"
              value={leaveMetrics.rejected}
              sub="Declined applications"
              icon={XCircle}
              iconCls="bg-rose-50 text-rose-600"
              valueCls="text-rose-700 dark:text-rose-400"
            />
            <KpiCard
              label="Total Leave Days"
              value={leaveMetrics.totalDays}
              sub="All requests · all types"
              icon={CalendarDays}
              iconCls="bg-indigo-50 text-indigo-600"
            />
          </div>

          <LuxuryDataTable
            title="Leave Application Register"
            subtitle="Leave requests by type, duration & statutory approval status"
            countBadge={`${leaveRows.length} requests`}
            data={leaveRows}
            searchable={true}
            searchPlaceholder="Search employee, type, status..."
            searchKeys={['employeeName', 'employeeId', 'department', 'leaveType', 'approvalStatus']}
            exportable={true}
            exportFilename="Leave_Report"
            columns={[
              {
                key: 'employeeName',
                header: 'Employee',
                sortable: true,
                render: (l) => (
                  <span className="font-bold text-gray-950 dark:text-gray-100">{l.employeeName}</span>
                ),
              },
              {
                key: 'department',
                header: 'Department',
                sortable: true,
                render: (l) => (
                  <span className="text-gray-600 dark:text-gray-400">{l.department}</span>
                ),
              },
              {
                key: 'leaveType',
                header: 'Type',
                sortable: true,
                render: (l) => (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60">
                    {l.leaveType}
                  </span>
                ),
              },
              {
                key: 'startDate',
                header: 'Duration',
                sortable: true,
                render: (l) => (
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                  </span>
                ),
                exportValue: (l) => `${l.startDate} - ${l.endDate}`,
              },
              {
                key: 'days',
                header: 'Days',
                sortable: true,
                align: 'center',
                render: (l) => (
                  <span className="font-black text-gray-950 tabular-nums dark:text-gray-100">{l.days}d</span>
                ),
              },
              {
                key: 'approvalStatus',
                header: 'Status',
                align: 'center',
                sortable: true,
                render: (l) => (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      STATUS_CHIP[l.approvalStatus] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#1c2026] dark:text-gray-400 dark:border-[#33383f]'
                    }`}
                  >
                    {l.approvalStatus}
                  </span>
                ),
              },
              {
                key: 'remarks',
                header: 'Remarks',
                render: (l) => (
                  <span className="text-gray-500 max-w-xs truncate block dark:text-gray-400">
                    {l.remarks || '—'}
                  </span>
                ),
                exportValue: (l) => l.remarks || '',
              },
            ]}
            emptyMessage="No leave requests for the selected department."
          />
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 4: PAYROLL & TAX
         ═════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'paymentTax' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Gross Payroll"
              value={formatETB(paymentTaxTotals.gross)}
              sub={`${paymentTaxRows.length} active payees · current run`}
              icon={DollarSign}
              iconCls="bg-indigo-50 text-indigo-600"
            />
            <KpiCard
              label="PAYE Income Tax"
              value={formatETB(paymentTaxTotals.tax)}
              sub="Withheld & remitted · Proc. 1395/2025"
              icon={Landmark}
              iconCls="bg-rose-50 text-rose-600"
              valueCls="text-rose-700 dark:text-rose-400"
            />
            <KpiCard
              label="Pension Remitted"
              value={formatETB(roundMoney(paymentTaxTotals.pensionEmp + paymentTaxTotals.pensionEmplr))}
              sub="7% employee + 11% employer"
              icon={ShieldCheck}
              iconCls="bg-teal-50 text-teal-600"
              valueCls="text-teal-700 dark:text-teal-400"
            />
            <KpiCard
              label="Net Transferred"
              value={formatETB(paymentTaxTotals.net)}
              sub="Bank disbursement total"
              icon={Users}
              iconCls="bg-emerald-50 text-emerald-600"
              valueCls="text-emerald-700 dark:text-emerald-400"
            />
          </div>

          <LuxuryDataTable
            title="Payroll & Tax Register"
            subtitle="Per-employee gross, statutory withholding (PAYE + pension) and net bank transfer — current run"
            countBadge={`${paymentTaxRows.length} employees`}
            data={paymentTaxRows}
            searchable={true}
            searchPlaceholder="Search employee, ID, department..."
            searchKeys={['employeeId', 'name', 'department', 'employmentType']}
            exportable={true}
            exportFilename="Payroll_Tax_Register"
            columns={[
              {
                key: 'employeeId',
                header: 'ID',
                sortable: true,
                render: (r) => (
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{r.employeeId}</span>
                ),
                exportValue: (r) => r.employeeId,
              },
              {
                key: 'name',
                header: 'Employee',
                sortable: true,
                render: (r) => (
                  <span className="font-bold text-gray-950 dark:text-gray-100">{r.name}</span>
                ),
              },
              {
                key: 'department',
                header: 'Department',
                sortable: true,
                render: (r) => (
                  <span className="text-gray-600 dark:text-gray-400">{r.department}</span>
                ),
              },
              {
                key: 'employmentType',
                header: 'Type',
                sortable: true,
                render: (r) => (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60">
                    {r.employmentType}
                  </span>
                ),
                exportValue: (r) => r.employmentType,
              },
              {
                key: 'gross',
                header: 'Gross Pay',
                sortable: true,
                align: 'right',
                render: (r) => (
                  <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">
                    {formatETB(r.gross)}
                  </span>
                ),
                exportValue: (r) => r.gross,
              },
              {
                key: 'incomeTax',
                header: 'PAYE Tax',
                sortable: true,
                align: 'right',
                render: (r) => (
                  <span className="tabular-nums text-rose-700 dark:text-rose-400 font-semibold">
                    {formatETB(r.incomeTax)}
                  </span>
                ),
                exportValue: (r) => r.incomeTax,
              },
              {
                key: 'pensionEmployee',
                header: 'Pension 7%',
                sortable: true,
                align: 'right',
                render: (r) => (
                  <span className="tabular-nums text-teal-700 dark:text-teal-400">
                    {formatETB(r.pensionEmployee)}
                  </span>
                ),
                exportValue: (r) => r.pensionEmployee,
              },
              {
                key: 'pensionEmployer',
                header: "Pension 11% (Empl'r)",
                sortable: true,
                align: 'right',
                render: (r) => (
                  <span className="tabular-nums text-blue-700 dark:text-blue-400">
                    {formatETB(r.pensionEmployer)}
                  </span>
                ),
                exportValue: (r) => r.pensionEmployer,
              },
              {
                key: 'netSalary',
                header: 'Net Transfer',
                sortable: true,
                align: 'right',
                render: (r) => (
                  <span className="tabular-nums font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                    {formatETB(r.netSalary)}
                  </span>
                ),
                exportValue: (r) => r.netSalary,
              },
              {
                key: 'exempt',
                header: 'Tax Status',
                align: 'center',
                render: (r) => (
                  r.exempt ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800" title="Contractual/Intern — no statutory tax or pension">
                      <XCircle size={11} /> Exempt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800">
                      <CheckCircle2 size={11} /> Taxed
                    </span>
                  )
                ),
                exportValue: (r) => (r.exempt ? 'Exempt' : 'Taxed'),
              },
            ]}
            headerActions={
              <span className="text-xs text-gray-500 font-mono dark:text-gray-400 self-center hidden sm:inline">
                Net Total: {formatETB(paymentTaxTotals.net)}
              </span>
            }
            emptyMessage="No employees for the selected department."
          />
        </>
      )}
    </div>
  )
}

export default Reports
