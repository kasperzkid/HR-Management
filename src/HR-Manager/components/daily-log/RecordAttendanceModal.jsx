import { useEffect, useState } from 'react'
import { Clock, X } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// RECORD ATTENDANCE MODAL
// ─────────────────────────────────────────────────────────────
export default function RecordAttendanceModal({ open, onClose, onSave, employees = [], initialData = null }) {
  const [form, setForm] = useState({
    employeeId: employees[0]?.employeeId || 'EMP-001',
    date: new Date().toISOString().slice(0, 10),
    checkIn: '08:00',
    checkOut: '17:00',
    status: 'Present',
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        employeeId: initialData.employeeId || employees[0]?.employeeId || 'EMP-001',
        date: initialData.date || new Date().toISOString().slice(0, 10),
        checkIn: initialData.checkIn || '08:00',
        checkOut: initialData.checkOut || '17:00',
        status: initialData.status || 'Present',
      })
    } else {
      setForm({
        employeeId: employees[0]?.employeeId || 'EMP-001',
        date: new Date().toISOString().slice(0, 10),
        checkIn: '08:00',
        checkOut: '17:00',
        status: 'Present',
      })
    }
  }, [initialData, employees, open])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const emp = employees.find((e) => e.employeeId === form.employeeId)

    let regularHrs = 0
    let otHrs = 0
    let late = 0

    if (form.status === 'Present') {
      const [sh, sm] = (form.checkIn || '08:00').split(':').map(Number)
      const [eh, em] = (form.checkOut || '17:00').split(':').map(Number)
      const workedMinutes = eh * 60 + em - (sh * 60 + sm)
      const workedHours = Math.max(0, workedMinutes / 60)
      regularHrs = Math.min(8, Math.round(workedHours * 4) / 4)
      otHrs = Math.max(0, Math.round((workedHours - 8) * 4) / 4)
      // Check if late past 08:00
      const startScheduled = 8 * 60
      if (sh * 60 + sm > startScheduled) {
        late = sh * 60 + sm - startScheduled
      }
    }

    const payload = {
      id: initialData?.id || `att-${Date.now()}`,
      employeeId: form.employeeId,
      name: emp?.name || initialData?.name || 'Staff Member',
      employeeName: emp?.name || initialData?.name || 'Staff Member',
      department: emp?.department || initialData?.department || 'Administration',
      date: form.date,
      checkIn: form.status === 'Present' ? form.checkIn : null,
      checkOut: form.status === 'Present' ? form.checkOut : null,
      regularHrs,
      otHrs,
      late,
      status: form.status,
    }

    onSave(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#262b31] flex items-center justify-between bg-slate-50/70 dark:bg-[#1c2026]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-950 text-white flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {initialData ? 'Edit Attendance Record' : 'Record Daily Attendance'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Log punch times and derive regular &amp; overtime hours
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Employee</label>
            <select
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-[#262b31] rounded-lg bg-white dark:bg-[#1c2026] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.employeeId} — {emp.name} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-[#262b31] rounded-lg bg-white dark:bg-[#1c2026] text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-[#262b31] rounded-lg bg-white dark:bg-[#1c2026] text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
                <option value="Sick Leave">Sick Leave</option>
              </select>
            </div>
          </div>

          {form.status === 'Present' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-[#1c2026] rounded-xl border border-slate-200 dark:border-[#262b31]">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Check-In</label>
                <input
                  type="time"
                  required
                  value={form.checkIn}
                  onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Check-Out</label>
                <input
                  type="time"
                  required
                  value={form.checkOut}
                  onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] font-mono text-xs"
                />
              </div>
              <p className="col-span-2 text-[10px] text-slate-500 mt-0.5">
                Standard shift: 08:00 – 17:00 (8h regular). Work past 17:00 calculates overtime automatically.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-[#262b31] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-[#33383f] rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-950 hover:bg-black text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
