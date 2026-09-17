import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  LayoutGrid,
  RotateCcw,
  ArrowUpDown,
  Plus,
  Clock,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  X,
  Edit2,
  Trash2,
  Check,
  CalendarCheck,
} from 'lucide-react'
import { HR_SETTINGS } from '../data/settingsData'

// ─────────────────────────────────────────────────────────────
// EXPORT MODAL (Qirb-Alga Hub Style)
// ─────────────────────────────────────────────────────────────
function ExportModal({ open, onClose, rows = [], filename = 'Attendance_Daily_Log' }) {
  const [busy, setBusy] = useState(null)

  if (!open) return null

  const exportCsv = () => {
    setBusy('csv')
    try {
      const headers = ['#', 'Date', 'Employee ID', 'Employee Name', 'Department', 'Check-In', 'Check-Out', 'Regular Hrs', 'OT Hrs', 'Late (min)', 'Status']
      const csvRows = [headers.join(',')]

      rows.forEach((r, idx) => {
        const row = [
          idx + 1,
          `"${r.date || ''}"`,
          `"${r.employeeId || ''}"`,
          `"${(r.name || r.employeeName || '').replace(/"/g, '""')}"`,
          `"${r.department || ''}"`,
          `"${r.checkIn || '—'}"`,
          `"${r.checkOut || '—'}"`,
          r.regularHrs ?? r.regular ?? 0,
          r.otHrs ?? r.overtime ?? 0,
          r.late ?? 0,
          `"${r.status || ''}"`,
        ]
        csvRows.push(row.join(','))
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setBusy(null)
      onClose()
    }
  }

  const exportPrintPdf = () => {
    setBusy('pdf')
    try {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
                h2 { margin-bottom: 4px; font-size: 18px; }
                p { margin-top: 0; font-size: 12px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
                th { background: #f8fafc; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; }
                td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .status-present { color: #047857; font-weight: bold; }
                .status-absent { color: #b91c1c; font-weight: bold; }
                .status-leave { color: #1d4ed8; font-weight: bold; }
              </style>
            </head>
            <body>
              <h2>${filename.replace(/_/g, ' ')}</h2>
              <p>Exported on ${new Date().toLocaleString()} • Total Records: ${rows.length}</p>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>ID</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Reg</th>
                    <th>OT</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (r, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${r.date || '—'}</td>
                      <td>${r.employeeId || '—'}</td>
                      <td><strong>${r.name || r.employeeName || '—'}</strong></td>
                      <td>${r.department || '—'}</td>
                      <td>${r.checkIn || '—'}</td>
                      <td>${r.checkOut || '—'}</td>
                      <td>${r.regularHrs ?? 0}h</td>
                      <td>${r.otHrs ?? 0}h</td>
                      <td>${r.status || '—'}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `
        printWindow.document.write(html)
        printWindow.document.close()
      }
    } finally {
      setBusy(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Export {rows.length} records
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2026] cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Choose a format to download <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{filename}</span>.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportPrintPdf}
            disabled={busy === 'pdf'}
            className="rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 p-4 flex flex-col items-center gap-2 text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-6 h-6" />
            <span className="text-xs font-bold">Print / PDF</span>
            {busy === 'pdf' && <span className="text-[10px] text-rose-500">Preparing…</span>}
          </button>

          <button
            onClick={exportCsv}
            disabled={busy === 'csv'}
            className="rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 p-4 flex flex-col items-center gap-2 text-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-6 h-6" />
            <span className="text-xs font-bold">Excel / CSV</span>
            {busy === 'csv' && <span className="text-[10px] text-emerald-500">Exporting…</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RECORD ATTENDANCE MODAL
// ─────────────────────────────────────────────────────────────
function RecordAttendanceModal({ open, onClose, onSave, employees = [], initialData = null }) {
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

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT: DailyLogTable (Modeled on Qirb-Alga LuxuryDataTable)
// ─────────────────────────────────────────────────────────────
export default function DailyLogTable({
  initialLogs = [],
  employees = [],
  onAddLog,
  title = 'Daily Log',
  subtitle = 'Live attendance punch records, daily work hours & overtime tracking',
  showActions = true,
  tableId = 'daily-log-table',
}) {
  const [logs, setLogs] = useState(initialLogs)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grid'
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortKey, setSortKey] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' | 'desc'
  const [exportOpen, setExportOpen] = useState(false)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [openActionId, setOpenActionId] = useState(null)

  const actionMenuRef = useRef(null)

  // Sync logs if parent initialLogs changes
  useEffect(() => {
    if (initialLogs && initialLogs.length > 0) {
      setLogs(initialLogs)
    }
  }, [initialLogs])

  // Close open action menu on outside click
  useEffect(() => {
    const handleDocClick = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('click', handleDocClick)
    return () => document.removeEventListener('click', handleDocClick)
  }, [])

  // 1. FILTERING
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const empName = log.name || log.employeeName || ''
      const empId = log.employeeId || ''
      const dept = log.department || ''
      const q = search.trim().toLowerCase()

      const matchSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        empId.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q)

      const matchDept = departmentFilter === 'All' || dept === departmentFilter
      const matchStatus = statusFilter === 'All' || log.status === statusFilter
      const matchDate = !dateFilter || log.date === dateFilter

      return matchSearch && matchDept && matchStatus && matchDate
    })
  }, [logs, search, departmentFilter, statusFilter, dateFilter])

  // 2. SORTING
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let valA = a[sortKey]
      let valB = b[sortKey]

      if (sortKey === 'name') {
        valA = a.name || a.employeeName || ''
        valB = b.name || b.employeeName || ''
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0)
    })
  }, [filteredLogs, sortKey, sortOrder])

  // 3. PAGINATION
  const totalRecords = sortedLogs.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startRow = totalRecords > 0 ? (safePage - 1) * rowsPerPage + 1 : 0
  const endRow = Math.min(safePage * rowsPerPage, totalRecords)
  const paginatedLogs = sortedLogs.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const handleSaveRecord = (payload) => {
    if (editingLog) {
      setLogs((prev) => prev.map((l) => (l.id === payload.id ? payload : l)))
      setEditingLog(null)
    } else {
      setLogs((prev) => [payload, ...prev])
      if (onAddLog) onAddLog(payload)
    }
  }

  const handleDeleteRecord = (id) => {
    setLogs((prev) => prev.filter((l) => l.id !== id))
    setOpenActionId(null)
  }

  const handleStatusChange = (id, newStatus) => {
    setLogs((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            status: newStatus,
            regularHrs: newStatus === 'Present' ? 8 : 0,
            otHrs: newStatus === 'Present' ? l.otHrs || 0 : 0,
            checkIn: newStatus === 'Present' ? l.checkIn || '08:00' : null,
            checkOut: newStatus === 'Present' ? l.checkOut || '17:00' : null,
          }
        }
        return l
      })
    )
    setOpenActionId(null)
  }

  const resetFilters = () => {
    setSearch('')
    setDepartmentFilter('All')
    setStatusFilter('All')
    setDateFilter('')
    setCurrentPage(1)
  }

  // Helper for status badge styling (Matching Qirb-Alga)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      case 'Absent':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
      case 'On Leave':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
      case 'Sick Leave':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
      case 'Late':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#1c2026] dark:text-slate-300 dark:border-[#262b31]'
    }
  }

  return (
    <div
      id={tableId}
      className="bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-sm overflow-hidden text-slate-800 dark:text-slate-200"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TABLE HEADER & INTEGRATED TOOLBAR (Qirb-Alga Exact Style)
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#262b31] space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                {totalRecords} records
              </span>
            </h2>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Live Search Input */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Search employee, ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 pl-9 pr-3 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 w-full"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 pl-8 pr-2.5 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer focus:outline-none"
                title="Filter by punch date"
              />
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 pl-2.5 pr-7 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:outline-none"
              >
                <option value="All">All Departments</option>
                {HR_SETTINGS.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-3 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 pl-2.5 pr-7 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
                <option value="Sick Leave">Sick Leave</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-3 pointer-events-none" />
            </div>

            {/* List / Grid Switcher */}
            <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-[#262b31] bg-slate-50 dark:bg-[#1c2026]">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#15181d] shadow-2xs text-slate-900 dark:text-slate-100'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#15181d] shadow-2xs text-slate-900 dark:text-slate-100'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1f242c] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              title="Export records to Excel or PDF"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            {/* Record Attendance Button */}
            {showActions && (
              <button
                type="button"
                onClick={() => {
                  setEditingLog(null)
                  setRecordModalOpen(true)
                }}
                className="h-9 px-3.5 rounded-xl bg-gray-950 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Record Punch</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. VIEW MODE: GRID VIEW
         ───────────────────────────────────────────────────────────── */}
      {viewMode === 'grid' ? (
        <div className="p-4 sm:p-5 bg-slate-50/40 dark:bg-[#181c22]/40">
          {paginatedLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#1c2026] text-slate-400 flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                    No attendance records found
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Try clearing your filters or date selection.</p>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedLogs.map((log, idx) => {
                const rowSeq = (safePage - 1) * rowsPerPage + idx + 1
                const empName = log.name || log.employeeName || 'Staff Member'
                const initials = empName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-2xs p-4 space-y-3 hover:border-slate-400/60 dark:hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{empName}</p>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{rowSeq} • {log.employeeId}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadge(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-[#262b31]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Department</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                          {log.department}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Date</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{log.date}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-[#1c2026] p-2.5 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Check In – Out</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {log.checkIn || '—'} – {log.checkOut || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Regular / OT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {log.regularHrs ?? 0}h /{' '}
                          <span className={log.otHrs > 0 ? 'text-purple-600 font-black' : ''}>
                            {log.otHrs ?? 0}h
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            3. VIEW MODE: TABLE VIEW (Qirb-Alga Exact Luxury Table)
           ───────────────────────────────────────────────────────────── */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b-2 border-slate-100 dark:border-[#262b31] bg-slate-50/80 dark:bg-[#1c2026] text-slate-500 dark:text-slate-400">
                {/* Sequential ID column # (1, 2, 3...) */}
                <th className="py-3 px-3.5 w-12 text-center text-[10.5px] font-bold uppercase tracking-wider">#</th>

                <th className="py-3 px-3.5 text-[10.5px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('date')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer group"
                  >
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                  </button>
                </th>

                <th className="py-3 px-3.5 text-[10.5px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer group"
                  >
                    <span>Employee</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                  </button>
                </th>

                <th className="py-3 px-3.5 text-[10.5px] font-bold uppercase tracking-wider">Department</th>
                <th className="py-3 px-3.5 text-[10.5px] font-bold uppercase tracking-wider">Check-In</th>
                <th className="py-3 px-3.5 text-[10.5px] font-bold uppercase tracking-wider">Check-Out</th>

                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('regularHrs')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer group ml-auto"
                  >
                    <span>Regular</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                  </button>
                </th>

                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('otHrs')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer group ml-auto"
                  >
                    <span>Overtime</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                  </button>
                </th>

                <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider">Late</th>
                <th className="py-3 px-3.5 text-center text-[10.5px] font-bold uppercase tracking-wider">Status</th>

                {showActions && (
                  <th className="py-3 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider pr-4 w-28">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-[#262b31] text-slate-700 dark:text-slate-300 font-normal">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#1c2026] text-slate-400 flex items-center justify-center">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                          No attendance records found
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or date criteria.</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        <span>Reset Filters</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => {
                  const rowSeq = (safePage - 1) * rowsPerPage + idx + 1
                  const empName = log.name || log.employeeName || 'Staff Member'
                  const isActionOpen = openActionId === log.id

                  return (
                    <tr
                      key={log.id}
                      className={`${
                        idx % 2 === 1
                          ? 'bg-slate-50/40 dark:bg-[#181c22]/40'
                          : 'bg-white dark:bg-[#15181d]'
                      } hover:bg-slate-50/80 dark:hover:bg-[#1f242c] transition-colors group`}
                    >
                      {/* Mandatory Sequential ID Number (1, 2, 3...) */}
                      <td className="py-3 px-3.5 text-center font-mono font-medium text-slate-400 dark:text-slate-500 text-xs">
                        {rowSeq}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {log.date}
                      </td>

                      {/* Employee Info */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{empName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{log.employeeId}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {log.department}
                      </td>

                      {/* Check-In */}
                      <td className="py-3 px-3.5 font-mono text-slate-800 dark:text-slate-200">
                        {log.checkIn || '—'}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3 px-3.5 font-mono text-slate-800 dark:text-slate-200">
                        {log.checkOut || '—'}
                      </td>

                      {/* Regular Hours */}
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {log.regularHrs ?? log.regular ?? 0}h
                      </td>

                      {/* Overtime Hours */}
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold">
                        {(log.otHrs ?? log.overtime ?? 0) > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            +{(log.otHrs ?? log.overtime ?? 0)}h
                          </span>
                        ) : (
                          <span className="text-slate-400">0h</span>
                        )}
                      </td>

                      {/* Late (min) */}
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums">
                        {log.late > 0 ? (
                          <span className="text-amber-700 font-bold">{log.late}m</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </td>

                      {/* Actions Column (Qirb-Alga Action Button & Dropdown) */}
                      {showActions && (
                        <td className="py-2.5 px-3.5 text-right pr-4 whitespace-nowrap relative">
                          <div className="relative inline-block text-left" ref={isActionOpen ? actionMenuRef : null}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenActionId(isActionOpen ? null : log.id)
                              }}
                              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-2xs cursor-pointer focus:outline-none"
                              title="Row actions"
                            >
                              <span>Actions</span>
                              <ChevronDown className="w-3 h-3 text-white/90" />
                            </button>

                            {/* Dropdown Menu */}
                            {isActionOpen && (
                              <div className="origin-top-right absolute right-0 mt-1 w-44 rounded-xl shadow-xl bg-white dark:bg-[#15181d] border border-slate-200 dark:border-[#262b31] py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLog(log)
                                    setRecordModalOpen(true)
                                    setOpenActionId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2026] flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Edit2 size={13} className="text-blue-600" />
                                  <span>Edit Punch Times</span>
                                </button>

                                <div className="border-t border-slate-100 dark:border-[#262b31] my-1" />

                                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Quick Status
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(log.id, 'Present')}
                                  className="w-full text-left px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-[#1c2026] flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Mark Present</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(log.id, 'Absent')}
                                  className="w-full text-left px-3 py-1.5 text-rose-700 hover:bg-rose-50 dark:hover:bg-[#1c2026] flex items-center gap-2 cursor-pointer"
                                >
                                  <XCircle size={13} />
                                  <span>Mark Absent</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(log.id, 'On Leave')}
                                  className="w-full text-left px-3 py-1.5 text-blue-700 hover:bg-blue-50 dark:hover:bg-[#1c2026] flex items-center gap-2 cursor-pointer"
                                >
                                  <CalendarCheck size={13} />
                                  <span>Mark On Leave</span>
                                </button>

                                <div className="border-t border-slate-100 dark:border-[#262b31] my-1" />

                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(log.id)}
                                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-[#1c2026] flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete Record</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. TABLE PAGINATION FOOTER (Qirb-Alga Exact Style)
         ───────────────────────────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#262b31] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-[#181c22]/40">
        {/* Showing row counter */}
        <div>
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startRow}–{endRow}</span> of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{totalRecords}</span> records
        </div>

        {/* Rows per page & page numbers */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <div className="relative">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-7 pl-2 pr-6 border border-slate-200 dark:border-[#262b31] rounded-md bg-white dark:bg-[#1c2026] text-slate-700 dark:text-slate-300 text-xs appearance-none cursor-pointer focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer font-semibold transition-colors"
            >
              Previous
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  safePage === pageNum
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1c2026]'
                }`}
              >
                {pageNum}
              </button>
            ))}

            {totalPages > 4 && <span className="px-1 text-slate-400">...</span>}

            {totalPages > 3 && (
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  safePage === totalPages
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1c2026]'
                }`}
              >
                {totalPages}
              </button>
            )}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1 font-semibold transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        rows={filteredLogs}
        filename="Attendance_Daily_Log"
      />

      {/* Record Attendance Modal */}
      <RecordAttendanceModal
        open={recordModalOpen}
        onClose={() => {
          setRecordModalOpen(false)
          setEditingLog(null)
        }}
        onSave={handleSaveRecord}
        employees={employees}
        initialData={editingLog}
      />
    </div>
  )
}
