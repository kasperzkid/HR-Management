import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function TableDataTools({ rows = [], filename = 'table-data', onImport, showStatus = true }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

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

  function exportWord() {
    if (!rows.length) {
      setMessage('There are no rows to export.')
      return
    }
    const headers = Object.keys(rows[0])
    const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headers.map((key) => `<th>${escape(key)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((key) => `<td>${escape(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
    const blob = new Blob([`\ufeff${html}`], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.doc`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function parseWord(file) {
    const html = await file.text()
    const documentNode = new DOMParser().parseFromString(html, 'text/html')
    const table = documentNode.querySelector('table')
    if (!table) throw new Error('The Word document must contain a table with a header row.')
    const tableRows = [...table.querySelectorAll('tr')].map((row) => [...row.querySelectorAll('th,td')].map((cell) => cell.textContent.trim()))
    const headers = tableRows.shift() || []
    return tableRows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
  }

  async function parseWordDocx(file) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read .docx files. Export as .doc or .xlsx instead.')
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const view = new DataView(buffer)
    let endRecord = -1
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) { endRecord = i; break }
    }
    if (endRecord < 0) throw new Error('The selected .docx file is not a valid Word document.')
    const count = view.getUint16(endRecord + 10, true)
    let directoryOffset = view.getUint32(endRecord + 16, true)
    const decoder = new TextDecoder()
    let documentXml = null
    for (let entry = 0; entry < count; entry += 1) {
      if (view.getUint32(directoryOffset, true) !== 0x02014b50) break
      const method = view.getUint16(directoryOffset + 10, true)
      const compressedSize = view.getUint32(directoryOffset + 20, true)
      const nameLength = view.getUint16(directoryOffset + 28, true)
      const extraLength = view.getUint16(directoryOffset + 30, true)
      const commentLength = view.getUint16(directoryOffset + 32, true)
      const localOffset = view.getUint32(directoryOffset + 42, true)
      const name = decoder.decode(bytes.slice(directoryOffset + 46, directoryOffset + 46 + nameLength))
      if (name === 'word/document.xml') {
        const localNameLength = view.getUint16(localOffset + 26, true)
        const localExtraLength = view.getUint16(localOffset + 28, true)
        const dataStart = localOffset + 30 + localNameLength + localExtraLength
        const compressed = bytes.slice(dataStart, dataStart + compressedSize)
        const content = method === 0
          ? compressed
          : method === 8
            ? new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())
            : null
        if (!content) throw new Error('This Word document uses an unsupported compression format.')
        documentXml = decoder.decode(content)
        break
      }
      directoryOffset += 46 + nameLength + extraLength + commentLength
    }
    if (!documentXml) throw new Error('No document content was found in the selected Word file.')
    const xml = new DOMParser().parseFromString(documentXml, 'application/xml')
    if (xml.querySelector('parsererror')) throw new Error('Could not read the Word document content.')
    const table = [...xml.getElementsByTagNameNS('*', 'tbl')].find((candidate) => candidate.getElementsByTagNameNS('*', 'tr').length)
    if (!table) throw new Error('The Word document must contain a table with a header row.')
    const rows = [...table.getElementsByTagNameNS('*', 'tr')].map((row) => [...row.getElementsByTagNameNS('*', 'tc')].map((cell) => [...cell.getElementsByTagNameNS('*', 't')].map((node) => node.textContent || '').join('').trim()))
    const headers = rows.shift() || []
    return rows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file || !onImport) return
    setBusy(true)
    setMessage('')
    try {
      let importedRows
      if (/\.docx$/i.test(file.name)) importedRows = await parseWordDocx(file)
      else if (/\.doc$/i.test(file.name)) importedRows = await parseWord(file)
      else {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        importedRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      }
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
      <div className="relative">
        <button type="button" aria-expanded={exportMenuOpen} onClick={() => setExportMenuOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0092B8] hover:bg-slate-50 hover:text-[#007A99]">
          <Download size={14} /> Export
        </button>
        {exportMenuOpen && <div className="absolute left-0 top-full z-30 mt-1 min-w-36 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button type="button" onClick={() => { exportRows(); setExportMenuOpen(false) }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Excel (.xlsx)</button>
          <button type="button" onClick={() => { exportWord(); setExportMenuOpen(false) }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Word (.doc)</button>
        </div>}
      </div>
      {onImport && <>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.doc,.docx" onChange={importFile} className="hidden" />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0092B8] hover:bg-slate-50 hover:text-[#007A99] disabled:opacity-50">
          <Upload size={14} /> {busy ? 'Importing…' : 'Import'}
        </button>
      </>}
      {showStatus && message && <span role="status" className="text-xs text-slate-500">{message}</span>}
    </div>
  )
}
