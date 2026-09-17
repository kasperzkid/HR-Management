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
import LuxuryDataTable from '../components/LuxuryDataTable'

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
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">Payroll Run &amp; Register</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
              Statutory Engine
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Period:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value)
                setFinalized(false)
              }}
              className="text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded-md px-2 py-1 focus:outline-none dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200"
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
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold shadow-2xs dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-300 dark:hover:bg-[#1c2026]"
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
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Gross Payroll</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums dark:text-gray-100">
            {formatETB(totals.gross)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block dark:text-gray-500">Basic + Allowances + OT</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Net Disbursement</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums dark:text-gray-100">
            {formatETB(totals.net)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block dark:text-gray-500">{payrollRows.length} active employees</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Income Tax</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums dark:text-gray-100">
            {formatETB(totals.tax)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block dark:text-gray-500">Proc. No. 1395/2025</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Pension (18%)</span>
          <p className="text-2xl font-black text-gray-950 mt-1.5 tabular-nums dark:text-gray-100">
            {formatETB(totals.totalPension)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block dark:text-gray-500">7% Employee + 11% Employer</span>
        </div>
      </div>

      {/* Payroll Register Table (Qirb-Alga Luxury Table) */}
      <LuxuryDataTable
        title="Employee Payroll Register"
        subtitle={`Line-by-line breakdown for ${currentPeriod.label} · Statutory Proclamation Nos. 1395/2025 & 715/2011`}
        countBadge={`${payrollRows.length} active staff`}
        data={payrollRows}
        searchable={true}
        searchPlaceholder="Search staff by name, ID, department..."
        searchKeys={['employeeId', 'name', 'department']}
        exportable={true}
        exportFilename={`Payroll_Register_${selectedPeriodId}`}
        headerActions={
          <span className="text-xs text-gray-500 font-mono dark:text-gray-400 self-center hidden sm:inline">
            Currency: ETB
          </span>
        }
        columns={[
          {
            key: 'employeeId',
            header: 'ID',
            sortable: true,
            render: (r) => (
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{r.employeeId}</span>
            ),
          },
          {
            key: 'name',
            header: 'Employee Name',
            sortable: true,
            render: (r) => (
              <span className="font-bold text-gray-950 dark:text-gray-100">{r.name}</span>
            ),
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (r) => (
              <span className="text-gray-600 dark:text-gray-400">{r.department}</span>
            ),
          },
          {
            key: 'basicSalary',
            header: 'Basic Salary',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">
                {formatETB(r.basicSalary)}
              </span>
            ),
            exportValue: (r) => r.basicSalary,
          },
          {
            key: 'totalAllowances',
            header: 'Allowances',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-gray-800 dark:text-gray-200">
                {formatETB(r.totalAllowances)}
              </span>
            ),
            exportValue: (r) => r.totalAllowances,
          },
          {
            key: 'otPay',
            header: 'OT Hours / Pay',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-gray-800 dark:text-gray-200 text-xs">
                {r.otHours}h <span className="text-[11px] text-gray-500">({formatETB(r.otPay)})</span>
              </span>
            ),
            exportValue: (r) => `${r.otHours}h (${r.otPay})`,
          },
          {
            key: 'gross',
            header: 'Gross Pay',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums font-bold text-gray-950 dark:text-gray-100">
                {formatETB(r.gross)}
              </span>
            ),
            exportValue: (r) => r.gross,
          },
          {
            key: 'incomeTax',
            header: 'Income Tax',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-rose-700 dark:text-rose-400 font-semibold">
                {r.exempt ? 'Exempt' : formatETB(r.incomeTax)}
              </span>
            ),
            exportValue: (r) => (r.exempt ? 0 : r.incomeTax),
          },
          {
            key: 'pensionEmployee',
            header: 'Pension (7%)',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-indigo-700 dark:text-indigo-400 font-semibold">
                {r.exempt ? 'Exempt' : formatETB(r.pensionEmployee)}
              </span>
            ),
            exportValue: (r) => (r.exempt ? 0 : r.pensionEmployee),
          },
          {
            key: 'netSalary',
            header: 'Net Salary',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums font-black text-gray-950 dark:text-gray-100 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/30">
                {formatETB(r.netSalary)}
              </span>
            ),
            exportValue: (r) => r.netSalary,
          },
        ]}
        dropdownActions={[
          {
            label: 'View Detailed Payslip',
            onClick: (r) => alert(`Payslip details for ${r.name}: Gross ${formatETB(r.gross)}, Net ${formatETB(r.netSalary)}`),
          },
          {
            label: 'Adjust Allowances / OT',
            onClick: (r) => alert(`Adjust compensation allowances for ${r.name}`),
          },
        ]}
      />
    </div>
  )
}
