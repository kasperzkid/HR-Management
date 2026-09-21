import { useMemo, useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { authHeaders } from '../../../lib/hrApi'
import {
  API_BASE,
  calculateTieredOvertimePay,
  calculatePreview,
  formatCurrency,
  getCurrentMonth,
  getEmployeeId,
  getEmployeeName,
  normalizePayroll,
} from './payrollMath'

export function SectionTitle({ children }) {
  return (
    <div className="mb-3 border-b border-slate-200 dark:border-[#262b31] pb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </div>
  )
}

export function Field({ label, value, onChange, type = 'text', min, step }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#33383f] bg-white dark:bg-[#1c2026] px-3 text-xs font-medium text-slate-900 dark:text-gray-100 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-500/30"
      />
    </label>
  )
}

export function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-5 shadow-2xs">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-100">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <div className="rounded-xl bg-slate-100 dark:bg-[#1c2026] p-3 text-slate-700 dark:text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function PayrollModal({ employee, payroll, month, attendanceSummary, onClose, onSaved }) {
  const [form, setForm] = useState({
    payrollMonth: payroll?.payrollMonth || month || getCurrentMonth(),
    // Overtime is always calculated from Attendance for the selected month.
    overtimePay: calculateTieredOvertimePay(employee?.basicSalary, attendanceSummary),
    loanDeduction: payroll?.loanDeduction ?? 0,
    otherDeduction: payroll?.otherDeduction ?? 0,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const preview = useMemo(() => calculatePreview(employee, form), [employee, form])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!employee) {
      setError('Employee information is missing.')
      return
    }

    if (!form.payrollMonth) {
      setError('Payroll month is required.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload = {
        employeeId: getEmployeeId(employee),
        payrollMonth: form.payrollMonth,
        overtimePay: calculateTieredOvertimePay(employee?.basicSalary, attendanceSummary),
        loanDeduction: Number(form.loanDeduction || 0),
        otherDeduction: Number(form.otherDeduction || 0),
      }

      const isEditing = Boolean(payroll?.id)

      const response = await fetch(
        isEditing ? `${API_BASE}/payroll/${payroll.id}` : `${API_BASE}/payroll`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Unable to save payroll record.')
      }

      onSaved(normalizePayroll(data))
    } catch (err) {
      console.error('Save payroll error:', err)
      setError(err.message || 'Unable to save payroll record.')
    } finally {
      setSaving(false)
    }
  }

  const summaryCells = [
    { label: 'Working Days', value: attendanceSummary?.workingDays ?? 0, tone: 'text-slate-950 dark:text-slate-100' },
    {
      label: 'Present / Leave',
      value: `${attendanceSummary?.presentDays ?? 0} / ${attendanceSummary?.leaveDays ?? 0}`,
      tone: 'text-slate-950 dark:text-slate-100',
    },
    { label: 'Overtime Hours', value: `${Number(attendanceSummary?.overtimeHours || 0).toFixed(2)} hrs`, tone: 'text-slate-950 dark:text-slate-100' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/70 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white dark:bg-[#15181d] shadow-2xl border border-slate-200 dark:border-[#262b31]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {payroll ? 'Edit Payroll' : 'Generate Payroll'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {getEmployeeName(employee)} · {employee?.department || '-'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <SectionTitle>Payroll Period</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Payroll Month" type="month" value={form.payrollMonth} onChange={(v) => updateField('payrollMonth', v)} />
              {summaryCells.map((cell) => (
                <div key={cell.label} className="rounded-xl border border-slate-200 dark:border-[#262b31] bg-slate-50 dark:bg-[#1c2026] p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {cell.label}
                  </div>
                  <div className={`mt-1 text-base font-semibold ${cell.tone}`}>{cell.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>Additional Payroll Inputs</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 dark:border-[#262b31] bg-slate-50 dark:bg-[#1c2026] p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Overtime Pay (Auto)
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-100">
                  {formatCurrency(calculateTieredOvertimePay(employee?.basicSalary, attendanceSummary))}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Tiered OT: 1.25× daytime · 1.5× night / rest day · 2× public holiday (Art. 68).
                </div>
              </div>
              <Field label="Loan / Advance Deduction" type="number" min="0" step="0.01" value={form.loanDeduction} onChange={(v) => updateField('loanDeduction', v)} />
              <Field label="Other Deduction" type="number" min="0" step="0.01" value={form.otherDeduction} onChange={(v) => updateField('otherDeduction', v)} />
            </div>
          </div>

          <div>
            <SectionTitle>Salary Calculation</SectionTitle>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Basic Salary</div>
                <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(preview.basicSalary)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Allowances</div>
                <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(preview.transportAllowance + preview.housingAllowance + preview.mealAllowance + preview.otherAllowance)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Gross Salary</div>
                <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(preview.grossSalary)}</div>
              </div>
              <div className="rounded-xl bg-slate-900 dark:bg-[#282f37] p-4 text-white">
                <div className="text-[10px] uppercase tracking-wide text-slate-300">Net Salary</div>
                <div className="mt-1 font-bold">{formatCurrency(preview.netSalary)}</div>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Deductions</SectionTitle>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 dark:border-[#262b31] p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Pension 7%</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(preview.pensionDeduction)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#262b31] p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Income Tax</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(preview.incomeTax)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#262b31] p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Loan / Advance</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(preview.loanDeduction)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#262b31] p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Other</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(preview.otherDeduction)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-[#262b31] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] px-3.5 text-xs font-semibold text-slate-700 dark:text-gray-300 shadow-2xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : payroll ? 'Save Changes' : 'Generate Payroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
