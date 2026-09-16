import { useState, useMemo } from 'react'
import { CalendarRange, FileBarChart2, TrendingUp, Download, Printer, Filter, Search, Users, DollarSign, ShieldCheck, BarChart3, ArrowUpRight } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'

// Build synthetic history by scaling current run over past periods (6 or 12).
function buildHistory(monthsCount = 6) {
  const attTotals = attendanceTotals(ATTENDANCE)
  const rows = INITIAL_EMPLOYEES.map((e) => calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 }))
  const months = []
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const factor = 1 - i * 0.01 + (i === 2 ? 0.08 : 0)
    const active = rows.filter((r) => r.active)
    months.push({
      period: d.toLocaleString('en-ET', { month: 'short', year: 'numeric' }),
      gross: roundMoney(active.reduce((s, r) => s + r.gross, 0) * factor),
      tax: roundMoney(active.reduce((s, r) => s + r.incomeTax, 0) * factor),
      pension: roundMoney(active.reduce((s, r) => s + r.pensionEmployee + r.pensionEmployer, 0) * factor),
      net: roundMoney(active.reduce((s, r) => s + r.netSalary, 0) * factor),
      headcount: active.length,
    })
  }
  return months
}

function Reports() {
  const [timeRange, setTimeRange] = useState(6) // 6 or 12 months
  const [selectedDept, setSelectedDept] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [chartMetric, setChartMetric] = useState('net') // net, gross, tax, pension
  const [toast, setToast] = useState(null)

  const history = useMemo(() => buildHistory(timeRange), [timeRange])

  const departments = useMemo(() => {
    const set = new Set()
    INITIAL_EMPLOYEES.forEach((e) => set.add(e.department))
    return ['All', ...Array.from(set)]
  }, [])

  const deptCosts = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    const map = {}
    INITIAL_EMPLOYEES.forEach((e) => {
      if (selectedDept !== 'All' && e.department !== selectedDept) return
      const r = calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 })
      if (!r.active) return
      if (!map[e.department]) map[e.department] = { gross: 0, net: 0, tax: 0, pension: 0, count: 0 }
      map[e.department].gross += r.gross
      map[e.department].net += r.netSalary
      map[e.department].tax += r.incomeTax
      map[e.department].pension += r.pensionEmployee + r.pensionEmployer
      map[e.department].count += 1
    })
    Object.values(map).forEach((m) => {
      m.gross = roundMoney(m.gross)
      m.net = roundMoney(m.net)
      m.tax = roundMoney(m.tax)
      m.pension = roundMoney(m.pension)
    })
    return map
  }, [selectedDept])

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history
    const q = searchQuery.toLowerCase()
    return history.filter((h) => h.period.toLowerCase().includes(q))
  }, [history, searchQuery])

  const currentPeriodSummary = history[history.length - 1] || { gross: 0, tax: 0, pension: 0, net: 0, headcount: 0 }
  const prevPeriodSummary = history[history.length - 2] || currentPeriodSummary
  const netGrowth = prevPeriodSummary.net ? (((currentPeriodSummary.net - prevPeriodSummary.net) / prevPeriodSummary.net) * 100).toFixed(1) : '0.0'

  const totalGrossSum = history.reduce((s, h) => s + h.gross, 0)
  const totalNetSum = history.reduce((s, h) => s + h.net, 0)
  const totalTaxSum = history.reduce((s, h) => s + h.tax, 0)
  const totalPensionSum = history.reduce((s, h) => s + h.pension, 0)

  const maxMetricValue = Math.max(...history.map((h) => h[chartMetric]))

  const handleExportCSV = () => {
    const headers = ['Period,Headcount,Gross (ETB),Income Tax (ETB),Pension (ETB),Net (ETB)']
    const rows = history.map((h) => `"${h.period}",${h.headcount},${h.gross},${h.tax},${h.pension},${h.net}`)
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `payroll_reports_${timeRange}m.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setToast('Exported CSV successfully.')
    setTimeout(() => setToast(null), 3000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-[1500px] mx-auto text-xs">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-[11px] font-medium">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gray-950 text-white flex items-center justify-center">
            <FileBarChart2 size={16} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-950">Payroll & Financial Reports</h1>
            <p className="text-[11px] text-gray-500">
              Historical runs, tax/pension summaries, and departmental cost breakdown.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selector */}
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-200">
            <button
              onClick={() => setTimeRange(6)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                timeRange === 6 ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              6M
            </button>
            <button
              onClick={() => setTimeRange(12)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                timeRange === 12 ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              12M
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 shadow-2xs">
            <Filter size={12} className="text-gray-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-[11px] font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d === 'All' ? 'All Depts' : d}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-[11px] font-semibold flex items-center gap-1 hover:bg-gray-50 shadow-2xs transition-colors"
          >
            <Download size={13} />
            CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-gray-950 text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-gray-800 shadow-xs transition-colors"
          >
            <Printer size={13} />
            Print
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-medium">Latest Period Net</span>
            <DollarSign size={14} className="text-gray-400" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold text-gray-950 tabular-nums">{formatETB(currentPeriodSummary.net)}</p>
            <div className="flex items-center gap-1 mt-0.5 text-[10px]">
              <span className={`font-semibold ${Number(netGrowth) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {netGrowth}%
              </span>
              <span className="text-gray-400">vs prev</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-medium">Gross ({timeRange}M)</span>
            <BarChart3 size={14} className="text-gray-400" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold text-gray-950 tabular-nums">{formatETB(totalGrossSum)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Total payout</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-medium">Tax &amp; Pension</span>
            <ShieldCheck size={14} className="text-gray-400" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold text-gray-950 tabular-nums">{formatETB(totalTaxSum + totalPensionSum)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Tax: {formatETB(totalTaxSum)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-medium">Headcount</span>
            <Users size={14} className="text-gray-400" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold text-gray-950 tabular-nums">{currentPeriodSummary.headcount} Active</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Payroll roster</p>
          </div>
        </div>
      </div>

      {/* Historical Chart Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <CalendarRange size={14} className="text-gray-500" />
            <h3 className="text-xs font-bold text-gray-950">Trend Analysis</h3>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            {[
              { id: 'net', label: 'Net' },
              { id: 'gross', label: 'Gross' },
              { id: 'tax', label: 'Tax' },
              { id: 'pension', label: 'Pension' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setChartMetric(m.id)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                  chartMetric === m.id ? 'bg-gray-950 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact bar chart */}
        <div className="flex items-end gap-2 h-36 pt-4 pb-1 px-1 border-b border-gray-100">
          {history.map((h) => {
            const val = h[chartMetric]
            const heightPx = Math.max(6, (val / maxMetricValue) * 110)
            return (
              <div key={h.period} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-950 text-white text-[9px] rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap z-10">
                  {h.period}: {formatETB(val)}
                </div>

                <span className="text-[9px] text-gray-600 truncate w-full text-center font-medium">
                  {formatETB(val).replace('.00', '').replace('ETB ', '')}
                </span>

                <div
                  className="w-full rounded-t-md bg-gray-900 transition-all hover:bg-gray-700"
                  style={{ height: `${heightPx}px` }}
                />

                <span className="text-[9px] text-gray-500 truncate w-full text-center">
                  {h.period.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Two-column layout: Department costs & History table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Cost Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} className="text-gray-500" />
              <h3 className="text-xs font-bold text-gray-950">Department Breakdown</h3>
            </div>
            <span className="text-[10px] text-gray-400">{Object.keys(deptCosts).length} depts</span>
          </div>

          <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
            {Object.entries(deptCosts).map(([dept, m]) => {
              const shareOfGross = totalGrossSum ? ((m.gross * (timeRange / 6)) / totalGrossSum) * 100 : 0
              return (
                <div key={dept} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-900">{dept}</p>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white border border-gray-200 text-gray-600">
                      {m.count} staff
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-400 text-[10px]">Gross: </span>
                      <span className="font-semibold text-gray-900">{formatETB(m.gross)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px]">Net: </span>
                      <span className="font-semibold text-gray-900">{formatETB(m.net)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Historical Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-950">Payroll Run History Ledger</h3>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search period..."
                className="pl-7 pr-3 py-1 text-[11px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:bg-white w-full sm:w-40 text-gray-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-[10px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium text-right">Headcount</th>
                  <th className="px-3 py-2 font-medium text-right">Gross</th>
                  <th className="px-3 py-2 font-medium text-right">Tax</th>
                  <th className="px-3 py-2 font-medium text-right">Pension</th>
                  <th className="px-3 py-2 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-[11px]">
                {filteredHistory.map((h) => (
                  <tr key={h.period} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2 font-semibold text-gray-900">{h.period}</td>
                    <td className="px-3 py-2 text-right">{h.headcount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatETB(h.gross)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatETB(h.tax)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatETB(h.pension)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-gray-950">{formatETB(h.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
