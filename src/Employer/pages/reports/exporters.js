// ─────────────────────────────────────────────────────────────
// Reports page — export helpers (current tab → XLSX / PDF).
// Extracted from pages/Reports.jsx.
// ─────────────────────────────────────────────────────────────

import * as XLSX from 'xlsx'

export function exportXlsx(exportState) {
  const aoa = [exportState.headers, ...exportState.rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = exportState.headers.map((h, i) => ({
    wch: Math.max(
      h.length + 2,
      ...exportState.rows.map((r) => String(r[i] ?? '').length + 2),
    ),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, exportState.sheet)
  XLSX.writeFile(wb, `${exportState.filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportPdf(exportState) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>${esc(exportState.filename)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
      h2 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
      p { margin: 0; font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
      th { background: #f8fafc; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; }
      td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) { background-color: #f8fafc; }
    </style>
  </head>
  <body>
    <h2>Yanol Technology PLC — Statutory &amp; Financial Report</h2>
    <p>${esc(exportState.sheet)} · Exported ${new Date().toLocaleString('en-ET')}</p>
    <table>
      <thead><tr>${exportState.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${exportState.rows
          .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table>
    <script>window.onload = function() { window.print(); window.close(); }</script>
  </body>
</html>`
  printWindow.document.write(html)
  printWindow.document.close()
}
