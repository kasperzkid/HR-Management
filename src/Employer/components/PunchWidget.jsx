import { useEffect, useMemo, useState } from 'react'
import { LogIn, LogOut, Loader2, Check, CalendarOff } from 'lucide-react'
import {
  getAddisNow,
  isWorkDay,
  isWithinCheckInWindow,
  isCheckOutTime,
  remainingLabel,
  getPunchState,
  subscribePunch,
  applyPunchStatus,
} from '../lib/workTime'
import {
  fetchPunchStatusApi,
  punchCheckInApi,
  punchCheckOutApi,
} from '../lib/punchApi'
import { getPunchLocation, PUNCH_RADIUS_METERS, formatDistance } from '../lib/geo'
import GeoBlockModal from './GeoBlockModal'

// Tiny event bus for punch feedback toasts (header + Attendance page)
export const PUNCH_FEEDBACK_EVENT = 'punch-feedback'

export function broadcastPunchFeedback(detail) {
  window.dispatchEvent(new CustomEvent(PUNCH_FEEDBACK_EVENT, { detail }))
}

// Header punch widget — ONE button visible at a time:
//   • Before check-in: shows Check In (disabled outside 08:00–14:00)
//   • After check-in:  shows Check Out (visible but DISABLED until 17:30,
//                      with a live remaining-time countdown)
//   • After check-out: shows today's completed times (view-only)
// All rules are enforced by the backend; the UI mirrors the responses.
export default function PunchWidget() {
  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null) // { tone, text }
  const [geoBlock, setGeoBlock] = useState(null) // geo modal message

  // Clock tick every 30s (re-evaluates windows + countdown)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // Mirror punches made anywhere (header or Attendance page)
  useEffect(() => subscribePunch(setPunch), [])

  // Show feedback for any punch (also when triggered from the Attendance page)
  useEffect(() => {
    const onFeedback = (e) => {
      setToast(e.detail)
      setTimeout(() => setToast(null), 5000)
    }
    window.addEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
    return () => window.removeEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
  }, [])

  // Load today's punch state from the backend on mount
  useEffect(() => {
    fetchPunchStatusApi()
      .then(applyPunchStatus)
      .catch(() => applyPunchStatus({ checkedIn: false, checkedOut: false }))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps — `tick` refreshes the clock
  const { minutes, day, timeLabel } = useMemo(() => getAddisNow(), [tick])

  const { checkedIn, checkedOut, checkInAt, checkOutAt } = punch

  const isWeekend = !isWorkDay(day)
  const inWindow = isWithinCheckInWindow(minutes)
  const atCheckOut = isCheckOutTime(minutes)
  const onLeave = punch.onLeave

  const canCheckIn = !onLeave && !isWeekend && inWindow && !checkedIn && !checkedOut
  const canCheckOut = !onLeave && !isWeekend && atCheckOut && checkedIn && !checkedOut

  async function handleCheckIn() {
    setBusy(true)
    try {
      const coords = await getPunchLocation()
      if (coords.distanceMeters > PUNCH_RADIUS_METERS) {
        setGeoBlock(
          `You are ${formatDistance(coords.distanceMeters)} from the office. Check-in is blocked outside the ${PUNCH_RADIUS_METERS}m radius.`
        )
        return
      }
      const res = await punchCheckInApi(coords)
      applyPunchStatus({ checkedIn: true, checkIn: res.record?.checkIn, checkedOut: false })
      broadcastPunchFeedback({
        tone: 'ok',
        text: `${res.message} (${formatDistance(coords.distanceMeters)} from office)`,
      })
    } catch (err) {
      if (err.code === 'OUTSIDE_PUNCH_RADIUS' || err.code === 'LOCATION_REQUIRED') {
        setGeoBlock(String(err.message || 'You must be inside the office to check in.'))
      } else {
        broadcastPunchFeedback({ tone: 'err', text: err.message })
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleCheckOut() {
    setBusy(true)
    try {
      const coords = await getPunchLocation()
      if (coords.distanceMeters > PUNCH_RADIUS_METERS) {
        setGeoBlock(
          `You are ${formatDistance(coords.distanceMeters)} from the office. Check-out is blocked outside the ${PUNCH_RADIUS_METERS}m radius.`
        )
        return
      }
      const res = await punchCheckOutApi(coords)
      applyPunchStatus({ checkedIn: true, checkedOut: true, checkOut: res.record?.checkOut })
      broadcastPunchFeedback({
        tone: 'ok',
        text: `${res.message} (${formatDistance(coords.distanceMeters)} from office)`,
      })
    } catch (err) {
      if (err.code === 'OUTSIDE_PUNCH_RADIUS' || err.code === 'LOCATION_REQUIRED') {
        setGeoBlock(String(err.message || 'You must be inside the office to check out.'))
      } else {
        broadcastPunchFeedback({ tone: 'err', text: err.message })
      }
    } finally {
      setBusy(false)
    }
  }

  const base =
    'h-7 min-w-16 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed'

  // Only ONE pill shows at a time — the relevant action for the current state.
  const showLeave = Boolean(onLeave)
  const showCheckIn = !showLeave && !checkedIn && !checkedOut
  const showCheckOut = !showLeave && checkedIn && !checkedOut
  const showDayComplete = !showLeave && checkedOut

  return (
    <div className="relative flex flex-col items-end w-full max-w-[240px]">
      {/* ON LEAVE — punches disabled */}
      {showLeave && (
        <div
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300"
          title={`On ${onLeave.leaveType} until ${onLeave.endDate} — check-in/check-out is disabled`}
        >
          <CalendarOff size={13} />
          <span className="text-[11px] font-semibold whitespace-nowrap">
            {onLeave.leaveType} until {onLeave.endDate}
          </span>
        </div>
      )}

      {/* CHECK IN — before punch */}
      {showCheckIn && (
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 shadow-xs dark:border-[#262b31] dark:bg-[#0d1015]">
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={!canCheckIn || busy}
            title={
              isWeekend
                ? 'Check-in is disabled on weekends (Sat/Sun)'
                : !inWindow
                ? 'Check-in opens at 8:00 AM and closes at 2:00 PM (UTC+3)'
                : 'Check in'
            }
            className={`${base} ${
              canCheckIn
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                : 'bg-transparent text-gray-400 dark:text-gray-600'
            }`}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
            <span>Check In</span>
          </button>
        </div>
      )}

      {/* CHECK OUT — after check-in */}
      {showCheckOut && (
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 shadow-xs dark:border-[#262b31] dark:bg-[#0d1015]">
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={!canCheckOut || busy}
            title={
              !checkedIn
                ? 'Check in first'
                : atCheckOut
                ? 'Check out'
                : `Check-out unlocks at 5:30 PM — ${remainingLabel(minutes)} remaining`
            }
            className={`${base} ${
              canCheckOut
                ? 'bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500'
                : 'bg-transparent text-amber-600 dark:text-amber-300'
            }`}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            <span>Check Out</span>
          </button>
        </div>
      )}

      {/* DAY COMPLETE — after check-out */}
      {showDayComplete && (
        <div className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-gray-200 bg-gray-50 text-slate-500 text-[11px] font-semibold dark:border-[#262b31] dark:bg-[#0d1015] dark:text-slate-400">
          <Check size={13} />
          <span className="tabular-nums">In {checkInAt}</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="tabular-nums">Out {checkOutAt}</span>
        </div>
      )}

      {/* Toast feedback */}
      {toast && (
        <div
          className={`absolute right-0 top-full mt-2 w-64 rounded-xl border px-3 py-2.5 text-xs font-medium shadow-lg z-50 ${
            toast.tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950 dark:text-rose-300'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Location-blocked popup */}
      <GeoBlockModal message={geoBlock} onClose={() => setGeoBlock(null)} />
    </div>
  )
}
