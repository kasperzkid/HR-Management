import { useMemo, useState } from 'react'
import {
  Printer,
  Download,
  FileText,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useEmployees } from '../../Employer/hooks/useEmployees'
import LuxuryDataTable from '../components/LuxuryDataTable'
import PaymentSlip from '../../components/PaymentSlip'

const PENSION_RATE = 0.07

// Departments computed from loaded employees inside the component

function getEmployeeName(employee) {
  if (employee.name) return employee.name
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ')
}

function getEmployeeId(employee, index) {
  return employee.employeeId || employee.id || `EMP-${String(index + 1).padStart(3, '0')}`
}

function getSalary(employee) {
  const salary = Number(employee.basicSalary ?? employee.salary ?? 0)
  return Number.isFinite(salary) ? salary : 0
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(month) {
  if (!month) return ''
  const date = new Date(`${month}-01T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function calculatePayroll(employee) {
  const basicSalary = getSalary(employee)
  const transportAllowance = Number(employee.transportAllowance || 0)
  const housingAllowance = Number(employee.housingAllowance || 0)
  const mealAllowance = Number(employee.mealAllowance || 0)
  const otherAllowance = Number(employee.otherAllowance || 0)
  const overtime = Number(employee.overtime || 0)

  const gross =
    basicSalary + transportAllowance + housingAllowance + mealAllowance + otherAllowance + overtime

  const pension = Number((basicSalary * PENSION_RATE).toFixed(2))
  const incomeTax = Number(employee.incomeTax || 0)
  const loanAdvance = Number(employee.loanAdvance || 0)
  const otherDeduction = Number(employee.otherDeduction || 0)

  const totalDeductions = pension + incomeTax + loanAdvance + otherDeduction
  const netSalary = gross - totalDeductions

  return {
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    overtime,
    gross,
    pension,
    incomeTax,
    loanAdvance,
    otherDeduction,
    totalDeductions,
    netSalary,
  }
}

function buildPayslip(employee, index) {
  return {
    employeeKey: employee.id || employee.employeeId || index,
    employeeId: getEmployeeId(employee, index),
    employeeName: getEmployeeName(employee),
    department: employee.department || 'Unassigned',
    jobTitle: employee.jobTitle || 'Employee',
    employmentStatus: employee.employmentStatus || employee.status || 'Active',
    tin: employee.tin || '',
    bankAccount: employee.bankAccount || '',
    ...calculatePayroll(employee),
  }
}

function SlipPreviewModal({ payslip, month, onClose, onPrev, onNext, hasPrev, hasNext }) {
  if (!payslip) return null

  const period = formatMonth(month)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/70 p-4 backdrop-blur-xs print:static print:block print:bg-white print:p-0 animate-in fade-in duration-200">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white dark:bg-[#15181d] shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        {/* Modal header (hidden in print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 dark:border-[#262b31] px-6 py-4 bg-slate-50/80 dark:bg-[#1c2026]">
          <div className="flex items-center gap-3">
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
                {payslip.employeeName} · {period}
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
              employeeId: payslip.employeeId,
              name: payslip.employeeName,
              department: payslip.department,
              jobTitle: payslip.jobTitle,
              tin: payslip.tin,
              bankAccount: payslip.bankAccount,
            }}
            payrollPeriod={period}
            earnings={{
              basicSalary: payslip.basicSalary,
              transport: payslip.transportAllowance,
              housing: payslip.housingAllowance,
              mealOther: payslip.mealAllowance + payslip.otherAllowance,
              otPay: payslip.overtime,
              grossSalary: payslip.gross,
            }}
            deductions={{
              incomeTax: payslip.incomeTax,
              pension: payslip.pension,
              otherDeduct: payslip.otherDeduction,
              loanDeduct: payslip.loanAdvance,
              totalDeduct: payslip.totalDeductions,
              netSalary: payslip.netSalary,
            }}
          />
        </div>
      </div>
    </div>
  )
}

const cardInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export default function PaymentSlips() {
  const [payrollMonth, setPayrollMonth] = useState(getCurrentMonth)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All Departments')
  const [selectedPayslip, setSelectedPayslip] = useState(null)

  // Generate payslips from employee records (samuel-dashboard buildPayslip logic)
  const { employees } = useEmployees()
  const DEPARTMENTS = useMemo(
    () => [
      'All Departments',
      ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean))),
    ],
    [employees]
  )
  const payslips = useMemo(() => employees.map(buildPayslip), [employees])

  const filteredPayslips = useMemo(() => {
    const query = search.trim().toLowerCase()
    return payslips.filter((payslip) => {
      const matchesSearch =
        !query ||
        payslip.employeeName.toLowerCase().includes(query) ||
        payslip.employeeId.toLowerCase().includes(query) ||
        payslip.department.toLowerCase().includes(query) ||
        payslip.jobTitle.toLowerCase().includes(query)

      const matchesDepartment = department === 'All Departments' || payslip.department === department

      return matchesSearch && matchesDepartment
    })
  }, [payslips, search, department])

  const focusedIdx = selectedPayslip
    ? filteredPayslips.findIndex((p) => p.employeeId === selectedPayslip.employeeId)
    : -1

  const columns = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      sortable: true,
      className: 'font-mono font-bold',
    },
    {
      key: 'employeeName',
      header: 'Employee Name',
      sortable: true,
      className: 'font-bold',
    },
    { key: 'department', header: 'Department', sortable: true },
    { key: 'jobTitle', header: 'Job Title' },
    {
      key: 'basicSalary',
      header: 'Basic Salary',
      align: 'right',
      render: (r) => formatCurrency(r.basicSalary),
      exportValue: (r) => r.basicSalary,
    },
    {
      key: 'allowances',
      header: 'Allowances',
      align: 'right',
      render: (r) =>
        formatCurrency(
          r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance + r.overtime,
        ),
      exportValue: (r) =>
        r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance + r.overtime,
    },
    {
      key: 'gross',
      header: 'Gross Salary',
      align: 'right',
      sortable: true,
      className: 'font-bold',
      render: (r) => formatCurrency(r.gross),
      exportValue: (r) => r.gross,
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      sortable: true,
      className: 'font-semibold',
      render: (r) => <span className="text-rose-600 dark:text-rose-400">{formatCurrency(r.totalDeductions)}</span>,
      exportValue: (r) => r.totalDeductions,
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(r.netSalary)}</span>
      ),
      exportValue: (r) => r.netSalary,
    },
    {
      key: 'employmentStatus',
      header: 'Status',
      align: 'center',
      render: (r) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
          {r.employmentStatus}
        </span>
      ),
      exportValue: (r) => r.employmentStatus,
    },
  ]

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header (hidden in print) */}
      <div className="no-print flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
              Payment Slips
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
              {formatMonth(payrollMonth)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View and print employee monthly payment slips.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Payroll Period
          </p>
          <input
            type="month"
            value={payrollMonth}
            onChange={(e) => setPayrollMonth(e.target.value)}
            className="mt-0.5 bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* LuxuryDataTable with built-in search, export, pagination, list/grid toggle + horizontal scroll */}
      <div className="no-print">
        <LuxuryDataTable
          title="Payment Slips"
          subtitle="Generated payslips from the current employee salary structure · Ethiopian Tax & Pension."
          countBadge={`${filteredPayslips.length} slips`}
          data={filteredPayslips}
          columns={columns}
          searchable
          searchTerm={search}
          onSearchChange={setSearch}
          searchKeys={['employeeName', 'employeeId', 'department', 'jobTitle']}
          searchPlaceholder="Search employee, ID or department..."
          filterControls={
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#33383f] rounded-xl px-2.5 py-1 text-xs">
              <Building2 size={13} className="text-slate-500" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          }
          headerActions={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#33383f] rounded-xl px-2.5 py-1 text-xs">
                <CalendarDays size={13} className="text-slate-500" />
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                />
              </div>
              <button
                onClick={() => window.print()}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#252a32] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Print all slips (2-up)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print All (2-Up)</span>
              </button>
            </div>
          }
          exportable
          exportFilename="Payment_Slips"
          allowViewModeToggle
          renderGridCard={(payslip) => (
            <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-bold shadow-2xs dark:bg-[#282f37] dark:text-slate-100">
                    {cardInitials(payslip.employeeName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 dark:text-slate-100">{payslip.employeeName}</h3>
                    <p className="mt-0.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {payslip.employeeId}
                    </p>
                  </div>
                </div>
                <FileText size={18} className="text-slate-300 dark:text-slate-600" />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 dark:border-[#262b31] divide-y divide-slate-100 dark:divide-[#262b31] text-xs">
                <div className="flex justify-between px-3.5 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Department</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{payslip.department}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Gross Salary</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(payslip.gross)}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Deductions</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(payslip.totalDeductions)}</span>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 dark:bg-[#1c2026] p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Net Salary</p>
                <p className="mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(payslip.netSalary)}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setSelectedPayslip(payslip)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                >
                  <FileText size={14} />
                  View Slip
                </button>
                <button
                  onClick={() => setSelectedPayslip(payslip)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#33383f] px-3 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-[#1c2026] cursor-pointer"
                  title="Print / Save"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          )}
          primaryAction={{
            label: 'View Slip',
            icon: FileText,
            onClick: (payslip) => setSelectedPayslip(payslip),
          }}
          onRowClick={(payslip) => setSelectedPayslip(payslip)}
          onResetFilters={() => {
            setSearch('')
            setDepartment('All Departments')
          }}
          scrollable
          minWidth="1250px"
          paginated
          emptyMessage="No payment slips found for the selected filters."
        />
      </div>

      {/* Print-ready 2-up slips (our YANOLTECH design) */}
      <div
        className={
          selectedPayslip
            ? 'hidden'
            : 'hidden print:grid grid-cols-2 gap-4 max-w-full mx-auto'
        }
        id="printable-payment-slips"
      >
        {filteredPayslips.map((payslip) => (
          <PaymentSlip
            key={payslip.employeeKey}
            employee={{
              employeeId: payslip.employeeId,
              name: payslip.employeeName,
              department: payslip.department,
              jobTitle: payslip.jobTitle,
              tin: payslip.tin,
              bankAccount: payslip.bankAccount,
            }}
            payrollPeriod={formatMonth(payrollMonth)}
            earnings={{
              basicSalary: payslip.basicSalary,
              transport: payslip.transportAllowance,
              housing: payslip.housingAllowance,
              mealOther: payslip.mealAllowance + payslip.otherAllowance,
              otPay: payslip.overtime,
              grossSalary: payslip.gross,
            }}
            deductions={{
              incomeTax: payslip.incomeTax,
              pension: payslip.pension,
              otherDeduct: payslip.otherDeduction,
              loanDeduct: payslip.loanAdvance,
              totalDeduct: payslip.totalDeductions,
              netSalary: payslip.netSalary,
            }}
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
              Payment slips are generated from the existing employee salary information and attendance records
              (pension 7% of basic salary, income tax, loan advance and other deductions). Finalized statutory tax
              calculations, bank/payment information and PDF generation will be connected in the later phases.
            </p>
          </div>
        </div>
      </div>

      {/* Slip preview modal (our YANOLTECH design) */}
      {selectedPayslip && (
        <SlipPreviewModal
          payslip={selectedPayslip}
          month={payrollMonth}
          onClose={() => setSelectedPayslip(null)}
          onPrev={() => focusedIdx > 0 && setSelectedPayslip(filteredPayslips[focusedIdx - 1])}
          onNext={() =>
            focusedIdx < filteredPayslips.length - 1 && setSelectedPayslip(filteredPayslips[focusedIdx + 1])
          }
          hasPrev={focusedIdx > 0}
          hasNext={focusedIdx < filteredPayslips.length - 1}
        />
      )}
    </div>
  )
}