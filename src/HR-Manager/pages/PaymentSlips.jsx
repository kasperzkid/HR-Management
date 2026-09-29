import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  Building2,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  Printer,
  Search,
  X,
} from 'lucide-react'

import { PageTitle, Table } from '../../components/ui'

const API_URL = '/api/hr-manager'
const ALL_PERIODS = 'all'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatMonth(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month || 'Pay period unavailable'
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getEmployeeName(employee = {}) {
  return employee.name || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Employee'
}

function responseRows(data, keys = []) {
  if (Array.isArray(data)) return data
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key]
  if (data?.data && data.data !== data) return responseRows(data.data, keys)
  return []
}

async function getJson(path) {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Could not load data (${response.status})`)
  return data
}

function getPeriodRange(period) {
  if (!/^\d{4}-\d{2}$/.test(period || '')) return null
  const [year, month] = period.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    startDate: `${period}-01`,
    endDate: `${period}-${String(lastDay).padStart(2, '0')}`,
  }
}

function normalizePayroll(record, employee) {
  return {
    ...record,
    employeeDatabaseId: record.employeeId,
    employeeId: employee?.employeeId || record.employee?.employeeId || record.employeeId || '',
    employeeName: getEmployeeName(employee || record.employee || { name: record.employeeName }),
    department: employee?.department || record.employee?.department || record.department || 'Unassigned',
    jobTitle: employee?.jobTitle || employee?.position || record.employee?.jobTitle || record.jobTitle || 'Employee',
    employmentStatus: employee?.employmentStatus || employee?.status || record.employee?.employmentStatus || record.employmentStatus || '—',
    employmentType: employee?.employmentType || record.employee?.employmentType || record.employmentType || '—',
    email: employee?.email || record.employee?.email || '',
    phone: employee?.phone || record.employee?.phone || '',
    tin: employee?.tin || record.employee?.tin || '',
    pensionId: employee?.pensionId || record.employee?.pensionId || '',
    bankName: employee?.bankName || record.employee?.bankName || '',
    bankAccount: employee?.bankAccount || record.employee?.bankAccount || '',
    joinDate: employee?.joinDate || record.employee?.joinDate || '',
    overtimeHours: Number(record.overtimeHours ?? record.otHours ?? 0),
    basicSalary: Number(record.basicSalary || 0),
    transportAllowance: Number(record.transportAllowance || 0),
    housingAllowance: Number(record.housingAllowance || 0),
    mealAllowance: Number(record.mealAllowance || 0),
    otherAllowance: Number(record.otherAllowance || 0),
    overtimePay: Number(record.overtimePay || 0),
    grossSalary: Number(record.grossSalary || 0),
    pensionDeduction: Number(record.pensionDeduction || record.employeePension || 0),
    incomeTax: Number(record.incomeTax || 0),
    loanDeduction: Number(record.loanDeduction || record.loanAdvance || 0),
    otherDeduction: Number(record.otherDeduction || 0),
    totalDeductions: Number(record.totalDeductions || 0),
    netSalary: Number(record.netSalary || 0),
    employerPension: Number(record.employerPension || 0),
    employerCost: Number(record.employerCost || 0),
  }
}

function DetailRow({ label, value, currency = false, emphasis = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${emphasis ? 'bg-slate-50 font-bold text-slate-950' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className="text-right font-semibold text-slate-900">{currency ? formatCurrency(value) : value || '—'}</span>
    </div>
  )
}

function PayslipPreview({ payslip, attendance, attendanceLoading, attendanceError, onClose }) {
  if (!payslip) return null
  const presentDays = attendance.filter((record) => ['PRESENT', 'LATE', 'CHECKED_IN', 'PENDING_CHECKOUT', 'PENDING_REVIEW'].includes(String(record.status || '').toUpperCase())).length
  const absentDays = attendance.filter((record) => ['ABSENT', 'A'].includes(String(record.status || '').toUpperCase())).length
  const leaveDays = attendance.filter((record) => ['SL', 'AL', 'ML', 'OL', 'LEAVE'].includes(String(record.status || '').toUpperCase())).length
  const lateMinutes = attendance.reduce((total, record) => total + Number(record.late || 0), 0)
  const overtimeHours = attendance.reduce((total, record) => total + Number(record.overtime || 0), 0)
  const earnings = [
    ['Basic Salary', payslip.basicSalary],
    ['Transport Allowance', payslip.transportAllowance],
    ['Housing Allowance', payslip.housingAllowance],
    ['Meal Allowance', payslip.mealAllowance],
    ['Other Allowance', payslip.otherAllowance],
    [`Overtime Pay${overtimeHours ? ` (${overtimeHours.toFixed(2)} hours)` : ''}`, payslip.overtimePay],
  ]
  const deductions = [
    ['Employee Pension', payslip.pensionDeduction],
    ['Income Tax', payslip.incomeTax],
    ['Loan Deduction', payslip.loanDeduction],
    ['Other Deduction', payslip.otherDeduction],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5 print:static print:block print:bg-white print:p-0">
      <section className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 print:hidden">
          <div className="min-w-0"><h2 className="text-lg font-bold text-slate-950 sm:text-xl">Payment Slip</h2><p className="mt-1 truncate text-sm text-slate-500">{payslip.employeeName} · {formatMonth(payslip.payrollMonth)}</p></div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:px-4"><Printer size={16} /> <span className="hidden sm:inline">Print / Save</span></button>
            <button type="button" onClick={onClose} aria-label="Close payment slip" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
          </div>
        </header>

        <div className="space-y-7 p-4 sm:p-8 print:p-10">
          <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white"><Building2 size={24} /></div><div><h1 className="text-2xl font-bold text-slate-950">Yanol Tech</h1><p className="text-sm text-slate-500">Employee Payment Slip</p></div></div>
            <div className="sm:text-right"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payroll Period</p><p className="mt-1 text-lg font-bold text-slate-950">{formatMonth(payslip.payrollMonth)}</p><p className="mt-1 text-xs text-slate-500">Record #{payslip.id}</p></div>
          </div>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Employee Information</h3>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
              {[
                ['Employee Name', payslip.employeeName], ['Employee ID', payslip.employeeId], ['Department', payslip.department],
                ['Job Title', payslip.jobTitle], ['Employment Status', payslip.employmentStatus], ['Employment Type', payslip.employmentType], ['Payment Type', 'Monthly Payroll'],
                ['Email', payslip.email], ['Phone', payslip.phone], ['Join Date', payslip.joinDate],
                ['TIN', payslip.tin], ['Pension ID', payslip.pensionId], ['Bank', payslip.bankName], ['Bank Account', payslip.bankAccount],
              ].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || '—'}</p></div>)}
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Earnings</h3><div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100">{earnings.map(([label, value]) => <DetailRow key={label} label={label} value={value} currency />)}<DetailRow label="Gross Salary" value={payslip.grossSalary} currency emphasis /></div></section>
            <section><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Deductions</h3><div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100">{deductions.map(([label, value]) => <DetailRow key={label} label={label} value={value} currency />)}<DetailRow label="Total Deductions" value={payslip.totalDeductions} currency emphasis /></div></section>
          </div>

          <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-sm text-slate-300">Net Salary Payable</p><p className="mt-1 text-3xl font-bold sm:text-4xl">{formatCurrency(payslip.netSalary)}</p></div><Banknote className="h-10 w-10 text-slate-400" /></div></section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Attendance Information</h3><p className="mt-1 text-xs text-slate-500">Attendance entries recorded for {formatMonth(payslip.payrollMonth)}.</p></div>{!attendanceLoading && <span className="text-xs font-medium text-slate-500">{attendance.length} records</span>}</div>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[['Present', presentDays], ['Absent', absentDays], ['Leave', leaveDays], ['Late', `${(lateMinutes / 60).toFixed(2)} hrs`], ['Overtime', `${overtimeHours.toFixed(2)} hrs`]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>)}
            </div>
            {attendanceError && <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{attendanceError}</p>}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table className="min-w-[680px] w-full">
                <thead><tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500"><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Check In</th><th className="px-3 py-2.5">Check Out</th><th className="px-3 py-2.5 text-right">Late</th><th className="px-3 py-2.5 text-right">Regular</th><th className="px-3 py-2.5 text-right">Overtime</th></tr></thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {attendanceLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading attendance…</span></td></tr> : attendance.length ? attendance.map((record) => <tr key={record.id}><td className="whitespace-nowrap px-3 py-2.5">{record.date}</td><td className="px-3 py-2.5">{record.status || '—'}</td><td className="px-3 py-2.5">{record.checkIn || '—'}</td><td className="px-3 py-2.5">{record.checkOut || '—'}</td><td className="px-3 py-2.5 text-right">{(Number(record.late || 0) / 60).toFixed(2)} hrs</td><td className="px-3 py-2.5 text-right">{Number(record.regular || 0).toFixed(2)} hrs</td><td className="px-3 py-2.5 text-right">{Number(record.overtime || 0).toFixed(2)} hrs</td></tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No attendance entries found for this pay period.</td></tr>}
                </tbody>
              </Table>
            </div>
          </section>

          <section className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2"><DetailRow label="Employer Pension Contribution" value={payslip.employerPension} currency /><DetailRow label="Total Employer Cost" value={payslip.employerCost} currency /></section>
          <p className="border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">This slip is generated from the saved payroll record. Please contact Human Resources if you have questions.</p>
        </div>
      </section>
    </div>
  )
}

function PaymentSlips() {
  const [employees, setEmployees] = useState([])
  const [employeeLoading, setEmployeeLoading] = useState(true)
  const [employeeError, setEmployeeError] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [payrollRecords, setPayrollRecords] = useState([])
  const [availablePeriods, setAvailablePeriods] = useState([])
  const [periodFilter, setPeriodFilter] = useState(ALL_PERIODS)
  const [loadedEmployeeId, setLoadedEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All Departments')
  const [loadingSlips, setLoadingSlips] = useState(false)
  const [apiError, setApiError] = useState('')
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const slipRequestId = useRef(0)

  useEffect(() => {
    let active = true
    getJson('/employees')
      .then((data) => {
        if (!active) return
        const list = responseRows(data, ['employees'])
        setEmployees(list)
      })
      .catch((error) => active && setEmployeeError(error.message || 'Unable to load employees.'))
      .finally(() => active && setEmployeeLoading(false))
    return () => { active = false }
  }, [])

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === selectedEmployeeId || String(employee.employeeId) === selectedEmployeeId),
    [employees, selectedEmployeeId],
  )

  async function loadSlips() {
    if (!selectedEmployeeId) {
      setApiError('Select an employee before loading payment slips.')
      return
    }
    const requestId = ++slipRequestId.current
    const requestedEmployeeId = selectedEmployeeId
    const requestedEmployee = selectedEmployee
    setLoadingSlips(true)
    setApiError('')
    setSelectedPayslip(null)
    setPayrollRecords([])
    setLoadedEmployeeId(selectedEmployeeId)
    try {
      const data = await getJson('/payroll')
      const records = responseRows(data, ['records', 'payroll', 'payrollRecords'])
      const employee = requestedEmployee
      const databaseId = String(employee?.id || selectedEmployeeId)
      const externalId = String(employee?.employeeId || selectedEmployeeId)
      const employeeRecords = records.filter((record) => [databaseId, externalId].includes(String(record.employeeId)))
      if (requestId !== slipRequestId.current) return
      const slips = employeeRecords.map((record) => normalizePayroll(record, employee))
      setPayrollRecords(slips)
      setAvailablePeriods([...new Set(employeeRecords.map((record) => record.payrollMonth).filter(Boolean))].sort((a, b) => b.localeCompare(a)))
      setPeriodFilter(ALL_PERIODS)
      setSearch('')
      setDepartment('All Departments')
      if (!slips.length) setApiError(`No saved payroll slips were found for ${getEmployeeName(employee)}.`)
    } catch (error) {
      if (requestId === slipRequestId.current) setApiError(error.message || 'Unable to load payment slips.')
    } finally {
      if (requestId === slipRequestId.current) setLoadingSlips(false)
    }
  }

  useEffect(() => {
    if (!employeeLoading && selectedEmployeeId && selectedEmployee) loadSlips()
    // Automatically refresh slips whenever the selected employee changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId, employeeLoading, selectedEmployee])

  async function viewSlip(payslip, requestId = slipRequestId.current) {
    setSelectedPayslip(payslip)
    setAttendance([])
    setAttendanceError('')
    const range = getPeriodRange(payslip.payrollMonth)
    if (!range) {
      setAttendanceError('Attendance cannot be matched because this payroll record has no valid pay period.')
      return
    }
    setAttendanceLoading(true)
    try {
      const query = new URLSearchParams(range)
      const data = await getJson(`/attendance?${query.toString()}`)
      const records = responseRows(data, ['attendance', 'records'])
      if (requestId !== slipRequestId.current) return
      const relatedIds = [String(payslip.employeeDatabaseId), String(payslip.employeeId)].filter(Boolean)
      const employeeAttendance = records.filter((record) => relatedIds.includes(String(record.employeeId)))
      setAttendance(employeeAttendance)
      const overtimeHours = employeeAttendance.reduce((total, record) => total + Number(record.overtime || 0), 0)
      setSelectedPayslip((current) => current?.id === payslip.id ? { ...current, overtimeHours } : current)
    } catch (error) {
      if (requestId === slipRequestId.current) setAttendanceError(error.message || 'Could not load this employee’s attendance for the pay period.')
    } finally {
      if (requestId === slipRequestId.current) setAttendanceLoading(false)
    }
  }

  function handleDownload(payslip) {
    viewSlip(payslip).then(() => window.setTimeout(() => window.print(), 250))
  }

  const departments = useMemo(() => ['All Departments', ...new Set(payrollRecords.map((record) => record.department).filter(Boolean))], [payrollRecords])
  const filteredPayslips = useMemo(() => payrollRecords.filter((payslip) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [payslip.employeeName, payslip.employeeId, payslip.department].some((value) => String(value || '').toLowerCase().includes(query))
    const matchesDepartment = department === 'All Departments' || payslip.department === department
    const matchesPeriod = periodFilter === ALL_PERIODS || payslip.payrollMonth === periodFilter
    return matchesSearch && matchesDepartment && matchesPeriod
  }), [payrollRecords, search, department, periodFilter])

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl print:hidden">
        <PageTitle eyebrow="Payment Slips" title="Employee Payment Slips" className="mb-6" />

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]"><FileText size={18} /></div><div><h2 className="text-sm font-bold text-slate-900">Load employee payment slips</h2><p className="mt-0.5 text-xs text-slate-500">Select an employee to find their saved payroll records.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select value={selectedEmployeeId} onChange={(event) => { slipRequestId.current += 1; setSelectedEmployeeId(event.target.value); setPayrollRecords([]); setLoadedEmployeeId(''); setSelectedPayslip(null); setAttendance([]); setLoadingSlips(false); setAttendanceLoading(false); setApiError(''); setAttendanceError('') }} disabled={employeeLoading || employees.length === 0} aria-label="Select employee" className="min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50">
              <option value="">{employeeLoading ? 'Loading employees…' : employees.length ? 'Select an employee' : 'No employees available'}</option>
              {employees.map((employee) => <option key={employee.id || employee.employeeId} value={employee.id || employee.employeeId}>{getEmployeeName(employee)} · {employee.employeeId || employee.id}</option>)}
            </select>
            {loadingSlips && <span className="inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold text-slate-500"><Loader2 size={16} className="animate-spin" />Loading slips…</span>}
          </div>
          {employeeError && <p className="mt-3 text-sm text-red-600">{employeeError}</p>}
        </section>

        {loadedEmployeeId && (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search slips by employee, ID, or department…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0092B8] focus:bg-white" /></div>
              <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="All Departments">All Departments</option>{departments.filter((value) => value !== 'All Departments').map((value) => <option key={value} value={value}>{value}</option>)}</select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600"><CalendarDays size={16} className="text-slate-400" /><span className="sr-only">Pay period</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className="max-w-48 bg-transparent font-semibold outline-none"><option value={ALL_PERIODS}>All pay periods</option>{availablePeriods.map((period) => <option key={period} value={period}>{formatMonth(period)}</option>)}</select></label>
            </div>

            {apiError && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">{apiError}</div>}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-bold text-slate-900">Saved Payment Slips</h2><p className="mt-1 text-xs text-slate-500">{selectedEmployee ? getEmployeeName(selectedEmployee) : 'Selected employee'} · {filteredPayslips.length} slip{filteredPayslips.length === 1 ? '' : 's'}</p></div><p className="text-xs font-medium text-slate-500">{periodFilter === ALL_PERIODS ? 'All available pay periods' : formatMonth(periodFilter)}</p></div>
              <div className="overflow-x-auto">
                <Table className="min-w-[760px] w-full">
                  <thead><tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Pay Period</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right">Gross Salary</th><th className="px-4 py-3 text-right">Deductions</th><th className="px-4 py-3 text-right">Net Salary</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {loadingSlips ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Loading saved slips…</span></td></tr> : filteredPayslips.length ? filteredPayslips.map((payslip) => <tr key={payslip.id} className="hover:bg-slate-50/80"><td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">{formatMonth(payslip.payrollMonth)}</td><td className="px-4 py-3.5"><p className="font-semibold text-slate-900">{payslip.employeeName}</p><p className="mt-0.5 text-xs text-slate-500">{payslip.employeeId}</p></td><td className="px-4 py-3.5">{payslip.department}</td><td className="px-4 py-3.5 text-right tabular-nums">{formatCurrency(payslip.grossSalary)}</td><td className="px-4 py-3.5 text-right tabular-nums text-rose-700">{formatCurrency(payslip.totalDeductions)}</td><td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700">{formatCurrency(payslip.netSalary)}</td><td className="px-4 py-3.5"><div className="flex justify-end gap-2"><button type="button" onClick={() => viewSlip(payslip)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0092B8] px-3 py-2 text-xs font-bold text-white hover:bg-[#007a99]"><FileText size={14} />View</button><button type="button" onClick={() => handleDownload(payslip)} aria-label={`Print ${payslip.employeeName} ${formatMonth(payslip.payrollMonth)} slip`} title="Print / Save slip" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Download size={15} /></button></div></td></tr>) : <tr><td colSpan={7} className="px-4 py-12 text-center"><FileText className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">No payment slips found</p><p className="mt-1 text-xs text-slate-500">No saved payroll records match this employee and pay-period filter.</p></td></tr>}
                  </tbody>
                </Table>
              </div>
            </section>
          </>
        )}
        {!loadedEmployeeId && !employeeLoading && !employeeError && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-12 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 text-sm font-bold text-slate-800">Select an employee to begin</h2><p className="mt-1 text-sm text-slate-500">Their existing saved payment slips will appear here.</p></div>}
      </div>

      <PayslipPreview payslip={selectedPayslip} attendance={attendance} attendanceLoading={attendanceLoading} attendanceError={attendanceError} onClose={() => setSelectedPayslip(null)} />
    </div>
  )
}

export default PaymentSlips
