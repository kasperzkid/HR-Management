import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function TableDataTools({ rows = [], filename = 'table-data', onImport, showStatus = true }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  function exportRows() {
    if (!rows.length) {
      setMessage('There are no rows to export.')
      return
    }
    const sheet = XLSX.utils.json_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Data')
    XLSX.writeFile(book, `${filename}.xlsx`)
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file || !onImport) return
    setBusy(true)
    setMessage('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const importedRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      if (!importedRows.length) throw new Error('The selected file has no data rows.')
      const result = await onImport(importedRows)
      setMessage(result || `Imported ${importedRows.length} row(s).`)
    } catch (error) {
      setMessage(error.message || 'Import failed.')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={exportRows} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0092B8] hover:bg-slate-50 hover:text-[#007A99]">
        <Download size={14} /> Export
      </button>
      {onImport && <>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={importFile} className="hidden" />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0092B8] hover:bg-slate-50 hover:text-[#007A99] disabled:opacity-50">
          <Upload size={14} /> {busy ? 'Importing…' : 'Import'}
        </button>
      </>}
      {showStatus && message && <span role="status" className="text-xs text-slate-500">{message}</span>}
    </div>
  )
}
