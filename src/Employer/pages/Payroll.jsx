import { useState, useMemo } from 'react'
import { Play, CheckCircle2, RefreshCw, Calculator, AlertTriangle } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { calcPayroll, formatETB, roundMoney, netToBasic } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'

function Payroll() {
  const rawUser = localStorage.getItem('user')
  const user = rawUser ? JSON.parse(rawUser) : { role: 'EMPLOYEE', employeeId: 'EMP-0001' }
  const currentEmployeeId = user.employeeId

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [finalized, setFinalized] = useState(false)
  const [overrides, setOverrides] = useState({})
  const [reverseInput, setReverseInput] = useState('')
  const [reverseResult, setReverseResult] = useState(null)

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

  const handleReverse = () => {
    const net = Number(reverseInput)
    if (!net || net <= 0) return
    setReverseResult({
      net,
      basic: netToBasic(net),
      hourly: roundMoney(netToBasic(net) / SETTINGS.standardMonthlyHours),
    })
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Payroll Run</h1>
          <p className="text-xs text-gray-500 mt-1">
            Tax brackets per Proclamation No. 1395/2025 · Pension {SETTINGS.pension.employeeRate * 100}% / {SETTINGS.pension.employerRate * 100}% · OT {SETTINGS.overtimeMultiplier}x · {SETTINGS.standardMonthlyHours}h std
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800"
          >
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {!finalized ? (
            <button
              onClick={() => setFinalized(true)}
              className="px-4 py-2 rounded-lg bg-gray-950 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
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
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
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
          { label: 'Gross Payroll', value: totals.gross, color: 'text-gray-950' },
          { label: 'Income Tax', value: totals.tax, color: 'text-sky-600' },
          { label: 'Emp Pension', value: totals.pensionEmp, color: 'text-teal-600' },
          { label: 'Empr Pension', value: totals.pensionEmpR, color: 'text-violet-600' },
          { label: 'Net Payroll', value: totals.net, color: 'text-emerald-600' },
        ].map((t) => (
          <div key={t.label} className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs">
            <p className="text-xs text-gray-500">{t.label}</p>
            <p className={`text-lg font-bold mt-1 ${t.color}`}>{formatETB(t.value)}</p>
          </div>
        ))}
      </div>

      {/* Payroll table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calculator size={15} className="text-gray-500" />
          <h3 className="text-sm font-bold text-gray-950">Computed Payroll — {month}/{year}</h3>
          <span className="text-[10px] font-medium text-gray-400 ml-1">Gold fields below are editable (Other & Loan deductions)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium text-right">Basic</th>
                <th className="px-3 py-3 font-medium text-right">Allow.</th>
                <th className="px-3 py-3 font-medium text-right">OT Hrs</th>
                <th className="px-3 py-3 font-medium text-right">OT Pay</th>
                <th className="px-3 py-3 font-medium text-right">Gross</th>
                <th className="px-3 py-3 font-medium text-right">Tax</th>
                <th className="px-3 py-3 font-medium text-right">Pension</th>
                <th className="px-3 py-3 font-medium text-right">Other</th>
                <th className="px-3 py-3 font-medium text-right">Loan</th>
                <th className="px-3 py-3 font-medium text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {rows.map((r) => (
                <tr key={r.employeeId} className={r.active ? '' : 'bg-gray-50/50 text-gray-400'}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <p className="text-[11px] text-gray-400">{r.employeeId} · {r.department}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      r.exempt ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {r.employmentType} {r.exempt && '· exempt'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatETB(r.basicSalary)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatETB(r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.otHours}h</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatETB(r.otPay)}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">{formatETB(r.gross)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-sky-600">{formatETB(r.incomeTax)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-teal-600">{formatETB(r.pensionEmployee)}</td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      disabled={finalized}
                      value={r.otherDeductions}
                      onChange={(e) => handleOverride(r.employeeId, 'otherDeductions', e.target.value)}
                      className="w-20 text-right px-2 py-1 text-xs rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:bg-gray-50 disabled:border-gray-100"
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      disabled={finalized}
                      value={r.loanDeductions}
                      onChange={(e) => handleOverride(r.employeeId, 'loanDeductions', e.target.value)}
                      className="w-20 text-right px-2 py-1 text-xs rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:bg-gray-50 disabled:border-gray-100"
                    />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-600">{formatETB(r.netSalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reverse calculator */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={15} className="text-gray-500" />
          <h3 className="text-sm font-bold text-gray-950">Net-to-Basic Reverse Calculator</h3>
          <span className="text-[11px] text-gray-400 ml-1">Given desired net salary → required basic (Permanent, no allowances/OT)</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full max-w-xs">
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Desired Net Salary (ETB)</label>
            <input
              type="number"
              value={reverseInput}
              onChange={(e) => setReverseInput(e.target.value)}
              placeholder="e.g. 30000"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <button onClick={handleReverse} className="px-4 py-2 rounded-lg bg-gray-950 text-white text-xs font-semibold hover:bg-gray-800 transition-colors">
            Calculate
          </button>
          {reverseResult && (
            <div className="flex gap-4 text-xs">
              <div>
                <p className="text-gray-500">Required Basic</p>
                <p className="font-bold text-gray-950 text-sm">{formatETB(reverseResult.basic)}</p>
              </div>
              <div>
                <p className="text-gray-500">Hourly Rate ({SETTINGS.standardMonthlyHours}h)</p>
                <p className="font-bold text-gray-950 text-sm">{formatETB(reverseResult.hourly)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business rule note */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <p>
          Business rules applied: only <strong>Active</strong> employees count in totals · <strong>Contractual / Intern</strong> are
          force-exempt from tax &amp; pension · allowances are 100% taxable · pension on basic only · overtime uses a flat{' '}
          {SETTINGS.overtimeMultiplier}x multiplier (law defines 1.25x / 1.5x / 2.0x tiers). Verify brackets against the Negarit Gazeta
          before statutory filing.
        </p>
      </div>
    </div>
  )
}

export default Payroll