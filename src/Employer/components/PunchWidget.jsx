import { useEffect, useMemo, useState } from 'react'
import { LogIn, LogOut, Loader2 } from 'lucide-react'
import {
  getAddisNow,
  isWorkDay,
  isWithinCheckInWindow,
  isCheckOutTime,
  getPunchState,
  subscribePunch,
} from '../lib/workTime'
import { punch } from '../lib/punchActions'

// Compact check-in / check-out widget for the header.
// Shares punch state with the Attendance page via lib/workTime.js.
// Emergency check-out intentionally lives only in the Attendance section.
export default function PunchWidget() {
  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())

  // Clock tick every 30s to re-evaluate the time windows
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // Keep in sync with punches made anywhere (header or Attendance page)
  useEffect(() => subscribePunch(setPunch), [])

  // eslint-disable-next-line react-hooks/exhaustive-deps — `tick` refreshes the clock
  const { minutes, day, timeLabel } = useMemo(() => getAddisNow(), [tick])

  const { checkedIn, checkedOut, checkInAt, checkOutAt } = punch

  const isWeekend = !isWorkDay(day)
  const inWindow = isWithinCheckInWindow(minutes)
  const atCheckOut = isCheckOutTime(minutes)

  const canCheckIn = !isWeekend && inWindow && !checkedIn && !checkedOut
  const canCheckOut = !isWeekend && atCheckOut && checkedIn && !checkedOut

  const busy = punch.busy || null

  const disabledIn = !canCheckIn || busy === 'in'
  const disabledOut = !canCheckOut || busy === 'out'

  let inHint = isWeekend ? 'Weekend' : checkedIn ? `In ${checkInAt}` : inWindow ? 'Open' : 'Closes 2:00 PM'
  let outHint = isWeekend ? 'Weekend' : checkedOut ? `Out ${checkOutAt}` : !checkedIn ? '—' : atCheckOut ? 'Open' : '5:30 PM'

  // Shared base styles with the rest of the header icon buttons
  const base =
    'group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer'
  const idle = 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1c2026]'

  return (
    <div className="flex items-center gap-1" title={`Work hours 8:00 AM – 5:30 PM (UTC+3) • Check-in until 2:00 PM • Check-out at 5:30 PM — ${timeLabel}`}>
      {/* CHECK IN */}
      <button
        type="button"
        onClick={() => punch('check-in')}
        disabled={disabledIn}
        className={`${base} ${canCheckIn ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30' : idle}`}
      >
        {busy === 'in' ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
        <span className="hidden xl:inline">Check In</span>
        <span className={`text-[9px] font-bold ${canCheckIn ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {inHint}
        </span>
      </button>

      {/* CHECK OUT */}
      <button
        type="button"
        onClick={() => punch('check-out')}
        disabled={disabledOut}
        className={`${base} ${canCheckOut ? 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30' : idle}`}
      >
        {busy === 'out' ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
        <span className="hidden xl:inline">Check Out</span>
        <span className={`text-[9px] font-bold ${canCheckOut ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {outHint}
        </span>
      </button>
    </div>
  )
}
