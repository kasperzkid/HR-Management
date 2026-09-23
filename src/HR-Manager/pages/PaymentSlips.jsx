import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarDays,
  Download,
  FileText,
  Printer,
  Search,
  X,
} from 'lucide-react'

import { PageTitle } from '../../components/ui'

const API_URL = 'http://localhost:4000/api/hr-manager'

const PENSION_RATE = 0.07

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatMonth(month) {
  if (!month) return ''
  const date = new Date(`${month}-01T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getEmployeeName(employee) {
  return employee.name || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Employee'
}

function getEmployeeId(employee, index) {
  return employee.employeeId || employee.id || `EMP-${String(index + 1).padStart(3, '0')}`
}

function getSalary(employee) {
  const salary = Number(employee.basicSalary ?? employee.salary ?? 0)
  return Number.isFinite(salary) ? salary : 0
}

function calculatePayroll(employee) {
  const basicSalary = getSalary(employee)
  const transportAllowance = Number(employee.transportAllowance || 0)
  const housingAllowance = Number(employee.housingAllowance || 0)
  const mealAllowance = Number(employee.mealAllowance || 0)
  const otherAllowance = Number(employee.otherAllowance || 0)
  const overtime = Number(employee.overtime || 0)

  const gross = basicSalary + transportAllowance + housingAllowance + mealAllowance + otherAllowance + overtime
  const pension = Number((basicSalary * PENSION_RATE).toFixed(2))
  const incomeTax = Number(employee.incomeTax || 0)
  const loanAdvance = Number(employee.loanAdvance || 0)
  const otherDeduction = Number(employee.otherDeduction || 0)
  const totalDeductions = pension + incomeTax + loanAdvance + otherDeduction
  const netSalary = gross - totalDeductions

  return {
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    overtime,
    gross,
    pension,
    incomeTax,
    loanAdvance,
    otherDeduction,
    totalDeductions,
    netSalary,
  }
}

function normalizePayroll(record) {
  return {
    ...record,
    employeeKey: record.employeeId || record.id,
    employeeId: record.employee?.employeeId || record.employeeId || '',
    employeeName:
      record.employee?.name ||
      [record.employee?.firstName, record.employee?.lastName].filter(Boolean).join(' ') ||
      record.employeeName ||
      'Employee',
    department: record.employee?.department || record.department || 'Unassigned',
    jobTitle: record.employee?.jobTitle || record.jobTitle || 'Employee',
    employmentStatus: record.employee?.employmentStatus || record.employee?.status || record.employmentStatus || 'Active',
    basicSalary: Number(record.basicSalary || 0),
    transportAllowance: Number(record.transportAllowance || 0),
    housingAllowance: Number(record.housingAllowance || 0),
    mealAllowance: Number(record.mealAllowance || 0),
    otherAllowance: Number(record.otherAllowance || 0),
    overtime: Number(record.overtimePay ?? record.overtime ?? 0),
    overtimeHours: Number(record.overtimeHours || 0),
    gross: Number(record.grossSalary ?? record.gross ?? 0),
    pension: Number(record.employeePension ?? record.pension ?? 0),
    incomeTax: Number(record.incomeTax || 0),
    loanAdvance: Number(record.loanAdvance || 0),
    otherDeduction: Number(record.otherDeduction || 0),
    totalDeductions: Number(record.totalDeductions || 0),
    netSalary: Number(record.netSalary || 0),
  }
}

function PayslipPreview({ payslip, month, onClose }) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 print:static print:block print:bg-white print:p-0">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Payment Slip</h2>
            <p className="mt-1 text-sm text-slate-500">{payslip.employeeName} · {formatMonth(month)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-8 print:p-10">
          <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white"><Building2 className="h-6 w-6" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Yanol Tech</h1>
                <p className="text-sm text-slate-500">Employee Payment Slip</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payroll Period</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{formatMonth(month)}</p>
            </div>
          </div>

          <div className="mb-8 grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Employee</p><p className="mt-1 font-bold text-slate-950">{payslip.employeeName}</p><p className="mt-1 text-sm text-slate-500">{payslip.employeeId}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Position</p><p className="mt-1 font-semibold text-slate-900">{payslip.jobTitle}</p><p className="mt-1 text-sm text-slate-500">{payslip.department}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Employment Status</p><p className="mt-1 font-semibold text-slate-900">{payslip.employmentStatus}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Payment Type</p><p className="mt-1 font-semibold text-slate-900">Monthly Payroll</p></div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Earnings</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {[
                  ['Basic Salary', payslip.basicSalary],
                  ['Transport Allowance', payslip.transportAllowance],
                  ['Housing Allowance', payslip.housingAllowance],
                  ['Meal Allowance', payslip.mealAllowance],
                  ['Other Allowance', payslip.otherAllowance],
                  [`Overtime (${payslip.overtimeHours.toFixed(2)} hrs)`, payslip.overtime],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-4 py-3 text-sm"><span>{label}</span><span className="font-semibold">{formatCurrency(value)}</span></div>
                ))}
                <div className="flex justify-between bg-slate-50 px-4 py-3 text-sm font-bold"><span>Gross Salary</span><span>{formatCurrency(payslip.gross)}</span></div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Deductions</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {[
                  ['Pension', payslip.pension],
                  ['Income Tax', payslip.incomeTax],
                  ['Loan / Advance', payslip.loanAdvance],
                  ['Other Deduction', payslip.otherDeduction],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-4 py-3 text-sm"><span>{label}</span><span className="font-semibold">{formatCurrency(value)}</span></div>
                ))}
                <div className="flex justify-between bg-slate-50 px-4 py-3 text-sm font-bold"><span>Total Deductions</span><span>{formatCurrency(payslip.totalDeductions)}</span></div>
              </div>
            </section>
          </div>

          <div className="mt-8 rounded-2xl bg-slate-950 p-6 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm text-slate-300">Net Salary</p><p className="mt-1 text-3xl font-bold">{formatCurrency(payslip.netSalary)}</p></div>
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-5">
            <p className="text-xs leading-5 text-slate-400">
              This payment slip is generated directly from the finalized payroll record for the selected payroll period.
              Overtime hours and overtime pay are sourced from Attendance through Payroll.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentSlips() {
  const [payrollMonth, setPayrollMonth] = useState(getCurrentMonth)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All Departments')
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPayroll() {
      setLoading(true)
      setApiError('')

      try {
        const response = await fetch(`${API_URL}/payroll?payrollMonth=${encodeURIComponent(payrollMonth)}`)
        if (!response.ok) throw new Error('Failed to load payroll records.')

        const data = await response.json()
        const records = Array.isArray(data) ? data : Array.isArray(data.records) ? data.records : []

        if (!cancelled) {
          setPayslips(records.map(normalizePayroll))
        }
      } catch (error) {
        if (!cancelled) {
          setPayslips([])
          setApiError(error.message || 'Unable to load payroll records.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPayroll()
    return () => { cancelled = true }
  }, [payrollMonth])

  const departments = useMemo(() => {
    return ['All Departments', ...Array.from(new Set(payslips.map((item) => item.department).filter(Boolean)))]
  }, [payslips])

  const filteredPayslips = useMemo(() => {
    const query = search.trim().toLowerCase()

    return payslips.filter((payslip) => {
      const matchesSearch =
        !query ||
        payslip.employeeName.toLowerCase().includes(query) ||
        payslip.employeeId.toLowerCase().includes(query) ||
        payslip.department.toLowerCase().includes(query)

      const matchesDepartment = department === 'All Departments' || payslip.department === department
      return matchesSearch && matchesDepartment
    })
  }, [payslips, search, department])

  function handleDownload(payslip) {
    setSelectedPayslip(payslip)
    setTimeout(() => window.print(), 0)
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <PageTitle
          eyebrow="Payment Slips"
          title="Employee Payment Slips"
          description="View and print payment slips generated from payroll records."
          action={
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <CalendarDays className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-xs text-slate-400">Payroll Period</p>
                <input type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} className="bg-transparent text-sm font-semibold text-slate-800 outline-none" />
              </div>
            </div>
          }
          className="mb-8"
        />

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, ID or department..." className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {apiError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{apiError}</div>}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">Loading payroll records...</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPayslips.map((payslip) => (
              <div key={payslip.id || payslip.employeeKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                      {payslip.employeeName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-950">{payslip.employeeName}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">{payslip.employeeId}</p>
                    </div>
                  </div>
                  <FileText className="h-5 w-5 text-slate-300" />
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Department</span><span className="font-medium text-slate-800">{payslip.department}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">OT Hours</span><span className="font-semibold text-slate-800">{payslip.overtimeHours.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Gross Salary</span><span className="font-semibold text-slate-800">{formatCurrency(payslip.gross)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Deductions</span><span className="font-semibold text-red-600">{formatCurrency(payslip.totalDeductions)}</span></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Net Salary</p><p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrency(payslip.netSalary)}</p></div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={() => setSelectedPayslip(payslip)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    <FileText className="h-4 w-4" /> View Slip
                  </button>
                  <button type="button" onClick={() => handleDownload(payslip)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-slate-700 transition hover:bg-slate-50" title="Print / Save">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredPayslips.length === 0 && !apiError && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-900">No payment slips found</h3>
            <p className="mt-1 text-sm text-slate-500">Generate payroll for {formatMonth(payrollMonth)} first.</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Payment Slips — Payroll Connected</p>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                Payment slips now read finalized payroll records for the selected month. Overtime hours and overtime pay come from Attendance through Payroll, so they are not entered separately here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedPayslip && <PayslipPreview payslip={selectedPayslip} month={payrollMonth} onClose={() => setSelectedPayslip(null)} />}
    </div>
  )
}

export default PaymentSlips
