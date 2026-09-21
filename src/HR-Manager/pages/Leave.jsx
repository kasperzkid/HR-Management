import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  FileText,
  Plus,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import LuxuryDataTable from '../components/LuxuryDataTable'
import { authHeaders } from '../../lib/hrApi'
import LeaveRequestModal, { StatCard } from './leave/LeaveRequestModal'
import LeaveBalancePanel from './leave/LeaveBalancePanel'
import {
  LEAVE_TYPES,
  STATUSES,
  DEPARTMENTS,
  getDepartment,
  getEmployeeId,
  getEmployeeName,
  getInitials,
  calculateWorkingDays,
  calculateAnnualEntitlement,
  formatDate,
  getStatusClass,
  getLeaveTypeClass,
  hasOverlap,
  selectClass,
} from './leave/leaveHelpers'

const API_URL = '/api/hr-manager'

const EMPTY_FORM = {
  employeeId: '',
  leaveType: LEAVE_TYPES[0],
  requestDate: new Date().toISOString().slice(0, 10),
  startDate: '',
  endDate: '',
  approvalStatus: 'Pending',
  approvedBy: '',
  approvedDate: '',
  remarks: '',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Leave() {
  const [employees, setEmployees] = useState([])
  const [requests, setRequests] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [employeeData, leaveData] = await Promise.all([
          fetch(`${API_URL}/employees`, { headers: authHeaders() }).then((r) =>
            r.ok ? r.json() : Promise.reject(new Error(`Employees: ${r.status}`)),
          ),
          fetch(`${API_URL}/leave`, { headers: authHeaders() }).then((r) =>
            r.ok ? r.json() : Promise.reject(new Error(`Leave: ${r.status}`)),
          ),
        ])

        if (cancelled) return

        // Leave requests may be wrapped ({ requests }) or a bare array.
        setRequests(Array.isArray(leaveData) ? leaveData : leaveData?.requests || [])
        setEmployees(Array.isArray(employeeData) ? employeeData : [])
        setLoadError('')
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Unable to load leave data')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All Leave Types')
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === 'All Statuses' ||
        request.approvalStatus === statusFilter

      const matchesLeaveType =
        leaveTypeFilter === 'All Leave Types' ||
        request.leaveType === leaveTypeFilter

      const matchesDepartment =
        departmentFilter === 'All Departments' ||
        request.department === departmentFilter

      return matchesStatus && matchesLeaveType && matchesDepartment
    })
  }, [requests, statusFilter, leaveTypeFilter, departmentFilter])

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.approvalStatus === 'Pending').length,
      approved: requests.filter((r) => r.approvalStatus === 'Approved').length,
      rejected: requests.filter((r) => r.approvalStatus === 'Rejected').length,
    }
  }, [requests])

  const selectedBalance = useMemo(() => {
    if (!selectedEmployeeId) return null

    const employee = employees.find((item) => getEmployeeId(item) === selectedEmployeeId)
    if (!employee) return null

    const approvedRequests = requests.filter(
      (request) =>
        (request.employeeId === employee.id ||
          request.employeeId === selectedEmployeeId) &&
        request.approvalStatus === 'Approved',
    )

    const annualTaken = approvedRequests
      .filter((request) => request.leaveType === 'Annual Leave')
      .reduce((total, request) => total + Number(request.days || 0), 0)

    const sickUsed = approvedRequests
      .filter((request) => request.leaveType === 'Sick Leave')
      .reduce((total, request) => total + Number(request.days || 0), 0)

    const entitled = calculateAnnualEntitlement(employee.joinDate)

    return {
      employee,
      entitled,
      taken: annualTaken,
      remaining: entitled - annualTaken,
      sickUsed,
    }
  }, [employees, requests, selectedEmployeeId])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function openCreateModal() {
    setEditingRequest(null)
    setForm({ ...EMPTY_FORM, requestDate: todayISO() })
    setModalOpen(true)
  }

  function openEditModal(request) {
    setEditingRequest(request)
    setForm({
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      requestDate: request.requestDate,
      startDate: request.startDate,
      endDate: request.endDate,
      approvalStatus: request.approvalStatus,
      approvedBy: request.approvedBy || '',
      approvedDate: request.approvedDate || '',
      remarks: request.remarks || '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingRequest(null)
    setForm(EMPTY_FORM)
  }

  async function saveRequest(event) {
    event.preventDefault()

    const employee = employees.find((item) => getEmployeeId(item) === form.employeeId)

    if (!employee) {
      window.alert('Please select an employee.')
      return
    }

    if (!form.startDate || !form.endDate) {
      window.alert('Please select the start and end dates.')
      return
    }

    if (form.endDate < form.startDate) {
      window.alert('End Date cannot be before Start Date.')
      return
    }

    const days = calculateWorkingDays(form.startDate, form.endDate)

    if (days <= 0) {
      window.alert('The selected period contains no working days.')
      return
    }

    if (
      hasOverlap(
        { ...form, approvalStatus: form.approvalStatus },
        requests,
        editingRequest?.id || '',
      )
    ) {
      const proceed = window.confirm(
        'This request overlaps another approved leave request for the same employee. Continue anyway?',
      )
      if (!proceed) return
    }

    let approvedBy = form.approvedBy
    let approvedDate = form.approvedDate

    if (form.approvalStatus === 'Approved') {
      if (!approvedBy) approvedBy = 'HR Manager'
      if (!approvedDate) approvedDate = todayISO()
    }

    const payload = {
      employeeId: form.employeeId,
      employeeName: getEmployeeName(employee),
      department: getDepartment(employee),
      leaveType: form.leaveType,
      requestDate: form.requestDate,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      approvalStatus: form.approvalStatus,
      approvedBy,
      approvedDate,
      remarks: form.remarks,
    }

    try {
      const res = await fetch(
        editingRequest ? `${API_URL}/leave/${editingRequest.id}` : `${API_URL}/leave`,
        {
          method: editingRequest ? 'PUT' : 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || `Save failed: ${res.status}`)
      }

      const saved = await res.json().catch(() => null)
      const savedRequest = saved?.request || saved

      setRequests((current) =>
        editingRequest
          ? current.map((r) => (r.id === editingRequest.id ? { ...r, ...savedRequest } : r))
          : [savedRequest || { ...payload, id: `LR-${Date.now()}` }, ...current],
      )

      closeModal()
    } catch (err) {
      window.alert(err.message || 'Could not save the leave request.')
    }
  }

  function updateStatus(request, status) {
    const approved = status === 'Approved'

    setRequests((current) =>
      current.map((item) => {
        if (item.id !== request.id) return item

        return {
          ...item,
          approvalStatus: status,
          approvedBy: approved ? item.approvedBy || 'HR Manager' : '',
          approvedDate: approved ? item.approvedDate || todayISO() : '',
        }
      }),
    )

    fetch(`${API_URL}/leave/${request.id}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        approvalStatus: status,
        approvedBy: approved ? request.approvedBy || 'HR Manager' : '',
        approvedDate: approved ? request.approvedDate || todayISO() : '',
      }),
    }).catch(() => {
      window.alert('Status updated locally, but the server could not be reached.')
    })
  }

  function approveRequest(request) {
    const overlap = hasOverlap(
      { ...request, approvalStatus: 'Approved' },
      requests,
      request.id,
    )

    if (overlap) {
      const proceed = window.confirm(
        'This request overlaps another approved leave request for the same employee. Approve anyway?',
      )
      if (!proceed) return
    }

    updateStatus(request, 'Approved')
  }

  function rejectRequest(request) {
    updateStatus(request, 'Rejected')
  }

  function resetFilters() {
    setStatusFilter('All Statuses')
    setLeaveTypeFilter('All Leave Types')
    setDepartmentFilter('All Departments')
  }

  const columns = useMemo(
    () => [
      {
        key: 'id',
        header: 'Request ID',
        render: (row) => (
          <span className="font-mono text-sm font-semibold text-blue-600">{row.id}</span>
        ),
      },
      {
        key: 'employeeName',
        header: 'Employee',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
              {getInitials(row.employeeName)}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">{row.employeeName}</p>
              <p className="text-xs text-slate-500">{row.employeeId}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        render: (row) => <span className="text-sm text-slate-600">{row.department}</span>,
      },
      {
        key: 'leaveType',
        header: 'Leave Type',
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getLeaveTypeClass(
              row.leaveType,
            )}`}
          >
            {row.leaveType}
          </span>
        ),
      },
      {
        key: 'requestDate',
        header: 'Request Date',
        render: (row) => (
          <span className="text-sm text-slate-600">{formatDate(row.requestDate)}</span>
        ),
      },
      {
        key: 'leavePeriod',
        header: 'Leave Period',
        render: (row) => (
          <>
            <div className="text-sm text-slate-700">{formatDate(row.startDate)}</div>
            <div className="text-xs text-slate-400">to {formatDate(row.endDate)}</div>
          </>
        ),
      },
      {
        key: 'days',
        header: 'Days',
        align: 'center',
        render: (row) => <span className="font-semibold text-slate-800">{row.days}</span>,
      },
      {
        key: 'approvalStatus',
        header: 'Status',
        render: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
              row.approvalStatus,
            )}`}
          >
            {row.approvalStatus}
          </span>
        ),
      },
      {
        key: 'approvedBy',
        header: 'Approved By',
        render: (row) => (
          <span className="text-sm text-slate-600">{row.approvedBy || '—'}</span>
        ),
      },
      {
        key: 'approvalDate',
        header: 'Approval Date',
        render: (row) => (
          <span className="text-sm text-slate-600">{formatDate(row.approvedDate)}</span>
        ),
      },
      {
        key: 'overlap',
        header: 'Overlap?',
        align: 'center',
        render: (row) => {
          const overlap = hasOverlap(row, requests, row.id)

          return overlap ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
              <AlertTriangle size={13} />
              CHECK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <Check size={13} />
              OK
            </span>
          )
        },
      },
    ],
    [requests],
  )

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-[#0a0d10] dark:text-gray-200">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
              <CalendarDays size={16} className="text-slate-400 dark:text-gray-500" />
              <span className="text-slate-500 dark:text-gray-400">HR Management</span>
              <span className="text-slate-300 dark:text-gray-600">/</span>
              <span className="text-slate-700 dark:text-gray-200">Leave</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-gray-100">
              Leave Management
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Manage employee leave requests, approvals, overlaps, and leave balances.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 cursor-pointer dark:bg-[#3a4149] dark:hover:bg-[#262b31]"
          >
            <Plus size={18} />
            New Leave Request
          </button>
        </div>

        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
            {loadError}
          </div>
        )}

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FileText} label="Total Requests" value={stats.total} description="All leave requests" />
          <StatCard icon={Clock3} label="Pending" value={stats.pending} description="Awaiting approval" />
          <StatCard icon={Check} label="Approved" value={stats.approved} description="Approved requests" />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected} description="Rejected requests" />
        </div>

        {/* Leave Requests */}
        <LuxuryDataTable
          title="Leave Requests"
          subtitle={`${filteredRequests.length} request${filteredRequests.length === 1 ? '' : 's'} shown`}
          countBadge={filteredRequests.length}
          columns={columns}
          data={filteredRequests}
          searchable
          searchKeys={['id', 'employeeId', 'employeeName', 'department']}
          searchPlaceholder="Search request ID, employee, department..."
          exportable
          exportFilename="HR_Leave_Requests"
          paginated
          defaultPageSize={10}
          emptyMessage="No leave requests match your filters."
          onResetFilters={resetFilters}
          headerActions={
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Approved leave affects balance
            </span>
          }
          filterControls={
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium whitespace-nowrap text-slate-500 dark:text-gray-400">
                  Status:
                </span>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={selectClass}
                >
                  <option>All Statuses</option>

                  {STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium whitespace-nowrap text-slate-500 dark:text-gray-400">
                  Leave Type:
                </span>

                <select
                  value={leaveTypeFilter}
                  onChange={(event) => setLeaveTypeFilter(event.target.value)}
                  className={selectClass}
                >
                  <option>All Leave Types</option>

                  {LEAVE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium whitespace-nowrap text-slate-500 dark:text-gray-400">
                  Department:
                </span>

                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className={selectClass}
                >
                  {DEPARTMENTS.map((department) => (
                    <option key={department}>{department}</option>
                  ))}
                </select>
              </div>
            </>
          }
          dropdownActions={[
            {
              label: 'Approve',
              icon: Check,
              tone: 'success',
              hidden: (row) => row.approvalStatus !== 'Pending',
              onClick: (row) => approveRequest(row),
            },
            {
              label: 'Reject',
              icon: XCircle,
              destructive: true,
              hidden: (row) => row.approvalStatus !== 'Pending',
              onClick: (row) => rejectRequest(row),
            },
            {
              label: 'Edit',
              icon: Edit3,
              onClick: (row) => openEditModal(row),
            },
          ]}
        />

        {/* Balance + selected employee details */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
          <LeaveBalancePanel
            employees={employees}
            requests={requests}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
          />

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
            <div className="border-b border-slate-200 p-5 dark:border-[#262b31]">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                  <UserCheck size={18} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-gray-100">Leave Balance Details</h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                    Select an employee from the balance table.
                  </p>
                </div>
              </div>
            </div>

            {selectedBalance ? (
              <div className="p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                    {getInitials(getEmployeeName(selectedBalance.employee))}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900 dark:text-gray-100">
                      {getEmployeeName(selectedBalance.employee)}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      {getEmployeeId(selectedBalance.employee)} ·{' '}
                      {getDepartment(selectedBalance.employee)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-[#1c2026]">
                    <span className="text-sm text-slate-500 dark:text-gray-400">Entitled (Annual)</span>
                    <span className="font-semibold text-slate-900 dark:text-gray-100">{selectedBalance.entitled}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-[#1c2026]">
                    <span className="text-sm text-slate-500 dark:text-gray-400">Taken (Approved)</span>
                    <span className="font-semibold text-slate-900 dark:text-gray-100">{selectedBalance.taken}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">Remaining</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedBalance.remaining}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-[#1c2026]">
                    <span className="text-sm text-slate-500 dark:text-gray-400">Sick Days Used</span>
                    <span className="font-semibold text-slate-900 dark:text-gray-100">{selectedBalance.sickUsed}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-400">
                  Only leave requests with <strong>Approved</strong> status are included in the
                  balance calculations.
                </div>
              </div>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-[#1c2026] dark:text-gray-500">
                  <Users size={25} />
                </div>

                <p className="text-sm font-medium text-slate-700 dark:text-gray-200">No employee selected</p>

                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-gray-400">
                  Click an employee in the balance table to see detailed leave balance information.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <LeaveRequestModal
        open={modalOpen}
        form={form}
        employees={employees}
        requests={requests}
        editingRequest={editingRequest}
        onClose={closeModal}
        onChange={updateForm}
        onSave={saveRequest}
      />
    </div>
  )
}
