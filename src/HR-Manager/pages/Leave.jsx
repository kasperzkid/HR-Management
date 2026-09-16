import React, { useState } from 'react'
import {
  Plane,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  Plus,
  X,
  Check,
  Info,
} from 'lucide-react'
import { HR_SETTINGS } from '../data/settingsData'
import { MOCK_LEAVE_REQUESTS, MOCK_EMPLOYEES } from '../data/mockData'
import { annualEntitlement } from '../lib/leave'

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

  const handleCreateRequest = (e) => {
    e.preventDefault()
    const emp = MOCK_EMPLOYEES.find((m) => m.employeeId === form.employeeId)
    const newReq = {
      id: `LVE-2026-00${leaveRequests.length + 1}`,
      employeeId: form.employeeId,
      employeeName: emp ? emp.name : 'Staff Member',
      department: emp ? emp.department : 'General',
      leaveType: form.leaveType,
      requestDate: new Date().toISOString().slice(0, 10),
      startDate: form.startDate,
      endDate: form.endDate,
      days: 3, // demo days
      approvalStatus: 'Pending',
      approvedBy: null,
      approvalDate: null,
      remarks: form.remarks,
    }
    setLeaveRequests([newReq, ...leaveRequests])
    setIsModalOpen(false)
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
            <h1 className="text-2xl font-black tracking-tight text-gray-950">Leave Management</h1>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                {pendingCount} Pending Approval
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
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
      <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-start gap-3">
        <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600 leading-relaxed">
          <span className="font-bold text-gray-950">Tenure-Based Accrual Policy: </span>
          Per Ethiopian Labour Proclamation No. 1156/2019, 1st year staff receive 16 working days annual leave. An additional 1 working day is earned for every 2 full years of continuous service. Sick leave is capped at 10 statutory days per calendar year.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterType(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterType === st
                ? 'bg-gray-950 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Leave Queue Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Approval Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((r) => {
                const isPending = r.approvalStatus === 'Pending'

                return (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{r.id}</td>
                    <td className="py-3 px-4 font-bold text-gray-950">
                      <div>{r.employeeName}</div>
                      <span className="text-[10px] font-mono text-gray-400">{r.employeeId}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">{r.department}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {r.leaveType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600">
                      {r.startDate} → {r.endDate}
                    </td>
                    <td className="py-3 px-4 font-black text-gray-950 tabular-nums">{r.days}d</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          r.approvalStatus === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : r.approvalStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {r.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate">{r.remarks || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(r.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          {r.approvalStatus} by {r.approvedBy || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <h3 className="text-sm font-bold text-gray-950">Record Leave Application</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Select Employee</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                >
                  {MOCK_EMPLOYEES.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>
                      {e.name} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                >
                  {HR_SETTINGS.leaveTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Reason for time off..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-950 text-white rounded-lg font-semibold"
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
