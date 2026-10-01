import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck, CalendarDays, CheckCircle2, ChevronRight, Clock, Download, FileText, KeyRound, MapPin, Plane, User, UserRound, Wallet, XCircle,
} from 'lucide-react'
import { fetchEmployees, fetchAttendance, fetchLeaveRequests, fetchPayrollRecords } from '../lib/employerApi'
import { changePasswordApi } from '../lib/userApi'
import { getCurrentUser, matchEmployee, placeholderEmployee } from '../lib/currentUser'
import { calcPayroll, formatETB } from '../lib/payroll'
import { leaveBalance, formatDate } from '../lib/leave'

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
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [payrollRecords, setPayrollRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchEmployees(), fetchAttendance(), fetchLeaveRequests(), fetchPayrollRecords()])
      .then(([employeeRows, attendanceRows, leaveRows, payrollRows]) => {
        if (cancelled) return
        setEmployees(Array.isArray(employeeRows) ? employeeRows : [])
        setAttendance(Array.isArray(attendanceRows) ? attendanceRows : [])
        setLeaveRequests(Array.isArray(leaveRows) ? leaveRows : [])
        setPayrollRecords(Array.isArray(payrollRows) ? payrollRows : [])
      })
      .catch((error) => console.error('Employee dashboard load error:', error))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const user = getCurrentUser()

  async function handlePasswordChange(event) {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('The new password must be at least 8 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new passwords do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await changePasswordApi({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      const updatedUser = { ...user, mustChangePassword: false }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage('Password updated successfully.')
    } catch (error) {
      setPasswordError(error.message || 'Could not update your password.')
    } finally {
      setSavingPassword(false)
    }
  }
  const emp = useMemo(() => matchEmployee(employees, user) || placeholderEmployee(user), [employees, user])
  const myLeave = useMemo(() => leaveRequests.filter((r) => r.employeeId === emp.id || r.employeeId === emp.employeeId), [leaveRequests, emp.id, emp.employeeId])
  const myAttendance = useMemo(() => attendance.filter((a) => a.employeeId === emp.id || a.employeeId === emp.employeeId), [attendance, emp.id, emp.employeeId])
  const myPayroll = useMemo(() => payrollRecords.filter((r) => r.employeeId === emp.id || r.employeeId === emp.employeeId), [payrollRecords, emp.id, emp.employeeId])
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const currentPayrollRecord = useMemo(() => myPayroll.find((r) => String(r.payrollMonth).startsWith(currentMonthKey)), [myPayroll, currentMonthKey])

  const attTotals = useMemo(() => myAttendance.reduce((t, r) => ({
    ...t, totalOtHours: t.totalOtHours + Number(r.overtime || 0),
  }), { totalOtHours: 0 }), [myAttendance])
  const calculatedPay = useMemo(() => calcPayroll(emp, attTotals), [emp, attTotals])
  const payRow = useMemo(() => currentPayrollRecord ? {
    ...calculatedPay,
    gross: Number(currentPayrollRecord.grossSalary || 0),
    netSalary: Number(currentPayrollRecord.netSalary || 0),
    incomeTax: Number(currentPayrollRecord.incomeTax || 0),
    pensionEmployee: Number(currentPayrollRecord.pensionDeduction || 0),
  } : calculatedPay, [currentPayrollRecord, calculatedPay])

  const bal = useMemo(() => leaveBalance(emp.joinDate, myLeave), [emp.joinDate, myLeave])
  const attAgg = useMemo(() => {
    const now = new Date()
    const agg = { present: 0, absent: 0, late: 0, sick: 0, regular: 0, overtime: 0 }
    myAttendance.forEach((a) => {
      const d = new Date(a.date)
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return
      agg.regular += Number(a.regular || 0); agg.overtime += Number(a.overtime || 0)
      const status = String(a.status || '').toUpperCase()
      if (['PRESENT','CHECKED_IN','PENDING_CHECKOUT'].includes(status)) agg.present += 1
      else if (status === 'ABSENT') agg.absent += 1
      else if (['SICK LEAVE','LEAVE'].includes(status)) agg.sick += 1
      if (Number(a.late || 0) > 0 || status === 'LATE') agg.late += 1
    })
    return agg
  }, [myAttendance])
  const monthAttendance = useMemo(() => {
    const now = new Date()
    return myAttendance.filter((a) => { const d = new Date(a.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() }).sort((a,b) => String(a.date).localeCompare(String(b.date)))
  }, [myAttendance])
  const payHistory = useMemo(() => [...myPayroll].sort((a,b) => String(b.payrollMonth).localeCompare(String(a.payrollMonth))).map((r) => ({ period: r.payrollMonth, net: Number(r.netSalary || 0), gross: Number(r.grossSalary || 0), status: 'Paid' })), [myPayroll])
  const activity = useMemo(() => {
    const items = []
    myLeave.forEach((r) => items.push({ id:`leave-${r.id}`, type:String(r.approvalStatus || '').toLowerCase()==='approved'?'approved':'pending', title:String(r.approvalStatus || '').toLowerCase()==='approved'?'Leave approved':'Leave request', text:`${r.leaveType || 'Leave'} from ${formatDate(r.startDate)} to ${formatDate(r.endDate)}`, time:r.approvedDate || r.requestDate || r.createdAt || '' }))
    myPayroll.slice(0,3).forEach((r) => items.push({ id:`payroll-${r.id}`, type:'payroll', title:'Payroll record available', text:`${r.payrollMonth} · Net ${formatETB(Number(r.netSalary || 0))}`, time:r.payrollMonth || r.createdAt || '' }))
    return items.sort((a,b) => String(b.time).localeCompare(String(a.time))).slice(0,8)
  }, [myLeave, myPayroll])
  const quickActions = [
    { label:'Request Leave', icon:Plane, to:'/employer/leave' },
    { label:'Download Payslip', icon:Download, to:'/employer/payslips' },
    { label:'View Attendance Log', icon:CalendarDays, to:'/employer/attendance' },
    { label:'Update Profile Info', icon:UserRound, to:'/employer/profile' },
  ]
  const leftPct = bal.entitled > 0 ? Math.max(0, Math.min(100, (bal.taken / bal.entitled) * 100)) : 0

  if (loading) {
    return <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto"><div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6"><p className="text-sm font-semibold text-gray-900">Loading your employee dashboard…</p><p className="text-xs text-gray-500 mt-1">Loading your live employee records.</p></div></div>
  }

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

      <section className="bg-white rounded-2xl border border-amber-200 shadow-2xs p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <KeyRound size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-950">Reset your password</h2>
            <p className="text-xs text-gray-500 mt-0.5">Use this section to replace your temporary or current password.</p>
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            ['currentPassword', 'Current password'],
            ['newPassword', 'New password'],
            ['confirmPassword', 'Confirm new password'],
          ].map(([field, label]) => (
            <label key={field} className="text-xs font-semibold text-gray-700">
              {label}
              <input
                type="password"
                value={passwordForm[field]}
                onChange={(event) => setPasswordForm((current) => ({ ...current, [field]: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-normal focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300"
                required
              />
            </label>
          ))}
          <div className="md:col-span-3 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={savingPassword} className="px-4 py-2 rounded-lg bg-gray-950 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50">
              {savingPassword ? 'Updating...' : 'Update password'}
            </button>
            {passwordMessage && <span className="text-xs font-medium text-emerald-600">{passwordMessage}</span>}
            {passwordError && <span className="text-xs font-medium text-rose-600">{passwordError}</span>}
          </div>
        </form>
      </section>

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
            {monthAttendance.slice(-14).map((a) => {
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
          {activity.length === 0 ? (
            <div className="px-5 py-5 text-xs text-gray-500">No employee activity has been recorded yet.</div>
          ) : activity.map((item) => {
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
          <span className="text-[11px] text-gray-400">Recorded payroll</span>
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
              {payHistory.length === 0 ? (
                <tr><td colSpan="5" className="px-5 py-6 text-center text-xs text-gray-500">No payroll records are available yet.</td></tr>
              ) : payHistory.map((h) => (
                <tr key={h.period} className="text-xs border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-900">{h.period}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatETB(h.gross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-950">{formatETB(h.net)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        h.status === 'Paid'
                          ? 'text-gray-950'
                          : 'text-gray-600'
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
          Payroll history shown from your recorded payroll records.
        </p>
      </div>
    </div>
  )
}

export default EmployeeDashboard
