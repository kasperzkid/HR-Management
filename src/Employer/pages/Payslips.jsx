import { useState, useMemo } from 'react'
import { Printer } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { calcPayroll, formatETB } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'
import { getCurrentEmployee } from '../lib/currentUser'

function PayslipCard({ emp, row }) {
  if (!row) return null

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
    <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200 dark:border-[#262b31] shadow-2xs p-6 print:border-0 print:shadow-none print:rounded-none max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-[#262b31] pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-black text-gray-950 dark:text-gray-100 tracking-tight">
              {SETTINGS.company.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{SETTINGS.company.address}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tel: {SETTINGS.company.phone}</p>
          </div>
          <div className="text-right">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 inline-block mb-1">
              Official Payslip
            </span>
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {new Date().toLocaleString('en-ET', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">TIN {SETTINGS.company.tin}</p>
          </div>
        </div>
      </div>

      {/* Employee info */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mb-4">
        {[
          ['Employee ID', emp.employeeId],
          ['Department', emp.department],
          ['Job Title', emp.jobTitle],
          ['Employment Type', emp.employmentType],
          ['TIN', emp.tin],
          ['Bank Account', emp.bankAccount],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-dashed border-gray-100 dark:border-[#262b31] pb-1">
            <span className="text-gray-500 dark:text-gray-400">{k}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{v}</span>
          </div>
        ))}
      </div>

      {/* Earnings & Deductions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            Earnings (ETB)
          </p>
          <div className="space-y-1.5">
            {earnings.map((e) => (
              <div key={e.label} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{e.label}</span>
                <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
                  {formatETB(e.value)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-xs font-bold border-t border-gray-200 dark:border-[#262b31] pt-1.5 mt-1">
              <span className="text-gray-900 dark:text-gray-100">Gross Earnings</span>
              <span className="tabular-nums">{formatETB(totalEarn)}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            Deductions (ETB)
          </p>
          <div className="space-y-1.5">
            {deductions.map((d) => (
              <div key={d.label} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{d.label}</span>
                <span className="tabular-nums font-medium text-rose-600 dark:text-rose-400">
                  {formatETB(-d.value)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-xs font-bold border-t border-gray-200 dark:border-[#262b31] pt-1.5 mt-1">
              <span className="text-gray-900 dark:text-gray-100">Total Deductions</span>
              <span className="tabular-nums text-rose-600 dark:text-rose-400">{formatETB(-totalDed)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net */}
      <div className="rounded-xl bg-gray-950 text-white dark:bg-[#20252d] px-4 py-3 flex justify-between items-center mb-4">
        <span className="text-xs font-semibold text-gray-300">NET SALARY PAYABLE</span>
        <span className="text-xl font-black tabular-nums">{formatETB(row.netSalary)}</span>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-6 text-xs text-gray-500 dark:text-gray-400 pt-2">
        <div className="border-t border-gray-300 dark:border-[#33383f] pt-1.5">
          <p className="font-semibold text-gray-700 dark:text-gray-300">Employer Authorized</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Finance Department</p>
        </div>
        <div className="border-t border-gray-300 dark:border-[#33383f] pt-1.5">
          <p className="font-semibold text-gray-700 dark:text-gray-300">Employee Received</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{emp.name}</p>
        </div>
      </div>
    </div>
  )
}

function Payslips() {
  const currentEmployee = getCurrentEmployee()

  const row = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    return calcPayroll(
      currentEmployee,
      attTotals[currentEmployee.employeeId] || { totalOtHours: 0 }
    )
  }, [currentEmployee])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
              My Payslip
            </h1>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-[#1c2026] dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
              {currentEmployee.name} ({currentEmployee.employeeId})
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Personal statutory earnings, allowances, tax deductions &amp; net salary statement
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-colors cursor-pointer shadow-xs"
        >
          <Printer size={15} />
          <span>Print Payslip</span>
        </button>
      </div>

      <PayslipCard emp={currentEmployee} row={row} />
    </div>
  )
}

export default Payslips