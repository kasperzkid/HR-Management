import { useState, useMemo } from 'react'
import {
  FileBarChart2,
  TrendingUp,
  Download,
  Printer,
  Filter,
  Users,
  DollarSign,
  ShieldCheck,
  BarChart3,
  CalendarDays,
  Clock,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CalendarCheck,
} from 'lucide-react'
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

function Reports() {
  const [timeRange, setTimeRange] = useState(6) // 3, 6, or 12 months
  const [selectedDept, setSelectedDept] = useState('All')
  const [activeReportTab, setActiveReportTab] = useState('payroll') // payroll, attendance, leave
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

  const maxMetricValue = Math.max(...history.map((h) => h[chartMetric] || 1))

  // Attendance summary metrics
  const attendanceMetrics = useMemo(() => {
    let totalPresent = 0
    let totalAbsent = 0
    let totalSick = 0
    let totalOt = 0
    ATTENDANCE.forEach((a) => {
      if (a.status === 'Present') totalPresent += 1
      else if (a.status === 'Absent') totalAbsent += 1
      else if (a.status === 'Sick Leave') totalSick += 1
      totalOt += a.overtime || 0
    })
    return {
      present: totalPresent,
      absent: totalAbsent,
      sick: totalSick,
      overtime: Math.round(totalOt * 10) / 10,
    }
  }, [])

  // Leave summary metrics
  const leaveMetrics = useMemo(() => {
    const approved = ALL_LEAVE.filter((l) => l.approvalStatus === 'Approved').length
    const pending = ALL_LEAVE.filter((l) => l.approvalStatus === 'Pending').length
    const rejected = ALL_LEAVE.filter((l) => l.approvalStatus === 'Rejected').length
    const totalDays = ALL_LEAVE.reduce((s, l) => s + (l.days || 0), 0)
    return { approved, pending, rejected, totalDays }
  }, [])

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">
                Statutory &amp; Financial Reports
              </h1>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                Proc. 1395/2025 Compliant
              </span>
            </div>
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

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 shadow-xs transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXECUTIVE KPI SUMMARY CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Latest Period Net */}
        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold">Latest Net Disbursement</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-950 dark:text-gray-100 tabular-nums">
              {formatETB(currentPeriodSummary.net)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span
                className={`font-bold inline-flex items-center gap-0.5 ${
                  Number(netGrowth) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {Number(netGrowth) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {netGrowth}%
              </span>
              <span className="text-gray-400 dark:text-gray-500">vs previous period</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cumulative Gross Cost */}
        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold">Cumulative Gross ({timeRange}M)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-950 dark:text-gray-100 tabular-nums">
              {formatETB(totalGrossSum)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Basic wages + Allowances + OT
            </p>
          </div>
        </div>

        {/* Card 3: Statutory Income Tax Remittance */}
        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold">Statutory Tax Remitted</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-rose-700 dark:text-rose-400 tabular-nums">
              {formatETB(totalTaxSum)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Ministry of Revenues · Proc. 1395/2025
            </p>
          </div>
        </div>

        {/* Card 4: Pension Funds Remitted */}
        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold">Pension Funds (18%)</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-teal-700 dark:text-teal-400 tabular-nums">
              {formatETB(totalPensionSum)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              POESSA / PSSSA · Proc. 715/2011
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TREND CHART & STATUTORY REPORT NAV TABS
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100 flex items-center gap-2">
              <span>{timeRange}-Month Financial &amp; Workforce Trajectory</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comparative disbursement analysis across trailing reporting periods
            </p>
          </div>

          {/* Metric switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-[#1c2026] p-1 rounded-xl border border-gray-200 dark:border-[#262b31] self-start sm:self-auto">
            {[
              { id: 'net', label: 'Net Pay' },
              { id: 'gross', label: 'Gross' },
              { id: 'tax', label: 'Tax' },
              { id: 'pension', label: 'Pension' },
              { id: 'otHours', label: 'OT Hours' },
            ].map((m) => (
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

        {/* Responsive Bar Chart */}
        <div className="flex items-end gap-3 h-44 pt-6 pb-2 px-2 border-b border-gray-100 dark:border-[#262b31]">
          {history.map((h) => {
            const val = h[chartMetric]
            const heightPx = Math.max(10, (val / maxMetricValue) * 125)
            const isLatest = h.period === currentPeriodSummary.period

            return (
              <div
                key={h.period}
                className="flex-1 flex flex-col items-center gap-1.5 min-w-0 group relative cursor-pointer"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-11 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-gray-950 text-white text-[10px] font-mono rounded-lg px-2 py-1 pointer-events-none whitespace-nowrap z-20 shadow-xl">
                  {h.period}: {chartMetric === 'otHours' ? `${val}h` : formatETB(val)}
                </div>

                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center font-medium font-mono">
                  {chartMetric === 'otHours'
                    ? `${val}h`
                    : formatETB(val).replace('.00', '').replace('ETB ', '')}
                </span>

                <div
                  className={`w-full rounded-t-lg transition-all duration-300 group-hover:opacity-90 ${
                    isLatest
                      ? 'bg-emerald-600 dark:bg-emerald-500 shadow-xs'
                      : 'bg-gray-900 dark:bg-[#3a4149]'
                  }`}
                  style={{ height: `${heightPx}px` }}
                />

                <span
                  className={`text-[10.5px] truncate w-full text-center font-medium ${
                    isLatest
                      ? 'font-bold text-emerald-700 dark:text-emerald-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {h.period.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-gray-900 dark:bg-[#3a4149]" />
              Trailing Periods
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600" />
              Latest Closed Run
            </span>
          </div>
          <span>Currency: ETB · Ethiopian Fiscal Year 2018 / 2026</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. DEPARTMENT COST ALLOCATION
         ───────────────────────────────────────────────────────────── */}
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

      {/* ─────────────────────────────────────────────────────────────
          5. PAYROLL RUN HISTORY LEDGER (Qirb-Alga Luxury Table)
         ───────────────────────────────────────────────────────────── */}
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
    </div>
  )
}

export default Reports
