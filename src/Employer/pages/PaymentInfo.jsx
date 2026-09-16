import { useState, useMemo } from 'react'
import { BadgeInfo, Building2, CheckCircle2, CreditCard, Hash, Landmark, Save, RotateCcw, ShieldCheck, Wallet } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'

const STORAGE_KEY = 'yanol-payment-info'
const EMPLOYEE = INITIAL_EMPLOYEES.find((e) => e.employeeId === 'EMP-0001') || INITIAL_EMPLOYEES[0]

function loadPayment() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved) return { ...defaultPayment(), ...saved }
  } catch {
    // ignore corrupted storage
  }
  return defaultPayment()
}

function defaultPayment() {
  return {
    bankName: EMPLOYEE.bankName,
    bankAccount: EMPLOYEE.bankAccount,
    tin: EMPLOYEE.tin,
    pensionId: EMPLOYEE.pensionId,
  }
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 transition-colors"
      />
    </div>
  )
}

function PaymentInfo() {
  const [payment, setPayment] = useState(loadPayment)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const transfers = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    const row = calcPayroll(EMPLOYEE, attTotals[EMPLOYEE.employeeId] || { totalOtHours: 0 })
    const months = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const factor = 1 - i * 0.012 + (i === 2 ? 0.06 : 0)
      months.push({
        period: d.toLocaleString('en-ET', { month: 'short', year: 'numeric' }),
        net: roundMoney(row.netSalary * factor),
        paidOn: d.toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: i === 0 ? 'Pending' : 'Paid',
      })
    }
    return months
  }, [])

  const set = (field, value) => setPayment((prev) => ({ ...prev, [field]: value }))

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payment))
    showToast('Payment information saved')
  }

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setPayment(defaultPayment())
    showToast('Payment information reset to employee record')
  }

  const fullAccount = `${payment.bankAccount}`
  const masked = fullAccount.slice(0, 4) + ' •••• ' + fullAccount.slice(-4)

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center shadow-xs">
          <Wallet size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Payment Information</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Bank, tax & pension details used when payroll is disbursed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contractor / account holder summary */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-950 text-white text-sm font-bold flex items-center justify-center">
              {EMPLOYEE.name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-950 truncate">{EMPLOYEE.name}</p>
              <p className="text-[11px] text-gray-500">{EMPLOYEE.employeeId} · {EMPLOYEE.jobTitle}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5"><BadgeInfo size={13} /> Department</span>
              <span className="font-semibold text-gray-900">{EMPLOYEE.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5"><CheckCircle2 size={13} /> Status</span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5"><Landmark size={13} /> Bank</span>
              <span className="font-semibold text-gray-900">{payment.bankName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5"><CreditCard size={13} /> Account</span>
              <span className="font-semibold text-gray-900 tabular-nums">{masked}</span>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-2.5">
            <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-emerald-800">
              Verified for payroll transfer — updated details apply from the next pay run.
            </p>
          </div>
        </div>

        {/* Editable payment details */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6">
          <div className="flex items-center gap-2 mb-4">
            <Hash size={16} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-950">Bank, Tax & Pension Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Account Holder</label>
              <input
                value={EMPLOYEE.name}
                disabled
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
            <Field label="Bank Name" value={payment.bankName} onChange={(v) => set('bankName', v)} />
            <Field label="Account Number" value={payment.bankAccount} onChange={(v) => set('bankAccount', v)} />
            <Field label="TIN (Tax ID)" value={payment.tin} onChange={(v) => set('tin', v)} />
            <Field label="Pension ID" value={payment.pensionId} onChange={(v) => set('pensionId', v)} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Building2 size={13} />
              Pays via {SETTINGS.company.name}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onClick={save}
                className="px-5 py-2 rounded-xl bg-gray-950 text-white text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
              >
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transfers */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-950">Recent Salary Transfers</h3>
          <span className="text-[11px] text-gray-400">Last 6 months · {payment.bankName}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[520px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium text-right">Net Amount</th>
                <th className="px-4 py-3 font-medium">Paid On</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transfers.map((t) => (
                <tr key={t.period} className="text-xs">
                  <td className="px-5 py-3 font-semibold text-gray-900">{t.period}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-950">{formatETB(t.net)}</td>
                  <td className="px-4 py-3 text-gray-600">{t.paidOn}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{t.paidOn.replace(/\s/g, '').replace(/[^0-9]/g, '')} · {payment.bankAccount.slice(-4)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PaymentInfo