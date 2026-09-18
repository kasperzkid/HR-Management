import { useEffect, useMemo, useState } from 'react'
import { calcPayroll, roundMoney } from '../../lib/payroll'
import { attendanceTotals } from '../../lib/attendanceUtils'
import { fetchEmployees, fetchAttendance, fetchLeaveRequests } from '../../lib/employerApi'
import { buildHistory } from './reportsConfig'

export function useReportData(dateRange) {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchEmployees(), fetchAttendance(), fetchLeaveRequests()])
      .then(([emps, att, leaves]) => {
        if (!cancelled) {
          setEmployees(emps)
          setAttendance(Array.isArray(att) ? att : att?.attendance || [])
          setLeaveRequests(Array.isArray(leaves) ? leaves : leaves?.requests || [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const history = useMemo(
    () => buildHistory(dateRange, employees, attendance),
    [dateRange, employees, attendance],
  )

  // Department cost breakdown
  const deptCosts = useMemo(() => {
    const attTotals = attendanceTotals(attendance)
    const map = {}
    employees.forEach((e) => {
      const r = calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 })
      if (!r.active) return
      if (!map[e.department]) {
        map[e.department] = { gross: 0, net: 0, tax: 0, pension: 0, count: 0, otHours: 0 }
      }
      map[e.department].gross += r.gross
      map[e.department].net += r.netSalary
      map[e.department].tax += r.incomeTax
      map[e.department].pension += r.pensionEmployee + r.pensionEmployer
      map[e.department].otHours += r.otHours || 0
      map[e.department].count += 1
    })
    Object.values(map).forEach((m) => {
      m.gross = roundMoney(m.gross)
      m.net = roundMoney(m.net)
      m.tax = roundMoney(m.tax)
      m.pension = roundMoney(m.pension)
      m.otHours = Math.round(m.otHours * 10) / 10
    })
    return map
  }, [employees, attendance])

  const currentPeriodSummary = history[history.length - 1] || {
    gross: 0,
    tax: 0,
    pension: 0,
    net: 0,
    headcount: 0,
  }
  const prevPeriodSummary = history[history.length - 2] || currentPeriodSummary
  const netGrowth = prevPeriodSummary.net
    ? (((currentPeriodSummary.net - prevPeriodSummary.net) / prevPeriodSummary.net) * 100).toFixed(1)
    : '0.0'

  const totalGrossSum = history.reduce((s, h) => s + h.gross, 0)
  const totalNetSum = history.reduce((s, h) => s + h.net, 0)
  const totalTaxSum = history.reduce((s, h) => s + h.tax, 0)
  const totalPensionSum = history.reduce((s, h) => s + h.pension, 0)

  // ── Per-employee current-run rows (shared by Payment & Tax tab) ──
  const employeeRows = useMemo(() => {
    const attTotals = attendanceTotals(attendance)
    return employees.map((e) => calcPayroll(e, attTotals[e.employeeId] || { totalOtHours: 0 }))
  }, [employees, attendance])

  const paymentTaxRows = useMemo(() => employeeRows.filter((r) => r.active), [employeeRows])

  const paymentTaxTotals = useMemo(() => {
    const pick = (key) => roundMoney(paymentTaxRows.reduce((s, r) => s + (r[key] || 0), 0))
    return {
      gross: pick('gross'),
      tax: pick('incomeTax'),
      pensionEmp: pick('pensionEmployee'),
      pensionEmplr: pick('pensionEmployer'),
      net: pick('netSalary'),
    }
  }, [paymentTaxRows])

  // ── Attendance tab data ──
  const attendanceMetrics = useMemo(() => {
    let totalPresent = 0
    let totalAbsent = 0
    let totalSick = 0
    let totalOt = 0
    let totalLate = 0
    attendance.forEach((a) => {
      if (a.status === 'Present') totalPresent += 1
      else if (a.status === 'Absent') totalAbsent += 1
      else if (a.status === 'Sick Leave') totalSick += 1
      totalOt += a.overtime || 0
      totalLate += a.late ? 1 : 0
    })
    return {
      present: totalPresent,
      absent: totalAbsent,
      sick: totalSick,
      overtime: Math.round(totalOt * 10) / 10,
      late: totalLate,
    }
  }, [attendance])

  // ── Leave tab data ──
  const leaveMetrics = useMemo(() => {
    const approved = leaveRequests.filter((l) => l.approvalStatus === 'Approved').length
    const pending = leaveRequests.filter((l) => l.approvalStatus === 'Pending').length
    const rejected = leaveRequests.filter((l) => l.approvalStatus === 'Rejected').length
    const totalDays = leaveRequests.reduce((s, l) => s + (l.days || 0), 0)
    return { approved, pending, rejected, totalDays }
  }, [leaveRequests])

  return {
    loading,
    history,
    deptCosts,
    currentPeriodSummary,
    netGrowth,
    totalGrossSum,
    totalNetSum,
    totalTaxSum,
    totalPensionSum,
    employeeRows,
    paymentTaxRows,
    paymentTaxTotals,
    attendanceMetrics,
    attendanceRows: attendance,
    leaveMetrics,
    leaveRows: leaveRequests,
  }
}
