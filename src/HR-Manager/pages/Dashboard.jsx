import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  UserCheck,
  CalendarCheck,
  CalendarX2,
  Wallet,
  TrendingDown,
  ShieldCheck,
  Clock,
  Plane,
  Calculator,
  UserPlus,
  CheckCircle2,
  CalendarPlus,
  AlertTriangle,
  FileCheck2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  X,
  FileSpreadsheet,
  ArrowUpRight,
  Building2,
  PieChart as PieChartIcon,
  BadgeAlert,
  Send,
  UserX,
  Info,
  ChevronDown,
} from 'lucide-react'

import { HR_SETTINGS } from '../data/settingsData'
import {
  MOCK_EMPLOYEES,
  PAYROLL_PERIODS,
  MOCK_ATTENDANCE_SUMMARY,
  MOCK_LEAVE_REQUESTS,
  MOCK_RECENT_ACTIVITIES,
} from '../data/mockData'
import { calcEmployeePayroll, formatETB, roundMoney } from '../lib/payroll'
import { calculateLeaveMetrics } from '../lib/leave'

// ─────────────────────────────────────────────────────────────
// COMPONENT: Section Header
// ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, badge, action }) {
  return (
    <div className="px-5 py-4 border-b border-gray-200/80 bg-white flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <Icon size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-950 tracking-tight">{title}</h3>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Filtered Records Modal / Drawer
// ─────────────────────────────────────────────────────────────
function FilteredRecordsModal({ alertItem, onClose }) {
  if (!alertItem) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                alertItem.status === 'REVIEW'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {alertItem.status === 'REVIEW' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-950">{alertItem.label}</h4>
              <p className="text-xs text-gray-500">
                {alertItem.records.length} record{alertItem.records.length === 1 ? '' : 's'} matching check criteria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 divide-y divide-gray-100">
          {alertItem.records.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
              <p className="text-sm font-semibold text-gray-900">All checks verified</p>
              <p className="text-xs text-gray-500 mt-1">
                Zero discrepancies found for &ldquo;{alertItem.label}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-900 flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <p className="font-semibold">Action Required for Statutory Compliance</p>
                  <p className="text-amber-800/90 text-[11px] mt-0.5">
                    Records flagged below must be updated prior to running final Ethiopian tax &amp; pension statutory filings.
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Identifier</th>
                      <th className="py-2.5 px-3">Name / Entity</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Status / Issue</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {alertItem.records.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                          {rec.id || rec.employeeId || `ROW-${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-950">
                          {rec.name || rec.employeeName || rec.title || 'Record item'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{rec.department || 'N/A'}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            {rec.reason || 'Review needed'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to={alertItem.targetPath || '/hr-manager/employees'}
                            onClick={onClose}
                            className="text-[11px] font-bold text-gray-900 hover:text-black underline inline-flex items-center gap-0.5"
                          >
                            Edit <ArrowUpRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-mono text-[11px]">System Audit Rule • Proclamation Compliant</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-900 text-white font-semibold text-xs hover:bg-black transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Add Employee Modal
// ─────────────────────────────────────────────────────────────
function AddEmployeeModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    employeeId: `EMP-00${Math.floor(Math.random() * 900) + 100}`,
    jobTitle: '',
    department: HR_SETTINGS.departments[0],
    employmentType: 'Permanent',
    employmentStatus: 'Active',
    basicSalary: '',
    transportAllowance: '2000',
    housingAllowance: '3000',
    mealAllowance: '1500',
    tin: '',
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '',
  })

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      basicSalary: Number(formData.basicSalary) || 0,
      transportAllowance: Number(formData.transportAllowance) || 0,
      housingAllowance: Number(formData.housingAllowance) || 0,
      mealAllowance: Number(formData.mealAllowance) || 0,
      joinDate: new Date().toISOString().slice(0, 10),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-950 text-white flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-950">Add New Employee</h4>
              <p className="text-xs text-gray-500">Register employee to HR &amp; Payroll directory</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Employee ID</label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Almaz Bekele"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              >
                {HR_SETTINGS.departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Job Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Operations Coordinator"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              >
                {HR_SETTINGS.employmentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Basic Monthly Salary (ETB)</label>
              <input
                type="number"
                required
                placeholder="e.g. 32000"
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Tax Identification Number (TIN)</label>
              <input
                type="text"
                placeholder="TIN-00123456"
                value={formData.tin}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Bank Account Number</label>
              <input
                type="text"
                placeholder="1000..."
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gray-950 text-white font-semibold hover:bg-black transition-colors"
            >
              Save Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN HR DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────
export default function HRDashboard() {
  const [selectedPeriodId, setSelectedPeriodId] = useState('2026-09')
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES)
  const [activeAlertDetail, setActiveAlertDetail] = useState(null)
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)

  // Current selected period definition
  const currentPeriod = useMemo(() => {
    return PAYROLL_PERIODS.find((p) => p.id === selectedPeriodId) || PAYROLL_PERIODS[0]
  }, [selectedPeriodId])

  // Attendance summary scoped to selected period
  const attendanceScope = useMemo(() => {
    return (
      MOCK_ATTENDANCE_SUMMARY[selectedPeriodId] || {
        absentTodayCount: 0,
        absentEmployees: [],
      }
    )
  }, [selectedPeriodId])

  // Leave requests scoped to selected period
  const leaveScope = useMemo(() => {
    return MOCK_LEAVE_REQUESTS.filter(
      (r) => !r.period || r.period === selectedPeriodId || r.requestDate.startsWith(selectedPeriodId)
    )
  }, [selectedPeriodId])

  // ─────────────────────────────────────────────────────────────
  // 1. DATA COMPUTATIONS & AGGREGATIONS
  // ─────────────────────────────────────────────────────────────
  const dashboardData = useMemo(() => {
    // 1. Headcount & Statuses
    const totalEmployees = employees.length
    const byStatus = {
      Active: 0,
      'On Leave': 0,
      Resigned: 0,
      Terminated: 0,
    }

    employees.forEach((emp) => {
      const st = emp.employmentStatus || 'Active'
      byStatus[st] = (byStatus[st] || 0) + 1
    })

    const activeEmployees = byStatus['Active']
    const employeesOnLeave = byStatus['On Leave']
    const absentToday = attendanceScope.absentTodayCount || 0

    // 2. Department Breakdown (strictly using central HR_SETTINGS.departments)
    const byDepartment = {}
    HR_SETTINGS.departments.forEach((dept) => {
      byDepartment[dept] = 0
    })

    employees.forEach((emp) => {
      if (emp.department && byDepartment[emp.department] !== undefined) {
        byDepartment[emp.department] += 1
      } else if (emp.department) {
        byDepartment[emp.department] = (byDepartment[emp.department] || 0) + 1
      }
    })

    // 3. Payroll Calculation: ONLY ACTIVE employees in current period
    // Inactive/Terminated/Resigned are strictly excluded from current period totals
    const activeEmpList = employees.filter((e) => e.employmentStatus === 'Active')

    const payrollLines = activeEmpList.map((emp) => {
      const att = attendanceScope[emp.employeeId] || { totalOtHours: 0 }
      return calcEmployeePayroll(emp, att)
    })

    const totalMonthlyGross = roundMoney(payrollLines.reduce((acc, row) => acc + row.gross, 0))
    const totalNetPayroll = roundMoney(payrollLines.reduce((acc, row) => acc + row.netSalary, 0))
    const totalIncomeTax = roundMoney(payrollLines.reduce((acc, row) => acc + row.incomeTax, 0))
    const totalPension = roundMoney(payrollLines.reduce((acc, row) => acc + row.totalPension, 0))
    const totalOvertimeHours = roundMoney(payrollLines.reduce((acc, row) => acc + row.otHours, 0))

    // 4. Leave Overview
    const pendingLeaveRequests = leaveScope.filter((l) => l.approvalStatus === 'Pending')
    const leaveMetrics = calculateLeaveMetrics(
      employees.filter((e) => e.employmentStatus === 'Active' || e.employmentStatus === 'On Leave'),
      leaveScope,
      new Date(`${currentPeriod.year}-${currentPeriod.month}-28`)
    )

    // 5. Alerts & Data Checks (9 statutory checks)
    const idMap = {}
    const tinMap = {}

    const dupIds = []
    const dupTins = []
    const missingSalary = []
    const missingBank = []
    const missingTin = []
    const missingExitDate = []
    const inactivePriced = []
    const flaggedPayrollRows = []

    employees.forEach((emp) => {
      // 1. Duplicate Employee IDs
      if (idMap[emp.employeeId]) {
        dupIds.push({ ...emp, reason: `Duplicate ID ${emp.employeeId} with ${idMap[emp.employeeId].name}` })
      } else {
        idMap[emp.employeeId] = emp
      }

      // 2. Duplicate TINs
      if (emp.tin) {
        if (tinMap[emp.tin]) {
          dupTins.push({ ...emp, reason: `Duplicate TIN ${emp.tin} with ${tinMap[emp.tin].name}` })
        } else {
          tinMap[emp.tin] = emp
        }
      }

      // 3. Missing Salary (Active employees only)
      if (emp.employmentStatus === 'Active' && (!emp.basicSalary || emp.basicSalary <= 0)) {
        missingSalary.push({ ...emp, reason: 'Basic salary is missing or zero' })
      }

      // 4. Missing Bank Info (Active employees)
      if (emp.employmentStatus === 'Active' && (!emp.bankAccount || emp.bankAccount.trim() === '')) {
        missingBank.push({ ...emp, reason: 'Missing bank account number for direct disbursement' })
      }

      // 5. Missing TIN
      if (emp.employmentStatus === 'Active' && (!emp.tin || emp.tin.trim() === '')) {
        missingTin.push({ ...emp, reason: 'Missing Ethiopian Tax Identification Number' })
      }

      // 6. Terminated / Resigned missing exit date
      if (
        (emp.employmentStatus === 'Resigned' || emp.employmentStatus === 'Terminated') &&
        (!emp.exitDate || emp.exitDate.trim() === '')
      ) {
        missingExitDate.push({ ...emp, reason: 'Exit status recorded without statutory effective exit date' })
      }
    })

    // 7. Inactive Employees Still Priced in Payroll
    employees
      .filter((e) => e.employmentStatus === 'Resigned' || e.employmentStatus === 'Terminated')
      .forEach((inactiveEmp) => {
        // Check if erroneously has active payroll entry
        if (inactiveEmp.exitDate && new Date(inactiveEmp.exitDate) < new Date('2026-09-01')) {
          // Flag if attendance has logged OT in current month
          const att = attendanceScope[inactiveEmp.employeeId]
          if (att && att.totalOtHours > 0) {
            inactiveEmp.reason = 'Inactive staff member logged with hours in current payroll'
            inactivePriced.push(inactiveEmp)
          }
        }
      })

    // 8. Leave requests pending approval
    const pendingLeaveRecords = pendingLeaveRequests.map((l) => ({
      id: l.id,
      name: l.employeeName,
      department: l.department,
      reason: `${l.days} days ${l.leaveType} leave requested on ${l.requestDate}`,
    }))

    // 9. Flagged payroll rows
    payrollLines.forEach((p) => {
      if (p.netSalary < 0) {
        flaggedPayrollRows.push({
          id: p.employeeId,
          name: p.name,
          department: p.department,
          reason: `Negative net salary (${formatETB(p.netSalary)}) due to deductions exceeding gross`,
        })
      }
    })

    // 9 Checks Specification Table
    const dataChecks = [
      {
        id: 'dup-id',
        label: 'Duplicate Employee IDs',
        count: dupIds.length,
        status: dupIds.length === 0 ? 'OK' : 'REVIEW',
        records: dupIds,
        targetPath: '/hr-manager/employees',
      },
      {
        id: 'dup-tin',
        label: 'Duplicate TINs',
        count: dupTins.length,
        status: dupTins.length === 0 ? 'OK' : 'REVIEW',
        records: dupTins,
        targetPath: '/hr-manager/employees',
      },
      {
        id: 'miss-sal',
        label: 'Employees Missing Salary',
        count: missingSalary.length,
        status: missingSalary.length === 0 ? 'OK' : 'REVIEW',
        records: missingSalary,
        targetPath: '/hr-manager/employees',
      },
      {
        id: 'miss-bank',
        label: 'Employees Missing Bank Info',
        count: missingBank.length,
        status: missingBank.length === 0 ? 'OK' : 'REVIEW',
        records: missingBank,
        targetPath: '/hr-manager/employees',
      },
      {
        id: 'miss-tin',
        label: 'Employees Missing TIN',
        count: missingTin.length,
        status: missingTin.length === 0 ? 'OK' : 'REVIEW',
        records: missingTin,
        targetPath: '/hr-manager/employees',
      },
      {
        id: 'miss-exit',
        label: 'Terminated/Resigned Missing Exit Date',
        count: missingExitDate.length,
        status: missingExitDate.length === 0 ? 'OK' : 'REVIEW',
        records: missingExitDate,
        targetPath: '/hr-manager/employees',
      },
      {
        id: 'inactive-priced',
        label: 'Inactive Employees Still Priced in Payroll',
        count: inactivePriced.length,
        status: inactivePriced.length === 0 ? 'OK' : 'REVIEW',
        records: inactivePriced,
        targetPath: '/hr-manager/payroll',
      },
      {
        id: 'leave-pending',
        label: 'Leave Requests Pending Approval',
        count: pendingLeaveRecords.length,
        status: pendingLeaveRecords.length === 0 ? 'OK' : 'REVIEW',
        records: pendingLeaveRecords,
        targetPath: '/hr-manager/leave',
      },
      {
        id: 'payroll-flagged',
        label: 'Payroll Rows Flagged "Check Required"',
        count: flaggedPayrollRows.length,
        status: flaggedPayrollRows.length === 0 ? 'OK' : 'REVIEW',
        records: flaggedPayrollRows,
        targetPath: '/hr-manager/payroll',
      },
    ]

    // Needs Review count = sum of all non-OK rows in Alerts & Data Checks section
    const needsReviewCount = dataChecks.filter((c) => c.status !== 'OK').reduce((sum, c) => sum + c.count, 0)

    return {
      totalEmployees,
      activeEmployees,
      employeesOnLeave,
      absentToday,
      totalMonthlyGross,
      totalNetPayroll,
      totalIncomeTax,
      totalPension,
      totalOvertimeHours,
      pendingLeaveCount: pendingLeaveRequests.length,
      leaveAvgDays: leaveMetrics.avgDaysTaken,
      leaveUtilizationRate: leaveMetrics.avgUtilizationRate,
      byDepartment,
      byStatus,
      dataChecks,
      needsReviewCount,
      absentEmployees: attendanceScope.absentEmployees || [],
    }
  }, [employees, attendanceScope, leaveScope, currentPeriod])

  const maxDeptHeadcount = Math.max(1, ...Object.values(dashboardData.byDepartment))
  const totalHead = Math.max(1, dashboardData.totalEmployees)

  // Status segmentation percentages
  const statusSegments = [
    { label: 'Active', count: dashboardData.byStatus.Active, color: '#09090b', twColor: 'bg-gray-950' },
    { label: 'On Leave', count: dashboardData.byStatus['On Leave'], color: '#3b82f6', twColor: 'bg-blue-600' },
    { label: 'Resigned', count: dashboardData.byStatus.Resigned, color: '#f59e0b', twColor: 'bg-amber-500' },
    { label: 'Terminated', count: dashboardData.byStatus.Terminated, color: '#ef4444', twColor: 'bg-rose-500' },
  ]

  const handleAddNewEmployee = (newEmp) => {
    setEmployees((prev) => [newEmp, ...prev])
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-gray-900 pb-16 antialiased">
      {/* ─────────────────────────────────────────────────────────────
          1. PAGE HEADER
          - Title "Dashboard"
          - Subtitle: "Live overview for [Month Year] payroll period" with month/year dropdown
          - Top-right: "Needs Review" badge showing single count, red if > 0
         ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Dashboard</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200/80 px-2 py-0.5 rounded-md">
                Admin Overview
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-gray-600 font-medium">
                Live overview for
              </span>
              <div className="relative inline-flex items-center">
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold text-xs rounded-lg pl-2.5 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer shadow-2xs transition-colors"
                >
                  {PAYROLL_PERIODS.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2 text-gray-500 pointer-events-none" />
              </div>
              <span className="text-xs text-gray-600 font-medium">payroll period</span>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <span className="text-xs text-gray-500 hidden sm:inline font-mono">
                {HR_SETTINGS.company.name} ({HR_SETTINGS.company.currency})
              </span>
            </div>
          </div>

          {/* Top-Right: Needs Review Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('alerts-data-checks')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                dashboardData.needsReviewCount > 0
                  ? 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-300/40 animate-pulse'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <BadgeAlert size={16} className={dashboardData.needsReviewCount > 0 ? 'text-white' : 'text-emerald-700'} />
              <span>
                Needs Review:{' '}
                <span className="underline decoration-white/60 font-black tracking-wide">
                  {dashboardData.needsReviewCount}
                </span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─────────────────────────────────────────────────────────────
            2. OVERVIEW — ROW OF 4 KPI CARDS
            Total Employees, Active Employees, Employees On Leave, Absent Today
            Responsive: 4 on desktop, 2 on tablet, 1 on mobile
           ───────────────────────────────────────────────────────────── */}
        <section id="overview" aria-labelledby="overview-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="overview-heading" className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Users size={14} className="text-gray-900" />
              Overview — Headcount KPIs
            </h2>
            <span className="text-[11px] text-gray-500 font-medium">Scoped to {currentPeriod.label}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Employees */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Total Employees</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 mt-3 tracking-tight">
                {dashboardData.totalEmployees}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Across all 8 departments</p>
            </div>

            {/* Active Employees */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Active Employees</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserCheck size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 mt-3 tracking-tight">
                {dashboardData.activeEmployees}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                {Math.round((dashboardData.activeEmployees / totalHead) * 100)}% of total workforce
              </p>
            </div>

            {/* Employees On Leave */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Employees On Leave</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CalendarCheck size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 mt-3 tracking-tight">
                {dashboardData.employeesOnLeave}
              </p>
              <p className="text-[11px] text-blue-700 font-medium mt-1">Approved statutory time-off</p>
            </div>

            {/* Absent Today */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-600">Absent Today</span>
                  <span className="block text-[10px] text-gray-400">weekday log</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <CalendarX2 size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 mt-3 tracking-tight">
                {dashboardData.absentToday}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 truncate">
                {dashboardData.absentToday > 0
                  ? dashboardData.absentEmployees[0] || 'Unexcused absence logged'
                  : 'Full daily attendance logged'}
              </p>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. PAYROLL SUMMARY
            Row of 3 KPI cards: Gross Payroll, Net Payroll, Overtime Hours
            Beside/below: 2 smaller cards for Income Tax & Pension Contribution
           ───────────────────────────────────────────────────────────── */}
        <section id="payroll-summary" aria-labelledby="payroll-summary-heading">
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <SectionHeader
              icon={Wallet}
              title="Payroll Summary"
              subtitle={`Computed strictly for ${dashboardData.activeEmployees} active employees in ${currentPeriod.label}`}
              action={
                <Link
                  to="/hr-manager/payroll"
                  className="text-xs font-bold text-gray-900 hover:text-black flex items-center gap-1 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                >
                  <span>Payroll Register</span>
                  <ChevronRight size={14} />
                </Link>
              }
            />

            <div className="p-5 sm:p-6 space-y-5">
              {/* Row of 3 Large KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gross Payroll */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80">
                  <div className="flex items-center justify-between text-gray-600 text-xs">
                    <span className="font-semibold">Total Monthly Gross Payroll</span>
                    <Wallet size={16} className="text-gray-900" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-gray-950 mt-2.5 tracking-tight tabular-nums">
                    {formatETB(dashboardData.totalMonthlyGross)}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Basic salaries + 100% taxable allowances + OT
                  </p>
                </div>

                {/* Net Payroll */}
                <div className="p-4 rounded-xl bg-gray-950 text-white border border-gray-900 shadow-xs">
                  <div className="flex items-center justify-between text-gray-400 text-xs">
                    <span className="font-semibold text-gray-200">Total Net Payroll</span>
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-2.5 tracking-tight tabular-nums">
                    {formatETB(dashboardData.totalNetPayroll)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Direct employee take-home transfer batch
                  </p>
                </div>

                {/* Overtime Hours */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80">
                  <div className="flex items-center justify-between text-gray-600 text-xs">
                    <span className="font-semibold">Total Overtime Hours</span>
                    <Clock size={16} className="text-gray-900" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-gray-950 mt-2.5 tracking-tight tabular-nums">
                    {dashboardData.totalOvertimeHours}{' '}
                    <span className="text-sm font-semibold text-gray-500">hrs</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Derived from check-in/out attendance logs
                  </p>
                </div>
              </div>

              {/* 2 Smaller Stat Cards: Total Income Tax & Pension Contribution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-900">
                      <TrendingDown size={14} className="text-rose-600" />
                      <span>Total Income Tax (Withholding)</span>
                    </div>
                    <p className="text-xl font-bold text-gray-950 mt-1 tabular-nums">
                      {formatETB(dashboardData.totalIncomeTax)}
                    </p>
                    <p className="text-[11px] text-rose-800/80 mt-0.5">
                      Proc. No. 1395/2025 brackets • Exempt staff excluded
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded-md border border-rose-200 text-rose-800">
                    Statutory
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                      <ShieldCheck size={14} className="text-indigo-600" />
                      <span>Total Pension Contribution (18%)</span>
                    </div>
                    <p className="text-xl font-bold text-gray-950 mt-1 tabular-nums">
                      {formatETB(dashboardData.totalPension)}
                    </p>
                    <p className="text-[11px] text-indigo-800/80 mt-0.5">
                      7% Employee + 11% Employer on basic salary
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded-md border border-indigo-200 text-indigo-800">
                    Statutory
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. LEAVE OVERVIEW
            Row of 2 cards:
            - Leave Requests Pending (number, links to Leave approval queue)
            - Leave Utilization (avg. days taken, number)
           ───────────────────────────────────────────────────────────── */}
        <section id="leave-overview" aria-labelledby="leave-overview-heading">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leave Requests Pending */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                    <Plane size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Leave Requests Pending
                    </h3>
                    <p className="text-[11px] text-gray-500">Awaiting management approval</p>
                  </div>
                </div>
                <Link
                  to="/hr-manager/leave"
                  className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <span>Approval Queue</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>

              <div className="mt-4 flex items-baseline gap-3">
                <p className="text-4xl font-black text-gray-950 tracking-tight">
                  {dashboardData.pendingLeaveCount}
                </p>
                <span className="text-xs font-medium text-gray-500">
                  {dashboardData.pendingLeaveCount === 1 ? 'request requires review' : 'requests require review'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 flex items-center justify-between">
                <span>Directly links to HR Manager leave approval queue</span>
                <Link to="/hr-manager/leave" className="font-semibold text-gray-900 hover:underline">
                  View Queue →
                </Link>
              </div>
            </div>

            {/* Leave Utilization */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <CalendarCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Leave Utilization
                    </h3>
                    <p className="text-[11px] text-gray-500">Average days taken across active staff</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {dashboardData.leaveUtilizationRate}% of entitlement
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <p className="text-4xl font-black text-gray-950 tracking-tight">
                  {dashboardData.leaveAvgDays}
                </p>
                <span className="text-sm font-semibold text-gray-600">days taken / employee</span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gray-950 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, dashboardData.leaveUtilizationRate)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">
                  Accrual rule: 16 base days + 1 extra day per 2 full years of service
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. DEPARTMENT BREAKDOWN & 6. WORKFORCE STATUS (2-COL ON DESKTOP)
           ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 5. Department Breakdown */}
          <div id="department-breakdown" className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <SectionHeader
                icon={Building2}
                title="Department Breakdown"
                subtitle="Headcount distribution across all 8 organizational units"
                badge="Central Config"
              />
              <div className="p-5 space-y-3">
                {HR_SETTINGS.departments.map((dept) => {
                  const count = dashboardData.byDepartment[dept] || 0
                  const pct = totalHead > 0 ? Math.round((count / totalHead) * 100) : 0
                  const barWidth = maxDeptHeadcount > 0 ? Math.round((count / maxDeptHeadcount) * 100) : 0

                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-800">{dept}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 text-[11px]">{pct}%</span>
                          <span className="font-bold text-gray-950 min-w-[20px] text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gray-900 h-full rounded-full transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/70 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Total assigned: {dashboardData.totalEmployees} employees</span>
              <span className="font-semibold text-gray-700">8 Departments</span>
            </div>
          </div>

          {/* 6. Workforce Status */}
          <div id="workforce-status" className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <SectionHeader
                icon={PieChartIcon}
                title="Workforce Status"
                subtitle="Active / On Leave / Resigned / Terminated split"
              />
              <div className="p-5">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* SVG Donut Chart */}
                  <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                      {/* Background track circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="12"
                      />
                      {(() => {
                        const radius = 38
                        const circ = 2 * Math.PI * radius
                        let accumulatedPercent = 0

                        return statusSegments.map((seg) => {
                          const pct = totalHead > 0 ? (seg.count / totalHead) * 100 : 0
                          if (pct <= 0) return null

                          const strokeDash = (pct / 100) * circ
                          const offset = -(accumulatedPercent / 100) * circ
                          accumulatedPercent += pct

                          return (
                            <circle
                              key={seg.label}
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="12"
                              strokeDasharray={`${strokeDash} ${circ}`}
                              strokeDashoffset={offset}
                              strokeLinecap="round"
                              className="transition-all duration-700"
                            />
                          )
                        })
                      })()}
                    </svg>
                    {/* Donut Center Count */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-gray-950 tracking-tight leading-none">
                        {dashboardData.totalEmployees}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                        Total
                      </span>
                    </div>
                  </div>

                  {/* Status Categories Table / List */}
                  <div className="flex-1 w-full space-y-2">
                    {statusSegments.map((seg) => {
                      const pct = totalHead > 0 ? Math.round((seg.count / totalHead) * 100) : 0
                      return (
                        <div
                          key={seg.label}
                          className="flex items-center justify-between p-2 rounded-xl bg-gray-50/70 border border-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${seg.twColor}`} />
                            <span className="text-xs font-bold text-gray-900">{seg.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-500">{pct}%</span>
                            <span className="text-xs font-black text-gray-950 tabular-nums bg-white px-2 py-0.5 rounded-md border border-gray-200">
                              {seg.count}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/70 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Payroll Gating Rule:</span>
              <span className="font-semibold text-gray-800">Only Active staff included in monthly run</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            7. ALERTS & DATA CHECKS
            Table/list of 9 checks with green "OK" / amber "REVIEW" pills
            Each row's Result count links to filtered records
           ───────────────────────────────────────────────────────────── */}
        <section id="alerts-data-checks" aria-labelledby="alerts-heading">
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <SectionHeader
              icon={AlertTriangle}
              title="Alerts & Data Checks"
              subtitle="Statutory compliance audits, TIN verification, and payroll anomaly checks"
              badge={`${dashboardData.needsReviewCount} Needs Review`}
              action={
                <span className="text-xs text-gray-500 font-medium">
                  Click count to inspect filtered records
                </span>
              }
            />

            <div className="divide-y divide-gray-100">
              {dashboardData.dataChecks.map((check) => {
                const isReview = check.status === 'REVIEW'

                return (
                  <div
                    key={check.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isReview ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {check.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Pill */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                          isReview
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {check.status}
                      </span>

                      {/* Result Count Button / Link */}
                      <button
                        onClick={() => setActiveAlertDetail(check)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isReview
                            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                        title="Click to view filtered underlying records"
                      >
                        <span>{check.count}</span>
                        <ChevronRight size={12} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-gray-700" />
                Audited against Ethiopian Labour Proclamation No. 1156/2019
              </span>
              <span>All 9 validation checks active</span>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            8. QUICK ACTIONS
            Row of 3-4 buttons:
            Run Payroll, Add Employee, Approve Leave, Add Attendance Record
           ───────────────────────────────────────────────────────────── */}
        <section id="quick-actions" aria-labelledby="quick-actions-heading">
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <SectionHeader icon={Calculator} title="Quick Actions" subtitle="Administrative shortcuts" />

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Run Payroll */}
              <Link
                to="/hr-manager/payroll"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50/80 transition-all group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-900 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <Calculator size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 group-hover:text-black">Run Payroll</p>
                  <p className="text-[10px] text-gray-500 truncate">Calculate {currentPeriod.label}</p>
                </div>
              </Link>

              {/* 2. Add Employee */}
              <button
                onClick={() => setIsAddEmployeeOpen(true)}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50/80 transition-all group shadow-2xs text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-900 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <UserPlus size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 group-hover:text-black">Add Employee</p>
                  <p className="text-[10px] text-gray-500 truncate">New hire onboarding</p>
                </div>
              </button>

              {/* 3. Approve Leave */}
              <Link
                to="/hr-manager/leave"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50/80 transition-all group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-900 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0 relative">
                  <CheckCircle2 size={18} />
                  {dashboardData.pendingLeaveCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center">
                      {dashboardData.pendingLeaveCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-950 group-hover:text-black">Approve Leave</p>
                    {dashboardData.pendingLeaveCount > 0 && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                        {dashboardData.pendingLeaveCount} pending
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">Review requests</p>
                </div>
              </Link>

              {/* 4. Add Attendance Record */}
              <Link
                to="/hr-manager/attendance"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50/80 transition-all group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-900 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <CalendarPlus size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 group-hover:text-black">Add Attendance</p>
                  <p className="text-[10px] text-gray-500 truncate">Log daily hours &amp; OT</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            9. RECENT ACTIVITY
            Vertical feed, most recent first:
            - New employee added
            - Employee exited (resigned/terminated)
            - Payroll run finalized for [period]
            - Leave request approved/rejected
            - Payslip released
           ───────────────────────────────────────────────────────────── */}
        <section id="recent-activity" aria-labelledby="recent-activity-heading">
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <SectionHeader
              icon={FileCheck2}
              title="Recent Activity"
              subtitle="Audit trail of HR lifecycle events, payroll finalizations, and leave status changes"
              badge="Live Feed"
            />

            <div className="divide-y divide-gray-100">
              {MOCK_RECENT_ACTIVITIES.map((act) => {
                let Icon = CheckCircle2
                let iconColor = 'bg-gray-100 text-gray-700'

                if (act.type === 'payroll') {
                  Icon = Wallet
                  iconColor = 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                } else if (act.type === 'hire') {
                  Icon = UserPlus
                  iconColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                } else if (act.type === 'exit') {
                  Icon = UserX
                  iconColor = 'bg-rose-50 text-rose-700 border border-rose-200/60'
                } else if (act.type === 'leave') {
                  Icon = Plane
                  iconColor = 'bg-blue-50 text-blue-700 border border-blue-200/60'
                } else if (act.type === 'payslip') {
                  Icon = Send
                  iconColor = 'bg-purple-50 text-purple-700 border border-purple-200/60'
                }

                return (
                  <div key={act.id} className="px-5 py-4 flex items-start gap-3.5 hover:bg-gray-50/60 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${iconColor}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-950 truncate">{act.title}</p>
                        <span className="text-[10px] font-medium text-gray-400 shrink-0 font-mono">
                          {act.relativeTime}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{act.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Timestamped per Ethiopian EAT (UTC+3)</span>
              <span className="font-mono text-[10px]">Audit Log #HR-9482</span>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            STATUTORY COMPLIANCE NOTICE (from source workbook)
           ───────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-2xs flex items-start gap-3">
          <Info size={18} className="text-gray-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-900">Ethiopian Statutory Calculation Caveat: </span>
            This HR Management Dashboard operates as an administrative intelligence tool. Income tax brackets (Proc. No. 1395/2025), pension contributions (Proc. No. 715/2011), and overtime provisions (Proc. No. 1156/2019) should be reconciled against the official Negarit Gazeta and verified with a certified tax advisor before statutory filing.
          </div>
        </div>
      </main>

      {/* Filtered Records Modal for Alerts */}
      <FilteredRecordsModal
        alertItem={activeAlertDetail}
        onClose={() => setActiveAlertDetail(null)}
      />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onSave={handleAddNewEmployee}
      />
    </div>
  )
}
