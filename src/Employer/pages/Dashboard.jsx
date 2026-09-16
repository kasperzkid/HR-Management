import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Users, UserCheck, CalendarCheck, Wallet, TrendingDown, ShieldCheck, Clock } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { LEAVE_REQUESTS } from '../data/leaveData'
import { calcPayroll } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'
import { formatETB, roundMoney } from '../lib/payroll'

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function Dashboard() {
  const raw = localStorage.getItem('user')
  let user = {
    name: 'AJ',
    email: 'employer@yanol.com',
    role: 'EMPLOYER',
    company: 'Yanol Technology',
  }
  if (raw) {
    try {
      user = { ...user, ...JSON.parse(raw) }
    } catch {
      /* ignore malformed stored user */
    }
  }

  const initials = getInitials(user.name)
  const roleLabel =
    user.role === 'HR_MANAGER'
      ? 'HR Manager'
      : user.role === 'EMPLOYER'
        ? 'Employer / Admin'
        : user.role || 'Team member'

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
    const pendingLeaves = LEAVE_REQUESTS.filter((r) => r.approvalStatus === 'Pending').length

    // Validation / alerts per the Dashboard sheet
    const alerts = []
    const tins = {}
    const ids = {}
    INITIAL_EMPLOYEES.forEach((e) => {
      if (!e.tin) alerts.push({ severity: 'error', text: `${e.name} is missing a TIN` })
      else {
        if (tins[e.tin] && tins[e.tin] !== e.employeeId)
          alerts.push({ severity: 'error', text: `Duplicate TIN ${e.tin} (${tins[e.tin]}, ${e.employeeId})` })
        tins[e.tin] = e.employeeId
      }
      if (ids[e.employeeId]) alerts.push({ severity: 'error', text: `Duplicate employee ID ${e.employeeId}` })
      ids[e.employeeId] = true

      if (!e.bankAccount) alerts.push({ severity: 'warning', text: `${e.name} is missing bank account info` })
      if (!e.basicSalary) alerts.push({ severity: 'warning', text: `${e.name} has no basic salary set` })

      if (e.employmentStatus === 'Resigned' || e.employmentStatus === 'Terminated') {
        // still costed if their row appears in the computed payroll
        const row = payrollRows.find((r) => r.employeeId === e.employeeId)
        if (row && row.active) {
          // Won't trigger normally since we filter active; kept as demonstration of the rule
        }
      }
    })

    // terminated-but-still-costed alert
    INITIAL_EMPLOYEES.forEach((e) => {
      if ((e.employmentStatus === 'Resigned' || e.employmentStatus === 'Terminated') && e.exitDate) {
        const past = new Date(e.exitDate) < new Date()
        if (past) alerts.push({ severity: 'warning', text: `${e.name} terminated ${e.exitDate} but still in payroll` })
      }
    })

    if (pendingLeaves > 0)
      alerts.push({ severity: 'warning', text: `${pendingLeaves} leave request(s) awaiting approval` })

    // headcount by department
    const byDept = {}
    INITIAL_EMPLOYEES.forEach((e) => {
      byDept[e.department] = (byDept[e.department] || 0) + 1
    })

    // status breakdown
    const byStatus = {}
    INITIAL_EMPLOYEES.forEach((e) => {
      byStatus[e.employmentStatus] = (byStatus[e.employmentStatus] || 0) + 1
    })

    return {
      payrollRows,
      activeRows,
      totalGross,
      totalNet,
      totalTax,
      totalPension,
      totalOvertime,
      pendingLeaves,
      alerts,
      byDept,
      byStatus,
      headcount: INITIAL_EMPLOYEES.length,
      activeCount: INITIAL_EMPLOYEES.filter((e) => e.employmentStatus === 'Active').length,
      onLeave: INITIAL_EMPLOYEES.filter((e) => e.employmentStatus === 'On Leave').length,
    }
  }, [])

  const kpis = [
    { label: 'Headcount', value: String(data.headcount), icon: Users, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Active', value: String(data.activeCount), icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'On Leave', value: String(data.onLeave), icon: CalendarCheck, color: 'bg-amber-50 text-amber-600' },
    { label: 'Gross Payroll', value: formatETB(data.totalGross), icon: Wallet, color: 'bg-violet-50 text-violet-600' },
    { label: 'Net Payroll', value: formatETB(data.totalNet), icon: Wallet, color: 'bg-rose-50 text-rose-600' },
    { label: 'Income Tax', value: formatETB(data.totalTax), icon: TrendingDown, color: 'bg-sky-50 text-sky-600' },
    { label: 'Pension', value: formatETB(data.totalPension), icon: ShieldCheck, color: 'bg-teal-50 text-teal-600' },
    { label: 'OT Hours', value: `${data.totalOvertime}h`, icon: Clock, color: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Profile Header Section */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-950 text-white flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-gray-950 truncate">{user.name}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/employer/profile"
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            {SETTINGS.company.name} — Period: {new Date().getMonth() + 1}/{new Date().getFullYear()}
          </p>
        </div>
        <Link
          to="/employer/payroll"
          className="px-4 py-2 rounded-lg bg-gray-950 text-white text-xs font-semibold hover:bg-gray-800 transition-colors inline-flex items-center justify-center gap-1.5"
        >
          Go to Payroll Run
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}>
              <k.icon size={16} />
            </div>
            <p className="text-2xl font-bold text-gray-950 mt-4 tracking-tight">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown tables */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-950">Headcount by Department</h3>
          </div>
          <ul className="divide-y divide-gray-50">
            {Object.entries(data.byDept)
              .sort((a, b) => b[1] - a[1])
              .map(([dept, count]) => (
                <li key={dept} className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-gray-600">{dept}</span>
                  <span className="text-xs font-bold text-gray-900">{count}</span>
                </li>
              ))}
          </ul>
        </div>

        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-950">Status Breakdown</h3>
          </div>
          <ul className="divide-y divide-gray-50">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-gray-600">{status}</span>
                <span className="text-xs font-bold text-gray-900">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Alerts / validation */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BellRing size={15} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-950">Validation & Alerts</h3>
          </div>
          {data.alerts.length === 0 ? (
            <div className="p-5 text-xs text-gray-500">No alerts — all checks passed.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.alerts.slice(0, 8).map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 px-5 py-3">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      a.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs text-gray-700">{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard