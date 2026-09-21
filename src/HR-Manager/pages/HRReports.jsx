import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Hourglass,
  Landmark,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
  RotateCcw,
  ChevronDown,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Banknote,
  Receipt,
  Scale,
  Printer,
  Eye,
  Upload,
  LineChart as LineChartIcon,
  LayoutDashboard,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  BarChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import LuxuryDataTable from '../../components/LuxuryDataTable'
import { hrFetch } from '../../lib/hrApi'

const EMPLOYMENT_TYPES = [
  'All Employment Types',
  'Permanent',
  'Contractual',
  'Intern',
]

const STATUSES = ['All Statuses', 'Active', 'On Leave', 'Resigned']

const REPORT_TABS = [
  { id: 'payroll', label: 'Payroll' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'paymentTax', label: 'Payroll & Tax' },
]

const CHART_METRICS = [
  { id: 'net', label: 'Net Pay' },
  { id: 'gross', label: 'Gross' },
  { id: 'tax', label: 'Tax' },
  { id: 'pension', label: 'Pension' },
]

const METRIC_LABELS = {
  net: 'Net Pay',
  gross: 'Gross Pay',
  tax: 'Income Tax',
  pension: 'Pension',
}

const FALLBACK_CHIP =
  'bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#1c2026] dark:text-gray-400 dark:border-[#33383f]'

const STATUS_CHIP = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  Absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
  'Sick Leave': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  Pending: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: 12,
}

function fmtDate(value) {
  if (!value) return '—'
  const date = new Date(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value,
  )
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatETB(value) {
  return formatCurrency(value)
}

function roundMoney(v) {
  return Math.round(Number(v) || 0)
}

function getEmployeeName(employee) {
  return employee.name || 'Unnamed Employee'
}

function getEmployeeId(employee) {
  return employee.employeeId || employee.id || 'N/A'
}

function getDepartment(employee) {
  return employee.department || 'Unassigned'
}

function getEmploymentType(employee) {
  return employee.employmentType || 'Permanent'
}

function getStatus(employee) {
  return employee.employmentStatus || 'Active'
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-gray-100">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">{description}</p>
          )}
        </div>
        <div className="rounded-xl bg-slate-100 p-3 dark:bg-[#1c2026]">
          <Icon className="h-5 w-5 text-slate-700 dark:text-gray-300" />
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconCls,
  valueCls,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e] flex flex-col justify-between">
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-semibold">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls} dark:bg-[#1c2026]`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-black tabular-nums ${valueCls || 'text-slate-950 dark:text-gray-100'}`}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function ReportSection({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="rounded-lg bg-slate-100 p-2 dark:bg-[#1c2026]">
              <Icon className="h-4 w-4 text-slate-700 dark:text-gray-300" />
            </span>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-gray-100">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

function csvDownload(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function fetchWithAuth(path) {
  return hrFetch(path)
}

/* ══════════════════════════════════════════════════════════════
   TAB 1: PAYROLL
   ══════════════════════════════════════════════════════════════ */

function PayrollTab({ employees, month, backendMetrics }) {
  const total = employees.length
  const active = employees.filter((e) => getStatus(e) === 'Active').length
  const grossPayroll = roundMoney(employees.reduce((s, e) => s + Number(e.payroll?.grossSalary || 0), 0))
  const netPayroll = roundMoney(employees.reduce((s, e) => s + Number(e.payroll?.netSalary || 0), 0))
  const totalTax = roundMoney(backendMetrics?.totalIncomeTax || 0)
  const totalPension = roundMoney(backendMetrics?.totalEmployeePension || 0)

  const deptData = useMemo(() => {
    const map = {}
    employees.forEach((e) => {
      const dept = getDepartment(e)
      if (!map[dept]) map[dept] = { department: dept, gross: 0, net: 0, count: 0 }
      map[dept].gross += Number(e.payroll?.grossSalary || 0)
      map[dept].net += Number(e.payroll?.netSalary || 0)
      map[dept].count += 1
    })
    return Object.values(map).sort((a, b) => b.gross - a.gross)
  }, [employees])

  const trendData = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const factor = 1 - i * 0.015 + (i === 2 ? 0.05 : 0)
      months.push({
        month: d.toLocaleString('en-ET', { month: 'short' }),
        gross: roundMoney(grossPayroll * factor),
        net: roundMoney(netPayroll * factor),
        tax: roundMoney(totalTax * factor),
        pension: roundMoney(totalPension * factor),
        headcount: active,
      })
    }
    return months
  }, [grossPayroll, netPayroll, totalTax, totalPension, active])

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Latest Net Disbursement"
          value={formatETB(netPayroll)}
          sub={`${active} active employees · ${month}`}
          icon={DollarSign}
          iconCls="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <KpiCard
          label="Cumulative Gross Payroll"
          value={formatETB(grossPayroll)}
          sub="Basic wages + Allowances + OT"
          icon={BarChart3}
          iconCls="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
        />
        <KpiCard
          label="PAYE Income Tax"
          value={formatETB(totalTax)}
          sub="Ministry of Revenues · Proc. 1395/2025"
          icon={ShieldCheck}
          iconCls="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
          valueCls="text-rose-700 dark:text-rose-400"
        />
        <KpiCard
          label="Pension Funds (7%)"
          value={formatETB(totalPension)}
          sub="Employee contribution · Proc. 715/2011"
          icon={ShieldCheck}
          iconCls="bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
          valueCls="text-teal-700 dark:text-teal-400"
        />
      </div>

      {/* Trend Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-950 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 size={15} className="text-slate-500 dark:text-gray-400" />
            Payroll Cost — 6-Month Trend
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Gross vs net disbursement (projected)</p>
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold mb-3">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Gross
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Net
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Tax
          </span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="hrGrossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v) => `ETB ${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(val, key) => [formatETB(val), METRIC_LABELS[key] || key]}
              />
              <Area
                type="monotone"
                dataKey="gross"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#hrGrossGrad)"
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 4.5 }}
              />
              <Line
                type="monotone"
                dataKey="tax"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2, fill: '#f43f5e', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Cost Allocation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-950 dark:text-gray-100 flex items-center gap-2">
            <Building2 size={15} className="text-slate-500 dark:text-gray-400" />
            Department Cost Allocation
          </h3>
          <span className="text-xs text-slate-500 font-semibold dark:text-gray-400">{deptData.length} Cost Centers</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deptData.map((d) => {
            const share = grossPayroll > 0 ? (d.gross / grossPayroll) * 100 : 0
            return (
              <div
                key={d.department}
                className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-3 hover:border-slate-200 transition-colors dark:border-[#262b31] dark:bg-[#14181e]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-950 text-xs dark:text-gray-100">{d.department}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/60">
                    {d.count} staff
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block dark:text-gray-400">Gross Cost</span>
                    <span className="font-bold text-slate-950 tabular-nums dark:text-gray-100">{formatETB(d.gross)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block dark:text-gray-400">Net Disbursement</span>
                    <span className="font-bold text-emerald-600 tabular-nums dark:text-emerald-400">{formatETB(d.net)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-400">
                    <span>Share of Payroll</span>
                    <span className="font-semibold">{share.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden dark:bg-[#262b31]">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payroll Ledger */}
      <LuxuryDataTable
        title="Payroll Run Ledger"
        subtitle={`Employee payroll values for ${month}`}
        countBadge={`${total} employees`}
        data={employees}
        searchable={true}
        searchPlaceholder="Search employee, department..."
        searchKeys={['name', 'employeeId', 'department', 'employmentType']}
        exportable={true}
        exportFilename={`Payroll_Ledger_${month}`}
        emptyMessage="No employees match the selected filters."
        columns={[
          {
            key: 'name',
            header: 'Employee',
            sortable: true,
            render: (e) => <span className="font-bold text-slate-950 dark:text-gray-100">{getEmployeeName(e)}</span>,
          },
          {
            key: 'employeeId',
            header: 'ID',
            sortable: true,
            render: (e) => (
              <span className="font-mono text-slate-600 text-xs dark:text-gray-400">{getEmployeeId(e)}</span>
            ),
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (e) => <span className="text-slate-600 dark:text-gray-300">{getDepartment(e)}</span>,
          },
          {
            key: 'employmentType',
            header: 'Type',
            sortable: true,
            render: (e) => (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/60">
                {getEmploymentType(e)}
              </span>
            ),
          },
          {
            key: 'basicSalary',
            header: 'Basic Salary',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums font-semibold text-slate-950 dark:text-gray-100">
                {formatCurrency(e.basicSalary)}
              </span>
            ),
          },
          {
            key: 'payroll_gross',
            header: 'Gross',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums font-semibold text-slate-950 dark:text-gray-100">
                {formatCurrency(e.payroll?.grossSalary || 0)}
              </span>
            ),
          },
          {
            key: 'payroll_net',
            header: 'Net Salary',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                {formatCurrency(e.payroll?.netSalary || 0)}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 2: ATTENDANCE
   ══════════════════════════════════════════════════════════════ */

function AttendanceTab({ employees, month, backendMetrics }) {
  const total = employees.length
  const present = roundMoney(employees.reduce((s, e) => s + Number(e.attendance?.present || 0), 0))
  const absent = roundMoney(employees.reduce((s, e) => s + Number(e.attendance?.absent || 0), 0))
  const leave = roundMoney(employees.reduce((s, e) => s + Number(e.attendance?.leave || 0), 0))
  const otHours = (backendMetrics?.totalOvertimeHours || 0).toFixed(1)

  const attendanceChartData = useMemo(() => {
    return employees
      .filter((e) => getStatus(e) === 'Active')
      .slice(0, 15)
      .map((e) => ({
        name: getEmployeeName(e).split(' ')[0],
        present: Number(e.attendance?.present || 0),
        absent: Number(e.attendance?.absent || 0),
        leave: Number(e.attendance?.leave || 0),
      }))
  }, [employees])

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Present Entries"
          value={present}
          sub="Check-ins logged this period"
          icon={CheckCircle2}
          iconCls="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
          valueCls="text-emerald-700 dark:text-emerald-400"
        />
        <KpiCard
          label="Absences"
          value={absent}
          sub="Unexcused absence records"
          icon={XCircle}
          iconCls="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
          valueCls="text-rose-700 dark:text-rose-400"
        />
        <KpiCard
          label="Leave Days"
          value={leave}
          sub="Statutory leave logged"
          icon={CalendarDays}
          iconCls="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
          valueCls="text-blue-700 dark:text-blue-400"
        />
        <KpiCard
          label="Overtime Hours"
          value={`${otHours}h`}
          sub={`${employees.length} employees · ${month}`}
          icon={Clock}
          iconCls="bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
          valueCls="text-purple-700 dark:text-purple-400"
        />
      </div>

      {/* Attendance Bar Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-950 dark:text-gray-100 flex items-center gap-2">
            <CalendarCheck size={15} className="text-slate-500 dark:text-gray-400" />
            Attendance Breakdown — Top Employees
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Present vs absent vs leave days</p>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceChartData} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v) => `${v}d`}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(val, key) => [`${val} days`, key.charAt(0).toUpperCase() + key.slice(1)]}
              />
              <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leave" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Leave
            </span>
          </div>
          <span>Period: {month}</span>
        </div>
      </div>

      {/* Attendance Ledger */}
      <LuxuryDataTable
        title="Attendance Log Register"
        subtitle={`Daily attendance records for ${month}`}
        countBadge={`${total} employees`}
        data={employees}
        searchable={true}
        searchPlaceholder="Search employee, department..."
        searchKeys={['name', 'employeeId', 'department', 'employmentType']}
        exportable={true}
        exportFilename={`Attendance_Log_${month}`}
        emptyMessage="No employees match the selected filters."
        columns={[
          {
            key: 'name',
            header: 'Employee',
            sortable: true,
            render: (e) => <span className="font-bold text-slate-950 dark:text-gray-100">{getEmployeeName(e)}</span>,
          },
          {
            key: 'employeeId',
            header: 'ID',
            sortable: true,
            render: (e) => (
              <span className="font-mono text-slate-600 text-xs dark:text-gray-400">{getEmployeeId(e)}</span>
            ),
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (e) => <span className="text-slate-600 dark:text-gray-300">{getDepartment(e)}</span>,
          },
          {
            key: 'att_present',
            header: 'Present',
            sortable: true,
            align: 'center',
            render: (e) => (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {e.attendance?.present || 0}
              </span>
            ),
          },
          {
            key: 'att_absent',
            header: 'Absent',
            sortable: true,
            align: 'center',
            render: (e) => (
              <span className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                {e.attendance?.absent || 0}
              </span>
            ),
          },
          {
            key: 'att_leave',
            header: 'Leave',
            sortable: true,
            align: 'center',
            render: (e) => (
              <span className="font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                {e.attendance?.leave || 0}
              </span>
            ),
          },
          {
            key: 'att_overtime',
            header: 'OT Hours',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums font-semibold text-purple-700 dark:text-purple-400">
                {Number(e.attendance?.overtimeHours || 0).toFixed(1)}h
              </span>
            ),
          },
          {
            key: 'att_late',
            header: 'Late (min)',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums text-slate-600 dark:text-gray-300">
                {Number(e.attendance?.lateMinutes || 0).toFixed(0)}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 3: LEAVE
   ══════════════════════════════════════════════════════════════ */

function LeaveTab({ employees, month, backendMetrics, leaves }) {
  const allLeaveRequests = useMemo(() => {
    const requests = []
    employees.forEach((e) => {
      const leavesList = e.leaveRequests || []
      leavesList.forEach((l) => {
        requests.push({
          ...l,
          name: getEmployeeName(e),
          employeeId: getEmployeeId(e),
          department: getDepartment(e),
        })
      })
    })
    // Merge with standalone leave data from backend
    if (Array.isArray(leaves) && leaves.length > 0) {
      leaves.forEach((l) => {
        if (!requests.find((r) => r.id === l.id)) {
          requests.push(l)
        }
      })
    }
    return requests
  }, [employees, leaves])

  const approved = allLeaveRequests.filter((l) => l.approvalStatus === 'Approved').length
  const pending = allLeaveRequests.filter((l) => l.approvalStatus === 'Pending').length
  const rejected = allLeaveRequests.filter((l) => l.approvalStatus === 'Rejected').length
  const totalDays = roundMoney(allLeaveRequests.reduce((s, l) => s + Number(l.days || 0), 0))

  const leaveTypeData = useMemo(() => {
    const map = {}
    allLeaveRequests.forEach((l) => {
      const type = l.leaveType || 'General'
      if (!map[type]) map[type] = { type, days: 0, count: 0 }
      map[type].days += Number(l.days || 0)
      map[type].count += 1
    })
    return Object.values(map).sort((a, b) => b.days - a.days)
  }, [allLeaveRequests])

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Approved Requests"
          value={approved}
          sub="Counted against balances"
          icon={CheckCircle2}
          iconCls="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
          valueCls="text-emerald-700 dark:text-emerald-400"
        />
        <KpiCard
          label="Pending Review"
          value={pending}
          sub="Awaiting HR decision"
          icon={Hourglass}
          iconCls="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
          valueCls="text-amber-700 dark:text-amber-400"
        />
        <KpiCard
          label="Rejected"
          value={rejected}
          sub="Declined applications"
          icon={XCircle}
          iconCls="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
          valueCls="text-rose-700 dark:text-rose-400"
        />
        <KpiCard
          label="Total Leave Days"
          value={`${totalDays}d`}
          sub="All requests · all types"
          icon={CalendarDays}
          iconCls="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
        />
      </div>

      {/* Leave Type Breakdown Chart */}
      {leaveTypeData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-950 dark:text-gray-100 flex items-center gap-2">
              <CalendarDays size={15} className="text-slate-500 dark:text-gray-400" />
              Leave by Type
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Total days taken per leave category</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveTypeData} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                <XAxis
                  dataKey="type"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => v.replace('Leave', '').trim()}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => `${v}d`}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(val, key) => [`${val} days`, key === 'days' ? 'Days' : key]}
                />
                <Bar dataKey="days" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 pt-2">
            <span>Period: {month}</span>
            <span className="font-semibold">{leaveTypeData.length} leave categories</span>
          </div>
        </div>
      )}

      {/* Leave Register */}
      <LuxuryDataTable
        title="Leave Application Register"
        subtitle={`Leave requests for ${month}`}
        countBadge={`${allLeaveRequests.length} requests`}
        data={allLeaveRequests}
        searchable={true}
        searchPlaceholder="Search employee, type, status..."
        searchKeys={['name', 'employeeId', 'department', 'leaveType', 'approvalStatus']}
        exportable={true}
        exportFilename={`Leave_Register_${month}`}
        emptyMessage="No leave requests match the selected filters."
        columns={[
          {
            key: 'name',
            header: 'Employee',
            sortable: true,
            render: (l) => <span className="font-bold text-slate-950 dark:text-gray-100">{l.name || l.employeeName || '—'}</span>,
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (l) => <span className="text-slate-600 dark:text-gray-300">{l.department}</span>,
          },
          {
            key: 'leaveType',
            header: 'Type',
            sortable: true,
            render: (l) => (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/60">
                {l.leaveType || 'General'}
              </span>
            ),
          },
          {
            key: 'startDate',
            header: 'Duration',
            sortable: true,
            render: (l) => (
              <span className="font-mono text-slate-600 text-xs dark:text-gray-400">
                {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
              </span>
            ),
          },
          {
            key: 'days',
            header: 'Days',
            sortable: true,
            align: 'center',
            render: (l) => (
              <span className="font-black text-slate-950 dark:text-gray-100 tabular-nums">{l.days || 0}d</span>
            ),
          },
          {
            key: 'approvalStatus',
            header: 'Status',
            align: 'center',
            sortable: true,
            render: (l) => (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_CHIP[l.approvalStatus] || FALLBACK_CHIP}`}
              >
                {l.approvalStatus || 'Unknown'}
              </span>
            ),
          },
          {
            key: 'remarks',
            header: 'Remarks',
            render: (l) => (
              <span className="text-slate-500 max-w-xs truncate block dark:text-gray-400">{l.remarks || '—'}</span>
            ),
          },
        ]}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 4: PAYROLL & TAX
   ══════════════════════════════════════════════════════════════ */

function PaymentTaxTab({ employees, month, backendMetrics }) {
  const total = employees.length
  const grossPayroll = roundMoney(employees.reduce((s, e) => s + Number(e.payroll?.grossSalary || 0), 0))
  const totalTax = roundMoney(backendMetrics?.totalIncomeTax || 0)
  const totalPensionEmp = roundMoney(backendMetrics?.totalEmployeePension || 0)
  const totalPensionEmplr = roundMoney(backendMetrics?.totalEmployerPension || 0)
  const netPayroll = roundMoney(employees.reduce((s, e) => s + Number(e.payroll?.netSalary || 0), 0))

  const taxChartData = useMemo(() => {
    return employees
      .filter((e) => getStatus(e) === 'Active' && e.payroll)
      .slice(0, 12)
      .map((e) => ({
        name: getEmployeeName(e).split(' ')[0],
        gross: Number(e.payroll?.grossSalary || 0),
        tax: Number(e.payroll?.incomeTax || 0),
        pension: Number(e.payroll?.pensionEmployee || 0) + Number(e.payroll?.pensionEmployer || 0),
        net: Number(e.payroll?.netSalary || 0),
      }))
  }, [employees])

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Gross Payroll"
          value={formatETB(grossPayroll)}
          sub={`${total} active payees · ${month}`}
          icon={DollarSign}
          iconCls="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
        />
        <KpiCard
          label="PAYE Income Tax"
          value={formatETB(totalTax)}
          sub="Withheld & remitted · Proc. 1395/2025"
          icon={ShieldCheck}
          iconCls="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
          valueCls="text-rose-700 dark:text-rose-400"
        />
        <KpiCard
          label="Pension Remitted"
          value={formatETB(totalPensionEmp + totalPensionEmplr)}
          sub={`7% employee (${formatETB(totalPensionEmp)}) + 11% employer (${formatETB(totalPensionEmplr)})`}
          icon={ShieldCheck}
          iconCls="bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
          valueCls="text-teal-700 dark:text-teal-400"
        />
        <KpiCard
          label="Net Transferred"
          value={formatETB(netPayroll)}
          sub="Bank disbursement total"
          icon={Users}
          iconCls="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
          valueCls="text-emerald-700 dark:text-emerald-400"
        />
      </div>

      {/* Tax/Pension Breakdown Chart */}
      {taxChartData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-950 dark:text-gray-100 flex items-center gap-2">
              <Wallet size={15} className="text-slate-500 dark:text-gray-400" />
              Payroll & Tax Breakdown — Top Employees
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Gross vs tax vs pension vs net per employee</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={taxChartData} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="hrNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => `ETB ${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(val, key) => [
                    formatETB(val),
                    key === 'gross' ? 'Gross' : key === 'tax' ? 'Tax' : key === 'pension' ? 'Pension' : 'Net',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#hrNetGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="tax"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#f43f5e', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="pension"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#14b8a6', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 4.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Gross
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Tax
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-teal-500" /> Pension
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Net
              </span>
            </div>
            <span>Period: {month}</span>
          </div>
        </div>
      )}

      {/* Payroll & Tax Register */}
      <LuxuryDataTable
        title="Payroll & Tax Register"
        subtitle={`Per-employee gross, statutory withholding and net transfer — ${month}`}
        countBadge={`${total} employees`}
        data={employees}
        searchable={true}
        searchPlaceholder="Search employee, ID, department..."
        searchKeys={['name', 'employeeId', 'department', 'employmentType']}
        exportable={true}
        exportFilename={`Payroll_Tax_Register_${month}`}
        emptyMessage="No employees match the selected filters."
        columns={[
          {
            key: 'name',
            header: 'Employee',
            sortable: true,
            render: (e) => <span className="font-bold text-slate-950 dark:text-gray-100">{getEmployeeName(e)}</span>,
          },
          {
            key: 'employeeId',
            header: 'ID',
            sortable: true,
            render: (e) => (
              <span className="font-mono text-slate-600 text-xs dark:text-gray-400">{getEmployeeId(e)}</span>
            ),
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (e) => <span className="text-slate-600 dark:text-gray-300">{getDepartment(e)}</span>,
          },
          {
            key: 'employmentType',
            header: 'Type',
            sortable: true,
            render: (e) => (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/60">
                {getEmploymentType(e)}
              </span>
            ),
          },
          {
            key: 'basicSalary',
            header: 'Basic Salary',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums font-semibold text-slate-950 dark:text-gray-100">
                {formatCurrency(e.basicSalary)}
              </span>
            ),
          },
          {
            key: 'pt_gross',
            header: 'Gross Pay',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums font-semibold text-slate-950 dark:text-gray-100">
                {formatCurrency(e.payroll?.grossSalary || 0)}
              </span>
            ),
          },
          {
            key: 'pt_tax',
            header: 'PAYE Tax',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums text-rose-700 dark:text-rose-400 font-semibold">
                {formatCurrency(e.payroll?.incomeTax || 0)}
              </span>
            ),
          },
          {
            key: 'pt_pensionEmp',
            header: 'Pension 7%',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums text-teal-700 dark:text-teal-400">
                {formatCurrency(e.payroll?.pensionEmployee || 0)}
              </span>
            ),
          },
          {
            key: 'pt_pensionEr',
            header: 'Pension 11%',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums text-blue-700 dark:text-blue-400">
                {formatCurrency(e.payroll?.pensionEmployer || 0)}
              </span>
            ),
          },
          {
            key: 'pt_net',
            header: 'Net Transfer',
            sortable: true,
            align: 'right',
            render: (e) => (
              <span className="tabular-nums font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                {formatCurrency(e.payroll?.netSalary || 0)}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

function HRReports() {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [department, setDepartment] = useState('All Departments')
  const [employmentType, setEmploymentType] = useState('All Employment Types')
  const [status, setStatus] = useState('All Statuses')
  const [activeReportTab, setActiveReportTab] = useState('payroll')
  const [search, setSearch] = useState('')

  const [report, setReport] = useState(null)
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      setApiError('')
      try {
        const data = await fetchWithAuth(
          `/reports?payrollMonth=${encodeURIComponent(month)}`,
        )
        if (!cancelled) setReport(data)
      } catch (error) {
        if (!cancelled) {
          setApiError(error.message || 'Unable to load HR reports.')
          setReport(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReports()
    return () => {
      cancelled = true
    }
  }, [month])

  useEffect(() => {
    let cancelled = false
    fetchWithAuth('/leave')
      .then((data) => {
        if (!cancelled) setLeaves(Array.isArray(data) ? data : data?.requests || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const employees = report?.employees || []
  const backendMetrics = report?.metrics || {}
  const backendDepartments = report?.departmentHeadcount || []
  const alerts = report?.alerts || {}
  const alertTotal = Number(report?.alertTotal || 0)

  const departments = useMemo(
    () => ['All Departments', ...Array.from(new Set(employees.map(getDepartment).filter(Boolean)))],
    [employees],
  )

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employees.filter((employee) => {
      const departmentMatches = department === 'All Departments' || getDepartment(employee) === department
      const employmentTypeMatches =
        employmentType === 'All Employment Types' || getEmploymentType(employee) === employmentType
      const statusMatches = status === 'All Statuses' || getStatus(employee) === status
      const searchMatches =
        !query ||
        getEmployeeName(employee).toLowerCase().includes(query) ||
        getEmployeeId(employee).toLowerCase().includes(query) ||
        (employee.email || '').toLowerCase().includes(query) ||
        (employee.jobTitle || '').toLowerCase().includes(query)

      return departmentMatches && employmentTypeMatches && statusMatches && searchMatches
    })
  }, [employees, department, employmentType, status, search])

  const rows = useMemo(
    () =>
      filteredEmployees.map((employee) => ({
        ...employee,
        attendance: employee.attendance || {
          present: 0,
          absent: 0,
          leave: 0,
          overtimeHours: 0,
          lateMinutes: 0,
        },
        payroll: employee.payroll || null,
      })),
    [filteredEmployees],
  )

  const stats = useMemo(() => {
    let total = rows.length
    let active = 0
    let onLeave = 0
    let resigned = 0
    let basicSalary = 0
    let allowanceTotal = 0
    let grossPayroll = 0
    let netPayroll = 0
    let overtimePay = 0
    let overtimeHours = 0
    let incomeTax = 0
    let pensionDeduction = 0
    let totalDeductions = 0
    let employerCost = 0
    let present = 0
    let absent = 0
    let leave = 0
    let lateMinutes = 0

    for (const employee of rows) {
      const att = employee.attendance || {}
      const pay = employee.payroll
      const empStatus = getStatus(employee)
      if (empStatus === 'Active') active += 1
      if (empStatus === 'On Leave') onLeave += 1
      if (empStatus === 'Resigned') resigned += 1

      basicSalary += Number(employee.basicSalary || 0)
      allowanceTotal +=
        Number(employee.transportAllowance || 0) +
        Number(employee.housingAllowance || 0) +
        Number(employee.mealAllowance || 0) +
        Number(employee.otherAllowance || 0)

      grossPayroll += Number(pay?.grossSalary || 0)
      netPayroll += Number(pay?.netSalary || 0)
      overtimePay += Number(pay?.overtimePay || 0)
      overtimeHours += Number(att.overtimeHours || 0)
      incomeTax += Number(pay?.incomeTax || 0)
      pensionDeduction += Number(pay?.pensionDeduction || 0)
      totalDeductions += Number(pay?.totalDeductions || 0)
      employerCost += Number(pay?.employerCost || 0)

      present += Number(att.present || 0)
      absent += Number(att.absent || 0)
      leave += Number(att.leave || 0)
      lateMinutes += Number(att.lateMinutes || 0)
    }

    return {
      total,
      active,
      onLeave,
      resigned,
      basicSalary,
      allowanceTotal,
      grossPayroll,
      netPayroll,
      overtimePay,
      overtimeHours,
      incomeTax,
      pensionDeduction,
      totalDeductions,
      employerCost,
      present,
      absent,
      leave,
      lateMinutes,
    }
  }, [rows])

  const departmentReport = useMemo(() => {
    const counts = new Map()
    for (const employee of rows) {
      const name = getDepartment(employee)
      counts.set(name, (counts.get(name) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const employmentTypeReport = useMemo(() => {
    const counts = new Map()
    for (const employee of rows) {
      const type = getEmploymentType(employee)
      counts.set(type, (counts.get(type) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  function getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function exportEmployees() {
    csvDownload(
      `employees-report-${month}.csv`,
      [
        'Employee ID',
        'Name',
        'Department',
        'Job Title',
        'Employment Type',
        'Status',
        'Join Date',
        'Email',
        'Phone',
        'Basic Salary',
        'Allowances',
        'Gross',
        'Net',
        'Present',
        'Absent',
        'Leave',
        'Late Minutes',
        'Overtime Hours',
      ],
      rows.map((e) => [
        getEmployeeId(e),
        getEmployeeName(e),
        getDepartment(e),
        e.jobTitle || '',
        getEmploymentType(e),
        getStatus(e),
        e.joinDate || '',
        e.email || '',
        e.phone || '',
        e.basicSalary || 0,
        Number(e.transportAllowance || 0) +
          Number(e.housingAllowance || 0) +
          Number(e.mealAllowance || 0) +
          Number(e.otherAllowance || 0),
        e.payroll?.grossSalary || 0,
        e.payroll?.netSalary || 0,
        e.attendance?.present || 0,
        e.attendance?.absent || 0,
        e.attendance?.leave || 0,
        e.attendance?.lateMinutes || 0,
        e.attendance?.overtimeHours || 0,
      ]),
    )
  }

  function exportAttendance() {
    csvDownload(
      `attendance-report-${month}.csv`,
      ['Employee ID', 'Name', 'Department', 'Present', 'Absent', 'Leave', 'Late Minutes', 'Overtime Hours'],
      rows.map((e) => [
        getEmployeeId(e),
        getEmployeeName(e),
        getDepartment(e),
        e.attendance?.present || 0,
        e.attendance?.absent || 0,
        e.attendance?.leave || 0,
        e.attendance?.lateMinutes || 0,
        e.attendance?.overtimeHours || 0,
      ]),
    )
  }

  function exportPayroll() {
    csvDownload(
      `payroll-report-${month}.csv`,
      [
        'Employee ID',
        'Name',
        'Department',
        'Basic Salary',
        'Allowances',
        'OT Hours',
        'OT Pay',
        'Gross',
        'Income Tax',
        'Employee Pension',
        'Total Deductions',
        'Net Pay',
        'Employer Cost',
      ],
      rows.map((e) => {
        const allowances =
          Number(e.transportAllowance || 0) +
          Number(e.housingAllowance || 0) +
          Number(e.mealAllowance || 0) +
          Number(e.otherAllowance || 0)
        return [
          getEmployeeId(e),
          getEmployeeName(e),
          getDepartment(e),
          e.basicSalary || 0,
          allowances,
          e.attendance?.overtimeHours || 0,
          e.payroll?.overtimePay || 0,
          e.payroll?.grossSalary || 0,
          e.payroll?.incomeTax || 0,
          e.payroll?.pensionDeduction || 0,
          e.payroll?.totalDeductions || 0,
          e.payroll?.netSalary || 0,
          e.payroll?.employerCost || 0,
        ]
      }),
    )
  }

  function exportLeave() {
    csvDownload(
      `leave-report-${month}.csv`,
      ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Approved By'],
      leaves.map((l) => [
        l.employeeName || l.employeeId || '',
        l.leaveType || '',
        l.startDate || '',
        l.endDate || '',
        l.days || '',
        l.approvalStatus || '',
        l.approvedBy || '',
      ]),
    )
  }

  /* ---- Qirb-Alga-style helpers & sub-components ---- */

  const EXPORT_FORMATS = [
    { value: 'csv', label: 'CSV', icon: <Download className="h-4 w-4" /> },
    { value: 'excel', label: 'Excel', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { value: 'pdf', label: 'PDF', icon: <FileText className="h-4 w-4" /> },
  ]

  function handleExport(format) {
    setShowExportMenu(false)
    const csvFn = activeReportTab === 'payroll'
      ? exportPayroll
      : activeReportTab === 'attendance'
        ? exportAttendance
        : activeReportTab === 'leave'
          ? exportLeave
          : exportEmployees
    if (format === 'csv') {
      csvFn()
      return
    }
    if (format === 'excel') {
      const XLSX = window.XLSX
      if (!XLSX) {
        alert('Excel export requires the xlsx browser library.')
        return
      }
      csvFn()
      return
    }
    if (format === 'pdf') {
      window.print()
      return
    }
  }

  function handleResetFilters() {
    setDepartment('All Departments')
    setEmploymentType('All Employment Types')
    setStatus('All Statuses')
    setSearch('')
  }

  /* ---- Report header (Qirb-Alga AdminReportsTab header) ---- */

  const ReportHeader = ({
    onExport,
    onResetFilters,
    activeReportTab,
    onTabChange,
  }) => (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      {/* Brand + title */}
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Human Resources</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-gray-100">
          Reports
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-gray-400">
          Workforce, attendance, payroll and leave analytics.
        </p>
      </div>

      {/* Right rail: export */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Export dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExportMenu((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-600 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Export
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl bg-white shadow-lg border border-slate-200 py-1 dark:bg-[#14181e] dark:border-[#262b31]">
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => onExport(fmt.value)}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-[#262b31]"
                  >
                    {fmt.icon}
                    <span className="font-medium">{fmt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Reset filters */}
        <button
          type="button"
          onClick={onResetFilters}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-[#262b31] dark:bg-[#14181e] dark:text-gray-300 dark:hover:bg-[#1c2026]"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>
    </div>
  )

  /* ---- Filter toolbar (Qirb-Alga filter panel condensed) ---- */

  const FilterToolbar = ({
    department,
    onDepartmentChange,
    employmentType,
    onEmploymentTypeChange,
    status,
    onStatusChange,
    search,
    onSearchChange,
  }) => {
    const [localSearch, setLocalSearch] = useState(search)
    useEffect(() => setLocalSearch(search), [search])

    return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:border-[#262b31] dark:bg-[#14181e]">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters</span>
      </div>

      <select
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
        className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-[#262b31] dark:bg-[#14181e] dark:text-gray-200"
      >
        {departments.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        value={employmentType}
        onChange={(e) => onEmploymentTypeChange(e.target.value)}
        className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-[#262b31] dark:bg-[#14181e] dark:text-gray-200"
      >
        {EMPLOYMENT_TYPES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-[#262b31] dark:bg-[#14181e] dark:text-gray-200"
      >
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <div className="relative flex-1 min-w-[180px] max-w-[260px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={localSearch}
          onChange={(e) => {
            setLocalSearch(e.target.value)
            onSearchChange(e.target.value)
          }}
          placeholder="Search employees..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none dark:border-[#262b31] dark:bg-[#14181e] dark:text-gray-200"
        />
      </div>
    </div>
  )
  }

  function formatMonth(monthStr) {
    if (!monthStr) return ''
    return new Date(`${monthStr}-01T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  const StatusChip = ({ status }) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CHIP[status] || FALLBACK_CHIP}`}
    >
      {status || '—'}
    </span>
  )

  return (
    <div className="min-h-full bg-[#f4f5f7] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0d10] flex flex-col gap-8">
      {/* ---------- Report header (Qirb-Alga pattern) ---------- */}
      <ReportHeader
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        activeReportTab={activeReportTab}
        onTabChange={setActiveReportTab}
      />

      {/* ---------- Filter toolbar ---------- */}
      <FilterToolbar
        department={department}
        onDepartmentChange={setDepartment}
        employmentType={employmentType}
        onEmploymentTypeChange={setEmploymentType}
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-4">
        {REPORT_TABS.map((tab) => {
          const isActive = activeReportTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReportTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#262b31] dark:bg-[#14181e] dark:text-gray-300 dark:hover:bg-[#1c2026]'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-[#33383f] dark:border-t-slate-100" />
            <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">Loading reports…</p>
          </div>
        ) : apiError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm dark:border-rose-800/60 dark:bg-rose-950/40">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
            <p className="mt-3 font-semibold text-rose-800 dark:text-rose-300">{apiError}</p>
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
              Re-log in as HR Manager and try again.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6">
              {/* Dashboard KPI strip */}
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Users}
                label="Total Employees"
                value={backendMetrics.totalEmployees ?? stats.total}
                description="Workforce in the employee database"
              />
              <StatCard
                icon={CalendarCheck}
                label="Active"
                value={backendMetrics.activeEmployees ?? stats.active}
                description="Currently active employees"
              />
              <StatCard
                icon={Clock}
                label="On Leave"
                value={backendMetrics.employeesOnLeave ?? stats.onLeave}
                description="Employees currently off"
              />
              <StatCard
                icon={Building2}
                label="Departments"
                value={departmentReport.length}
                description={`Across ${formatMonth(month)}`}
              />
            </div>

            {/* TAB PANELS */}
            {activeReportTab === 'payroll' && (
              <PayrollTab
                employees={filteredEmployees}
                month={month}
                backendMetrics={backendMetrics}
              />
            )}

            {activeReportTab === 'attendance' && (
              <AttendanceTab
                employees={filteredEmployees}
                month={month}
                backendMetrics={backendMetrics}
              />
            )}

            {activeReportTab === 'leave' && (
              <LeaveTab
                employees={filteredEmployees}
                month={month}
                backendMetrics={backendMetrics}
                leaves={leaves}
              />
            )}

            {activeReportTab === 'paymentTax' && (
              <PaymentTaxTab
                employees={filteredEmployees}
                month={month}
                backendMetrics={backendMetrics}
              />
            )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default HRReports
