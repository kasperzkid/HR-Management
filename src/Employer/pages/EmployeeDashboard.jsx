import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  MapPin,
  Plane,
  User,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { ALL_LEAVE } from '../data/leaveData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { leaveBalance, formatDate } from '../lib/leave'
import { SETTINGS } from '../data/settingsData'

// The logged-in employee — scoped entirely to their own ID.
// Every widget below is filtered by WHERE employeeId = CURRENT_EMPLOYEE.employeeId
const CURRENT_EMPLOYEE = INITIAL_EMPLOYEES.find((e) => e.employeeId === 'EMP-0001') || INITIAL_EMPLOYEES[0]

// Upcoming company holidays (displayed in the activity feed)
const UPCOMING_HOLIDAYS = [
  { day: '27', month: 'Sep', name: 'Meskel (Finding of the True Cross)' },
  { day: '7', month: 'Jan', name: 'Ethiopian Christmas (Genna)' },
  { day: '19', month: 'Jan', name: 'Timkat (Epiphany)' },
]

function tenure(joinDate) {
  const join = new Date(joinDate)
  const now = new Date()
  let years = now.getFullYear() - join.getFullYear()
  let months = now.getMonth() - join.getMonth()
  if (months < 0) {
    years -= 1
    months += 12
  }
  return `${years} yr${years === 1 ? '' : 's'} ${months} mo${months === 1 ? '' : 's'}`
}

function Avatar({ src, name, size = 'h-20 w-20', text = 'text-2xl' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div className={`${size} rounded-2xl overflow-hidden bg-gray-950 flex items-center justify-center text-white ${text} font-bold shadow-sm shrink-0`}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  )
}

function EmployeeDashboard() {
  const emp = CURRENT_EMPLOYEE

  const myLeave = useMemo(() => ALL_LEAVE.filter((r) => r.employeeId === emp.employeeId), [emp.employeeId])

  // ── This month's pay (scoped to this employee only) ──
  const attTotals = useMemo(() => attendanceTotals(ATTENDANCE), [])
  const payRow = useMemo(
    () => calcPayroll(emp, attTotals[emp.employeeId] || { totalOtHours: 0 }),
    [emp, attTotals]
  )

  // ── Leave balance ──
  const bal = useMemo(() => leaveBalance(emp.joinDate, myLeave), [emp.joinDate, myLeave])

  // ── Attendance this month ──
  const myAttendance = useMemo(() => {
    const now = new Date()
    return ATTENDANCE.filter((a) => {
      const [y, m] = a.date.split('-').map(Number)
      return a.employeeId === emp.employeeId && y === now.getFullYear() && m === now.getMonth() + 1
    })
  }, [emp.employeeId])

  const attAgg = useMemo(() => {
    const agg = { present: 0, absent: 0, late: 0, sick: 0, regular: 0, overtime: 0 }
    myAttendance.forEach((a) => {
      agg.regular += a.regular || 0
      agg.overtime += a.overtime || 0
      if (a.status === 'Present') agg.present += 1
      else if (a.status === 'Absent') agg.absent += 1
      else if (a.status === 'Sick Leave') agg.sick += 1
      if (a.late && a.late > 0) agg.late += 1
    })
    return agg
  }, [myAttendance])

  // ── Payslip history (last 6 months, this employee only) ──
  const payHistory = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const factor = 1 - i * 0.012 + (i === 2 ? 0.06 : 0)
      months.push({
        period: d.toLocaleString('en-ET', { month: 'short', year: 'numeric' }),
        net: roundMoney(payRow.netSalary * factor),
        gross: roundMoney(payRow.gross * factor),
        status: i === 0 ? 'Pending' : 'Paid',
      })
    }
    return months
  }, [payRow])

  // ── Recent activity feed ──
  const activity = useMemo(() => {
    const items = []
    myLeave.forEach((r) => {
      if (r.approvalStatus === 'Approved') {
        items.push({
          id: `leave-${r.id}`,
          type: 'approved',
          title: 'Leave approved',
          text: `${r.leaveType} leave ${formatDate(r.startDate)} – ${formatDate(r.endDate)} (${r.days} day${r.days === 1 ? '' : 's'})`,
          time: r.approvalDate ? formatDate(r.approvalDate) : '',
        })
      } else if (r.approvalStatus === 'Pending') {
        items.push({
          id: `leave-${r.id}`,
          type: 'pending',
          title: 'Leave request awaiting decision',
          text: `${r.leaveType} leave from ${formatDate(r.startDate)} to ${formatDate(r.endDate)}`,
          time: r.requestDate ? formatDate(r.requestDate) : '',
        })
      }
    })
    items.push({
      id: 'payslip',
      type: 'payroll',
      title: 'New payslip available',
      text: `Your ${new Date().toLocaleString('en-ET', { month: 'long', year: 'numeric' })} payslip has been released.`,
      time: 'This month',
    })
    UPCOMING_HOLIDAYS.forEach((h) => {
      items.push({
        id: `holiday-${h.name}`,
        type: 'holiday',
        title: `Public holiday · ${h.name}`,
        text: `${h.month} ${h.day}`,
        time: 'Upcoming',
      })
    })
    return items.sort((a, b) => (a.time === 'Upcoming' ? 1 : b.time === 'Upcoming' ? -1 : 0))
  }, [myLeave])

  const quickActions = [
    { label: 'Request Leave', icon: Plane, to: '/employer/leave' },
    { label: 'Download Payslip', icon: Download, to: '/employer/payslips' },
    { label: 'View Attendance Log', icon: CalendarDays, to: '/employer/attendance' },
    { label: 'Update Profile Info', icon: UserRound, to: '/employer/profile' },
  ]

  const leftPct = bal.entitled > 0 ? Math.max(0, Math.min(100, (bal.taken / bal.entitled) * 100)) : 0

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center">
          <UserRound size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Employee Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Personal view — scoped to your own employee record only
          </p>
        </div>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar src={emp.avatar} name={emp.name} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-extrabold tracking-tight text-gray-950">{emp.name}</h2>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-950 bg-gray-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-950" />
                Active
              </span>
              <span className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                {emp.employmentType}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-1">
              {emp.jobTitle} · {emp.department}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <FileText size={13} className="text-gray-400" /> {emp.employeeId}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400" /> {emp.location}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarCheck size={13} className="text-gray-400" /> Joined {formatDate(emp.joinDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" /> Tenure {tenure(emp.joinDate)}
              </span>
            </div>
          </div>
          <Link
            to="/employer/profile"
            className="shrink-0 px-4 py-2 rounded-xl bg-gray-950 text-white text-xs font-semibold hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <User size={14} /> View Profile
          </Link>
        </div>
      </div>

      {/* Three stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* This month's pay */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-950">This Month's Pay</h3>
          </div>
          <p className="text-[26px] font-extrabold tracking-tight text-gray-950 leading-none">
            {formatETB(payRow.netSalary)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5">Net salary</p>

          <div className="mt-4 space-y-2 text-xs">
            {[
              ['Gross Salary', payRow.gross],
              ['Income Tax', payRow.incomeTax],
              ['Pension (7%)', payRow.pensionEmployee],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {label === 'Gross Salary' ? '' : '− '}
                  {formatETB(value)}
                </span>
              </div>
            ))}
          </div>

          <Link
            to="/employer/payslips"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          >
            View full payslip <ChevronRight size={14} />
          </Link>
        </div>

        {/* Leave balance */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Plane size={16} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-950">Leave Balance</h3>
          </div>
          <p className="text-[26px] font-extrabold tracking-tight text-gray-950 leading-none">
            {bal.remaining} <span className="text-sm font-semibold text-gray-500">days left</span>
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500">Annual leave</span>
              <span className="font-semibold text-gray-900">
                {bal.taken} / {bal.entitled} used
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gray-950" style={{ width: `${leftPct}%` }} />
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Sick days used (approved)</span>
              <span className="font-semibold text-gray-900">{bal.sickDaysUsed} / {bal.sickDaysTotal}</span>
            </div>
          </div>

          <Link
            to="/employer/leave"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Request leave <ChevronRight size={14} />
          </Link>
        </div>

        {/* Attendance this month */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-950">Attendance This Month</h3>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Present', value: attAgg.present },
              { label: 'Absent', value: attAgg.absent },
              { label: 'Late', value: attAgg.late },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-50 border border-gray-100 py-3">
                <p className="text-lg font-extrabold text-gray-950 leading-none">{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total regular hours</span>
              <span className="font-semibold text-gray-900 tabular-nums">{attAgg.regular}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Overtime hours</span>
              <span className="font-semibold text-gray-900 tabular-nums">{attAgg.overtime}h</span>
            </div>
          </div>

          {/* Calendar strip */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {myAttendance.slice(-14).map((a) => {
              const day = Number(a.date.slice(8, 10))
              const isLate = (a.late || 0) > 0
              const isPresent = a.status === 'Present'
              const isSick = a.status === 'Sick Leave'
              return (
                <span
                  key={a.id}
                  title={`${a.date} · ${a.status}${isLate ? ' (late)' : ''}`}
                  className={`w-7 h-7 rounded-md text-[10px] font-bold flex items-center justify-center ${
                    isPresent
                      ? isLate
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-950 text-white'
                      : isSick
                        ? 'bg-gray-100 text-gray-500 border border-gray-200'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {day}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6">
        <h3 className="text-sm font-bold text-gray-950 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((qa) => (
            <Link
              key={qa.label}
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

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-950">Recent Activity & Notifications</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {activity.map((item) => {
            const Icon =
              item.type === 'approved'
                ? CheckCircle2
                : item.type === 'pending'
                  ? XCircle
                  : item.type === 'payroll'
                    ? Wallet
                    : CalendarDays
            return (
              <div key={item.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{item.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.text}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-gray-400">{item.time}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payslip history */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-950">Payslip History</h3>
          <span className="text-[11px] text-gray-400">Last 6 months</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[480px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium text-right">Gross</th>
                <th className="px-4 py-3 font-medium text-right">Net Salary</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {payHistory.map((h) => (
                <tr key={h.period} className="text-xs border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-900">{h.period}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatETB(h.gross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-950">{formatETB(h.net)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        h.status === 'Paid'
                          ? 'bg-gray-950 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-950 transition-colors"
                    >
                      <Download size={13} /> View / PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[10px] text-gray-400 border-t border-gray-100">
          Payroll reference: {SETTINGS.company.name} · TIN {SETTINGS.company.tin}
        </p>
      </div>
    </div>
  )
}

export default EmployeeDashboard