import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import AddEmployeeModal from '../components/AddEmployeeModal'
import LuxuryDataTable from '../components/LuxuryDataTable'

// ─────────────────────────────────────────────────────────────
// COMPONENT: Section Header
// ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, badge, action }) {
  return (
    <div className="px-5 py-4 border-b border-gray-200/80 dark:border-[#262b31] bg-white dark:bg-[#15181d] flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <Icon size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100 tracking-tight">{title}</h3>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1c2026] text-gray-700 dark:text-gray-300">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
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
      <div className="bg-white dark:bg-[#15181d] rounded-2xl shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-[#262b31] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between bg-gray-50/80 dark:bg-[#1c2026]">
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
              <h4 className="text-sm font-bold text-gray-950 dark:text-gray-100">{alertItem.label}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {alertItem.records.length} record{alertItem.records.length === 1 ? '' : 's'} matching check criteria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-[#262b31]">
          {alertItem.records.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">All checks verified</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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

              <div className="border border-gray-200 dark:border-[#262b31] rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-[#1c2026] border-b border-gray-200 dark:border-[#262b31] text-gray-600 dark:text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Identifier</th>
                      <th className="py-2.5 px-3">Name / Entity</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Status / Issue</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#262b31] bg-white dark:bg-[#15181d]">
                    {alertItem.records.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/70 dark:hover:bg-[#1c2026] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-900 dark:text-gray-100">
                          {rec.id || rec.employeeId || `ROW-${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-950 dark:text-gray-100">
                          {rec.name || rec.employeeName || rec.title || 'Record item'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{rec.department || 'N/A'}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            {rec.reason || 'Review needed'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to={alertItem.targetPath || '/hr-manager/employees'}
                            onClick={onClose}
                            className="text-[11px] font-bold text-gray-900 dark:text-gray-100 hover:text-black underline inline-flex items-center gap-0.5"
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

        <div className="px-6 py-3 border-t border-gray-100 dark:border-[#262b31] bg-gray-50/80 dark:bg-[#1c2026] flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">System Audit Rule • Proclamation Compliant</span>
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
// MAIN HR DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────
export default function HRDashboard() {
  const navigate = useNavigate()
  const [selectedPeriodId, setSelectedPeriodId] = useState('2026-09')
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES)
  const [activeAlertDetail, setActiveAlertDetail] = useState(null)
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)
  const [recentActivities, setRecentActivities] = useState(MOCK_RECENT_ACTIVITIES)

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

  const deptBreakdownData = useMemo(() => {
    return HR_SETTINGS.departments.map((dept, idx) => {
      const count = dashboardData.byDepartment[dept] || 0
      const pct = totalHead > 0 ? Math.round((count / totalHead) * 100) : 0
      const deptEmps = employees.filter((e) => e.department === dept)
      const activeCount = deptEmps.filter((e) => e.employmentStatus === 'Active').length
      const onLeaveCount = deptEmps.filter((e) => e.employmentStatus === 'On Leave').length
      return {
        id: `dept-${idx}`,
        department: dept,
        headcount: count,
        pct,
        activeCount,
        onLeaveCount,
        status: activeCount > 0 ? 'Active' : 'No Active Staff',
      }
    })
  }, [dashboardData.byDepartment, totalHead, employees])

  const workforceStatusData = useMemo(() => {
    return statusSegments.map((seg, idx) => {
      const pct = totalHead > 0 ? Math.round((seg.count / totalHead) * 100) : 0
      return {
        id: `status-${idx}`,
        label: seg.label,
        count: seg.count,
        pct,
        color: seg.color,
        description:
          seg.label === 'Active'
            ? 'Actively rostered and payroll eligible'
            : seg.label === 'On Leave'
            ? 'Statutory annual or sick leave tenure'
            : seg.label === 'Resigned'
            ? 'Voluntary separation notice filed'
            : 'Contract terminated per proclamation',
      }
    })
  }, [statusSegments, totalHead])

  const alertsTableData = useMemo(() => {
    return dashboardData.dataChecks.map((check) => ({
      id: check.id,
      label: check.label,
      status: check.status,
      count: check.count,
      severity: check.status === 'REVIEW' ? 'Action Required' : 'Compliant',
      scope:
        check.id === 'dup-id' || check.id === 'dup-tin'
          ? 'Identity & Tax Registry'
          : check.id === 'miss-sal' || check.id === 'payroll-flagged' || check.id === 'inactive-priced'
          ? 'Payroll Calculation Engine'
          : check.id === 'miss-bank'
          ? 'Direct Bank Routing'
          : check.id === 'miss-exit'
          ? 'Separation Documentation'
          : 'Leave Administration',
      records: check.records,
      targetPath: check.targetPath,
    }))
  }, [dashboardData.dataChecks])

  // Table Column Definitions (LuxuryDataTable)
  const deptColumns = useMemo(
    () => [
      {
        key: 'department',
        header: 'Department',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2 font-bold text-gray-950 dark:text-gray-100">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{row.department}</span>
          </div>
        ),
      },
      {
        key: 'headcount',
        header: 'Headcount',
        align: 'right',
        sortable: true,
        render: (row) => <span className="font-mono font-bold text-gray-950 dark:text-gray-100">{row.headcount}</span>,
      },
      {
        key: 'pct',
        header: '% of Workforce',
        align: 'left',
        sortable: true,
        render: (row) => (
          <div className="w-full max-w-[140px] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-gray-600 dark:text-gray-400">{row.pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#1c2026] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gray-900 dark:bg-gray-100 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (row.headcount / maxDeptHeadcount) * 100)}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'activeCount',
        header: 'Active Staff',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
            {row.activeCount}
          </span>
        ),
      },
      {
        key: 'onLeaveCount',
        header: 'On Leave',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
            {row.onLeaveCount}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        render: (row) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              row.status === 'Active'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-[#1c2026] dark:border-[#262b31] dark:text-gray-400'
            }`}
          >
            {row.status}
          </span>
        ),
      },
    ],
    [maxDeptHeadcount]
  )

  const workforceColumns = useMemo(
    () => [
      {
        key: 'label',
        header: 'Workforce Status',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
            <span className="font-bold text-gray-950 dark:text-gray-100">{row.label}</span>
          </div>
        ),
      },
      {
        key: 'count',
        header: 'Headcount',
        align: 'right',
        sortable: true,
        render: (row) => <span className="font-mono font-bold text-gray-950 dark:text-gray-100">{row.count}</span>,
      },
      {
        key: 'pct',
        header: '% Share',
        align: 'left',
        sortable: true,
        render: (row) => (
          <div className="w-full max-w-[120px] space-y-1">
            <span className="text-[11px] font-mono text-gray-600 dark:text-gray-400">{row.pct}%</span>
            <div className="w-full bg-gray-100 dark:bg-[#1c2026] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${row.pct}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Statutory / Policy Description',
        sortable: true,
        render: (row) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.description}</span>,
      },
      {
        key: 'payrollGating',
        header: 'Payroll Gating Status',
        align: 'center',
        render: (row) => {
          const isEligible = row.label === 'Active'
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isEligible
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-400'
                  : row.label === 'On Leave'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/40 dark:text-blue-400'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-400'
              }`}
            >
              {isEligible ? 'Payroll Eligible' : 'Excluded from Run'}
            </span>
          )
        },
      },
    ],
    []
  )

  const alertsColumns = useMemo(
    () => [
      {
        key: 'label',
        header: 'Statutory Check / Audit Rule',
        sortable: true,
        render: (row) => {
           const isReview = row.status === 'REVIEW'
          return (
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isReview ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950/50' : 'bg-emerald-500'
                }`}
              />
              <span className="font-bold text-gray-950 dark:text-gray-100 text-xs">{row.label}</span>
            </div>
          )
        },
      },
      {
        key: 'scope',
        header: 'Compliance Scope',
        sortable: true,
        render: (row) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.scope}</span>,
      },
      {
        key: 'count',
        header: 'Flagged Records',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span
            className={`inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border ${
              row.status === 'REVIEW'
                ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#1c2026] dark:text-gray-300 dark:border-[#262b31]'
            }`}
          >
            {row.count}
          </span>
        ),
      },
      {
        key: 'severity',
        header: 'Status',
        align: 'center',
        sortable: true,
        render: (row) => {
          const isReview = row.status === 'REVIEW'
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isReview
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40'
              }`}
            >
              {isReview ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
              <span>{row.severity}</span>
            </span>
          )
        },
      },
      {
        key: 'inspect',
        header: 'Action',
        align: 'right',
        render: (row) => (
          <button
            type="button"
            onClick={() => setActiveAlertDetail(row)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-[#1c2026] dark:hover:bg-[#262b31] text-gray-900 dark:text-gray-100 transition-colors cursor-pointer"
          >
            <span>Inspect ({row.count})</span>
            <ChevronRight size={12} />
          </button>
        ),
      },
    ],
    []
  )

  const recentActivityColumns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Event / Action',
        sortable: true,
        render: (row) => {
          let Icon = CheckCircle2
          let iconColor = 'bg-gray-100 dark:bg-[#1c2026] text-gray-700 dark:text-gray-300'
          if (row.type === 'payroll') {
            Icon = Wallet
            iconColor = 'bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400'
          } else if (row.type === 'hire') {
            Icon = UserPlus
            iconColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400'
          } else if (row.type === 'exit') {
            Icon = UserX
            iconColor = 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400'
          } else if (row.type === 'leave') {
            Icon = Plane
            iconColor = 'bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400'
          } else if (row.type === 'payslip') {
            Icon = Send
            iconColor = 'bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/30 dark:text-purple-400'
          }
          return (
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                <Icon size={14} />
              </div>
              <span className="font-bold text-gray-950 dark:text-gray-100 text-xs">{row.title}</span>
            </div>
          )
        },
      },
      {
        key: 'type',
        header: 'Category',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-[#1c2026] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#262b31]">
            {row.type}
          </span>
        ),
      },
      {
        key: 'detail',
        header: 'Audit Trail Details',
        sortable: true,
        render: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{row.detail}</span>
        ),
      },
      {
        key: 'relativeTime',
        header: 'Timestamp',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {row.relativeTime}
          </span>
        ),
      },
    ],
    []
  )

  const handleAddNewEmployee = (newEmp) => {
    setEmployees((prev) => [newEmp, ...prev])
    setRecentActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        type: 'hire',
        title: 'New Employee Registered',
        detail: `${newEmp.name} (${newEmp.employeeId}) onboarded to ${newEmp.department} as ${newEmp.jobTitle} • Basic: ETB ${Number(newEmp.basicSalary || 0).toLocaleString()}`,
        relativeTime: 'Just now',
      },
      ...prev,
    ])
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-[#0a0d10] text-gray-900 dark:text-gray-100 pb-16 antialiased">
      {/* ─────────────────────────────────────────────────────────────
          1. PAGE HEADER
          - Title "Dashboard"
          - Subtitle: "Live overview for [Month Year] payroll period" with month/year dropdown
          - Top-right: "Needs Review" badge showing single count, red if > 0
         ───────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-[#15181d] border-b border-gray-200/80 dark:border-[#262b31]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">Dashboard</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1c2026] border border-gray-200/80 dark:border-[#262b31] px-2 py-0.5 rounded-md">
                Admin Overview
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Live overview for
              </span>
              <div className="relative inline-flex items-center">
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="appearance-none bg-gray-50 dark:bg-[#15181d] hover:bg-gray-100 dark:hover:bg-[#1c2026] border border-gray-300 dark:border-[#33383f] text-gray-900 dark:text-gray-200 font-bold text-xs rounded-lg pl-2.5 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer shadow-2xs transition-colors"
                >
                  {PAYROLL_PERIODS.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2 text-gray-500 dark:text-gray-400 pointer-events-none" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">payroll period</span>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline font-mono">
                {HR_SETTINGS.company.name} ({HR_SETTINGS.company.currency})
              </span>
            </div>
          </div>

          {/* Top-Right: Needs Review rollup counter & New Employee Action */}
          <div className="flex items-center gap-3">
            {dashboardData.needsReviewCount > 0 ? (
              <a
                href="#alerts-data-checks"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-2xs transition-colors cursor-pointer"
                title="Statutory audits requiring attention"
              >
                <AlertTriangle size={14} className="text-amber-600" />
                <span>Needs Review: {dashboardData.needsReviewCount}</span>
              </a>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Needs Review: 0</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAddEmployeeOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-950 hover:bg-black text-white shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
              id="dashboard-new-employee-btn"
            >
              <UserPlus size={15} />
              <span>New Employee</span>
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
            <div>
              <h2 id="overview-heading" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Users size={14} className="text-gray-900 dark:text-gray-100" />
                Overview
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                headcount KPIs (Total, Active, On Leave, Absent Today)
              </p>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Scoped to {currentPeriod.label}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Employees */}
            <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Total Employees</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1c2026] text-gray-900 dark:text-gray-100 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 dark:text-gray-100 mt-3 tracking-tight">
                {dashboardData.totalEmployees}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Across all 8 departments</p>
            </div>

            {/* Active Employees */}
            <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Active Employees</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserCheck size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 dark:text-gray-100 mt-3 tracking-tight">
                {dashboardData.activeEmployees}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                {Math.round((dashboardData.activeEmployees / totalHead) * 100)}% of total workforce
              </p>
            </div>

            {/* Employees On Leave */}
            <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Employees On Leave</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CalendarCheck size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 dark:text-gray-100 mt-3 tracking-tight">
                {dashboardData.employeesOnLeave}
              </p>
              <p className="text-[11px] text-blue-700 font-medium mt-1">Approved statutory time-off</p>
            </div>

            {/* Absent Today */}
            <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5 hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Absent Today</span>
                  <span className="block text-[10px] text-gray-400 dark:text-gray-500">weekday log</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <CalendarX2 size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-950 dark:text-gray-100 mt-3 tracking-tight">
                {dashboardData.absentToday}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
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
          <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden">
            <SectionHeader
              icon={Wallet}
              title="Payroll Summary"
              subtitle={`Gross/Net Payroll, Total Tax, Total Pension, Overtime Hours — ${currentPeriod.label}`}
              action={
                <Link
                  to="/hr-manager/payroll"
                  className="text-xs font-bold text-gray-900 dark:text-gray-100 hover:text-black flex items-center gap-1 bg-gray-50 dark:bg-[#1c2026] hover:bg-gray-100 dark:hover:bg-[#1c2026] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#262b31] transition-colors"
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
                <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#1c2026] border border-gray-200/80 dark:border-[#262b31]">
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-xs">
                    <span className="font-semibold">Total Monthly Gross Payroll</span>
                    <Wallet size={16} className="text-gray-900 dark:text-gray-100" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-gray-100 mt-2.5 tracking-tight tabular-nums">
                    {formatETB(dashboardData.totalMonthlyGross)}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Basic salaries + 100% taxable allowances + OT
                  </p>
                </div>

                {/* Net Payroll */}
                <div className="p-4 rounded-xl bg-gray-950 text-white border border-gray-900 shadow-xs">
                  <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 text-xs">
                    <span className="font-semibold text-gray-200">Total Net Payroll</span>
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-2.5 tracking-tight tabular-nums">
                    {formatETB(dashboardData.totalNetPayroll)}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    Direct employee take-home transfer batch
                  </p>
                </div>

                {/* Overtime Hours */}
                <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#1c2026] border border-gray-200/80 dark:border-[#262b31]">
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-xs">
                    <span className="font-semibold">Total Overtime Hours</span>
                    <Clock size={16} className="text-gray-900 dark:text-gray-100" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-gray-100 mt-2.5 tracking-tight tabular-nums">
                    {dashboardData.totalOvertimeHours}{' '}
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">hrs</span>
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
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
                    <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                      {formatETB(dashboardData.totalIncomeTax)}
                    </p>
                    <p className="text-[11px] text-rose-800/80 mt-0.5">
                      Proc. No. 1395/2025 brackets • Exempt staff excluded
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-white dark:bg-[#15181d] px-2 py-1 rounded-md border border-rose-200 text-rose-800">
                    Statutory
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                      <ShieldCheck size={14} className="text-indigo-600" />
                      <span>Total Pension Contribution (18%)</span>
                    </div>
                    <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                      {formatETB(dashboardData.totalPension)}
                    </p>
                    <p className="text-[11px] text-indigo-800/80 mt-0.5">
                      7% Employee + 11% Employer on basic salary
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-white dark:bg-[#15181d] px-2 py-1 rounded-md border border-indigo-200 text-indigo-800">
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
          <div className="flex items-center gap-2 mb-3">
            <Plane size={14} className="text-gray-900 dark:text-gray-100" />
            <div>
              <h2 id="leave-overview-heading" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Leave Overview
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Pending Requests, Avg. Leave Utilization
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leave Requests Pending */}
            <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5 flex flex-col justify-between hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                    <Plane size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Leave Requests Pending
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Awaiting management approval</p>
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
                <p className="text-4xl font-black text-gray-950 dark:text-gray-100 tracking-tight">
                  {dashboardData.pendingLeaveCount}
                </p>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {dashboardData.pendingLeaveCount === 1 ? 'request requires review' : 'requests require review'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#262b31] text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                <span>Directly links to HR Manager leave approval queue</span>
                <Link to="/hr-manager/leave" className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                  View Queue →
                </Link>
              </div>
            </div>

            {/* Leave Utilization */}
            <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5 flex flex-col justify-between hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <CalendarCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Leave Utilization
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Average days taken across active staff</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {dashboardData.leaveUtilizationRate}% of entitlement
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <p className="text-4xl font-black text-gray-950 dark:text-gray-100 tracking-tight">
                  {dashboardData.leaveAvgDays}
                </p>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">days taken / employee</span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#262b31]">
                <div className="w-full bg-gray-100 dark:bg-[#1c2026] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gray-950 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, dashboardData.leaveUtilizationRate)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                  Accrual rule: 16 base days + 1 extra day per 2 full years of service
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. DEPARTMENT BREAKDOWN — full-width LuxuryDataTable
           ───────────────────────────────────────────────────────────── */}
        <section id="department-breakdown" aria-labelledby="dept-breakdown-heading">
          <LuxuryDataTable
            title="Department Breakdown"
            subtitle="headcount by department"
            countBadge={`${HR_SETTINGS.departments.length} departments`}
            columns={deptColumns}
            data={deptBreakdownData}
            searchable
            searchPlaceholder="Search departments…"
            searchKeys={['department']}
            exportable
            exportFilename="Department_Breakdown"
            sortable
            paginated={false}
            emptyMessage="No department data available."
          />
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. WORKFORCE STATUS — LuxuryDataTable (with donut visual preserved above)
           ───────────────────────────────────────────────────────────── */}
        <section id="workforce-status" aria-labelledby="workforce-heading">
          {/* Donut Chart Summary (kept for visual context) */}
          <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden mb-0">
            <SectionHeader
              icon={PieChartIcon}
              title="Workforce Status"
              subtitle="Active / On Leave / Resigned / Terminated split"
            />
            <div className="px-5 pt-4 pb-1 flex flex-col sm:flex-row items-center gap-6">
              {/* SVG Donut Chart */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                  {(() => {
                    const radius = 38
                    const circ = 2 * Math.PI * radius
                    let accumulated = 0
                    return statusSegments.map((seg) => {
                      const pct = totalHead > 0 ? (seg.count / totalHead) * 100 : 0
                      if (pct <= 0) return null
                      const dash = (pct / 100) * circ
                      const offset = -(accumulated / 100) * circ
                      accumulated += pct
                      return (
                        <circle
                          key={seg.label}
                          cx="50" cy="50" r={radius}
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="12"
                          strokeDasharray={`${dash} ${circ}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      )
                    })
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-gray-950 dark:text-gray-100 tracking-tight leading-none">
                    {dashboardData.totalEmployees}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
                    Total
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 flex-1">
                {statusSegments.map((seg) => {
                  const pct = totalHead > 0 ? Math.round((seg.count / totalHead) * 100) : 0
                  return (
                    <div key={seg.label} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${seg.twColor} shrink-0`} />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {seg.label}
                      </span>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                        ({seg.count} · {pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Workforce Table */}
          <LuxuryDataTable
            title=""
            subtitle=""
            columns={workforceColumns}
            data={workforceStatusData}
            searchable={false}
            exportable
            exportFilename="Workforce_Status"
            sortable
            paginated={false}
            emptyMessage="No workforce data available."
            className="rounded-t-none border-t-0"
          />
        </section>

        {/* ─────────────────────────────────────────────────────────────
            7. ALERTS & DATA CHECKS
           ───────────────────────────────────────────────────────────── */}
        <section id="alerts-data-checks" aria-labelledby="alerts-heading">
          <LuxuryDataTable
            title="Alerts & Data Checks"
            subtitle="duplicate IDs/TINs, missing info, flagged rows"
            countBadge={`Needs Review (${dashboardData.needsReviewCount})`}
            columns={alertsColumns}
            data={alertsTableData}
            searchable
            searchPlaceholder="Search audit checks…"
            searchKeys={['label', 'scope', 'severity']}
            exportable
            exportFilename="Alerts_Data_Checks"
            sortable
            paginated={false}
            emptyMessage="All statutory checks passed."
          />
        </section>

        {/* ─────────────────────────────────────────────────────────────
            8. QUICK ACTIONS — Run Payroll, Add Employee, Approve Leave
           ───────────────────────────────────────────────────────────── */}
        <section id="quick-actions" aria-labelledby="quick-actions-heading">
          <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden">
            <SectionHeader
              icon={Calculator}
              title="Quick Actions"
              subtitle="Run Payroll, Add Employee, Approve Leave"
            />

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Run Payroll */}
              <Link
                to="/hr-manager/payroll"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 dark:border-[#262b31] hover:border-gray-900 bg-white dark:bg-[#15181d] hover:bg-gray-50/80 dark:hover:bg-[#1c2026] transition-all group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1c2026] text-gray-900 dark:text-gray-100 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <Calculator size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 dark:text-gray-100 group-hover:text-black">Run Payroll</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Calculate {currentPeriod.label}</p>
                </div>
              </Link>

              {/* 2. Add Employee */}
              <button
                onClick={() => setIsAddEmployeeOpen(true)}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 dark:border-[#262b31] hover:border-gray-900 bg-white dark:bg-[#15181d] hover:bg-gray-50/80 dark:hover:bg-[#1c2026] transition-all group shadow-2xs text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1c2026] text-gray-900 dark:text-gray-100 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <UserPlus size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 dark:text-gray-100 group-hover:text-black">Add Employee</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">New hire onboarding</p>
                </div>
              </button>

              {/* 3. Approve Leave */}
              <Link
                to="/hr-manager/leave"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 dark:border-[#262b31] hover:border-gray-900 bg-white dark:bg-[#15181d] hover:bg-gray-50/80 dark:hover:bg-[#1c2026] transition-all group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1c2026] text-gray-900 dark:text-gray-100 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0 relative">
                  <CheckCircle2 size={18} />
                  {dashboardData.pendingLeaveCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center">
                      {dashboardData.pendingLeaveCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-950 dark:text-gray-100 group-hover:text-black">Approve Leave</p>
                    {dashboardData.pendingLeaveCount > 0 && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        {dashboardData.pendingLeaveCount} pending
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Review requests</p>
                </div>
              </Link>

              {/* 4. Add Attendance */}
              <Link
                to="/hr-manager/attendance"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 dark:border-[#262b31] hover:border-gray-900 bg-white dark:bg-[#15181d] hover:bg-gray-50/80 dark:hover:bg-[#1c2026] transition-all group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1c2026] text-gray-900 dark:text-gray-100 group-hover:bg-gray-950 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <CalendarPlus size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 dark:text-gray-100 group-hover:text-black">Add Attendance</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Log daily hours &amp; OT</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            9. RECENT ACTIVITY — LuxuryDataTable
           ───────────────────────────────────────────────────────────── */}
        <section id="recent-activity" aria-labelledby="recent-activity-heading">
          <LuxuryDataTable
            title="Recent Activity"
            subtitle="hires, exits, payroll runs, leave approvals"
            countBadge="Live Feed"
            columns={recentActivityColumns}
            data={recentActivities}
            searchable
            searchPlaceholder="Search activity…"
            searchKeys={['title', 'type', 'detail']}
            exportable
            exportFilename="Recent_Activity_Log"
            sortable
            paginated
            defaultPageSize={10}
            emptyMessage="No recent activity recorded."
          />
        </section>


        {/* ─────────────────────────────────────────────────────────────
            STATUTORY COMPLIANCE NOTICE (from source workbook)
           ───────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200/90 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-4 shadow-2xs flex items-start gap-3">
          <Info size={18} className="text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
            <span className="font-bold text-gray-900 dark:text-gray-100">Ethiopian Statutory Calculation Caveat: </span>
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
        existingEmployees={employees}
      />
    </div>
  )
}
