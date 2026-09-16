import React, { useState, useMemo } from 'react'
import {
  Wallet,
  Calculator,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  TrendingDown,
  ShieldCheck,
  Clock,
  ChevronDown,
  Info,
} from 'lucide-react'
import { HR_SETTINGS } from '../data/settingsData'
import {
  MOCK_EMPLOYEES,
  PAYROLL_PERIODS,
  MOCK_ATTENDANCE_SUMMARY,
} from '../data/mockData'
import { calcEmployeePayroll, formatETB, roundMoney } from '../lib/payroll'

export default function HRPayroll() {
  const [selectedPeriodId, setSelectedPeriodId] = useState('2026-09')
  const [finalized, setFinalized] = useState(false)

  const currentPeriod = useMemo(() => {
    return PAYROLL_PERIODS.find((p) => p.id === selectedPeriodId) || PAYROLL_PERIODS[0]
  }, [selectedPeriodId])

  const attendance = useMemo(() => {
    return MOCK_ATTENDANCE_SUMMARY[selectedPeriodId] || {}
  }, [selectedPeriodId])

  // Active employees only
  const activeEmployees = useMemo(() => {
    return MOCK_EMPLOYEES.filter((e) => e.employmentStatus === 'Active')
  }, [])

  const payrollRows = useMemo(() => {
    return activeEmployees.map((emp) => {
      const att = attendance[emp.employeeId] || { totalOtHours: 0 }
      return calcEmployeePayroll(emp, att)
    })
  }, [activeEmployees, attendance])

  const totals = useMemo(() => {
    const gross = roundMoney(payrollRows.reduce((s, r) => s + r.gross, 0))
    const net = roundMoney(payrollRows.reduce((s, r) => s + r.netSalary, 0))
    const tax = roundMoney(payrollRows.reduce((s, r) => s + r.incomeTax, 0))
    const pensionEmp = roundMoney(payrollRows.reduce((s, r) => s + r.pensionEmployee, 0))
    const pensionComp = roundMoney(payrollRows.reduce((s, r) => s + r.pensionEmployer, 0))
    const totalPension = roundMoney(payrollRows.reduce((s, r) => s + r.totalPension, 0))
    const otHours = roundMoney(payrollRows.reduce((s, r) => s + r.otHours, 0))

    return {
      gross,
      net,
      tax,
      pensionEmp,
      pensionComp,
      totalPension,
      otHours,
    }
  }, [payrollRows])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-gray-950">Payroll Run &amp; Register</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
              Statutory Engine
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">Period:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value)
                setFinalized(false)
              }}
              className="text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded-md px-2 py-1 focus:outline-none"
            >
              {PAYROLL_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert(`Exporting payroll register for ${currentPeriod.label} as CSV...`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold shadow-2xs"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setFinalized(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
              finalized
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-950 hover:bg-black text-white cursor-pointer'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>{finalized ? 'Payroll Finalized ✓' : 'Finalize Payroll Run'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Total Gross Payroll</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums">
            {formatETB(totals.gross)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">Basic + Allowances + OT</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Total Net Disbursement</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums">
            {formatETB(totals.net)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">{payrollRows.length} active employees</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Total Income Tax</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums">
            {formatETB(totals.tax)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">Proc. No. 1395/2025</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Total Pension (18%)</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums">
            {formatETB(totals.totalPension)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">7% Employee + 11% Employer</span>
        </div>
      </div>

      {/* Payroll Register Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-950">Employee Payroll Register</h3>
            <p className="text-xs text-gray-500">Line-by-line breakdown for {currentPeriod.label}</p>
          </div>
          <span className="text-xs text-gray-500 font-mono">Currency: ETB</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3 text-right">Basic Salary</th>
                <th className="py-2.5 px-3 text-right">Allowances</th>
                <th className="py-2.5 px-3 text-right">OT Hours / Pay</th>
                <th className="py-2.5 px-3 text-right">Gross</th>
                <th className="py-2.5 px-3 text-right">Income Tax</th>
                <th className="py-2.5 px-3 text-right">Pension (Emp)</th>
                <th className="py-2.5 px-3 text-right font-black">Net Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white font-mono">
              {payrollRows.map((row) => (
                <tr key={row.employeeId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{row.employeeId}</td>
                  <td className="py-2.5 px-3 font-sans font-bold text-gray-950">{row.name}</td>
                  <td className="py-2.5 px-3 font-sans text-gray-600">{row.department}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-800">
                    {formatETB(row.basicSalary)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-800">
                    {formatETB(row.totalAllowances)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-800">
                    {row.otHours}h ({formatETB(row.otPay)})
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-gray-950">
                    {formatETB(row.gross)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-rose-700 font-medium">
                    {row.exempt ? 'Exempt' : formatETB(row.incomeTax)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-indigo-700 font-medium">
                    {row.exempt ? 'Exempt' : formatETB(row.pensionEmployee)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-black text-gray-950 bg-gray-50/80">
                    {formatETB(row.netSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100/80 font-mono font-bold border-t border-gray-200 text-gray-950">
              <tr>
                <td colSpan={3} className="py-3 px-3 font-sans font-black">
                  Total Active Payroll ({payrollRows.length} staff)
                </td>
                <td className="py-3 px-3 text-right">
                  {formatETB(roundMoney(payrollRows.reduce((s, r) => s + r.basicSalary, 0)))}
                </td>
                <td className="py-3 px-3 text-right">
                  {formatETB(roundMoney(payrollRows.reduce((s, r) => s + r.totalAllowances, 0)))}
                </td>
                <td className="py-3 px-3 text-right">{totals.otHours}h</td>
                <td className="py-3 px-3 text-right text-black">{formatETB(totals.gross)}</td>
                <td className="py-3 px-3 text-right text-rose-800">{formatETB(totals.tax)}</td>
                <td className="py-3 px-3 text-right text-indigo-800">{formatETB(totals.pensionEmp)}</td>
                <td className="py-3 px-3 text-right text-black font-black">{formatETB(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
