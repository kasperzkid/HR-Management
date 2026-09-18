import { useState, useMemo } from 'react'
import { BadgeInfo, Building2, CheckCircle2, CreditCard, Download, FileText, Hash, Landmark, Printer, RotateCcw, Save, ShieldCheck, Wallet, X } from 'lucide-react'
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
  const [statement, setStatement] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const payrollRow = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    return calcPayroll(EMPLOYEE, attTotals[EMPLOYEE.employeeId] || { totalOtHours: 0 })
  }, [])

  const transfers = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const factor = 1 - i * 0.012 + (i === 2 ? 0.06 : 0)
      months.push({
        period: d.toLocaleString('en-ET', { month: 'short', year: 'numeric' }),
        net: roundMoney(payrollRow.netSalary * factor),
        paidOn: d.toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: i === 0 ? 'Pending' : 'Paid',
      })
    }
    return months
  }, [payrollRow])

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

  const referenceFor = (t) =>
    `${String(t.paidOn).replace(/\s/g, '').replace(/[^0-9]/g, '')}-${String(payment.bankAccount).slice(-4)}`

  // Rebuild the month's payroll breakdown consistent with the transferred net
  // (historical transfers scale the current run by a seasonal factor).
  const statementFor = (t) => {
    const factor = payrollRow.netSalary ? t.net / payrollRow.netSalary : 1
    const basic = roundMoney(payrollRow.basicSalary * factor)
    const allowances = roundMoney(
      (payrollRow.transportAllowance + payrollRow.housingAllowance + payrollRow.mealAllowance + payrollRow.otherAllowance) * factor
    )
    const otPay = roundMoney(payrollRow.otPay * factor)
    const gross = roundMoney(payrollRow.gross * factor)
    const incomeTax = roundMoney(payrollRow.incomeTax * factor)
    const pension = roundMoney(payrollRow.pensionEmployee * factor)
    const otherDed = roundMoney(gross - t.net - incomeTax - pension)
    return { ...t, bankName: payment.bankName, basic, allowances, otPay, gross, incomeTax, pension, otherDed }
  }

  const buildStatementHtml = (s, autoPrint = false) => {
    const c = SETTINGS.company
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Salary Statement — ${esc(s.period)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; max-width: 720px; margin: 0 auto; }
      .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
      h2 { margin: 0; font-size: 18px; color: #0f172a; }
      p { margin: 2px 0; font-size: 12px; color: #64748b; }
      .doc-title { text-align: right; }
      .doc-title h3 { margin: 0; font-size: 15px; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
      th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; background: #f8fafc; }
      td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
      td.val { text-align: right; font-variant-numeric: tabular-nums; }
      tr.total td { font-weight: bold; border-bottom: none; background: #f8fafc; }
      .net { margin-top: 16px; padding: 12px 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #065f46; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-top: 16px; font-size: 12px; }
      .meta div { display: flex; justify-content: space-between; gap: 8px; }
      .meta span:first-child { color: #64748b; }
      .meta span:last-child { font-weight: 600; color: #0f172a; }
      .footer { margin-top: 28px; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style>
  </head>
  <body>
    <div class="head">
      <div>
        <h2>${esc(c.name)}</h2>
        <p>${esc(c.address)}</p>
        <p>${esc(c.phone)} · ${esc(c.email)} · TIN ${esc(c.tin)}</p>
      </div>
      <div class="doc-title">
        <h3>Salary Statement</h3>
        <p>Period: ${esc(s.period)}</p>
        <p>Ref: ${esc(referenceFor(s))}</p>
      </div>
    </div>

    <div class="meta">
      <div><span>Employee</span><span>${esc(EMPLOYEE.name)}</span></div>
      <div><span>Employee ID</span><span>${esc(EMPLOYEE.employeeId)}</span></div>
      <div><span>Department</span><span>${esc(EMPLOYEE.department)}</span></div>
      <div><span>Job Title</span><span>${esc(EMPLOYEE.jobTitle)}</span></div>
      <div><span>Bank</span><span>${esc(s.bankName)}</span></div>
      <div><span>Account</span><span>${esc(masked)}</span></div>
      <div><span>Paid On</span><span>${esc(s.paidOn)}</span></div>
      <div><span>Status</span><span>${esc(s.status)}</span></div>
    </div>

    <table>
      <thead><tr><th>Earnings</th><th style="text-align:right">Amount (ETB)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td class="val">${formatETB(s.basic)}</td></tr>
        <tr><td>Allowances (transport, housing, meal &amp; other)</td><td class="val">${formatETB(s.allowances)}</td></tr>
        <tr><td>Overtime (${payrollRow.otHours} h @ ${formatETB(payrollRow.otRate)}/h)</td><td class="val">${formatETB(s.otPay)}</td></tr>
        <tr class="total"><td>Gross Earnings</td><td class="val">${formatETB(s.gross)}</td></tr>
      </tbody>
    </table>

    <table>
      <thead><tr><th>Deductions</th><th style="text-align:right">Amount (ETB)</th></tr></thead>
      <tbody>
        <tr><td>Income Tax (PAYE)</td><td class="val">${formatETB(s.incomeTax)}</td></tr>
        <tr><td>Employee Pension (${SETTINGS.pension.employeeRate * 100}%)</td><td class="val">${formatETB(s.pension)}</td></tr>
        <tr><td>Other Deductions (incl. loans)</td><td class="val">${formatETB(s.otherDed)}</td></tr>
        <tr class="total"><td>Total Deductions</td><td class="val">${formatETB(roundMoney(s.gross - s.net))}</td></tr>
      </tbody>
    </table>

    <div class="net"><span>Net Salary Transferred</span><span>${formatETB(s.net)}</span></div>

    <div class="footer">
      System-generated salary statement from ${esc(c.name)} HRMS on ${new Date().toLocaleString('en-ET')}. For any discrepancy, contact payroll at ${esc(c.email)}.
    </div>
    ${autoPrint ? '<script>window.onload = function() { window.print(); window.close(); }</script>' : ''}
  </body>
</html>`
  }

  const printStatement = (s) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(buildStatementHtml(s, true))
    printWindow.document.close()
  }

  const downloadReceipt = (s) => {
    const blob = new Blob([buildStatementHtml(s)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Salary_Receipt_${EMPLOYEE.employeeId}_${String(s.period).replace(/\s+/g, '_')}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Receipt downloaded for ${s.period}`)
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
                {referenceFor(t)}
              </span>
            ),
            exportValue: referenceFor,
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
            icon: FileText,
            onClick: (t) => setStatement(statementFor(t)),
          },
          {
            label: 'Download Receipt',
            icon: Download,
            tone: 'success',
            onClick: (t) => downloadReceipt(statementFor(t)),
          },
        ]}
      />

      {/* Salary statement modal */}
      {statement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setStatement(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-[#262b31]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] flex items-center justify-center shrink-0">
                  <FileText size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Salary Statement · {statement.period}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Ref {referenceFor(statement)}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        statement.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-[#1c2026] dark:text-gray-400 dark:border-[#33383f]'
                      }`}
                    >
                      {statement.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatement(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2026] cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs border-b border-slate-100 dark:border-[#262b31]">
              <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400">Employee</span><span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{EMPLOYEE.name}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400">Employee ID</span><span className="font-semibold text-gray-900 dark:text-gray-100">{EMPLOYEE.employeeId}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400">Department</span><span className="font-semibold text-gray-900 dark:text-gray-100">{EMPLOYEE.department}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400">Paid On</span><span className="font-semibold text-gray-900 dark:text-gray-100">{statement.paidOn}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400">Bank</span><span className="font-semibold text-gray-900 dark:text-gray-100">{statement.bankName}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400">Account</span><span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{masked}</span></div>
            </div>

            <div className="px-5 py-4 space-y-2 border-b border-slate-100 dark:border-[#262b31]">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Earnings</p>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">Basic Salary</span><span className="tabular-nums text-gray-900 dark:text-gray-100">{formatETB(statement.basic)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">Allowances</span><span className="tabular-nums text-gray-900 dark:text-gray-100">{formatETB(statement.allowances)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">Overtime ({payrollRow.otHours}h × {formatETB(payrollRow.otRate)}/h)</span><span className="tabular-nums text-gray-900 dark:text-gray-100">{formatETB(statement.otPay)}</span></div>
              <div className="flex justify-between text-xs pt-2 border-t border-slate-100 dark:border-[#262b31]"><span className="font-semibold text-gray-700 dark:text-gray-300">Gross Earnings</span><span className="tabular-nums font-bold text-gray-950 dark:text-gray-100">{formatETB(statement.gross)}</span></div>
            </div>

            <div className="px-5 py-4 space-y-2 border-b border-slate-100 dark:border-[#262b31]">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Deductions</p>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">Income Tax (PAYE)</span><span className="tabular-nums text-gray-900 dark:text-gray-100">{formatETB(statement.incomeTax)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">Employee Pension ({SETTINGS.pension.employeeRate * 100}%)</span><span className="tabular-nums text-gray-900 dark:text-gray-100">{formatETB(statement.pension)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">Other Deductions (incl. loans)</span><span className="tabular-nums text-gray-900 dark:text-gray-100">{formatETB(statement.otherDed)}</span></div>
              <div className="flex justify-between text-xs pt-2 border-t border-slate-100 dark:border-[#262b31]"><span className="font-semibold text-gray-700 dark:text-gray-300">Total Deductions</span><span className="tabular-nums font-bold text-gray-950 dark:text-gray-100">{formatETB(roundMoney(statement.gross - statement.net))}</span></div>
            </div>

            <div className="px-5 py-4 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Net Salary Transferred</span>
              <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{formatETB(statement.net)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 p-5">
              <button
                type="button"
                onClick={() => setStatement(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#262b31] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => printStatement(statement)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#262b31] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer size={14} /> Print / PDF
              </button>
              <button
                type="button"
                onClick={() => downloadReceipt(statement)}
                className="px-5 py-2 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} /> Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentInfo