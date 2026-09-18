import { useState, useRef, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react'

// Single-date calendar picker returning "YYYY-MM-DD" strings.
// Styled to match the LuxuryDateRangePicker used elsewhere in the app.

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)

const parseDate = (val) => {
  if (!val) return null
  const d = new Date(`${val}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const toISO = (d) => {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const fmtLabel = (val) => {
  const d = parseDate(val)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}

const isSameDay = (a, b) => {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return x === y
}

export default function LuxuryDatePicker({ value, onChange, maxDate, minDate, placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => parseDate(value) || new Date())
  const [view, setView] = useState('calendar') // 'calendar' | 'years'
  const [yearPage, setYearPage] = useState(() => {
    const base = (value ? parseDate(value) : new Date()).getFullYear()
    return Math.floor(base / 12)
  })
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selected = parseDate(value)
  const maxD = parseDate(maxDate)
  const minD = parseDate(minDate)

  const handleSelect = (day) => {
    if (maxD && day > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate())) return
    if (minD && day < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate())) return
    onChange(toISO(day))
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setOpen(false)
  }

  const switchView = () => {
    const base = currentMonth.getFullYear()
    setYearPage(Math.floor(base / 12))
    setView((v) => (v === 'calendar' ? 'years' : 'calendar'))
  }

  const goYearPage = (dir) => setYearPage((p) => p + dir)

  const yearGrid = []
  const pageStart = yearPage * 12
  for (let i = 0; i < 12; i++) yearGrid.push(pageStart + i)

  const maxYear = maxD ? maxD.getFullYear() : new Date().getFullYear()
  const minYear = minD ? minD.getFullYear() : maxYear - 120

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
  const totalDays = new Date(year, month + 1, 0).getDate()

  const days = []
  for (let i = 0; i < firstDayIndex; i++) days.push(null)
  for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i))

  const todayTime = new Date()
  todayTime.setHours(0, 0, 0, 0)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 px-3 pr-8 rounded-lg border border-gray-300 dark:border-[#33383f] text-xs font-medium text-slate-800 dark:text-gray-200 bg-white dark:bg-[#15181d] hover:border-gray-400 dark:hover:border-gray-600 flex items-center justify-between shadow-xs transition-colors cursor-pointer text-left gap-2"
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarIcon size={14} className="text-blue-600 shrink-0" />
          <span className={`truncate ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
            {selected ? fmtLabel(value) : placeholder}
          </span>
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              clear()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                clear()
              }
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            aria-label="Clear date"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-xl bg-white dark:bg-[#15181d] overflow-hidden text-slate-800 dark:text-gray-200 p-3">
          {view === 'calendar' && (
            <>
              <div className="flex items-center justify-between h-9 mb-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((p) => new Date(p.getFullYear() - 1, p.getMonth(), 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                  title="Previous year"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((p) => addMonths(p, -1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={switchView}
                  className="text-xs font-semibold text-slate-900 dark:text-gray-100 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                  title="Pick year"
                >
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((p) => addMonths(p, 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((p) => new Date(p.getFullYear() + 1, p.getMonth(), 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                  title="Next year"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center mb-1">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="text-[11px] font-medium text-slate-400 py-1">
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {days.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="h-8" />
                  const dayTime = day.getTime()
                  const isPastToday = dayTime < todayTime.getTime()
                  const isDisabled = (maxD && dayTime > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate()).getTime()) || (minD && dayTime < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate()).getTime())
                  const isSelected = selected && isSameDay(day, selected)
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelect(day)}
                      className={`h-8 text-xs flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                        isDisabled
                          ? 'text-slate-300 line-through dark:text-gray-600'
                          : isSelected
                          ? 'bg-blue-600 text-white font-bold rounded-lg shadow-xs'
                          : dayTime === todayTime.getTime()
                          ? 'text-blue-700 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-[#1c2026] rounded-lg'
                          : isPastToday
                          ? 'text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-[#1c2026] rounded-lg'
                          : 'text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#1c2026] rounded-lg'
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {view === 'years' && (
            <>
              <div className="flex items-center justify-between h-9 mb-2">
                <button
                  type="button"
                  onClick={() => goYearPage(-1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-900 dark:text-gray-100">
                  {pageStart} – {pageStart + 11}
                </span>
                <button
                  type="button"
                  onClick={() => goYearPage(1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {yearGrid.map((y) => {
                  const disabled = y > maxYear || y < minYear
                  const isCurrent = y === currentMonth.getFullYear()
                  return (
                    <button
                      key={y}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const keep = Math.min(month, 11)
                        setCurrentMonth(new Date(y, keep, 1))
                        setView('calendar')
                      }}
                      className={`h-8 text-xs flex items-center justify-center rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed ${
                        disabled
                          ? 'text-slate-300 dark:text-gray-600'
                          : isCurrent
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}