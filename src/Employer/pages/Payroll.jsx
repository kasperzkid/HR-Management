import { useState, useMemo } from 'react'
import { Play, CheckCircle2, RefreshCw } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'
import LuxuryDataTable from '../components/LuxuryDataTable'
import { getCurrentEmployee } from '../lib/currentUser'

function Payroll() {
  const currentEmployee = getCurrentEmployee()
  const currentEmployeeId = currentEmployee.employeeId

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [finalized, setFinalized] = useState(false)
  const [overrides, setOverrides] = useState({})

  const filteredEmployees = useMemo(() => {
    return INITIAL_EMPLOYEES.filter((emp) => emp.employeeId === currentEmployeeId)
  }, [currentEmployeeId])

  const rows = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    return filteredEmployees.map((emp) => {
      const base = calcPayroll(emp, attTotals[emp.employeeId] || { totalOtHours: 0 })
      const ov = overrides[emp.employeeId]
      const otherDeductions = ov?.otherDeductions ?? emp.otherDeductions ?? 0
      const loanDeductions = ov?.loanDeductions ?? emp.loanDeductions ?? 0
      const totalDeductions = base.incomeTax + base.pensionEmployee + otherDeductions + loanDeductions
      return {
        ...base,
        otherDeductions,
        loanDeductions,
        totalDeductions,
        netSalary: roundMoney(base.gross - totalDeductions),
      }
    })
  }, [overrides])

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.active)
    return {
      gross: roundMoney(active.reduce((s, r) => s + r.gross, 0)),
      tax: roundMoney(active.reduce((s, r) => s + r.incomeTax, 0)),
      pensionEmp: roundMoney(active.reduce((s, r) => s + r.pensionEmployee, 0)),
      pensionEmpR: roundMoney(active.reduce((s, r) => s + r.pensionEmployer, 0)),
      net: roundMoney(active.reduce((s, r) => s + r.netSalary, 0)),
      otherDed: roundMoney(active.reduce((s, r) => s + r.otherDeductions + r.loanDeductions, 0)),
    }
  }, [rows])

  const handleOverride = (employeeId, field, value) => {
    const num = Number(value) || 0
    setOverrides((prev) => ({ ...prev, [employeeId]: { ...(prev[employeeId] || {}), [field]: num } }))
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">Payroll Run</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tax brackets per Proclamation No. 1395/2025 · Pension {SETTINGS.pension.employeeRate * 100}% / {SETTINGS.pension.employerRate * 100}% · OT {SETTINGS.overtimeMultiplier}x · {SETTINGS.standardMonthlyHours}h std
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] font-semibold text-gray-800 dark:text-gray-200"
          >
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] font-semibold text-gray-800 dark:text-gray-200">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {!finalized ? (
            <button
              onClick={() => setFinalized(true)}
              className="px-4 py-2 rounded-lg bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
            >
              <Play size={14} />
              Finalize Run
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={15} />
                Finalized
              </span>
              <button
                onClick={() => { setFinalized(false); setOverrides({}) }}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#33383f] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                Reopen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Gross Payroll', value: totals.gross, color: 'text-gray-950 dark:text-gray-100' },
          { label: 'Income Tax', value: totals.tax, color: 'text-sky-600' },
          { label: 'Emp Pension', value: totals.pensionEmp, color: 'text-teal-600' },
          { label: 'Empr Pension', value: totals.pensionEmpR, color: 'text-violet-600' },
          { label: 'Net Payroll', value: totals.net, color: 'text-emerald-600' },
        ].map((t) => (
          <div key={t.label} className="bg-white dark:bg-[#15181d] rounded-2xl p-4 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.label}</p>
            <p className={`text-lg font-bold mt-1 ${t.color}`}>{formatETB(t.value)}</p>
          </div>
        ))}
      </div>

      {/* Computed Payroll Table (Luxury Table) */}
      <LuxuryDataTable
        title={`Computed Payroll — ${month}/${year}`}
        subtitle="Detailed statutory breakdown with editable deductions & net disbursement"
        countBadge={`${rows.length} records`}
        data={rows}
        searchable={true}
        searchPlaceholder="Search staff name, ID, department..."
        searchKeys={['name', 'employeeId', 'department', 'employmentType']}
        exportable={true}
        exportFilename={`Employer_Payroll_${month}_${year}`}
        columns={[
          {
            key: 'name',
            header: 'Employee',
            sortable: true,
            render: (r) => (
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{r.employeeId} · {r.department}</p>
              </div>
            ),
          },
          {
            key: 'employmentType',
            header: 'Type',
            sortable: true,
            render: (r) => (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  r.exempt ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-700 dark:bg-[#1c2026] dark:text-gray-300'
                }`}
              >
                {r.employmentType} {r.exempt && '· exempt'}
              </span>
            ),
          },
          {
            key: 'basicSalary',
            header: 'Basic',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums font-medium">{formatETB(r.basicSalary)}</span>,
            exportValue: (r) => r.basicSalary,
          },
          {
            key: 'allowances',
            header: 'Allow.',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums">
                {formatETB(r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance)}
              </span>
            ),
            exportValue: (r) => r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance,
          },
          {
            key: 'otHours',
            header: 'OT',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-xs">
                {r.otHours}h <span className="text-[10px] text-gray-400">({formatETB(r.otPay)})</span>
              </span>
            ),
            exportValue: (r) => `${r.otHours}h (${r.otPay})`,
          },
          {
            key: 'gross',
            header: 'Gross',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums font-semibold">{formatETB(r.gross)}</span>,
            exportValue: (r) => r.gross,
          },
          {
            key: 'incomeTax',
            header: 'Tax',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums text-sky-600 font-medium">{formatETB(r.incomeTax)}</span>,
            exportValue: (r) => r.incomeTax,
          },
          {
            key: 'pensionEmployee',
            header: 'Pension',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums text-teal-600 font-medium">{formatETB(r.pensionEmployee)}</span>,
            exportValue: (r) => r.pensionEmployee,
          },
          {
            key: 'otherDeductions',
            header: 'Other Ded.',
            align: 'right',
            render: (r) => (
              <input
                type="number"
                disabled={finalized}
                value={r.otherDeductions}
                onChange={(e) => handleOverride(r.employeeId, 'otherDeductions', e.target.value)}
                className="w-18 text-right px-2 py-0.5 text-xs rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:border-gray-100 dark:disabled:border-gray-800 text-gray-800 dark:text-gray-200"
              />
            ),
            exportValue: (r) => r.otherDeductions,
          },
          {
            key: 'loanDeductions',
            header: 'Loan Ded.',
            align: 'right',
            render: (r) => (
              <input
                type="number"
                disabled={finalized}
                value={r.loanDeductions}
                onChange={(e) => handleOverride(r.employeeId, 'loanDeductions', e.target.value)}
                className="w-18 text-right px-2 py-0.5 text-xs rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:border-gray-100 dark:disabled:border-gray-800 text-gray-800 dark:text-gray-200"
              />
            ),
            exportValue: (r) => r.loanDeductions,
          },
          {
            key: 'netSalary',
            header: 'Net Salary',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                {formatETB(r.netSalary)}
              </span>
            ),
            exportValue: (r) => r.netSalary,
          },
        ]}
      />

    </div>
  )
}

export default Payroll