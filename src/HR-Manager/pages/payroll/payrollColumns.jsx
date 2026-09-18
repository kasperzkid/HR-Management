import { Clock3 } from 'lucide-react'
import { formatCurrency, getInitials } from './payrollMath'

// Column definitions for the payroll records table (LuxuryDataTable).
export function getPayrollColumns() {
  return [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (record) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-[#1c2026] dark:text-gray-300">
            {getInitials(record.employeeName || record.employee?.name || '')}
          </div>
          <div>
            <p className="whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-gray-100">
              {record.employeeName || record.employee?.name || 'Unknown'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
              {record.employee?.employeeId || record.employeeId || '-'}
            </p>
          </div>
        </div>
      ),
      exportValue: (r) => r.employeeName || r.employee?.name || 'Unknown',
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (record) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {record.department || record.employee?.department || '-'}
        </span>
      ),
    },
    {
      key: 'basicSalary',
      header: 'Basic',
      align: 'right',
      sortable: true,
      render: (record) => (
        <span className="text-xs text-slate-700 dark:text-gray-300 tabular-nums">{formatCurrency(record.basicSalary)}</span>
      ),
    },
    {
      key: 'allowances',
      header: 'Allowances',
      align: 'right',
      render: (record) => (
        <span className="text-xs text-slate-700 dark:text-gray-300 tabular-nums">
          {formatCurrency(
            record.transportAllowance + record.housingAllowance + record.mealAllowance + record.otherAllowance,
          )}
        </span>
      ),
      exportValue: (r) =>
        r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance,
    },
    {
      key: 'overtimeHours',
      header: 'OT Hours',
      align: 'right',
      render: (record) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-gray-300 tabular-nums">
          <Clock3 size={13} className="text-slate-400" />
          {Number(record.attendanceSummary?.overtimeHours || 0).toFixed(2)}
        </span>
      ),
      exportValue: (r) => r.attendanceSummary?.overtimeHours || 0,
    },
    {
      key: 'overtimePay',
      header: 'Overtime Pay',
      align: 'right',
      render: (record) => (
        <span className="text-xs text-slate-700 dark:text-gray-300 tabular-nums">{formatCurrency(record.overtimePay)}</span>
      ),
    },
    {
      key: 'grossSalary',
      header: 'Gross',
      align: 'right',
      sortable: true,
      render: (record) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-gray-100 tabular-nums">{formatCurrency(record.grossSalary)}</span>
      ),
    },
    {
      key: 'pensionDeduction',
      header: 'Pension',
      align: 'right',
      render: (record) => (
        <span className="text-xs text-slate-700 dark:text-gray-300 tabular-nums">{formatCurrency(record.pensionDeduction)}</span>
      ),
    },
    {
      key: 'incomeTax',
      header: 'Income Tax',
      align: 'right',
      render: (record) => (
        <span className="text-xs text-slate-700 dark:text-gray-300 tabular-nums">{formatCurrency(record.incomeTax)}</span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      sortable: true,
      render: (record) => (
        <span className="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(record.totalDeductions)}</span>
      ),
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      align: 'right',
      sortable: true,
      render: (record) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(record.netSalary)}</span>
      ),
    },
    {
      key: 'employerCost',
      header: 'Employer Cost',
      align: 'right',
      render: (record) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-gray-100 tabular-nums">{formatCurrency(record.employerCost)}</span>
      ),
    },
  ]
}
