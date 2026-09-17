import { useState, useMemo } from 'react'
import { BadgeInfo, Building2, CheckCircle2, CreditCard, Hash, Landmark, Save, RotateCcw, ShieldCheck, Wallet } from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'
import LuxuryDataTable from '../components/LuxuryDataTable'
import { getCurrentEmployee } from '../lib/currentUser'

const STORAGE_KEY = 'yanol-payment-info'
const EMPLOYEE = getCurrentEmployee()

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
      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-[#33383f] rounded-xl bg-white dark:bg-[#15181d] focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 dark:text-gray-200 transition-colors"
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
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 flex items-center justify-center shadow-xs">
          <Wallet size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">Payment Information</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Bank, tax & pension details used when payroll is disbursed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contractor / account holder summary */}
        <div className="lg:col-span-1 bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-sm font-bold flex items-center justify-center">
              {EMPLOYEE.name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-950 dark:text-gray-100 truncate">{EMPLOYEE.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{EMPLOYEE.employeeId} · {EMPLOYEE.jobTitle}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><BadgeInfo size={13} /> Department</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{EMPLOYEE.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><CheckCircle2 size={13} /> Status</span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Landmark size={13} /> Bank</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{payment.bankName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><CreditCard size={13} /> Account</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{masked}</span>
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
        <div className="lg:col-span-2 bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6">
          <div className="flex items-center gap-2 mb-4">
            <Hash size={16} className="text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Bank, Tax & Pension Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Account Holder</label>
              <input
                value={EMPLOYEE.name}
                disabled
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-[#33383f] rounded-xl bg-gray-50 dark:bg-[#1c2026] text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
            </div>
            <Field label="Bank Name" value={payment.bankName} onChange={(v) => set('bankName', v)} />
            <Field label="Account Number" value={payment.bankAccount} onChange={(v) => set('bankAccount', v)} />
            <Field label="TIN (Tax ID)" value={payment.tin} onChange={(v) => set('tin', v)} />
            <Field label="Pension ID" value={payment.pensionId} onChange={(v) => set('pensionId', v)} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-[#262b31] pt-5">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <Building2 size={13} />
              Pays via {SETTINGS.company.name}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#262b31] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onClick={save}
                className="px-5 py-2 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
              >
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transfers (Qirb-Alga Luxury Table) */}
      <LuxuryDataTable
        title="Recent Salary Transfers"
        subtitle={`Last 6 months bank transfers · ${payment.bankName}`}
        countBadge={`${transfers.length} transfers`}
        data={transfers}
        searchable={true}
        searchPlaceholder="Search transfers..."
        searchKeys={['period', 'paidOn', 'status']}
        exportable={true}
        exportFilename={`Salary_Transfers_${payment.bankName.replace(/\s+/g, '_')}`}
        columns={[
          {
            key: 'period',
            header: 'Period',
            sortable: true,
            render: (t) => <span className="font-semibold text-gray-900 dark:text-gray-100">{t.period}</span>,
          },
          {
            key: 'net',
            header: 'Net Amount',
            sortable: true,
            align: 'right',
            render: (t) => (
              <span className="tabular-nums font-bold text-gray-950 dark:text-gray-100">
                {formatETB(t.net)}
              </span>
            ),
            exportValue: (t) => t.net,
          },
          {
            key: 'paidOn',
            header: 'Paid On',
            sortable: true,
            render: (t) => <span className="text-gray-600 dark:text-gray-400">{t.paidOn}</span>,
          },
          {
            key: 'reference',
            header: 'Bank Reference',
            render: (t) => (
              <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                {t.paidOn.replace(/\s/g, '').replace(/[^0-9]/g, '')} · {payment.bankAccount.slice(-4)}
              </span>
            ),
            exportValue: (t) => `${t.paidOn.replace(/\s/g, '').replace(/[^0-9]/g, '')}-${payment.bankAccount.slice(-4)}`,
          },
          {
            key: 'status',
            header: 'Status',
            align: 'center',
            sortable: true,
            render: (t) => (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                  t.status === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-[#1c2026] dark:text-gray-400 dark:border-[#33383f]'
                }`}
              >
                {t.status}
              </span>
            ),
          },
        ]}
        dropdownActions={[
          {
            label: 'View Statement',
            onClick: (t) => showToast(`Statement viewed for ${t.period}`),
          },
          {
            label: 'Download Receipt',
            onClick: (t) => showToast(`Receipt downloaded for ${t.period}`),
          },
        ]}
      />
    </div>
  )
}

export default PaymentInfo