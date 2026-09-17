import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  Plus,
  X,
  Check,
  Info,
  CalendarDays,
  User,
  Building,
  Hash,
} from 'lucide-react'
import { HR_SETTINGS } from '../data/settingsData'
import { MOCK_LEAVE_REQUESTS, MOCK_EMPLOYEES } from '../data/mockData'
import { annualEntitlement, networkdays } from '../lib/leave'
import LuxuryDataTable from '../components/LuxuryDataTable'

export default function HRLeave() {
  const [leaveRequests, setLeaveRequests] = useState(MOCK_LEAVE_REQUESTS)
  const [filterType, setFilterType] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [form, setForm] = useState({
    employeeId: MOCK_EMPLOYEES[0].employeeId,
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    remarks: '',
  })

  const pendingCount = leaveRequests.filter((r) => r.approvalStatus === 'Pending').length
  const selectedEmployee = MOCK_EMPLOYEES.find((m) => m.employeeId === form.employeeId)
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-ET', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleApprove = (id) => {
    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              approvalStatus: 'Approved',
              approvedBy: 'Meron Alemu',
              approvalDate: new Date().toISOString().slice(0, 10),
            }
          : r
      )
    )
  }

  const handleReject = (id) => {
    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              approvalStatus: 'Rejected',
              approvedBy: 'Meron Alemu',
              approvalDate: new Date().toISOString().slice(0, 10),
            }
          : r
      )
    )
  }

  const days = form.startDate && form.endDate ? networkdays(form.startDate, form.endDate) : 0
  const invalidRange =
    form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)

  const handleCreateRequest = (e) => {
    e.preventDefault()
    if (!form.startDate || !form.endDate || invalidRange || days <= 0) return
    const emp = MOCK_EMPLOYEES.find((m) => m.employeeId === form.employeeId)
    const newReq = {
      id: `LVE-${String(Date.now()).slice(-4)}`,
      employeeId: form.employeeId,
      employeeName: emp ? emp.name : 'Staff Member',
      department: emp ? emp.department : 'General',
      leaveType: form.leaveType,
      requestDate: new Date().toISOString().slice(0, 10),
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      approvalStatus: 'Pending',
      approvedBy: null,
      approvalDate: null,
      remarks: form.remarks,
    }
    setLeaveRequests([newReq, ...leaveRequests])
    setIsModalOpen(false)
    setForm({
      employeeId: MOCK_EMPLOYEES[0].employeeId,
      leaveType: 'Annual',
      startDate: '',
      endDate: '',
      remarks: '',
    })
  }

  const filtered = leaveRequests.filter((r) => {
    if (filterType === 'All') return true
    return r.approvalStatus === filterType
  })

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">Leave Management</h1>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                {pendingCount} Pending Approval
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Review employee time-off applications &amp; statutory tenure accruals
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>Apply Leave on Behalf</span>
        </button>
      </div>

      {/* Accrual Policy Banner */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-start gap-3 dark:bg-[#15181d] dark:border-[#262b31]">
        <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600 leading-relaxed dark:text-gray-400">
          <span className="font-bold text-gray-950 dark:text-gray-100">Tenure-Based Accrual Policy: </span>
          Per Ethiopian Labour Proclamation No. 1156/2019, 1st year staff receive 16 working days annual leave. An additional 1 working day is earned for every 2 full years of continuous service. Sick leave is capped at 10 statutory days per calendar year.
        </div>
      </div>

      {/* Luxury Leave Applications Table (Qirb-Alga Style) */}
      <LuxuryDataTable
        title="Leave Applications & Queue"
        subtitle="Review employee time-off applications, manage queue & statutory accruals"
        countBadge={`${filtered.length} requests`}
        data={filtered}
        searchable={true}
        searchPlaceholder="Search by employee, ID, remarks..."
        searchKeys={['id', 'employeeName', 'employeeId', 'department', 'leaveType', 'remarks']}
        exportable={true}
        exportFilename="Leave_Requests_Log"
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Filter Status:</span>
            {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterType(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === st
                    ? 'bg-gray-950 text-white dark:bg-gray-100 dark:text-gray-950'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-[#1c2026] dark:text-gray-400 dark:border-[#262b31] dark:hover:bg-[#252a32]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        }
        headerActions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-gray-950 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={14} />
            <span>Apply Leave</span>
          </button>
        }
        columns={[
          {
            key: 'id',
            header: 'Request ID',
            sortable: true,
            render: (r) => (
              <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{r.id}</span>
            ),
          },
          {
            key: 'employeeName',
            header: 'Employee',
            sortable: true,
            render: (r) => (
              <div>
                <div className="font-bold text-gray-950 dark:text-gray-100">{r.employeeName}</div>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{r.employeeId}</span>
              </div>
            ),
          },
          {
            key: 'department',
            header: 'Department',
            sortable: true,
            render: (r) => (
              <span className="font-medium text-gray-700 dark:text-gray-300">{r.department}</span>
            ),
          },
          {
            key: 'leaveType',
            header: 'Leave Type',
            sortable: true,
            render: (r) => (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60">
                {r.leaveType}
              </span>
            ),
          },
          {
            key: 'startDate',
            header: 'Duration',
            sortable: true,
            render: (r) => (
              <span className="font-mono text-gray-600 dark:text-gray-400 text-xs">
                {r.startDate} → {r.endDate}
              </span>
            ),
            exportValue: (r) => `${r.startDate} - ${r.endDate}`,
          },
          {
            key: 'days',
            header: 'Days',
            sortable: true,
            align: 'center',
            render: (r) => (
              <span className="font-black text-gray-950 tabular-nums dark:text-gray-100">{r.days}d</span>
            ),
          },
          {
            key: 'approvalStatus',
            header: 'Status',
            align: 'center',
            sortable: true,
            render: (r) => (
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  r.approvalStatus === 'Approved'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                    : r.approvalStatus === 'Pending'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                }`}
              >
                {r.approvalStatus}
              </span>
            ),
          },
          {
            key: 'remarks',
            header: 'Remarks',
            render: (r) => (
              <span className="text-gray-500 max-w-xs truncate block dark:text-gray-400">
                {r.remarks || '—'}
              </span>
            ),
          },
        ]}
        renderRowActions={(r) => {
          const isPending = r.approvalStatus === 'Pending'
          return isPending ? (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleApprove(r.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                title="Approve leave"
              >
                <Check size={12} /> Approve
              </button>
              <button
                type="button"
                onClick={() => handleReject(r.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                title="Reject leave"
              >
                <X size={12} /> Reject
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-gray-400 italic dark:text-gray-500">
              {r.approvalStatus} by {r.approvedBy || 'Admin'}
            </span>
          )
        }}
      />

      {/* Apply Leave Modal — matches the Apply for Leave popup style */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#15181d] rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-[#262b31] overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#262b31]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Apply for Leave</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Record a leave application on behalf of an employee for approval
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-[#2a3139] rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 overflow-y-auto">
              {/* Employee picker + read-only derived info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Employee Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <select
                      required
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 cursor-pointer"
                    >
                      {MOCK_EMPLOYEES.map((e) => (
                        <option key={e.employeeId} value={e.employeeId}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      disabled
                      value={selectedEmployee ? selectedEmployee.department : '—'}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-gray-50 dark:bg-[#1c2026] text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Request Date
                  </label>
                  <div className="relative">
                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      disabled
                      value={fmtDate(new Date().toISOString().slice(0, 10))}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-gray-50 dark:bg-[#1c2026] text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Leave Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.leaveType}
                    onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 cursor-pointer"
                  >
                    {HR_SETTINGS.leaveTypes.map((t) => (
                      <option key={t} value={t}>
                        {t} Leave
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200"
                  />
                </div>
              </div>

              {/* Computed read-only fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    No. of Days
                  </label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      disabled
                      value={invalidRange ? 'Invalid range' : `${days} working day${days === 1 ? '' : 's'}`}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-gray-50 dark:bg-[#1c2026] text-gray-700 dark:text-gray-300 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Weekends excluded automatically</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Approval Status
                  </label>
                  <span className="inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60">
                    Pending
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Approved By / Approval Date
                  </label>
                  <div className="flex items-center h-[34px] text-xs text-gray-400 dark:text-gray-500 italic">
                    Set by HR upon review
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Remarks / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="E.g. Annual holiday with family, medical appointment, etc."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#262b31]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-[#1c2026] dark:hover:bg-[#2a3139] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-gray-950 hover:bg-gray-800 dark:bg-[#3a4149] dark:hover:bg-gray-600 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
