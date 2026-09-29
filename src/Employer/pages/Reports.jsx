import { useState } from 'react'
import {
  FileBarChart2,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Wallet,
} from 'lucide-react'
import LuxuryDateRangePicker from '../components/LuxuryDateRangePicker'
import { useReportData } from './reports/useReportData'
import { REPORT_TABS } from './reports/reportsConfig'
import { exportXlsx, exportPdf } from './reports/exporters'
import { PayrollTab, AttendanceTab, LeaveTab, PaymentTaxTab } from './reports/reportTabs'

// Tab icons live here since the config module must stay icon-agnostic
// for tree-shaking; mapping keeps REPORT_TABS serializable there.
const TAB_ICONS = {
  payroll: BarChart3,
  attendance: CalendarCheck,
  leave: CalendarDays,
  paymentTax: Wallet,
}

export default function Reports() {
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })
  const [activeReportTab, setActiveReportTab] = useState('payroll') // payroll, attendance, leave, paymentTax
  const [chartMetric, setChartMetric] = useState('net') // net, gross, tax, pension, otHours
  const [exportOpen, setExportOpen] = useState(false)

  const data = useReportData(dateRange)
  const { history, totalGrossSum, attendanceRows, leaveRows, paymentTaxRows } = data

  // ── Export helpers (current tab → XLSX / PDF) ──
  const exportState = (() => {
    if (activeReportTab === 'attendance') {
      return {
        filename: 'Attendance_Report',
        sheet: 'Attendance Register',
        headers: ['Date', 'Employee ID', 'Employee', 'Department', 'Check In', 'Check Out', 'Regular Hrs', 'OT Hrs', 'Status'],
        rows: attendanceRows.map((a) => [
          a.date, a.employeeId, a.employeeName, a.department, a.checkIn || '', a.checkOut || '',
          a.regular ?? 0, a.overtime || 0, a.status,
        ]),
      }
    }
    if (activeReportTab === 'leave') {
      return {
        filename: 'Leave_Report',
        sheet: 'Leave Register',
        headers: ['Employee ID', 'Employee', 'Department', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Remarks'],
        rows: leaveRows.map((l) => [
          l.employeeId, l.employeeName, l.department, l.leaveType, l.startDate, l.endDate,
          l.days, l.approvalStatus, l.remarks || '',
        ]),
      }
    }
    if (activeReportTab === 'paymentTax') {
      return {
        filename: 'Payroll_Tax_Register',
        sheet: 'Payroll & Tax',
        headers: ['Employee ID', 'Employee', 'Department', 'Type', 'Gross Pay', 'PAYE Tax', 'Pension 7%', "Pension 11% (Empl'r)", 'Net Transfer'],
        rows: paymentTaxRows.map((r) => [
          r.employeeId, r.name, r.department, r.employmentType, r.gross, r.incomeTax,
          r.pensionEmployee, r.pensionEmployer, r.netSalary,
        ]),
      }
    }
    return {
      filename: `Payroll_Run_History_${history.length}M`,
      sheet: 'Run History',
      headers: ['Period', 'Headcount', 'Gross Pay', 'Income Tax', 'Pension (18%)', 'Net Disbursement', 'Status'],
      rows: history.map((h) => [h.period, h.headcount, h.gross, h.tax, h.pension, h.net, h.status]),
    }
  })()

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & GLOBAL CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] flex items-center justify-center shadow-xs">
            <FileBarChart2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">
              Statutory &amp; Financial Reports
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Historical payroll trends, tax/pension remittances, workforce utilization &amp; department allocations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date range selector */}
          <LuxuryDateRangePicker
            value={dateRange}
            onChange={setDateRange}
            variant="filter"
            placeholder="Select date range"
          />

          {/* Export dropdown: XLSX / PDF */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="px-3.5 py-1.5 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-52 p-1.5 rounded-xl z-40 bg-white dark:bg-[#1c2026] shadow-xl border border-gray-200 dark:border-[#262b31] ring-1 ring-black/5">
                  <button
                    type="button"
                    onClick={() => { setExportOpen(false); exportXlsx(exportState) }}
                    className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold cursor-pointer transition-colors text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-gray-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Excel (.xlsx)
                      <span className="block text-[10px] font-normal text-gray-400 dark:text-gray-500">Formatted multi-column ledger</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportOpen(false); exportPdf(exportState) }}
                    className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold cursor-pointer transition-colors text-gray-700 hover:bg-rose-50 hover:text-rose-800 dark:text-gray-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  >
                    <FileText size={15} className="text-rose-500 dark:text-rose-400 shrink-0" />
                    <span>
                      PDF / Print
                      <span className="block text-[10px] font-normal text-gray-400 dark:text-gray-500">Formal report folio</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. REPORT SECTION TABS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 dark:bg-[#1c2026] rounded-2xl p-1.5 border border-gray-200 dark:border-[#262b31] w-max max-w-full">
        {REPORT_TABS.map((t) => {
          const Icon = TAB_ICONS[t.id]
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveReportTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                activeReportTab === t.id
                  ? 'bg-white dark:bg-[#252a32] text-emerald-600 dark:text-emerald-400 font-black shadow-lg'
                  : 'text-gray-500 dark:text-gray-400 font-bold hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-[#252a32]/60'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════
          TAB PANELS
         ═════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'payroll' && (
        <PayrollTab
          data={data}
          chartMetric={chartMetric}
          setChartMetric={setChartMetric}
          totalGrossSum={totalGrossSum}
        />
      )}

      {activeReportTab === 'attendance' && <AttendanceTab data={data} />}

      {activeReportTab === 'leave' && <LeaveTab data={data} />}

      {activeReportTab === 'paymentTax' && <PaymentTaxTab data={data} />}
    </div>
  )
}
