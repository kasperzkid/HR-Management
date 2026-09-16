import { useState, useMemo } from 'react'
import { Printer } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { calcPayroll, formatETB } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'

function PayslipCard({ emp, row }) {
  const earnings = [
    { label: 'Basic Salary', value: row.basicSalary },
    { label: 'Transport Allowance', value: row.transportAllowance },
    { label: 'Housing Allowance', value: row.housingAllowance },
    { label: 'Meal / Other Allowance', value: row.mealAllowance + row.otherAllowance },
    { label: 'Overtime Pay', value: row.otPay },
  ]
  const deductions = [
    { label: 'Income Tax', value: row.incomeTax },
    { label: 'Employee Pension (7%)', value: row.pensionEmployee },
    { label: 'Other Deductions', value: row.otherDeductions },
    { label: 'Loan Deductions', value: row.loanDeductions },
  ]
  const totalEarn = earnings.reduce((s, e) => s + e.value, 0)
  const totalDed = deductions.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5 print:border-0 print:shadow-none print:rounded-none">
      {/* Header */}
      <div className="border-b border-gray-200 pb-3 mb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-extrabold text-gray-950 tracking-tight">{SETTINGS.company.name}</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{SETTINGS.company.address}</p>
            <p className="text-[10px] text-gray-500">Tel: {SETTINGS.company.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-900">PAYSLIP</p>
            <p className="text-[10px] text-gray-500">
              {new Date().toLocaleString('en-ET', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-gray-500">TIN {SETTINGS.company.tin}</p>
          </div>
        </div>
      </div>

      {/* Employee info */}
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[10px] mb-3">
        {[
          ['Employee ID', emp.employeeId],
          ['Department', emp.department],
          ['Job Title', emp.jobTitle],
          ['Employment Type', emp.employmentType],
          ['TIN', emp.tin],
          ['Bank Account', emp.bankAccount],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-dashed border-gray-100 pb-1">
            <span className="text-gray-500">{k}</span>
            <span className="font-semibold text-gray-900">{v}</span>
          </div>
        ))}
      </div>

      {/* Earnings & Deductions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-1.5">Earnings</p>
          <div className="space-y-1">
            {earnings.map((e) => (
              <div key={e.label} className="flex justify-between text-[10px]">
                <span className="text-gray-600">{e.label}</span>
                <span className="tabular-nums font-medium text-gray-900">{formatETB(e.value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-[10px] font-bold border-t border-gray-200 pt-1">
              <span className="text-gray-900">Gross Salary</span>
              <span className="tabular-nums">{formatETB(totalEarn)}</span>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-1.5">Deductions</p>
          <div className="space-y-1">
            {deductions.map((d) => (
              <div key={d.label} className="flex justify-between text-[10px]">
                <span className="text-gray-600">{d.label}</span>
                <span className="tabular-nums font-medium text-gray-900">{formatETB(-d.value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-[10px] font-bold border-t border-gray-200 pt-1">
              <span className="text-gray-900">Total Deductions</span>
              <span className="tabular-nums">{formatETB(-totalDed)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net */}
      <div className="rounded-xl bg-gray-950 text-white px-3 py-2 flex justify-between items-center mb-4">
        <span className="text-[10px] font-semibold text-gray-300">NET SALARY</span>
        <span className="text-lg font-extrabold tabular-nums">{formatETB(row.netSalary)}</span>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500">
        <div className="border-t border-gray-300 pt-1">Prepared by</div>
        <div className="border-t border-gray-300 pt-1">Approved by</div>
      </div>
    </div>
  )
}

function Payslips() {
  const [selectedId, setSelectedId] = useState('all')

  const rows = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    const map = {}
    INITIAL_EMPLOYEES.forEach((emp) => {
      map[emp.employeeId] = calcPayroll(emp, attTotals[emp.employeeId] || { totalOtHours: 0 })
    })
    return map
  }, [])

  const employeesToShow =
    selectedId === 'all'
      ? INITIAL_EMPLOYEES.filter((e) => e.employmentStatus === 'Active')
      : INITIAL_EMPLOYEES.filter((e) => e.employeeId === selectedId)

  return (
    <div className="p-5 md:p-6 space-y-4 max-w-[1300px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-950">Payslips</h1>
          <p className="text-[10px] text-gray-500 mt-1">Auto-generated per employee per payroll run</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800"
          >
            <option value="all">All active employees</option>
            {INITIAL_EMPLOYEES.map((e) => (
              <option key={e.employeeId} value={e.employeeId}>{e.employeeId} — {e.name}</option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-gray-950 text-white text-xs font-semibold flex items-center gap-1 hover:bg-gray-800 transition-colors"
          >
            <Printer size={13} />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {employeesToShow.map((emp) => (
          <PayslipCard key={emp.employeeId} emp={emp} row={rows[emp.employeeId]} />
        ))}
      </div>
    </div>
  )
}

export default Payslips