import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  Users,
  UserCheck,
  CalendarCheck,
  Wallet,
  TrendingDown,
  ShieldCheck,
  Clock,
  UserPlus,
  Calendar,
  FileText,
  CreditCard,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import ApplyLeaveModal from '../components/ApplyLeaveModal'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { ALL_LEAVE, LEAVE_REQUESTS } from '../data/leaveData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { leaveBalance } from '../lib/leave'
import { SETTINGS } from '../data/settingsData'
import AddEmployeeModal from '../../HR-Manager/components/AddEmployeeModal'
import LuxuryDataTable from '../components/LuxuryDataTable'
import { getCurrentEmployee, getCurrentUser } from '../lib/currentUser'

function Dashboard() {
  const user = getCurrentUser()
  const currentEmployee = getCurrentEmployee()
  const isEmployeeRole = !user?.role || user?.role === 'EMPLOYEE'

  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // 1. Employee-specific metrics
  const myPayroll = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    return calcPayroll(
      currentEmployee,
      attTotals[currentEmployee.employeeId] || { totalOtHours: 0 }
    )
  }, [currentEmployee])

  const [myLeaveRequests, setMyLeaveRequests] = useState(() =>
    ALL_LEAVE.filter((r) => r.employeeId === currentEmployee.employeeId)
  )

  const myLeave = useMemo(() => {
    return leaveBalance(currentEmployee.joinDate, myLeaveRequests)
  }, [currentEmployee.joinDate, myLeaveRequests])

  const myAttendance = useMemo(() => {
    const records = ATTENDANCE.filter((a) => a.employeeId === currentEmployee.employeeId)
    let regular = 0
    let overtime = 0
    let present = 0
    records.forEach((a) => {
      regular += a.regular || 0
      overtime += a.overtime || 0
      if (a.status === 'Present') present += 1
    })
    return { records, regular, overtime, present }
  }, [currentEmployee.employeeId])

  // 2. Company-wide metrics for Employer Admin role
  const companyData = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    const payrollRows = employees.map((emp) =>
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

    return {
      totalGross,
      totalNet,
      totalTax,
      totalPension,
      totalOvertime,
      pendingLeaves,
      headcount: employees.length,
      activeCount: employees.filter((e) => e.employmentStatus === 'Active').length,
      onLeave: employees.filter((e) => e.employmentStatus === 'On Leave').length,
    }
  }, [employees])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. WELCOME HEADER (Personalized for Current Employee)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">
              Welcome back, {currentEmployee.name.split(' ')[0]}!
            </h1>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-[#1c2026] dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
              {currentEmployee.jobTitle}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {SETTINGS.company.name} · {currentEmployee.department} Department · ID: {currentEmployee.employeeId}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CalendarCheck size={15} />
            <span>Apply for Leave</span>
          </button>
          <Link
            to="/employer/payslips"
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <FileText size={15} />
            <span>My Payslip</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PERSONAL EMPLOYEE KPIS (Only Current User Data)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Net Salary */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <p className="text-2xl font-black text-gray-950 dark:text-gray-100 mt-3 tracking-tight tabular-nums">
            {formatETB(myPayroll.netSalary)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Net Monthly Salary</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
          </div>
        </div>

        {/* KPI 2: Remaining Leave */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarCheck size={18} />
          </div>
          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-3 tracking-tight">
            {myLeave.remaining} <span className="text-xs font-normal text-gray-400">days</span>
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Remaining Annual Leave</span>
            <span className="text-[10px] text-gray-400">{myLeave.taken} days taken</span>
          </div>
        </div>

        {/* KPI 3: Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <UserCheck size={18} />
          </div>
          <p className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-3 tracking-tight">
            {myAttendance.present} <span className="text-xs font-normal text-gray-400">shifts</span>
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Present This Month</span>
            <span className="text-[10px] text-teal-600 font-semibold">{myAttendance.regular}h regular</span>
          </div>
        </div>

        {/* KPI 4: Overtime */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-3 tracking-tight">
            {myAttendance.overtime}h
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Overtime Logged</span>
            <span className="text-[10px] text-purple-600 font-semibold">{formatETB(myPayroll.otPay)}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. QUICK ACCESS TILES
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/employer/leave"
          className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/90 dark:border-[#262b31] shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-950 dark:text-gray-100">Leave Applications</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">View status &amp; apply</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/employer/payslips"
          className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/90 dark:border-[#262b31] shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-950 dark:text-gray-100">Monthly Payslip</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Tax &amp; pension details</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/employer/payment-info"
          className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/90 dark:border-[#262b31] shadow-2xs hover:border-violet-300 dark:hover:border-violet-700 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-950 dark:text-gray-100">Payment &amp; Bank Info</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Manage account &amp; TIN</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MY RECENT LEAVE REQUESTS (Qirb-Alga Luxury Table)
         ───────────────────────────────────────────────────────────── */}
      <LuxuryDataTable
        title="My Recent Leave Requests"
        subtitle={`Recent time-off applications submitted by ${currentEmployee.name}`}
        countBadge={`${myLeaveRequests.length} records`}
        data={myLeaveRequests}
        searchable={true}
        searchPlaceholder="Search my requests..."
        searchKeys={['id', 'leaveType', 'remarks', 'approvalStatus']}
        exportable={true}
        exportFilename={`My_Leave_Requests_${currentEmployee.employeeId}`}
        columns={[
          {
            key: 'id',
            header: 'Req ID',
            sortable: true,
            render: (r) => (
              <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">{r.id}</span>
            ),
          },
          {
            key: 'leaveType',
            header: 'Leave Type',
            sortable: true,
            render: (r) => (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60">
                {r.leaveType}
              </span>
            ),
          },
          {
            key: 'startDate',
            header: 'Start Date',
            sortable: true,
            render: (r) => <span className="text-gray-600 dark:text-gray-400">{r.startDate}</span>,
          },
          {
            key: 'endDate',
            header: 'End Date',
            sortable: true,
            render: (r) => <span className="text-gray-600 dark:text-gray-400">{r.endDate}</span>,
          },
          {
            key: 'days',
            header: 'Days',
            sortable: true,
            align: 'center',
            render: (r) => (
              <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{r.days}d</span>
            ),
          },
          {
            key: 'approvalStatus',
            header: 'Status',
            sortable: true,
            align: 'center',
            render: (r) => (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  r.approvalStatus === 'Approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                    : r.approvalStatus === 'Pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                }`}
              >
                {r.approvalStatus}
              </span>
            ),
          },
        ]}
      />

      {/* Apply for Leave Modal */}
      <ApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onApply={(newReq) => {
          setMyLeaveRequests((prev) => [newReq, ...prev])
          setIsLeaveModalOpen(false)
          showToast('Leave request submitted successfully for approval')
        }}
        employee={currentEmployee}
      />

      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white dark:bg-[#3a4149] px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Add Employee Modal (available if needed) */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(newEmp) => setEmployees((prev) => [newEmp, ...prev])}
        existingEmployees={employees}
      />
    </div>
  )
}

export default Dashboard