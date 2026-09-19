import { useState } from 'react'

import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Edit3,
  Loader2,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'

import LuxuryDataTable from '../components/LuxuryDataTable'
import PayrollModal, { StatCard } from './payroll/PayrollModal'
import { usePayrollData } from './payroll/usePayrollData'
import { getPayrollColumns } from './payroll/payrollColumns'
import {
  PAYE_BRACKETS,
  formatCurrency,
  getAttendanceSummary,
  getEmployeeId,
  moveMonthOffset,
} from './payroll/payrollMath'

export default function Payroll() {
  const data = usePayrollData()
  const {
    loading,
    attendanceLoading,
    payrollLoading,
    error,
    payrollError,
    payrollMonth,
    setPayrollMonth,
    departments,
    filteredRows,
    summary,
    generating,
    deletingId,
    modalOpen,
    selectedEmployee,
    selectedPayroll,
    openEditModal,
    closeModal,
    generateAllPayroll,
    handleDelete,
    handleSaved,
    refreshPayroll,
  } = data

  const [department, setDepartment] = useState('All Departments')

  const tableRows = filteredRows(department)
  const columns = getPayrollColumns()

  function moveMonth(offset) {
    setPayrollMonth(moveMonthOffset(payrollMonth, offset))
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
              Payroll Management
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
              {payrollMonth}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Review employee earnings, deductions, net salary and employer cost.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => moveMonth(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="month"
            value={payrollMonth}
            onChange={(e) => setPayrollMonth(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-slate-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          />

          <button
            onClick={() => moveMonth(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] cursor-pointer"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={refreshPayroll}
            disabled={loading || payrollLoading}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] px-3.5 text-xs font-semibold text-slate-700 dark:text-gray-300 shadow-2xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={15} className={payrollLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={generateAllPayroll}
            disabled={generating || payrollLoading || loading}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
            {generating ? 'Generating...' : 'Generate Payroll'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {payrollError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {payrollError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Payroll Employees" value={summary.employees} description="Saved payroll records" />
        <StatCard icon={CircleDollarSign} label="Gross Payroll" value={formatCurrency(summary.gross)} description="Total employee earnings" />
        <StatCard icon={Calculator} label="Total Deductions" value={formatCurrency(summary.deductions)} description="Pension + tax + loans" />
        <StatCard icon={CircleDollarSign} label="Net Payroll" value={formatCurrency(summary.net)} description="Total amount payable" />
        <StatCard icon={CircleDollarSign} label="Employer Cost" value={formatCurrency(summary.employerCost)} description="Gross + employer pension" />
      </div>

      {/* Payroll rules */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-5 shadow-2xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payroll Rules</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Current payroll calculations used by the HR payroll module.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full bg-slate-100 dark:bg-[#1c2026] px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300">
              Employee Pension: 7%
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-[#1c2026] px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300">
              Employer Pension: 11%
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-[#1c2026] px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300">
              Contractual / Intern: Excluded
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-[#1c2026] px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300">
              Overtime: Hours ÷ 208 × 1.5
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#262b31] text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2">Taxable Income</th>
                <th className="px-3 py-2">Rate</th>
                <th className="px-3 py-2">Subtraction</th>
              </tr>
            </thead>
            <tbody>
              {PAYE_BRACKETS.map((bracket, index) => (
                <tr key={`${bracket.min}-${index}`} className="border-b border-slate-100 dark:border-[#262b31] last:border-0">
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {bracket.max === Infinity
                      ? `${formatCurrency(bracket.min)}+`
                      : `${formatCurrency(bracket.min)} – ${formatCurrency(bracket.max)}`}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{bracket.rate * 100}%</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{formatCurrency(bracket.subtraction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payroll records table */}
      <LuxuryDataTable
        title="Payroll Records"
        subtitle={`Saved payroll records for ${payrollMonth}`}
        countBadge={tableRows.length}
        columns={columns}
        data={tableRows}
        searchable
        searchKeys={['employeeName', 'employeeId', 'department']}
        searchPlaceholder="Search by employee name, ID or department..."
        exportable
        exportFilename={`HR_Payroll_${payrollMonth}`}
        paginated
        defaultPageSize={10}
        loading={loading || payrollLoading}
        emptyMessage="No saved payroll records for this month. Click Generate Payroll to create them."
        onResetFilters={() => setDepartment('All Departments')}
        scrollable
        minWidth="1500px"
        filterControls={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Department:
              </span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-9 pl-2.5 pr-7 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                {departments.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-[#1c2026] px-3 py-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
              <span className={`h-2 w-2 rounded-full ${payrollLoading ? 'bg-amber-400' : 'bg-emerald-500'}`} />
              {payrollLoading ? 'Loading database...' : 'Database connected'}
            </span>
          </div>
        }
        headerActions={
          attendanceLoading ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Loader2 size={13} className="animate-spin" />
              Loading attendance...
            </span>
          ) : null
        }
        primaryAction={{
          label: 'Edit Payroll',
          icon: Edit3,
          onClick: (record) => openEditModal(record),
        }}
        dropdownActions={[
          {
            label: 'Delete Payroll',
            icon: Trash2,
            destructive: true,
            hidden: (record) => deletingId === record.id,
            onClick: (record) => handleDelete(record),
          },
        ]}
      />

      {modalOpen && selectedEmployee && (
        <PayrollModal
          employee={selectedEmployee}
          payroll={selectedPayroll}
          month={payrollMonth}
          attendanceSummary={
            selectedEmployee
              ? getAttendanceSummary(data.attendanceByEmployee.get(String(getEmployeeId(selectedEmployee))) || [])
              : {}
          }
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
