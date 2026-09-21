import {
  TrendingUp,
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
import { formatETB, roundMoney } from '../../lib/payroll'
import LuxuryDataTable from '../../components/LuxuryDataTable'
import { CHART_METRICS, METRIC_LABELS, CHART_TOOLTIP_STYLE, STATUS_CHIP, fmtDate } from './reportsConfig'

export function KpiCard({ label, value, sub, icon: Icon, iconCls, valueCls = 'text-gray-950 dark:text-gray-100' }) {
  return (
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
}

const FALLBACK_CHIP =
  'bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#1c2026] dark:text-gray-400 dark:border-[#33383f]'

// ═════════════════════════════════════════════════════════════
// TAB 1: PAYROLL
// ═════════════════════════════════════════════════════════════
export function PayrollTab({
  data,
  chartMetric,
  setChartMetric,
  totalGrossSum,
}) {
  const {
    history,
    deptCosts,
    currentPeriodSummary,
    netGrowth,
    totalTaxSum,
    totalPensionSum,
  } = data

  return (
    <>
      {/* Executive KPI summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Latest Net Disbursement"
          value={formatETB(currentPeriodSummary.net)}
          sub={
            <span className="flex items-center gap-1.5 mt-1">
              <span
                className={`font-bold inline-flex items-center gap-0.5 ${
                  Number(netGrowth) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
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
          label={`Cumulative Gross (${history.length}M)`}
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
              <span>{history.length}-Period Financial &amp; Workforce Trajectory</span>
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
              ? ((m.gross * (history.length / 6)) / totalGrossSum) * 100
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
          subtitle={`Selected-period certified run statements with statutory filing status`}
          data={history.some((h) => h.headcount > 0) ? history : []}
          searchable={true}
          searchPlaceholder="Search periods (e.g. Sep 2026)..."
          searchKeys={['period', 'complianceRate', 'status']}
          exportable={true}
          emptyMessage="No payroll run history yet. Run payroll to populate this ledger."
          exportFilename={`Payroll_Run_History_${history.length}M`}
          allowViewModeToggle={true}
          renderGridCard={(h) => (
            <div
              key={h.period}
              className="rounded-xl border border-gray-200/80 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-950 dark:text-gray-100 text-sm">{h.period}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
                  {h.status}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{h.headcount} active employee(s)</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-100 dark:border-[#262b31]">
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block">Gross Pay</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatETB(h.gross)}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block">Income Tax</span>
                  <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-400">{formatETB(h.tax)}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block">Pension (18%)</span>
                  <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-400">{formatETB(h.pension)}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block">Net Disbursement</span>
                  <span className="font-black tabular-nums text-emerald-700 dark:text-emerald-400">{formatETB(h.net)}</span>
                </div>
              </div>
            </div>
          )}
          columns={[
            {
              key: 'period',
              header: 'Period',
              sortable: true,
              render: (h) => <span className="font-bold text-gray-950 dark:text-gray-100">{h.period}</span>,
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
  )
}

// ═════════════════════════════════════════════════════════════
// TAB 2: ATTENDANCE
// ═════════════════════════════════════════════════════════════
export function AttendanceTab({ data }) {
  const { attendanceMetrics, attendanceRows } = data

  return (
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
        allowViewModeToggle={true}
        renderGridCard={(a) => (
          <div
            key={`${a.date}-${a.employeeId}`}
            className="rounded-xl border border-gray-200/80 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-950 dark:text-gray-100 text-sm">{a.employeeName}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_CHIP[a.status] || FALLBACK_CHIP}`}>
                {a.status}
              </span>
            </div>
            <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
              {fmtDate(a.date)} · {a.department}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-100 dark:border-[#262b31]">
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">Check In</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{a.checkIn || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">Check Out</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{a.checkOut || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">Regular Hrs</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{a.regular ?? 0}h</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">OT Hrs</span>
                <span className="font-semibold tabular-nums text-purple-700 dark:text-purple-400">
                  {a.overtime ? `${a.overtime}h` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
        columns={[
          {
            key: 'date',
            header: 'Date',
            sortable: true,
            render: (a) => <span className="font-mono text-gray-700 dark:text-gray-300">{fmtDate(a.date)}</span>,
            exportValue: (a) => a.date,
          },
          {
            key: 'employeeName',
            header: 'Employee',
            sortable: true,
            render: (a) => <span className="font-bold text-gray-950 dark:text-gray-100">{a.employeeName}</span>,
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (a) => <span className="text-gray-600 dark:text-gray-400">{a.department}</span>,
          },
          {
            key: 'checkIn',
            header: 'Check In',
            align: 'center',
            render: (a) => <span className="font-mono text-gray-700 dark:text-gray-300">{a.checkIn || '—'}</span>,
            exportValue: (a) => a.checkIn || '',
          },
          {
            key: 'checkOut',
            header: 'Check Out',
            align: 'center',
            render: (a) => <span className="font-mono text-gray-700 dark:text-gray-300">{a.checkOut || '—'}</span>,
            exportValue: (a) => a.checkOut || '',
          },
          {
            key: 'regular',
            header: 'Regular Hrs',
            sortable: true,
            align: 'right',
            render: (a) => <span className="tabular-nums text-gray-800 dark:text-gray-200">{a.regular ?? 0}h</span>,
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
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_CHIP[a.status] || FALLBACK_CHIP}`}>
                {a.status}
              </span>
            ),
          },
        ]}
        emptyMessage="No attendance records for the selected department."
      />
    </>
  )
}

// ═════════════════════════════════════════════════════════════
// TAB 3: LEAVE
// ═════════════════════════════════════════════════════════════
export function LeaveTab({ data }) {
  const { leaveMetrics, leaveRows } = data

  return (
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
        allowViewModeToggle={true}
        renderGridCard={(l) => (
          <div
            key={l.id || `${l.employeeId}-${l.startDate}`}
            className="rounded-xl border border-gray-200/80 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-gray-950 dark:text-gray-100 text-sm">{l.employeeName}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_CHIP[l.approvalStatus] || FALLBACK_CHIP}`}>
                {l.approvalStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60 font-semibold">
                {l.leaveType}
              </span>
              <span className="font-black tabular-nums text-gray-950 dark:text-gray-100">{l.days}d</span>
            </div>
            <div className="font-mono text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-[#262b31]">
              {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
            </div>
          </div>
        )}
        columns={[
          {
            key: 'employeeName',
            header: 'Employee',
            sortable: true,
            render: (l) => <span className="font-bold text-gray-950 dark:text-gray-100">{l.employeeName}</span>,
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (l) => <span className="text-gray-600 dark:text-gray-400">{l.department}</span>,
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
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_CHIP[l.approvalStatus] || FALLBACK_CHIP}`}>
                {l.approvalStatus}
              </span>
            ),
          },
          {
            key: 'remarks',
            header: 'Remarks',
            render: (l) => (
              <span className="text-gray-500 max-w-xs truncate block dark:text-gray-400">{l.remarks || '—'}</span>
            ),
            exportValue: (l) => l.remarks || '',
          },
        ]}
        emptyMessage="No leave requests for the selected department."
      />
    </>
  )
}

// ═════════════════════════════════════════════════════════════
// TAB 4: PAYROLL & TAX
// ═════════════════════════════════════════════════════════════
export function PaymentTaxTab({ data }) {
  const { paymentTaxRows, paymentTaxTotals } = data

  return (
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
        allowViewModeToggle={true}
        renderGridCard={(r) => (
          <div
            key={r.employeeId}
            className="rounded-xl border border-gray-200/80 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-bold text-gray-950 dark:text-gray-100 text-sm block truncate">{r.name}</span>
                <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 block truncate">
                  {r.employeeId} · {r.department}
                </span>
              </div>
              {r.exempt ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800">
                  <XCircle size={10} /> Exempt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800">
                  <CheckCircle2 size={10} /> Taxed
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-100 dark:border-[#262b31]">
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">Gross Pay</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatETB(r.gross)}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">PAYE Tax</span>
                <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-400">{formatETB(r.incomeTax)}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">Pension 7% + 11%</span>
                <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                  {formatETB(r.pensionEmployee + r.pensionEmployer)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block">Net Transfer</span>
                <span className="font-black tabular-nums text-emerald-700 dark:text-emerald-400">{formatETB(r.netSalary)}</span>
              </div>
            </div>
          </div>
        )}
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
            render: (r) => <span className="font-bold text-gray-950 dark:text-gray-100">{r.name}</span>,
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (r) => <span className="text-gray-600 dark:text-gray-400">{r.department}</span>,
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
            render: (r) =>
              r.exempt ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800"
                  title="Contractual/Intern — no statutory tax or pension"
                >
                  <XCircle size={11} /> Exempt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800">
                  <CheckCircle2 size={11} /> Taxed
                </span>
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
  )
}
