import { useState, useMemo } from 'react'
import { Plus, Check, X, TriangleAlert } from 'lucide-react'
import { ALL_LEAVE } from '../data/leaveData'
import { INITIAL_EMPLOYEES } from '../data/employeeData'
import { leaveBalance, findOverlaps, networkdays, formatDate } from '../lib/leave'
import { SETTINGS } from '../data/settingsData'

const STATUS_STYLES = {
  Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const LEAVE_COLORS = {
  Annual: 'bg-indigo-50 text-indigo-700',
  Sick: 'bg-teal-50 text-teal-700',
  Maternity: 'bg-pink-50 text-pink-700',
  Paternity: 'bg-blue-50 text-blue-700',
  Study: 'bg-violet-50 text-violet-700',
  Unpaid: 'bg-gray-100 text-gray-600',
}

function Leave() {
  const [requests, setRequests] = useState(ALL_LEAVE)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    employeeId: 'EMP-0001',
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    remarks: '',
  })
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const overlaps = useMemo(() => findOverlaps(requests), [requests])
  const overlapIds = useMemo(() => new Set(overlaps.flat()), [overlaps])

  const pending = requests.filter((r) => r.approvalStatus === 'Pending')

  const approve = (id) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, approvalStatus: 'Approved', approvedBy: 'Meron Alemu', approvalDate: new Date().toISOString().slice(0, 10) } : r)))
    showToast('Leave request approved')
  }
  const reject = (id) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, approvalStatus: 'Rejected', approvedBy: 'Meron Alemu' } : r)))
    showToast('Leave request rejected')
  }

  const submitRequest = (e) => {
    e.preventDefault()
    if (!form.startDate || !form.endDate) return
    const emp = INITIAL_EMPLOYEES.find((x) => x.employeeId === form.employeeId)
    setRequests([
      {
        id: `LVE-${String(requests.length + 1).padStart(4, '0')}`,
        employeeId: form.employeeId,
        employeeName: emp?.name || form.employeeId,
        department: emp?.department || '—',
        leaveType: form.leaveType,
        requestDate: new Date().toISOString().slice(0, 10),
        startDate: form.startDate,
        endDate: form.endDate,
        days: networkdays(form.startDate, form.endDate),
        approvalStatus: 'Pending',
        approvedBy: null,
        approvalDate: null,
        remarks: form.remarks,
      },
      ...requests,
    ])
    setShowForm(false)
    setForm({ employeeId: 'EMP-0001', leaveType: 'Annual', startDate: '', endDate: '', remarks: '' })
    showToast('Leave request submitted')
  }

  const employeeOptions = INITIAL_EMPLOYEES.filter((e) => e.employmentStatus === 'Active' || e.employmentStatus === 'On Leave')

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Leave</h1>
          <p className="text-xs text-gray-500 mt-1">Requests, approval queue & balances — NETWORKDAYS = {networkdays('2026-03-01', '2026-03-05')} days for a Mar 1–5 stay</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-gray-950 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-colors">
          <Plus size={15} />
          New Request
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-950">New Leave Request</h3>
          <form onSubmit={submitRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Employee</label>
                <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white">
                  {employeeOptions.map((e) => <option key={e.employeeId} value={e.employeeId}>{e.employeeId} — {e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Leave Type</label>
                <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white">
                  {SETTINGS.leaveTypes.map((t) => <option key={t} value={t}>{t} Leave</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">End Date</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Remarks</label>
                <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
              <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-gray-950 rounded-lg hover:bg-gray-800">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Pending approval queue */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-950">Approval Queue</h3>
          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">{pending.length} pending</span>
        </div>
        {pending.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-400">No pending requests</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map((r) => (
                <tr key={r.id} className="text-xs">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900">{r.employeeName}</p>
                    <p className="text-[11px] text-gray-400">{r.employeeId} · {r.department}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${LEAVE_COLORS[r.leaveType]}`}>{r.leaveType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(r.startDate)} → {formatDate(r.endDate)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.days}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{r.remarks || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => approve(r.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200" title="Approve">
                        <Check size={14} />
                      </button>
                      <button onClick={() => reject(r.id)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200" title="Reject">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Balances */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-950">Leave Balances (Tenure-based Accrual)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium text-right">Entitled (Annual)</th>
                <th className="px-4 py-3 font-medium text-right">Taken (Approved)</th>
                <th className="px-4 py-3 font-medium text-right">Remaining</th>
                <th className="px-4 py-3 font-medium text-right">Sick Used (Approved)</th>
                <th className="px-4 py-3 font-medium text-right">Sick Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {INITIAL_EMPLOYEES.filter((e) => e.employmentStatus === 'Active' || e.employmentStatus === 'On Leave').map((e) => {
                const bal = leaveBalance(e.joinDate, requests.filter((r) => r.employeeId === e.employeeId))
                return (
                  <tr key={e.employeeId} className="text-xs">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{e.name}</p>
                      <p className="text-[11px] text-gray-400">{e.employeeId}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{bal.entitled}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{bal.taken}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{bal.remaining}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{bal.sickDaysUsed}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{bal.sickRemaining}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full history */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-950">Request History</h3>
          <span className="text-[11px] text-gray-400">{requests.length} requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Req ID</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium text-right">Days</th>
                <th className="px-4 py-3 font-medium">Approved By</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((r) => (
                <tr key={r.id} className={`text-xs ${r.approvalStatus === 'Approved' && overlapIds.has(r.id) ? 'bg-rose-50/50' : ''}`}>
                  <td className="px-5 py-3 font-mono text-gray-500">{r.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{r.employeeName}</p>
                    <p className="text-[11px] text-gray-400">{r.employeeId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${LEAVE_COLORS[r.leaveType]}`}>{r.leaveType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.startDate)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.endDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.days}</td>
                  <td className="px-4 py-3 text-gray-600">{r.approvedBy || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[r.approvalStatus]}`}>{r.approvalStatus}</span>
                      {overlapIds.has(r.id) && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold" title="Overlapping approved request detected">
                          <TriangleAlert size={11} />
                          Overlap
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Leave