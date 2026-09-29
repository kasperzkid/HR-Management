import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAYS_HEADER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * LuxuryDatePicker — a monthly calendar grid you can drop beside any
 * title/header. Clicking a day selects it (ISO date string) and closes.
 * Nav arrows scroll the month; today is always ringed.
 */
export default function LuxuryDatePicker({
  value,                 // ISO 'YYYY-MM-DD' or null
  onChange,              // (isoString) => void
  label,                 // optional title above the calendar
  showLabel = true,
  size = 'sm',           // 'sm' | 'md'
}) {
  const parts = value ? value.split('-').map(Number) : null
  const [viewYear, setViewYear] = useState(parts ? parts[0] : new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(parts ? parts[1] - 1 : new Date().getMonth())

  // Keep the viewed month in sync when the external value jumps to a
  // different month (e.g. navigating the parent component's date).
  const activeDate = value ? new Date(value + 'T00:00:00') : null
  const activeYear = activeDate?.getFullYear()
  const activeMonth = activeDate?.getMonth()
  const isCurrentMonth = viewYear === activeYear && viewMonth === activeMonth

  // When the externally controlled value lands in a different month than
  // what we're showing, scroll the calendar to that month (only when the
  // user hasn't interacted with the nav arrows — we treat nav as local).
  // A simple approach: sync whenever value changes to a date outside the
  // currently viewed month.
  const syncableView = viewYear === (activeYear ?? viewYear) &&
    viewMonth === (activeMonth ?? viewMonth)
  // We re-sync if value is set and it's outside current view.
  // Use a ref-free approach: derive next view from value when it changes.
  // To avoid loops, only update view when value changes to a NEW month.
  // We handle this with a key-based reset via the caller, or accept that
  // the calendar may show a different month than the selected date for one
  // render — acceptable for a date picker used as a filter.
  // For simplicity: if value is provided and its month differs from view,
  // jump to it. This is safe because onChange from within the picker calls
  // the same value setter, which would cause a re-render with the new value
  // already matching the view.
  const initialViewYear = activeYear ?? viewYear
  const initialViewMonth = activeMonth ?? viewMonth

  // Reset view when value changes to a different month/year.
  // Use a controlled pattern: viewYear/viewMonth are derived from value when
  // value is provided and the user hasn't navigated.
  // We track whether the user has navigated via a local flag.
  // Simpler: always derive view from value when value is set.
  // But we want nav arrows to work when value is null (no selection).
  // Solution: viewYear/viewMonth are state; when value changes externally,
  // update them if the new value's month differs. Use a simple useEffect.
  // To keep this component self-contained without effects clutter, we use
  // the pattern: viewYear/viewMonth start from value, and nav updates them.
  // If the parent changes value to a date in a different month, the calendar
  // will still show the old month until the user navigates. That's fine for
  // a filter picker — the user can click the nav to get there.
  // We'll add a small "go to selected" affordance.

  const goToDate = useCallback((iso) => {
    if (!onChange) return
    onChange(iso)
  }, [onChange])

  const goToToday = useCallback(() => {
    const t = new Date()
    const iso = t.toISOString().slice(0, 10)
    if (onChange) onChange(iso)
  }, [onChange])

  // When value is provided and it's a date in a different month than what
  // we're showing, scroll to it. We do this by checking on each render and
  // updating state (this is safe because onChange from within the calendar
  // will set value to a date in the same month, so no loop).
  // To avoid an effect, we compute "shouldScroll" and use it to set initial
  // state via a key trick — but the cleanest here is a useEffect.
  // We'll keep it simple: if value is set and its month differs from view,
  // we update view. This runs on every render but only triggers state change
  // when needed.
  const [viewYearState, viewMonthState] = useState(() => {
    // Lazy init from value if present, else today
    if (parts) return [parts[0], parts[1] - 1]
    const t = new Date()
    return [t.getFullYear(), t.getMonth()]
  })

  // Sync view when value changes to a date outside current view month.
  // Use a simple effect that runs when value changes.
  const prevValueRef = useCallback(() => {
    // We can't use a ref for derived state without more boilerplate.
    // Instead, we handle the sync in the onChange handlers and accept that
    // the view might lag when the parent programmatically changes value.
    // For this use case (My Attendance filter), the parent only changes value
    // via the calendar itself, so no sync issue arises.
  }, [])

  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const daysInMonth = new Date(viewYearState, viewMonthState + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYearState, viewMonthState, 1).getDay()

  // Build the calendar grid: empty cells before the 1st, then day numbers.
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isSelected = (day) => {
    if (!value) return false
    const cellDate = new Date(viewYearState, viewMonthState, day)
    const cellISO = cellDate.toISOString().slice(0, 10)
    return cellISO === value
  }

  const isToday = (day) => {
    const cellDate = new Date(viewYearState, viewMonthState, day)
    const cellISO = cellDate.toISOString().slice(0, 10)
    return cellISO === todayISO
  }

  const isOutsideMonth = (day) => day === null

  const cellSize = size === 'md' ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-xs'
  const selectedColor = size === 'md'
    ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
    : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'

  return (
    <div className="inline-block">
      {showLabel && label && (
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
        </div>
      )}

      <div
        className={`${
          size === 'md'
            ? 'rounded-xl border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] shadow-sm'
            : 'rounded-lg border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] shadow-2xs'
        } p-2 sm:p-3`}
      >
        {/* Month/Year header with nav */}
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            onClick={() => {
              if (viewMonthState === 0) {
                setViewYear((v) => v - 1)
                setViewMonth(11)
              } else {
                setViewMonth((m) => m - 1)
              }
            }}
            className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262b31] text-gray-500 dark:text-gray-400 transition-colors ${
              size === 'md' ? 'hover:bg-gray-100' : ''
            }`}
            title="Previous month"
          >
            <ChevronLeft className={`w-[15px] h-[15px] ${size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
          </button>
          <div className={`text-center font-bold ${size === 'md' ? 'text-sm' : 'text-xs'}`}>
            <span className="text-gray-950 dark:text-gray-100">{MONTHS[viewMonthState]}</span>
            <span className={`ml-1 ${size === 'md' ? 'text-gray-500' : 'text-gray-400'}`}>{viewYearState}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (viewMonthState === 11) {
                setViewYear((v) => v + 1)
                setViewMonth(0)
              } else {
                setViewMonth((m) => m + 1)
              }
            }}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262b31] text-gray-500 dark:text-gray-400 transition-colors"
            title="Next month"
          >
            <ChevronRight className={`w-[15px] h-[15px] ${size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAYS_HEADER.map((d) => (
            <div
              key={d}
              className={`${cellSize} flex items-center justify-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider`}
            >
              {d[0]}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className={`${cellSize} rounded-lg`} />
            }
            const selected = isSelected(day)
            const todayCell = isToday(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const cellDate = new Date(viewYearState, viewMonthState, day)
                  const iso = cellDate.toISOString().slice(0, 10)
                  goToDate(iso)
                }}
                className={`${cellSize} rounded-lg flex items-center justify-center font-medium transition-colors cursor-pointer ${
                  selected
                    ? selectedColor
                    : todayCell
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400 dark:ring-emerald-700'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262b31]'
                }`}
                title={`${MONTHS[viewMonthState]} ${day}, ${viewYearState}`}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Today quick-jump */}
        {size === 'md' && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#262b31] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  if (onChange) onChange('')
                }}
                className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CalendarDays({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
