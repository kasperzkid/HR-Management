import { useState, useEffect } from 'react'
import { X, CalendarCheck, User, Building, Calendar, Hash, FileText } from 'lucide-react'
import { SETTINGS } from '../data/settingsData'
import { networkdays, formatDate } from '../lib/leave'

/**
 * Apply for Leave — modal form matching the 13-column leave schema:
 * Employee Name · Department · Leave Type · Request Date · Start Date ·
 * End Date · No. of Days · Approval Status · Approved By · Approval Date · Remarks
 */
function ApplyLeaveModal({ isOpen, onClose, onApply, employee }) {
  const [form, setForm] = useState({
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    remarks: '',
  })
  const [error, setError] = useState('')

  // Reset the form whenever the modal is (re)opened
  useEffect(() => {
    if (isOpen) {
      setForm({ leaveType: 'Annual', startDate: '', endDate: '', remarks: '' })
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const days = form.startDate && form.endDate ? networkdays(form.startDate, form.endDate) : 0
  const invalidRange =
    form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.startDate || !form.endDate || invalidRange || days <= 0) {
      setError('Please provide a valid date range (End Date must be on or after Start Date).')
      return
    }

    onApply({
      id: `LVE-${String(Date.now()).slice(-4)}`,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department || '—',
      leaveType: form.leaveType,
      requestDate: new Date().toISOString().slice(0, 10),
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      approvalStatus: 'Pending',
      approvedBy: null,
      approvalDate: null,
      remarks: form.remarks,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-[#262b31] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#262b31]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarCheck size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Apply for Leave</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Application will be forwarded to HR &amp; department manager for approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-[#2a3139] rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Read-only record info (auto-filled from the logged-in employee) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Employee Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  disabled
                  value={employee.name}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-gray-50 dark:bg-[#1c2026] text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
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
                  value={employee.department || '—'}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-gray-50 dark:bg-[#1c2026] text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Request Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  disabled
                  value={formatDate(new Date().toISOString().slice(0, 10))}
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
                {SETTINGS.leaveTypes.map((t) => (
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
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
              <textarea
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="E.g. Annual holiday with family, medical appointment, etc."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#262b31]">
            <button
              type="button"
              onClick={onClose}
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
  )
}

export default ApplyLeaveModal
