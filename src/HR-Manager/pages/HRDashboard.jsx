import React, { useState, useEffect } from 'react'
import {
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  Users,
  Eye,
  DollarSign,
  Percent,
  TrendingUp,
  AlertTriangle,
  Wallet,
  PiggyBank,
  Briefcase,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import { useEmployees } from '../../Employer/hooks/useEmployees'
import LuxuryDataTable from '../components/LuxuryDataTable'

const API_URL = '/api/hr-manager'

// Hex colors for recharts (attendance status pie) — matches the palette
// used across the Attendance page (emerald/red/amber) and payroll charts.
const STATUS_COLORS = {
  Present: '#10b981',
  Absent: '#ef4444',
  'Sick Leave': '#f59e0b',
  'Annual Leave': '#6366f1',
  'On Leave': '#6366f1',
  'Maternity Leave': '#ec4899',
  'Half Day': '#06b6d4',
}

function fetchAttendanceData(startDate, endDate) {
  const token = typeof window !== 'undefined' && localStorage.getItem('user')
  const user = token ? JSON.parse(token) : null
  const authHeader = user && user.token ? `Bearer ${user.token}` : ''
  return fetch(`${API_URL}/attendance?startDate=${startDate}&endDate=${endDate}`, {
    headers: { Authorization: authHeader },
  })
    .then((r) => r.json())
    .then((d) => (Array.isArray(d) ? d : []))
    .catch(() => [])
}

function fetchPayrollData() {
  const token = typeof window !== 'undefined' && localStorage.getItem('user')
  const user = token ? JSON.parse(token) : null
  const authHeader = user && user.token ? `Bearer ${user.token}` : ''
  return fetch(`${API_URL}/payroll`, {
    headers: { Authorization: authHeader },
  })
    .then((r) => r.json())
    .then((d) => (Array.isArray(d) ? d : []))
}

function HRDashboard() {
  const navigate = useNavigate()
  const { employees, loading: empLoading } = useEmployees()

  const [attendance, setAttendance] = useState([])
  const [payroll, setPayroll] = useState([])
  const [dashLoading, setDashLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchAttendanceData('2026-09-01', '2026-09-30'),
      fetchPayrollData(),
    ])
      .then(([att, pay]) => {
        if (!cancelled) {
          setAttendance(att)
          setPayroll(pay)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDashLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── Employee metrics ──────────────────────────────────────────
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(
    (e) => e.employmentStatus === 'Active' || e.status === 'Active',
  ).length
  const onLeaveEmployees = employees.filter(
    (e) => e.employmentStatus === 'On Leave' || e.status === 'On Leave',
  ).length
  const departments = new Set(
    employees.map((e) => e.department).filter(Boolean),
  ).size

  // ── Payroll metrics ───────────────────────────────────────────
  const totalGross = payroll.reduce((s, r) => s + (r.grossSalary || 0), 0)
  const totalNet = payroll.reduce((s, r) => s + (r.netSalary || 0), 0)
  const totalTax = payroll.reduce((s, r) => s + (r.incomeTax || 0), 0)
  const totalPension = payroll.reduce(
    (s, r) => s + (r.pensionDeduction || 0) + (r.employerPension || 0),
    0,
  )
  const totalOvertimePay = payroll.reduce((s, r) => s + (r.overtimePay || 0), 0)
  const totalOvertimeHours = payroll.reduce((s, r) => s + (r.overtimeHours || 0), 0)

  // ── Attendance metrics ────────────────────────────────────────
  // Accept both short codes (P/A/SL/AL) from seed data and full labels
  // (Present/Absent/Sick Leave) from HR-created records.
  const isPresent = (s) =>
    s === 'Present' || s === 'P' || s === 'PH' || s === 'Half Day'
  const isAbsent = (s) => s === 'Absent' || s === 'A'
  const isOnLeave = (s) =>
    ['Sick Leave', 'Annual Leave', 'On Leave', 'Maternity Leave', 'SL', 'AL', 'ML', 'OL'].includes(s)

  const presentCount = attendance.filter((a) => isPresent(a.status)).length
  const absentCount = attendance.filter((a) => isAbsent(a.status)).length
  const leaveCount = attendance.filter((a) => isOnLeave(a.status)).length
  const totalLateMinutes = attendance.reduce((s, a) => s + (a.late || 0), 0)
  const totalOvertimeFromAtt =
    attendance.reduce((s, a) => s + (a.overtime || 0), 0)

  // ── Department payroll breakdown ──────────────────────────────
  const deptPayroll = Object.entries(
    payroll.reduce((acc, r) => {
      const dept = r.department || 'Unassigned'
      if (!acc[dept]) acc[dept] = { gross: 0, net: 0, count: 0 }
      acc[dept].gross += r.grossSalary || 0
      acc[dept].net += r.netSalary || 0
      acc[dept].count += 1
      return acc
    }, {}),
  )
    .map(([department, data]) => ({ department, ...data }))
    .sort((a, b) => b.gross - a.gross)

  // ── Attendance status pie data ────────────────────────────────
  const STATUS_COLORS = {
    Present: '#10b981',
    Absent: '#ef4444',
    'On Leave': '#3b82f6',
  }

  const attendancePieData = [
    { name: 'Present', value: presentCount, color: STATUS_COLORS.Present },
    { name: 'Absent', value: absentCount, color: STATUS_COLORS.Absent },
    {
      name: 'On Leave',
      value: leaveCount,
      color: STATUS_COLORS['On Leave'],
    },
  ].filter((d) => d.value > 0)

  const isPresentStatus = (s) =>
    s === 'Present' || s === 'P' || s === 'PH' || s === 'Half Day'
  const isAbsentStatus = (s) => s === 'Absent' || s === 'A'
  const isLeaveStatus = (s) =>
    ['Sick Leave', 'Annual Leave', 'On Leave', 'Maternity Leave', 'SL', 'AL', 'ML', 'OL'].includes(s)

  const employeeAttendanceMap = attendance.reduce((acc, a) => {
    if (!acc[a.employeeId])
      acc[a.employeeId] = {
        name: a.employeeName,
        present: 0,
        absent: 0,
        leave: 0,
        late: 0,
        overtime: 0,
      }
    const rec = acc[a.employeeId]
    if (isPresentStatus(a.status)) rec.present += 1
    else if (isAbsentStatus(a.status)) rec.absent += 1
    else if (isLeaveStatus(a.status)) rec.leave += 1
    rec.late += a.late || 0
    rec.overtime += a.overtime || 0
    return acc
  }, {})

  const performerData = Object.entries(employeeAttendanceMap)
    .map(([id, data]) => {
      const total = data.present + data.absent + data.leave
      return {
        name: data.name || id,
        employeeId: id,
        present: data.present,
        absent: data.absent,
        leave: data.leave,
        late: data.late,
        overtime: data.overtime,
        rate: total > 0 ? Math.round((data.present / total) * 100) : 0,
        total,
      }
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.rate - a.rate)

  const topPerformers = performerData.slice(0, 5)
  const lowPerformers = performerData
    .filter((p) => p.rate < 80)
    .slice(0, 5)
    .sort((a, b) => a.rate - b.rate)

  // ── Columns for employee table ────────────────────────────────
  const columns = [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      render: (employee) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1c2026] text-xs font-bold text-slate-700 dark:text-gray-300">
            {employee.initials ||
              employee.name
                ?.split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'EM'}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
              {employee.name || 'Unnamed Employee'}
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {employee.employeeId || employee.id || '-'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (employee) => (
        <span className="text-sm text-slate-600 dark:text-gray-300">
          {employee.department || '-'}
        </span>
      ),
    },
    {
      key: 'jobTitle',
      header: 'Position',
      render: (employee) => (
        <span className="text-sm text-slate-600 dark:text-gray-300">
          {employee.jobTitle || '-'}
        </span>
      ),
    },
    {
      key: 'employmentStatus',
      header: 'Status',
      render: (employee) => {
        const status = employee.employmentStatus || employee.status || 'Unknown'
        const color =
          status === 'Active'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
            : status === 'On Leave'
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60'
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#1c2026] dark:text-gray-300 dark:border-[#262b31]'
        return (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${color}`}>
            {status}
          </span>
        )
      },
    },
  ]

  const fmtETB = (v) => {
    if (v == null || isNaN(v)) return '0'
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 0,
    }).format(v)
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0d10] dark:text-gray-200">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
            Human Resources
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-gray-100">
            HR Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            Workforce, attendance, payroll &amp; performance overview.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/hr-manager/reports')}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer dark:bg-[#3a4149] dark:hover:bg-[#262b31]"
        >
          View Reports
          <ArrowUpRight size={15} />
        </button>
      </div>

      {/* ── Row 1: Workforce KPI Cards ─────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Total Employees',
            value: totalEmployees,
            description: 'Employees in the company',
            icon: Users,
            color: 'text-slate-700',
            bg: 'bg-slate-100',
          },
          {
            title: 'Active Employees',
            value: activeEmployees,
            description: 'Currently active',
            icon: CalendarCheck,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            title: 'On Leave',
            value: onLeaveEmployees,
            description: 'Currently on leave',
            icon: Clock3,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            title: 'Departments',
            value: departments,
            description: 'Active departments',
            icon: Users,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-gray-100">
                    {stat.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color} dark:text-gray-300`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-gray-400">
                {stat.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Row 2: Payroll & Tax KPI Cards ─────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            title: 'Gross Payroll',
            value: fmtETB(totalGross),
            description: 'Total monthly gross',
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: '+2.4%',
          },
          {
            title: 'Net Payroll',
            value: fmtETB(totalNet),
            description: 'After tax & pension',
            icon: Wallet,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            trend: '+1.8%',
          },
          {
            title: 'Income Tax',
            value: fmtETB(totalTax),
            description: 'PAYE collected',
            icon: Percent,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            title: 'Pension',
            value: fmtETB(totalPension),
            description: 'Emp + Employer',
            icon: PiggyBank,
            color: 'text-cyan-600',
            bg: 'bg-cyan-50',
          },
          {
            title: 'Overtime Pay',
            value: fmtETB(totalOvertimePay),
            description: `${totalOvertimeHours}h overtime`,
            icon: TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-gray-100 tabular-nums">
                    {stat.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color} dark:text-gray-300`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <p className="text-slate-500 dark:text-gray-400">
                  {stat.description}
                </p>
                {stat.trend && (
                  <span className="text-emerald-600 font-semibold text-[10px]">
                    {stat.trend}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Row 3: Main dashboard — Attendance + Payroll charts ─ */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Attendance Performance */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-gray-100">
                Attendance Performance
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                September 2026 · punch records
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Leave
              </span>
            </div>
          </div>

          {dashLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading attendance data…</div>
          ) : (
            <>
              {/* Pie chart */}
              <div className="flex items-center gap-6 mb-6">
                <div className="w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendancePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        dataKey="value"
                        stroke="none"
                      >
                        {attendancePieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3 text-xs">
                  {attendancePieData.map((d) => (
                    <div
                      key={d.name}
                      className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-3 text-center"
                    >
                      <p className="text-lg font-bold text-slate-900 dark:text-gray-100">
                        {d.value}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400">
                        {d.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance bar chart — per employee */}
              {topPerformers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-gray-100 mb-2">
                    Top Performers — Attendance Rate
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={topPerformers}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="#94a3b8" fontSize={10} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        stroke="#94a3b8"
                        fontSize={10}
                        tickFormatter={(v) => v?.split(' ')[0] || v}
                      />
                      <Tooltip
                        formatter={(v, k) => [`${v}%`, 'Attendance Rate']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Late & Overtime summary */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-800/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                    Total Late Minutes
                  </p>
                  <p className="text-xl font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                    {totalLateMinutes}m
                  </p>
                </div>
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/20 p-3 border border-purple-200 dark:border-purple-800/30">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">
                    Overtime Hours
                  </p>
                  <p className="text-xl font-bold text-purple-800 dark:text-purple-300 tabular-nums">
                    {totalOvertimeFromAtt}h
                  </p>
                </div>
              </div>

              {lowPerformers.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#262b31]">
                  <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    Needs Attention
                  </h3>
                  <div className="space-y-1.5">
                    {lowPerformers.map((p) => (
                      <div
                        key={p.employeeId}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/10"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate mr-2">
                          {p.name?.split(' ')[0]}
                        </span>
                        <span className="font-bold text-rose-600 tabular-nums">
                          {p.rate}% ({p.absent} absent, {p.late}m late)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Payroll & Salary Distribution */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-gray-100">
                Payroll &amp; Salary Distribution
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                September 2026 pay run
              </p>
            </div>
          </div>

          {dashLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading payroll data…</div>
          ) : (
            <>
              {/* Gross vs Net bar chart by department */}
              {deptPayroll.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-gray-100 mb-2">
                    Payroll by Department
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={deptPayroll} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="department" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => v?.substring(0, 8)} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                      <Tooltip
                        formatter={(v, k) => [fmtETB(v), k === 'gross' ? 'Gross' : 'Net']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="gross" name="Gross" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net" name="Net" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 text-[10px] font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Gross
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" /> Net
                    </span>
                  </div>
                </div>
              )}

              {/* Individual salary distribution */}
              {payroll.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-gray-100 mb-2">
                    Salary Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={payroll.slice(0, 8)} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="employeeName" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => v?.substring(0, 6)} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                      <Tooltip
                        formatter={(v, k) => [fmtETB(v), k === 'grossSalary' ? 'Gross' : 'Net']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="grossSalary" name="Gross" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="netSalary" name="Net" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tax & Pension breakdown */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-800/30 text-center">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                    Income Tax
                  </p>
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                    {fmtETB(totalTax)}
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    {payroll.length > 0
                      ? Math.round((totalTax / totalGross) * 100)
                      : 0}%
                    of gross
                  </p>
                </div>
                <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/20 p-3 border border-cyan-200 dark:border-cyan-800/30 text-center">
                  <p className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">
                    Pension
                  </p>
                  <p className="text-lg font-bold text-cyan-800 dark:text-cyan-300 tabular-nums">
                    {fmtETB(totalPension)}
                  </p>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400">
                    7% emp + 11% empl
                  </p>
                </div>
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/20 p-3 border border-purple-200 dark:border-purple-800/30 text-center">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">
                    Overtime
                  </p>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-300 tabular-nums">
                    {fmtETB(totalOvertimePay)}
                  </p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400">
                    {totalOvertimeHours}h total
                  </p>
                </div>
              </div>

              {/* Deductions waterfall (tax + pension as stacked) */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#262b31]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-gray-100 mb-2">
                  Deductions Overview
                </h3>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={deptPayroll} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="department" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => v?.substring(0, 8)} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                    <Tooltip formatter={(v, k) => [fmtETB(v), k === 'tax' ? 'Tax' : 'Pension']} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="tax" name="Tax" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pension" name="Pension" fill="#06b6d4" stackId="a" radius={[0, 0, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Row 4: Employee performance table ──────────────────── */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-gray-100">
              Employee Performance Summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Attendance rate, late minutes &amp; overtime per employee
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#262b31] dark:bg-[#14181e] dark:text-gray-200">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-slate-100 dark:border-[#262b31] bg-slate-50/80 dark:bg-[#1c2026] text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3.5 text-[10.5px] font-bold uppercase tracking-wider">Employee</th>
                <th className="py-3 px-3.5 text-[10.5px] font-bold uppercase tracking-wider">Department</th>
                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    Attendance Rate
                    <TrendingUp size={10} />
                  </span>
                </th>
                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">Present</th>
                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">Absent</th>
                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">Leave</th>
                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">Late (m)</th>
                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">Overtime (h)</th>
                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">Gross Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#262b31] text-slate-700 dark:text-slate-300 font-normal">
              {performerData
                .sort((a, b) => b.rate - a.rate)
                .slice(0, 10)
                .map((p) => {
                  const emp = employees.find((e) => e.employeeId === p.employeeId || e.id === p.employeeId)
                  const grossSalary = payroll.find((r) => r.employeeId === p.employeeId || r.id === p.employeeId)
                  return (
                    <tr
                      key={p.employeeId}
                      className={`${p.rate < 80 ? 'bg-rose-50/30 dark:bg-rose-950/10' : p.rate >= 95 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''} hover:bg-slate-50/80 dark:hover:bg-[#1f242c] transition-colors`}
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-bold shrink-0">
                            {(p.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-gray-100 truncate max-w-[120px]">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 dark:text-gray-300">
                        {emp?.department || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span
                          className={`font-bold tabular-nums ${
                            p.rate >= 95
                              ? 'text-emerald-600'
                              : p.rate >= 80
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {p.rate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-emerald-600 font-bold tabular-nums">
                        {p.present}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-rose-600 font-bold tabular-nums">
                        {p.absent}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-blue-600 tabular-nums">
                        {p.leave}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-amber-600 tabular-nums">
                        {p.late > 0 ? `${p.late}m` : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-purple-600 font-bold tabular-nums">
                        {p.overtime > 0 ? `${p.overtime}h` : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-slate-800 dark:text-gray-100">
                        {grossSalary ? fmtETB(grossSalary.grossSalary) : '—'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Row 5: Recent Employees table ──────────────────────── */}
      <section className="mt-6">
        <LuxuryDataTable
          title="Recent Employees"
          subtitle="Employees currently available in the shared data."
          countBadge={employees.length}
          columns={columns}
          data={employees}
          searchable
          searchKeys={['name', 'employeeId', 'department', 'jobTitle', 'employmentStatus']}
          searchPlaceholder="Search recent employees..."
          exportable
          exportFilename="HR_Recent_Employees"
          paginated
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 20]}
          emptyMessage="No employee records available."
          primaryAction={{
            label: 'View Profile',
            icon: Eye,
            onClick: () => navigate('/hr-manager/employees'),
          }}
        />
      </section>
    </div>
  )
}

export default HRDashboard
