import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  Users,
  UserCheck,
  CalendarCheck,
  CalendarX2,
  Wallet,
  TrendingDown,
  ShieldCheck,
  Clock,
  TriangleAlert,
  CheckCircle2,
  UserPlus,
  LogOut,
  Plane,
  Calculator,
  BarChart3,
} from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { ALL_LEAVE } from '../data/leaveData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { leaveBalance } from '../lib/leave'
import { SETTINGS } from '../data/settingsData'

function SectionTitle({ icon: Icon, title, right }) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gray-950 text-white flex items-center justify-center shrink-0">
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-bold text-gray-950">{title}</h3>
      </div>
      {right}
    </div>
  )
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5">
      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
        <Icon size={16} />
      </div>
      <p className="text-2xl font-bold text-gray-950 mt-4 tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Dashboard() {
  const data = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)

    const payrollRows = INITIAL_EMPLOYEES.map((emp) =>
      calcPayroll(emp, attTotals[emp.employeeId] || { totalOtHours: 0 })
    )
    const activeRows = payrollRows.filter((r) => r.active)

    const totalGross = roundMoney(activeRows.reduce((s, r) => s + r.gross, 0))
    const totalNet = roundMoney(activeRows.reduce((s, r) => s + r.netSalary, 0))
    const totalTax = roundMoney(activeRows.reduce((s, r) => s + r.incomeTax, 0))
    const totalPension = roundMoney(
      activeRows.reduce((s, r) => s + r.pensionEmployee + r.pensionEmployer, 0)
    )
    const totalOvertime = roundMoney(activeRows.reduce((s, r) => s + r.otHours, 0))

    const pendingLeaves = ALL_LEAVE.filter((r) => r.approvalStatus === 'Pending').length
    const absentToday = ATTENDANCE.filter((a) => a.status === 'Absent').length

    // Average annual-leave utilization across active staff
    const activeEmps = INITIAL_EMPLOYEES.filter(
      (e) => e.employmentStatus === 'Active' || e.employmentStatus === 'On Leave'
    )
    let utilSum = 0
    let utilCount = 0
    activeEmps.forEach((e) => {
      const bal = leaveBalance(e.joinDate, ALL_LEAVE.filter((r) => r.employeeId === e.employeeId))
      if (bal.entitled > 0) {
        utilSum += Math.min(100, (bal.taken / bal.entitled) * 100)
        utilCount += 1
      }
    })
    const avgUtilization = utilCount ? Math.round(utilSum / utilCount) : 0

    // Workforce status split
    const byStatus = { Active: 0, 'On Leave': 0, Resigned: 0, Terminated: 0 }
    INITIAL_EMPLOYEES.forEach((e) => {
      byStatus[e.employmentStatus] = (byStatus[e.employmentStatus] || 0) + 1
    })

    // Headcount by department
    const byDept = {}
    INITIAL_EMPLOYEES.forEach((e) => {
      byDept[e.department] = (byDept[e.department] || 0) + 1
    })

    // Alerts & data checks, categorized
    const alerts = []
    const tins = {}
    const ids = {}
    INITIAL_EMPLOYEES.forEach((e) => {
      if (!e.tin) {
        alerts.push({ severity: 'error', category: 'Missing info', text: `${e.name} is missing a TIN` })
      } else {
        if (tins[e.tin] && tins[e.tin] !== e.employeeId) {
          alerts.push({ severity: 'error', category: 'Duplicate', text: `Duplicate TIN ${e.tin} (${tins[e.tin]}, ${e.employeeId})` })
        }
        tins[e.tin] = e.employeeId
      }
      if (ids[e.employeeId]) {
        alerts.push({ severity: 'error', category: 'Duplicate', text: `Duplicate employee ID ${e.employeeId}` })
      }
      ids[e.employeeId] = true

      if (!e.bankAccount) {
        alerts.push({ severity: 'warning', category: 'Missing info', text: `${e.name} is missing bank account info` })
      }
      if (!e.basicSalary) {
        alerts.push({ severity: 'warning', category: 'Missing info', text: `${e.name} has no basic salary set` })
      }
    })

    INITIAL_EMPLOYEES.forEach((e) => {
      if ((e.employmentStatus === 'Resigned' || e.employmentStatus === 'Terminated') && e.exitDate) {
        if (new Date(e.exitDate) < new Date()) {
          alerts.push({ severity: 'warning', category: 'Flagged', text: `${e.name} terminated ${e.exitDate} but still in payroll` })
        }
      }
    })

    if (pendingLeaves > 0) {
      alerts.push({ severity: 'warning', category: 'Flagged', text: `${pendingLeaves} leave request(s) awaiting approval` })
    }

    // Recent activity feed
    const activities = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const factor = 1 - i * 0.01
      activities.push({
        id: `pay-${i}`,
        type: 'payroll',
        title: 'Payroll run completed',
        detail: `${formatETB(roundMoney(totalNet * factor))} net disbursed`,
        date: d.toISOString().slice(0, 10),
      })
    }
    ALL_LEAVE.filter((r) => r.approvalStatus === 'Approved' && r.approvalDate).forEach((r) => {
      activities.push({
        id: `leave-${r.id}`,
        type: 'leave',
        title: `Leave approved`,
        detail: `${r.leaveType} leave · ${r.employeeName}`,
        date: r.approvalDate,
      })
    })
    INITIAL_EMPLOYEES.forEach((e) => {
      activities.push({
        id: `hire-${e.employeeId}`,
        type: 'hire',
        title: 'New hire',
        detail: `${e.name} joined as ${e.jobTitle}`,
        date: e.joinDate,
      })
      if (e.exitDate) {
        activities.push({
          id: `exit-${e.employeeId}`,
          type: 'exit',
          title: 'Exit',
          detail: `${e.name} · ${e.employmentStatus.toLowerCase()} ${e.exitDate}`,
          date: e.exitDate,
        })
      }
    })
    activities.sort((a, b) => (a.date < b.date ? 1 : -1))
    const recentActivity = activities.slice(0, 8)

    return {
      totalGross,
      totalNet,
      totalTax,
      totalPension,
      totalOvertime,
      pendingLeaves,
      absentToday,
      avgUtilization,
      alerts,
      byDept,
      byStatus,
      recentActivity,
      headcount: INITIAL_EMPLOYEES.length,
      activeCount: byStatus.Active,
      onLeave: byStatus['On Leave'],
    }
  }, [])

  const overview = [
    { label: 'Total Employees', value: String(data.headcount), icon: Users },
    { label: 'Active', value: String(data.activeCount), icon: UserCheck },
    { label: 'On Leave', value: String(data.onLeave), icon: CalendarCheck },
    { label: 'Absent Today', value: String(data.absentToday), icon: CalendarX2 },
  ]

  const maxDept = Math.max(1, ...Object.values(data.byDept))
  const totalHead = Math.max(1, data.headcount)
  const segments = [
    { label: 'Active', count: data.byStatus.Active, color: 'bg-gray-950' },
    { label: 'On Leave', count: data.byStatus['On Leave'], color: 'bg-gray-500' },
    { label: 'Resigned', count: data.byStatus.Resigned, color: 'bg-gray-300' },
    { label: 'Terminated', count: data.byStatus.Terminated, color: 'bg-gray-200' },
  ]

  const quickActions = [
    { label: 'Run Payroll', icon: Calculator, to: '/employer/payroll' },
    { label: 'Add Employee', icon: UserPlus, to: '/employer/employee' },
    { label: 'Approve Leave', icon: CheckCircle2, to: '/employer/leave' },
  ]

  const activityIcon = {
    payroll: Wallet,
    leave: CheckCircle2,
    hire: UserPlus,
    exit: LogOut,
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">HR Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            {SETTINGS.company.name} — Period: {new Date().getMonth() + 1}/{new Date().getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-gray-950 text-white px-3 py-1.5 rounded-full">
            <TriangleAlert size={12} />
            {data.alerts.length} {data.alerts.length === 1 ? 'item' : 'items'} need review
          </span>
        </div>
      </div>

      {/* Overview — headcount KPIs */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gray-950 text-white flex items-center justify-center">
          <Users size={16} />
        </div>
        <h2 className="text-sm font-bold text-gray-950">Overview</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overview.map((k) => (
          <Stat key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <SectionTitle icon={Wallet} title="Payroll Summary" />
          <div className="p-5">
            <p className="text-[26px] font-extrabold tracking-tight text-gray-950 leading-none">
              {formatETB(data.totalNet)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1.5">Net payroll this period</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { label: 'Gross Payroll', value: formatETB(data.totalGross), icon: Wallet },
                { label: 'Income Tax', value: formatETB(data.totalTax), icon: TrendingDown },
                { label: 'Total Pension', value: formatETB(data.totalPension), icon: ShieldCheck },
                { label: 'Overtime Hours', value: `${data.totalOvertime}h`, icon: Clock },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <s.icon size={13} />
                    <span className="text-[10px] font-medium">{s.label}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-950 mt-2 tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leave Overview */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <SectionTitle
            icon={Plane}
            title="Leave Overview"
            right={
              <Link to="/employer/leave" className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                Review →
              </Link>
            }
          />
          <div className="p-5 space-y-5">
            <div>
              <p className="text-[26px] font-extrabold tracking-tight text-gray-950 leading-none">
                {data.pendingLeaves}
              </p>
              <p className="text-[11px] text-gray-500 mt-1.5">Pending requests</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500">Avg. leave utilization</span>
                <span className="font-bold text-gray-900">{data.avgUtilization}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-gray-950" style={{ width: `${data.avgUtilization}%` }} />
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center gap-2.5">
              <BarChart3 size={15} className="text-gray-500 shrink-0" />
              <p className="text-[11px] text-gray-600">
                Average annual leave taken vs entitled across {data.activeCount} active employees.
              </p>
            </div>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <SectionTitle icon={Users} title="Department Breakdown" />
          <ul className="divide-y divide-gray-50">
            {Object.entries(data.byDept)
              .sort((a, b) => b[1] - a[1])
              .map(([dept, count]) => (
                <li key={dept} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-600 truncate">{dept}</span>
                    <span className="font-bold text-gray-900 shrink-0">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                    <div className="h-full rounded-full bg-gray-950" style={{ width: `${(count / maxDept) * 100}%` }} />
                  </div>
                </li>
              ))}
          </ul>
        </div>

        {/* Workforce Status */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <SectionTitle icon={CheckCircle2} title="Workforce Status" />
          <div className="p-5">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
              {segments.map((s) =>
                s.count > 0 ? <span key={s.label} className={s.color} style={{ width: `${(s.count / totalHead) * 100}%` }} /> : null
              )}
            </div>
            <ul className="mt-5 space-y-2.5">
              {segments.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    {s.label}
                  </span>
                  <span className="font-bold text-gray-900 tabular-nums">{s.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Alerts & Data Checks */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <SectionTitle
            icon={TriangleAlert}
            title="Alerts & Data Checks"
            right={
              <span className="text-[10px] font-bold text-white bg-gray-950 px-2 py-0.5 rounded-full">
                {data.alerts.length}
              </span>
            }
          />
          {data.alerts.length === 0 ? (
            <div className="p-5 text-xs text-gray-500">No alerts — all checks passed.</div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-[240px] overflow-y-auto">
              {data.alerts.slice(0, 8).map((a, i) => (
                <li key={i} className="px-5 py-3 flex items-start gap-2.5">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed">{a.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <SectionTitle icon={Calculator} title="Quick Actions" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((qa) => (
              <Link
                key={qa.to}
                to={qa.to}
                className="flex flex-col items-start gap-2.5 p-4 rounded-xl border border-gray-200 hover:border-gray-950 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors">
                  <qa.icon size={17} />
                </div>
                <span className="text-xs font-semibold text-gray-900">{qa.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <SectionTitle
          icon={BellRing}
          title="Recent Activity"
          right={<span className="text-[11px] text-gray-400">Hires · Exits · Payroll · Leave</span>}
        />
        <div className="divide-y divide-gray-50">
          {data.recentActivity.map((item) => {
            const Icon = activityIcon[item.type]
            return (
              <div key={item.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{item.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-gray-400">{fmt(item.date)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard