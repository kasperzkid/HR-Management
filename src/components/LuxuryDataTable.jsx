import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  List,
  LayoutGrid,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react'

/**
 * Built-in Export Modal (Qirb-Alga style)
 */
function ExportModal({ open, onClose, rows = [], columns = [], filename = 'Export' }) {
  const [busy, setBusy] = useState(null)

  if (!open) return null

  const printableColumns = columns.filter((col) => col.key && col.header)

  const exportCsv = () => {
    setBusy('csv')
    try {
      const headers = ['#', ...printableColumns.map((c) => `"${c.header.replace(/"/g, '""')}"`)]
      const csvRows = [headers.join(',')]

      rows.forEach((r, idx) => {
        const row = [
          idx + 1,
          ...printableColumns.map((col) => {
            const rawVal = col.exportValue ? col.exportValue(r) : r[col.key]
            const valStr = rawVal === null || rawVal === undefined ? '' : String(rawVal)
            return `"${valStr.replace(/"/g, '""')}"`
          }),
        ]
        csvRows.push(row.join(','))
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`)
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
                h2 { margin-bottom: 4px; font-size: 18px; color: #0f172a; }
                p { margin-top: 0; font-size: 12px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
                th { background: #f8fafc; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; }
                td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
                tr:nth-child(even) { background-color: #f8fafc; }
              </style>
            </head>
            <body>
              <h2>${filename}</h2>
              <p>Exported on ${new Date().toLocaleString()} • Total Records: ${rows.length}</p>
              <table>
                <thead>
                  <tr>
                    <th style="width: 36px; text-align: center;">#</th>
                    ${printableColumns.map((c) => `<th style="text-align: ${c.align === 'right' ? 'right' : 'left'}">${c.header}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (r, i) => `
                    <tr>
                      <td style="text-align: center; color: #94a3b8; font-family: monospace;">${i + 1}</td>
                      ${printableColumns
                        .map((col) => {
                          const val = col.exportValue ? col.exportValue(r) : r[col.key]
                          return `<td style="text-align: ${col.align === 'right' ? 'right' : 'left'}">${val === null || val === undefined ? '—' : String(val)}</td>`
                        })
                        .join('')}
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
          Choose an export format for <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{filename}</span>.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportPrintPdf}
            disabled={busy === 'pdf'}
            className="rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 p-4 flex flex-col items-center gap-2 text-rose-700 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-6 h-6" />
            <span className="text-xs font-bold">Print / PDF</span>
            {busy === 'pdf' && <span className="text-[10px] text-rose-500">Preparing…</span>}
          </button>

          <button
            onClick={exportCsv}
            disabled={busy === 'csv'}
            className="rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 p-4 flex flex-col items-center gap-2 text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
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

/**
 * Luxury Actions Dropdown — site theme (gray-950 trigger, emerald accent,
 * rose destructive). Actions accept an optional `tone`: 'success' | 'danger'.
 */
const ACTION_TONES = {
  success: {
    item: 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  danger: {
    item: 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300',
    icon: 'text-rose-500 dark:text-rose-400',
  },
  default: {
    item: 'text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-gray-200 dark:hover:bg-[#1c2026] dark:hover:text-gray-100',
    icon: 'text-slate-400 dark:text-gray-400',
  },
}

const toneOf = (action) =>
  ACTION_TONES[action.destructive || action.tone === 'danger' ? 'danger' : action.tone === 'success' ? 'success' : 'default']

function RowActionsDropdown({ primaryAction, dropdownActions = [], row }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('click', handleOutside)
    }
    return () => document.removeEventListener('click', handleOutside)
  }, [open])

  const visibleDropdown = dropdownActions.filter((a) => !a.hidden || !a.hidden(row))
  if (!primaryAction && visibleDropdown.length === 0) return null

  const primaryTone = toneOf(primaryAction || {})

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-lg text-[11px] font-semibold transition-all shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
          open
            ? 'bg-gray-800 text-white dark:bg-[#4a525c]'
            : 'bg-gray-950 text-white hover:bg-gray-800 dark:bg-[#3a4149] dark:hover:bg-[#4a525c]'
        }`}
        title="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>Actions</span>
        <ChevronDown
          className={`w-3 h-3 text-white/80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-44 p-1.5 rounded-xl text-xs z-50 bg-white dark:bg-[#1c2026] shadow-xl border border-slate-200/80 dark:border-[#262b31] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 origin-top-right"
          onClick={(e) => e.stopPropagation()}
        >
          {primaryAction && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                primaryAction.onClick(row)
              }}
              className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold cursor-pointer transition-colors ${primaryTone.item}`}
            >
              {primaryAction.icon && (
                <primaryAction.icon className={`w-3.5 h-3.5 shrink-0 ${primaryTone.icon}`} />
              )}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {visibleDropdown.map((action, idx) => {
            const tone = toneOf(action)
            return (
              <button
                key={idx}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  action.onClick(row)
                }}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium cursor-pointer transition-colors ${tone.item}`}
              >
                {action.icon && <action.icon className={`w-3.5 h-3.5 shrink-0 ${tone.icon}`} />}
                <span>{action.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Universal LuxuryDataTable Component
 * Exact match for Qirb-Alga LuxuryDataTable styling and user experience
 */
export default function LuxuryDataTable({
  title,
  subtitle,
  countBadge,
  columns = [],
  data = [],
  // Search
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchKeys = [], // fields to search in client-side search
  searchTerm: externalSearchTerm,
  onSearchChange: externalOnSearchChange,
  // Filter controls slot
  filterControls,
  // Header action buttons slot
  headerActions,
  // Export configuration
  exportable = true,
  exportFilename = 'Records_Export',
  // Actions
  primaryAction,
  dropdownActions = [],
  renderRowActions,
  // Row interaction
  rowClassName,
  onRowClick,
  // Sorting
  sortable = true,
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  onSort: externalOnSort,
  // View mode
  allowViewModeToggle = false,
  defaultViewMode = 'list',
  renderGridCard,
  // Pagination
  paginated = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  // Controlled pagination (optional)
  currentPage: controlledCurrentPage,
  pageSize: controlledPageSize,
  totalItems: controlledTotalItems,
  onPageChange: controlledOnPageChange,
  onPageSizeChange: controlledOnPageSizeChange,
  // State
  loading = false,
  emptyMessage = 'No matching records found.',
  onResetFilters,
  className = '',
  // Wide-table mode: keep horizontal scrolling on desktop instead of clipping.
  // Pair with `minWidth` (e.g. "1900px") to guarantee comfortable column spacing.
  scrollable = false,
  minWidth,
}) {
  // 1. View Mode (list vs grid)
  const [viewMode, setViewMode] = useState(defaultViewMode)

  // 2. Export modal state
  const [exportOpen, setExportOpen] = useState(false)

  // 3. Client-side Search state (if not controlled)
  const [internalSearch, setInternalSearch] = useState('')
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearch
  const handleSearchChange = (val) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(val)
    } else {
      setInternalSearch(val)
    }
  }

  // 4. Client-side Sorting state (if not controlled)
  const [internalSortBy, setInternalSortBy] = useState(null)
  const [internalSortOrder, setInternalSortOrder] = useState('asc')
  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy
  const sortOrder = externalSortOrder !== undefined ? externalSortOrder : internalSortOrder

  const handleSort = (key) => {
    if (externalOnSort) {
      externalOnSort(key)
    } else {
      if (internalSortBy === key) {
        setInternalSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
      } else {
        setInternalSortBy(key)
        setInternalSortOrder('asc')
      }
    }
  }

  // 5. Client-side Pagination state (if not controlled)
  const [internalPage, setInternalPage] = useState(1)
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize)
  const isControlledPagination = controlledCurrentPage !== undefined

  // Process data with client-side search and sorting if not controlled externally
  const processedData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : []

    // Client-side search if no external search handler is passed
    if (!externalOnSearchChange && searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter((row) => {
        if (searchKeys.length > 0) {
          return searchKeys.some((k) => {
            const val = row[k]
            return val !== null && val !== undefined && String(val).toLowerCase().includes(q)
          })
        }
        // Fallback: search across all string/number columns
        return Object.values(row).some((val) => {
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        })
      })
    }

    // Client-side sort if no external onSort is passed
    if (!externalOnSort && sortBy) {
      result.sort((a, b) => {
        const valA = a[sortBy]
        const valB = b[sortBy]
        if (valA === valB) return 0
        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1

        let comparison = 0
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB
        } else {
          comparison = String(valA).localeCompare(String(valB))
        }
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, searchTerm, searchKeys, externalOnSearchChange, sortBy, sortOrder, externalOnSort])

  // Pagination calculations
  const totalItems = isControlledPagination ? controlledTotalItems ?? data.length : processedData.length
  const currentPage = isControlledPagination ? controlledCurrentPage : internalPage
  const pageSize = isControlledPagination ? controlledPageSize ?? defaultPageSize : internalPageSize
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize || 10)))

  // Reset page when search or data changes (client-side)
  useEffect(() => {
    if (!isControlledPagination && internalPage > totalPages) {
      setInternalPage(1)
    }
  }, [totalPages, isControlledPagination, internalPage])

  const paginatedData = useMemo(() => {
    if (isControlledPagination || !paginated) {
      return processedData
    }
    const start = (currentPage - 1) * pageSize
    return processedData.slice(start, start + pageSize)
  }, [processedData, isControlledPagination, paginated, currentPage, pageSize])

  const startRow = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endRow = Math.min(currentPage * pageSize, totalItems)

  const handlePageChange = (page) => {
    if (isControlledPagination) {
      controlledOnPageChange?.(page)
    } else {
      setInternalPage(page)
    }
  }

  const handlePageSizeChange = (size) => {
    if (isControlledPagination) {
      controlledOnPageSizeChange?.(size)
    } else {
      setInternalPageSize(size)
      setInternalPage(1)
    }
  }

  const handleReset = () => {
    if (externalOnSearchChange) externalOnSearchChange('')
    else setInternalSearch('')
    if (onResetFilters) onResetFilters()
  }

  const hasActiveFilters = Boolean(searchTerm || (filterControls && onResetFilters))

  const badgeText = countBadge !== undefined ? countBadge : `${totalItems} total`

  return (
    <div
      className={`bg-white dark:bg-[#15181d] rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-2xs overflow-hidden text-slate-800 dark:text-gray-200 ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TABLE HEADER & INTEGRATED TOOLBAR (Qirb-Alga Luxury Header)
         ───────────────────────────────────────────────────────────── */}
      {(title || searchable || filterControls || headerActions || exportable || allowViewModeToggle) && (
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#262b31] space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {title && (
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                  <span>{title}</span>
                  {badgeText && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
                      {badgeText}
                    </span>
                  )}
                </h2>
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {/* Live Search Input */}
              {searchable && (
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 shadow-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {searchTerm ? (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  )}
                </div>
              )}

              {/* View Mode Toggle (List vs Grid) */}
              {allowViewModeToggle && renderGridCard && (
                <div className="flex items-center bg-slate-100 dark:bg-[#1c2026] p-0.5 rounded-xl border border-slate-200 dark:border-[#262b31]">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-[#252a32] text-slate-900 dark:text-gray-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    title="Table list view"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-[#252a32] text-slate-900 dark:text-gray-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    title="Grid card view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              )}

              {/* Export Button */}
              {exportable && (
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#252a32] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Export records to CSV/Excel or PDF"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}

              {/* Header Right Custom Action Buttons */}
              {headerActions}
            </div>
          </div>

          {/* Integrated Filter Bar */}
          {filterControls && (
            <div className="pt-2 border-t border-slate-100 dark:border-[#262b31] flex flex-wrap items-center gap-2.5">
              {filterControls}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. GRID VIEW OR TABLE VIEW
         ───────────────────────────────────────────────────────────── */}
      {viewMode === 'grid' && renderGridCard ? (
        <div className="p-4 sm:p-5 bg-slate-50/40 dark:bg-[#121418]">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading records…</span>
              </div>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#1c2026] text-slate-400 flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-gray-300 text-sm">{emptyMessage}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Try adjusting your filter criteria.</p>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#252a32] transition-colors cursor-pointer mt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedData.map((row, idx) => renderGridCard(row, idx))}
            </div>
          )}
        </div>
      ) : (
        <div className={scrollable ? 'overflow-x-auto' : 'overflow-x-auto md:overflow-x-clip'}>
          <table
            className={`w-full text-left text-xs border-collapse ${scrollable ? '' : 'min-w-[700px] md:min-w-0'}`}
            style={scrollable && minWidth ? { minWidth } : undefined}
          >
            <thead>
              <tr className="border-b-2 border-slate-100 dark:border-[#262b31] bg-slate-50/80 dark:bg-[#1c2026] text-slate-500 dark:text-gray-400">
                {/* Mandatory Sequential ID Column # (1, 2, 3...) */}
                <th className="py-3.5 px-3.5 w-12 text-center text-[10.5px] font-bold uppercase tracking-wider">
                  #
                </th>

                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-3.5 px-3.5 text-[10.5px] font-bold uppercase tracking-wider ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.sortable && sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-gray-100 transition-colors cursor-pointer group"
                      >
                        <span>{col.header}</span>
                        {sortBy === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-emerald-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-gray-300" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                ))}

                {/* Actions Column */}
                {(renderRowActions || primaryAction || dropdownActions.length > 0) && (
                  <th className="py-3.5 px-3.5 text-right text-[10.5px] font-bold uppercase tracking-wider pr-4 w-32">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-[#262b31] text-slate-700 dark:text-gray-300 font-normal">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="py-16 text-center text-slate-400 dark:text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Loading records…</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="py-16 text-center text-slate-400 dark:text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#1c2026] text-slate-400 flex items-center justify-center">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-gray-300 text-sm">{emptyMessage}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                          Try adjusting your filter or search criteria.
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleReset}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#252a32] transition-colors cursor-pointer mt-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const rowSequenceNumber = (currentPage - 1) * pageSize + idx + 1
                  return (
                    <tr
                      key={row.id || row.booking_id || row.employeeId || idx}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`${
                        idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-[#181c22]/50' : 'bg-white dark:bg-[#15181d]'
                      } ${
                        onRowClick ? 'cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-[#1c2026]'
                      } ${rowClassName ? rowClassName(row, idx) : ''} transition-colors group`}
                    >
                      {/* Mandatory Sequential ID Number (1, 2, 3...) */}
                      <td className="py-3.5 px-3.5 text-center font-mono font-medium text-slate-300 dark:text-gray-600 text-xs">
                        {rowSequenceNumber}
                      </td>

                      {/* Defined Columns */}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-3.5 px-3.5 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {(() => {
                            const rendered = col.render ? col.render(row, idx) : row[col.key]
                            if (
                              typeof rendered === 'object' &&
                              rendered !== null &&
                              !React.isValidElement(rendered)
                            ) {
                              const fallback = row[col.key]
                              return fallback !== null && fallback !== undefined ? String(fallback) : ''
                            }
                            return rendered
                          })()}
                        </td>
                      ))}

                      {/* Actions Column */}
                      {(renderRowActions || primaryAction || dropdownActions.length > 0) && (
                        <td
                          className="py-2.5 px-3 text-right pr-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderRowActions ? (
                            renderRowActions(row, idx)
                          ) : (
                            <RowActionsDropdown
                              primaryAction={primaryAction}
                              dropdownActions={dropdownActions}
                              row={row}
                            />
                          )}
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
          3. TABLE PAGINATION FOOTER (Qirb-Alga Style)
         ───────────────────────────────────────────────────────────── */}
      {paginated && (
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#262b31] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-gray-400">
          {/* Showing Row Counter */}
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-gray-300">{startRow}–{endRow}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-gray-300">{totalItems}</span> records
          </div>

          {/* Rows per page & page numbers */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Rows per page selector */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="h-7 pl-2 pr-6 border border-slate-200 dark:border-[#262b31] rounded-md bg-white dark:bg-[#1c2026] text-slate-700 dark:text-gray-300 text-xs appearance-none cursor-pointer focus:outline-none"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>

              {/* Render First 3 pages */}
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-7 h-7 rounded-md text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#1c2026]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              {/* Ellipsis if more than 4 pages */}
              {totalPages > 4 && <span className="px-1 text-slate-400">…</span>}

              {/* Last page if totalPages > 3 */}
              {totalPages > 3 && (
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  className={`w-7 h-7 rounded-md text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === totalPages
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#1c2026]'
                  }`}
                >
                  {totalPages}
                </button>
              )}

              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        rows={processedData}
        columns={columns}
        filename={exportFilename}
      />
    </div>
  )
}
