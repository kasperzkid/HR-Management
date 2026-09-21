import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '../../../lib/hrApi'
import {
  API_BASE,
  calculateTieredOvertimePay,
  getAttendanceSummary,
  getCurrentMonth,
  getEmployeeId,
  getEmployeeName,
  getMonthRange,
  normalizePayroll,
} from './payrollMath'

/*
 * Payroll records are loaded directly from the database.
 * We do NOT rebuild payroll rows from employees here.
 * This is what makes saved payroll survive a page refresh.
 */
export function usePayrollData() {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [payroll, setPayroll] = useState([])

  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [payrollLoading, setPayrollLoading] = useState(false)

  const [error, setError] = useState('')
  const [payrollError, setPayrollError] = useState('')

  const [payrollMonth, setPayrollMonth] = useState(getCurrentMonth)

  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedPayroll, setSelectedPayroll] = useState(null)

  async function loadEmployees() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`${API_BASE}/employees`, {
        headers: authHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load employees.')
      }

      setEmployees(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Load employees error:', err)
      setError(err.message || 'Unable to load employees.')
    } finally {
      setLoading(false)
    }
  }

  async function loadAttendance() {
    if (!payrollMonth) return

    const { startDate, endDate } = getMonthRange(payrollMonth)

    try {
      setAttendanceLoading(true)

      const response = await fetch(
        `${API_BASE}/attendance?startDate=${startDate}&endDate=${endDate}`,
        { headers: authHeaders() },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load attendance.')
      }

      setAttendance(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Load attendance error:', err)
      setAttendance([])
    } finally {
      setAttendanceLoading(false)
    }
  }

  async function loadSavedPayroll() {
    if (!payrollMonth) return

    try {
      setPayrollLoading(true)
      setPayrollError('')

      const response = await fetch(
        `${API_BASE}/payroll?payrollMonth=${encodeURIComponent(payrollMonth)}`,
        { headers: authHeaders(), cache: 'no-store' },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load saved payroll.')
      }

      setPayroll(Array.isArray(data) ? data.map(normalizePayroll) : [])
    } catch (err) {
      console.error('Load payroll error:', err)
      setPayroll([])
      setPayrollError(err.message || 'Saved payroll records could not be loaded from the database.')
    } finally {
      setPayrollLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollMonth])

  useEffect(() => {
    loadSavedPayroll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollMonth])

  const departments = useMemo(() => {
    return [
      'All Departments',
      ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean))),
    ]
  }, [employees])

  const employeeById = useMemo(() => {
    const map = new Map()
    employees.forEach((employee) => map.set(String(getEmployeeId(employee)), employee))
    return map
  }, [employees])

  const attendanceByEmployee = useMemo(() => {
    const map = new Map()
    employees.forEach((employee) => {
      const ids = [employee.id, employee.employeeId].filter(Boolean)
      const records = attendance.filter((item) => {
        const attendanceEmployeeId = item.employeeId || item.employee_id
        return ids.some((id) => String(attendanceEmployeeId) === String(id))
      })
      map.set(String(getEmployeeId(employee)), records)
    })
    return map
  }, [employees, attendance])

  // Only saved database payroll records are displayed.
  // Employees without a payroll record are added by "Generate Payroll".
  const rows = useMemo(() => {
    return payroll.map((record) => {
      const employee = employeeById.get(String(record.employeeId)) || null
      const attendanceForEmployee = attendanceByEmployee.get(String(record.employeeId)) || []
      return {
        ...record,
        employee,
        attendanceSummary: getAttendanceSummary(attendanceForEmployee),
      }
    })
  }, [payroll, employeeById, attendanceByEmployee])

  const filteredRows = (department) => {
    if (department === 'All Departments') return rows
    return rows.filter((record) => record.department === department)
  }

  const summary = useMemo(() => {
    return payroll.reduce(
      (total, record) => ({
        employees: total.employees + 1,
        gross: total.gross + Number(record.grossSalary || 0),
        deductions: total.deductions + Number(record.totalDeductions || 0),
        net: total.net + Number(record.netSalary || 0),
        employerCost: total.employerCost + Number(record.employerCost || 0),
        overtimeHours: total.overtimeHours + Number(record.overtimePay || 0),
      }),
      { employees: 0, gross: 0, deductions: 0, net: 0, employerCost: 0, overtimeHours: 0 },
    )
  }, [payroll])

  const payrollByEmployee = useMemo(() => {
    const map = new Map()
    payroll.forEach((record) => map.set(String(record.employeeId), record))
    return map
  }, [payroll])

  const activeEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const status = String(employee.employmentStatus || employee.status || '').toLowerCase()
        return status === 'active' || status === ''
      }),
    [employees],
  )

  function openEditModal(record) {
    const employee = employeeById.get(String(record.employeeId)) || null
    if (!employee) {
      setPayrollError('The employee linked to this payroll record could not be found.')
      return
    }
    setSelectedEmployee(employee)
    setSelectedPayroll(record)
    setModalOpen(true)
  }

  function closeModal() {
    if (generating) return
    setModalOpen(false)
    setSelectedEmployee(null)
    setSelectedPayroll(null)
  }

  async function generateAllPayroll() {
    if (!payrollMonth) {
      setPayrollError('Please select a payroll month.')
      return
    }

    if (!activeEmployees.length) {
      setPayrollError('There are no active employees available for payroll.')
      return
    }

    try {
      setGenerating(true)
      setPayrollError('')

      // Only create records that do not already exist.
      // Existing saved records are never overwritten by a refresh or by Generate Payroll.
      const employeesWithoutPayroll = activeEmployees.filter(
        (employee) => !payrollByEmployee.has(String(getEmployeeId(employee))),
      )

      if (employeesWithoutPayroll.length === 0) {
        await loadSavedPayroll()
        return
      }

      const results = []

      for (const employee of employeesWithoutPayroll) {
        const summary = getAttendanceSummary(
          attendanceByEmployee.get(String(getEmployeeId(employee))) || [],
        )
        const response = await fetch(`${API_BASE}/payroll`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            employeeId: getEmployeeId(employee),
            payrollMonth,
            overtimePay: calculateTieredOvertimePay(employee.basicSalary, summary),
            loanDeduction: 0,
            otherDeduction: 0,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error || data?.message || `Failed to generate payroll for ${getEmployeeName(employee)}.`,
          )
        }

        results.push(normalizePayroll(data))
      }

      setPayroll((current) => [...current, ...results])
      await loadSavedPayroll()
    } catch (err) {
      console.error('Generate payroll error:', err)
      setPayrollError(err.message || 'Unable to generate payroll.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(record) {
    const employee = employeeById.get(String(record.employeeId))
    const employeeName = getEmployeeName(employee)

    const confirmed = window.confirm(
      `Delete the payroll record for ${employeeName} for ${record.payrollMonth}?`,
    )
    if (!confirmed) return

    try {
      setDeletingId(record.id)
      setPayrollError('')

      const response = await fetch(`${API_BASE}/payroll/${record.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to delete payroll record.')
      }

      setPayroll((current) => current.filter((item) => item.id !== record.id))
      await loadSavedPayroll()
    } catch (err) {
      console.error('Delete payroll error:', err)
      setPayrollError(err.message || 'Unable to delete payroll record.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSaved(savedRecord) {
    setPayroll((current) => {
      const exists = current.some((item) => item.id === savedRecord.id)
      if (exists) {
        return current.map((item) => (item.id === savedRecord.id ? savedRecord : item))
      }
      return [...current, savedRecord]
    })
    setModalOpen(false)
    setSelectedEmployee(null)
    setSelectedPayroll(null)
    await loadSavedPayroll()
  }

  async function refreshPayroll() {
    await Promise.all([loadEmployees(), loadAttendance(), loadSavedPayroll()])
  }

  return {
    employees,
    attendance,
    payroll,
    loading,
    attendanceLoading,
    payrollLoading,
    error,
    payrollError,
    payrollMonth,
    setPayrollMonth,
    departments,
    employeeById,
    attendanceByEmployee,
    rows,
    filteredRows,
    summary,
    activeEmployees,
    generating,
    deletingId,
    modalOpen,
    selectedEmployee,
    selectedPayroll,
    openEditModal,
    closeModal,
    generateAllPayroll,
    handleDelete,
    handleSaved,
    refreshPayroll,
  }
}
