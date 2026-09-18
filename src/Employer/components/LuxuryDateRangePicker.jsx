import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react'

export const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

const isSameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)

export function dateRangeToFilter(range) {
  const start = range.from ? new Date(range.from).setHours(0, 0, 0, 0) : null
  const end = range.to ? new Date(range.to).setHours(23, 59, 59, 999) : null
  return { start, end }
}

export function inDateRange(dateValue, range) {
  if (!range || (!range.from && !range.to)) return true
  const t = new Date(dateValue).getTime()
  const { start, end } = dateRangeToFilter(range)
  if (start && t < start) return false
  if (end && t > end) return false
  return true
}

export default function LuxuryDateRangePicker({
  value,
  onChange,
  variant = 'header',
  label = 'Dates',
  placeholder = 'Select dates',
  minDate,
  maxDate,
  minNights = 0,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => (value.from ? new Date(value.from) : new Date()))
  const [tempRange, setTempRange] = useState(value)
  const [hoverDate, setHoverDate] = useState(null)
  const rootRef = useRef(null)

  // Sync temp state when value changes externally or popover opens
  useEffect(() => {
    if (open) {
      setTempRange(value)
      if (value.from) setCurrentMonth(new Date(value.from))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth])

  const handleDayClick = (day) => {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate())
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return

    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      setTempRange({ from: d, to: undefined })
    } else if (tempRange.from && !tempRange.to) {
      if (d <= tempRange.from) setTempRange({ from: d, to: undefined })
      else setTempRange({ from: tempRange.from, to: d })
    }
  }

  const calculatedNights = useMemo(() => {
    if (!tempRange.from || !tempRange.to) return 0
    return Math.max(0, Math.round((tempRange.to.getTime() - tempRange.from.getTime()) / 86400000))
  }, [tempRange.from, tempRange.to])

  const isMinNightsViolated = minNights > 0 && tempRange.from && tempRange.to && calculatedNights < minNights

  const handleApply = () => {
    if (isMinNightsViolated) return
    onChange(tempRange)
    setOpen(false)
  }

  const handleReset = () => {
    const emptyRange = { from: undefined, to: undefined }
    setTempRange(emptyRange)
    onChange(emptyRange)
    setOpen(false)
  }

  const handlePresetSelect = (preset) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (preset === 'all') {
      const r = { from: undefined, to: undefined }
      setTempRange(r)
      onChange(r)
      setOpen(false)
      return
    }
    if (preset === 'today') {
      const end = new Date(today)
      if (minNights > 0) end.setDate(today.getDate() + minNights)
      const r = { from: today, to: end }
      setCurrentMonth(today)
      setTempRange(r)
      onChange(r)
      setOpen(false)
      return
    }
    if (preset === 'this_week') {
      const dayOfWeek = today.getDay()
      const distanceToMon = (dayOfWeek + 6) % 7
      const start = new Date(today)
      start.setDate(today.getDate() - distanceToMon)
      const end = new Date(start)
      end.setDate(start.getDate() + Math.max(6, minNights))
      setCurrentMonth(start)
      const r = { from: start, to: end }
      setTempRange(r)
      onChange(r)
      setOpen(false)
      return
    }
    if (preset === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setCurrentMonth(start)
      const r = { from: start, to: end }
      setTempRange(r)
      onChange(r)
      setOpen(false)
      return
    }
    if (preset === 'last_30') {
      const start = new Date(today)
      start.setDate(today.getDate() - 30)
      setCurrentMonth(start)
      const r = { from: start, to: today }
      setTempRange(r)
      onChange(r)
      setOpen(false)
      return
    }
    if (preset === 'next_30') {
      const end = new Date(today)
      end.setDate(today.getDate() + Math.max(30, minNights))
      setCurrentMonth(today)
      const r = { from: today, to: end }
      setTempRange(r)
      onChange(r)
      setOpen(false)
    }
  }

  const triggerLabel = useMemo(() => {
    if (value.from && value.to) {
      if (isSameDay(value.from, value.to)) return fmtDate(value.from)
      const nights = Math.max(0, Math.round((value.to.getTime() - value.from.getTime()) / 86400000))
      return `${fmtDate(value.from)} – ${fmtDate(value.to)} (${nights}n)`
    }
    if (value.from) return `From: ${fmtDate(value.from)}`
    return placeholder
  }, [value, placeholder])

  const renderMonth = (monthDate, withNav = true) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDayIndex; i++) days.push(null)
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i))

    return (
      <div className="w-64 select-none">
        <div className="flex items-center justify-between h-9 px-1 mb-2">
          {withNav ? (
            <button
              type="button"
              onClick={() => setCurrentMonth((p) => addMonths(p, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-7" />
          )}
          <span className="text-xs font-semibold text-slate-900">
            {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          {withNav ? (
            <button
              type="button"
              onClick={() => setCurrentMonth((p) => addMonths(p, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-7" />
          )}
        </div>

        <div className="grid grid-cols-7 text-center mb-1">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <span key={d} className="text-[11px] font-medium text-slate-400 py-1">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-8" />
            return (
              <DayCell
                key={day.toISOString()}
                day={day}
                tempRange={tempRange}
                hoverDate={hoverDate}
                minDate={minDate}
                maxDate={maxDate}
                onSelect={handleDayClick}
                onHover={setHoverDate}
              />
            )
          })}
        </div>
      </div>
    )
  }

  const presets = [
    { id: 'today', label: minNights > 0 ? `Today (${minNights}n)` : 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_30', label: 'Last 30 Days' },
    { id: 'next_30', label: 'Next 30 Days' },
    { id: 'all', label: 'All Dates' },
  ]

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          variant === 'header'
            ? 'flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#33383f] bg-white dark:bg-[#15181d] text-xs font-medium text-slate-700 dark:text-gray-200 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-[#1c2026] shadow-xs transition-colors cursor-pointer'
            : variant === 'inline'
            ? 'w-full text-left px-5 py-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-[#1c2026] transition-colors'
            : 'w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-[#33383f] text-xs font-medium text-slate-800 dark:text-gray-200 bg-white dark:bg-[#15181d] hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-[#1c2026] flex items-center justify-between shadow-xs transition-colors cursor-pointer text-left'
        }
      >
        {variant === 'inline' ? (
          <>
            <span className="sr-only">{label}</span>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
              <span className="truncate text-sm font-medium text-slate-700 dark:text-gray-200">{triggerLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <>
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <span className="font-semibold truncate">{triggerLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-auto max-w-[95vw] rounded-2xl border border-slate-200 dark:border-[#262b31] shadow-xl bg-white dark:bg-[#15181d] overflow-hidden text-slate-800 dark:text-gray-200">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-44 bg-slate-50/70 dark:bg-[#1c2026] border-b md:border-b-0 md:border-r border-slate-100 dark:border-[#262b31] p-2.5 md:p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 py-0.5 md:px-2 md:py-1 mb-1">
                Quick Ranges
              </div>
              <div className="flex flex-wrap md:flex-col gap-1">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p.id)}
                    className="w-auto md:w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-gray-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-[#252a32] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                {renderMonth(currentMonth, true)}
                <div className="hidden sm:block">{renderMonth(nextMonth, false)}</div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#1c2026] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  {tempRange.from && tempRange.to ? (
                    <span className="font-semibold text-slate-900 dark:text-gray-100">
                      {fmtDate(tempRange.from)} – {fmtDate(tempRange.to)}
                    </span>
                  ) : tempRange.from ? (
                    <span className="text-slate-500 dark:text-gray-400">
                      From: <strong className="text-slate-800 dark:text-gray-100">{fmtDate(tempRange.from)}</strong>
                    </span>
                  ) : (
                    <span className="text-slate-400">Select a date range</span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-gray-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-[#252a32] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    disabled={isMinNightsViolated || !tempRange.from || !tempRange.to}
                    onClick={handleApply}
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Range</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DayCell = ({ day, tempRange, hoverDate, minDate, maxDate, onSelect, onHover }) => {
  const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const isDisabledMin = minDate
    ? dayTime < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime()
    : false
  const isDisabledMax = maxDate
    ? dayTime > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime()
    : false
  const isDisabled = isDisabledMin || isDisabledMax

  const isStart = tempRange.from && isSameDay(day, tempRange.from)
  const isEnd = tempRange.to && isSameDay(day, tempRange.to)
  const isBoth = isStart && isEnd

  const inRange =
    !isDisabled &&
    tempRange.from &&
    tempRange.to &&
    dayTime >= tempRange.from.getTime() &&
    dayTime <= tempRange.to.getTime()

  const inHoverRange =
    !isDisabled &&
    tempRange.from &&
    !tempRange.to &&
    hoverDate &&
    hoverDate > tempRange.from &&
    dayTime >= tempRange.from.getTime() &&
    dayTime <= new Date(hoverDate.getFullYear(), hoverDate.getMonth(), hoverDate.getDate()).getTime()

  let cellBgClass = 'text-slate-700 hover:bg-slate-100 rounded-lg'
  if (isDisabled) cellBgClass = 'text-slate-300 cursor-not-allowed rounded-lg line-through'
  else if (isBoth) cellBgClass = 'bg-blue-600 text-white font-bold rounded-lg shadow-xs'
  else if (isStart) cellBgClass = 'bg-blue-600 text-white font-bold rounded-l-lg rounded-r-none shadow-xs'
  else if (isEnd) cellBgClass = 'bg-blue-600 text-white font-bold rounded-r-lg rounded-l-none shadow-xs'
  else if (inRange) cellBgClass = 'bg-blue-50 text-blue-900 font-medium rounded-none'
  else if (inHoverRange) cellBgClass = 'bg-blue-50/70 text-blue-900 rounded-none'

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onSelect(day)}
      onMouseEnter={() => !isDisabled && onHover(day)}
      className={`h-8 text-xs flex items-center justify-center transition-all ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${cellBgClass}`}
    >
      {day.getDate()}
    </button>
  )
}