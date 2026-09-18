import { useState, useMemo } from 'react'
import {
  Printer,
  Search,
  LayoutGrid,
  List,
  Columns2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  Calendar,
  X,
} from 'lucide-react'
import { INITIAL_EMPLOYEES } from '../../Employer/data/employeeData'
import { ATTENDANCE, attendanceTotals } from '../../Employer/data/attendanceData'
import { calcPayroll, formatETB } from '../../Employer/lib/payroll'
import PaymentSlip from '../../components/PaymentSlip'

function SlipPreviewModal({ slip, period, onClose, onPrev, onNext, hasPrev, hasNext }) {
  if (!slip) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/70 p-4 backdrop-blur-xs print:static print:block print:bg-white print:p-0 animate-in fade-in duration-200">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white dark:bg-[#15181d] shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        {/* Modal header (hidden in print) */}
        <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 dark:border-[#262b31] px-6 py-4 bg-slate-50/80 dark:bg-[#1c2026]">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#2a3139] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous employee"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-slate-100">Payment Slip</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {slip.employee.name} · {period}
              </p>
            </div>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#2a3139] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next employee"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
            >
              <Printer size={15} />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-[#2a3139] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Our YANOLTECH slip design */}
        <div className="p-6 sm:p-8 print:p-0">
          <PaymentSlip
            employee={{
              employeeId: slip.employee.employeeId,
              name: slip.employee.name,
              department: slip.employee.department,
              jobTitle: slip.employee.jobTitle,
              tin: slip.employee.tin,
              bankAccount: slip.employee.bankAccount,
            }}
            payrollPeriod={period}
            earnings={slip.earnings}
            deductions={slip.deductions}
          />
        </div>
      </div>
    </div>
  )
}

export default function PaymentSlips() {
  const [viewType, setViewType] = useState('cards')
  const [month, setMonth] = useState(8)
  const [year, setYear] = useState(2026)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedEmpId, setSelectedEmpId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const periodLabel = `${monthNames[month - 1] || 'August'} ${year}`

  // Generate slips from employee records + attendance (samuel-style derivation)
  const slipsData = useMemo(() => {
    const attTotals = attendanceTotals(ATTENDANCE)
    return INITIAL_EMPLOYEES.map((emp) => {
      const att = attTotals[emp.employeeId] || (emp.employeeId === 'EMP-0001' ? { totalOtHours: 10.5 } : { totalOtHours: 0 })
      const row = calcPayroll(emp, att)

      const earnings = {
        basicSalary: row.basicSalary,
        transport: row.transportAllowance,
        housing: row.housingAllowance,
        mealOther: row.mealAllowance + row.otherAllowance,
        otPay: row.otPay,
        grossSalary: row.gross,
      }

      const deductions = {
        incomeTax: row.incomeTax,
        pension: row.pensionEmployee,
        otherDeduct: row.otherDeductions || 0,
        loanDeduct: row.loanDeductions || 0,
        totalDeduct: row.incomeTax + row.pensionEmployee + (row.otherDeductions || 0) + (row.loanDeductions || 0),
        netSalary: row.netSalary,
      }

      return {
        employee: {
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          jobTitle: emp.jobTitle,
          tin: emp.tin || '',
          bankAccount: emp.bankAccount || '',
        },
        earnings,
        deductions,
      }
    })
  }, [])

  const filteredSlips = useMemo(() => {
    return slipsData.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.employee.jobTitle && item.employee.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesDept = selectedDept === 'All' || item.employee.department === selectedDept
      return matchesSearch && matchesDept
    })
  }, [slipsData, searchQuery, selectedDept])

  const departments = useMemo(() => {
    return ['All', ...new Set(slipsData.map((s) => s.employee.department))]
  }, [slipsData])

  const currentFocusedSlip = useMemo(() => {
    return (
      filteredSlips.find((s) => s.employee.employeeId === selectedEmpId) ||
      filteredSlips[0] ||
      null
    )
  }, [filteredSlips, selectedEmpId])

  const focusedIdx = currentFocusedSlip
    ? filteredSlips.findIndex((s) => s.employee.employeeId === currentFocusedSlip.employee.employeeId)
    : -1

  const openPreview = (employeeId) => {
    setSelectedEmpId(employeeId)
    setPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
    setSelectedEmpId(null)
  }

  const cardInitials = (name) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* TOP CONTROLS & HEADER (HIDDEN IN PRINT) */}
      <div className="no-print space-y-4">
        {/* Title & Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#15181d] border border-slate-200 dark:border-[#262b31] p-5 rounded-2xl shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                Payment Slips
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                {periodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              YANOLTECH SOLUTIONS PLC statutory payroll slips · Ethiopian Tax & Pension Breakdown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#33383f] rounded-xl px-3 py-1.5 text-xs">
              <Calendar size={13} className="text-slate-500" />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 cursor-pointer"
            >
              <Printer size={15} />
              <span>Print All Slips (2-Up)</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & View Mode Toggles */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#15181d] border border-slate-200 dark:border-[#262b31] p-3 rounded-2xl shadow-2xs">
          {/* Search & Department Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#33383f] rounded-xl focus:outline-none focus:bg-white dark:focus:bg-[#15181d] text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#33383f] rounded-xl px-2.5 py-1 text-xs">
              <Building2 size={13} className="text-slate-500" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredSlips.length} of {slipsData.length} slips
            </span>
          </div>

          {/* View Type Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1c2026] p-1 rounded-xl shrink-0 border border-slate-200 dark:border-[#33383f]">
            <button
              onClick={() => setViewType('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'cards'
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-[#282f37] dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setViewType('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'table'
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-[#282f37] dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <List size={14} />
              <span>Summary Table</span>
            </button>

            <button
              onClick={() => setViewType('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'grid'
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-[#282f37] dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Columns2 size={14} />
              <span>2-Up Slips</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. CARDS DIRECTORY VIEW (samuel-dashboard style) */}
      {viewType === 'cards' && (
        <div className="no-print">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredSlips.map((item) => (
              <div
                key={item.employee.employeeId}
                className="bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-bold shadow-2xs dark:bg-[#282f37] dark:text-slate-100">
                      {cardInitials(item.employee.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950 dark:text-slate-100">{item.employee.name}</h3>
                      <p className="mt-0.5 text-xs font-mono text-slate-500 dark:text-slate-400">{item.employee.employeeId}</p>
                    </div>
                  </div>
                  <FileText size={18} className="text-slate-300 dark:text-slate-600" />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 dark:border-[#262b31] divide-y divide-slate-100 dark:divide-[#262b31] text-xs">
                  <div className="flex justify-between px-3.5 py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Department</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.employee.department}</span>
                  </div>
                  <div className="flex justify-between px-3.5 py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Gross Salary</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatETB(item.earnings.grossSalary)}</span>
                  </div>
                  <div className="flex justify-between px-3.5 py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Deductions</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{formatETB(item.deductions.totalDeduct)}</span>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-[#1c2026] p-3.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Net Salary</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatETB(item.deductions.netSalary)}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openPreview(item.employee.employeeId)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                  >
                    <FileText size={14} />
                    View Slip
                  </button>
                  <button
                    onClick={() => openPreview(item.employee.employeeId)}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#33383f] px-3 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-[#1c2026] cursor-pointer"
                    title="Print / Save"
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredSlips.length === 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] px-6 py-12 text-center shadow-2xs">
              <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">No payment slips found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try changing your search or department filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. SUMMARY TABLE VIEW */}
      {viewType === 'table' && (
        <div className="no-print bg-white dark:bg-[#15181d] border border-slate-200 dark:border-[#262b31] rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#262b31] flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100">
              Payroll Slips Directory — {periodLabel}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Click any row or "View Slip" to inspect full details
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-[#1c2026] text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-[#262b31] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Department & Title</th>
                  <th className="py-3 px-4 text-right">Basic Salary</th>
                  <th className="py-3 px-4 text-right">Gross Salary</th>
                  <th className="py-3 px-4 text-right">Total Deduct.</th>
                  <th className="py-3 px-4 text-right">Net Salary</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#262b31]">
                {filteredSlips.map((item) => (
                  <tr
                    key={item.employee.employeeId}
                    onClick={() => openPreview(item.employee.employeeId)}
                    className="hover:bg-indigo-50/50 dark:hover:bg-[#1c2026] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.employee.employeeId}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-950 dark:text-slate-100">
                      {item.employee.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <div>{item.employee.department}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{item.employee.jobTitle}</div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-medium text-slate-900 dark:text-slate-100">
                      {formatETB(item.earnings.basicSalary)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-slate-950 dark:text-slate-100">
                      {formatETB(item.earnings.grossSalary)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-rose-600 dark:text-rose-400 font-semibold">
                      {formatETB(item.deductions.totalDeduct)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {formatETB(item.deductions.netSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openPreview(item.employee.employeeId)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-[#33383f] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#20252b] text-[11px] font-semibold cursor-pointer"
                      >
                        <FileText size={12} />
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PRINT-READY 2-UP SLIPS (our design) */}
      <div
        className={
          previewOpen
            ? 'hidden'
            : viewType === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 max-w-full mx-auto'
            : 'hidden print:grid grid-cols-2 gap-4 max-w-full mx-auto'
        }
        id="printable-payment-slips"
      >
        {filteredSlips.map((item) => (
          <PaymentSlip
            key={item.employee.employeeId}
            employee={item.employee}
            payrollPeriod={periodLabel}
            earnings={item.earnings}
            deductions={item.deductions}
          />
        ))}
      </div>

      {/* Phase 1 info banner */}
      <div className="no-print rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/20 p-4">
        <div className="flex gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Payment Slips — Phase 1</p>
            <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
              Payment slips are generated from the current employee salary and attendance records using the YANOLTECH
              slip format. Finalized tax calculations, bank/payment information and backend payroll records will be
              connected in the later phases.
            </p>
          </div>
        </div>
      </div>

      {/* Slip preview modal (our design) */}
      {previewOpen && currentFocusedSlip && (
        <SlipPreviewModal
          slip={currentFocusedSlip}
          period={periodLabel}
          onClose={handleClosePreview}
          onPrev={() => focusedIdx > 0 && setSelectedEmpId(filteredSlips[focusedIdx - 1].employee.employeeId)}
          onNext={() => focusedIdx < filteredSlips.length - 1 && setSelectedEmpId(filteredSlips[focusedIdx + 1].employee.employeeId)}
          hasPrev={focusedIdx > 0}
          hasNext={focusedIdx < filteredSlips.length - 1}
        />
      )}
    </div>
  )
}