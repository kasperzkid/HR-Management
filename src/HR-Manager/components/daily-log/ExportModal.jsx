import { useState } from 'react'
import { FileSpreadsheet, FileText, X } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// EXPORT MODAL (Qirb-Alga Hub Style)
// ─────────────────────────────────────────────────────────────
export default function ExportModal({ open, onClose, rows = [], filename = 'Attendance_Daily_Log' }) {
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
