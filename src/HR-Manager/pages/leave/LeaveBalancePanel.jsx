import { useMemo } from 'react'
import LuxuryDataTable from '../../components/LuxuryDataTable'
import {
  calculateAnnualEntitlement,
  getEmployeeId,
  getEmployeeName,
  getInitials,
} from './leaveHelpers'

export default function LeaveBalancePanel({
  employees,
  requests,
  selectedEmployeeId,
  onSelectEmployee,
}) {
  const balances = useMemo(() => {
    return employees.map((employee) => {
      const employeeId = getEmployeeId(employee)

      const employeeRequests = requests.filter(
        (request) =>
          (request.employeeId === employee.id ||
            request.employeeId === employeeId) &&
          request.approvalStatus === 'Approved',
      )

      const annualTaken = employeeRequests
        .filter(
          (request) =>
            request.leaveType === 'Annual Leave',
        )
        .reduce(
          (total, request) =>
            total + Number(request.days || 0),
          0,
        )

      const sickUsed = employeeRequests
        .filter(
          (request) =>
            request.leaveType === 'Sick Leave',
        )
        .reduce(
          (total, request) =>
            total + Number(request.days || 0),
          0,
        )

      const entitled = calculateAnnualEntitlement(
        employee.joinDate,
      )

      return {
        employee,
        employeeId,
        employeeName: getEmployeeName(employee),
        entitled,
        taken: annualTaken,
        remaining: entitled - annualTaken,
        sickUsed,
      }
    })
  }, [employees, requests])

  const balanceColumns = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      render: (balance) => (
        <span className="text-sm font-medium text-blue-600">
          {balance.employeeId}
        </span>
      ),
    },
    {
      key: 'employeeName',
      header: 'Employee Name',
      render: (balance) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {getInitials(balance.employeeName)}
          </div>

          <span className="text-sm font-medium text-slate-800">
            {balance.employeeName}
          </span>
        </div>
      ),
    },
    {
      key: 'entitled',
      header: 'Entitled',
      align: 'right',
      render: (balance) => (
        <span className="text-sm text-slate-700">
          {balance.entitled}
        </span>
      ),
    },
    {
      key: 'taken',
      header: 'Taken',
      align: 'right',
      render: (balance) => (
        <span className="text-sm text-slate-700">
          {balance.taken}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (balance) => (
        <span
          className={`text-sm font-semibold ${
            balance.remaining < 0
              ? 'text-red-600'
              : 'text-emerald-600'
          }`}
        >
          {balance.remaining}
        </span>
      ),
    },
    {
      key: 'sickUsed',
      header: 'Sick Used',
      align: 'right',
      render: (balance) => (
        <span className="text-sm text-slate-700">
          {balance.sickUsed}
        </span>
      ),
    },
  ]

  return (
    <LuxuryDataTable
      title="Employee Leave Balance"
      subtitle="Annual leave balance based on approved requests."
      countBadge={balances.length}
      columns={balanceColumns}
      data={balances}
      searchable={false}
      exportable={false}
      paginated={false}
      emptyMessage="No employees available."
      onRowClick={(balance) =>
        onSelectEmployee(
          balance.employeeId === selectedEmployeeId
            ? ''
            : balance.employeeId,
        )
      }
      rowClassName={(row) =>
        row.employeeId === selectedEmployeeId
          ? 'bg-blue-50/50 dark:bg-blue-950/20'
          : ''
      }
    />
  )
}
