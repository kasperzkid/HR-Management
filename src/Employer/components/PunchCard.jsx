import { useEffect, useMemo, useState } from 'react'
import {
  Siren,
  X,
  AlertCircle,
  Loader2,
  Clock,
  TrendingUp,
  TrendingDown,
  Hourglass,
  CheckCircle2,
} from 'lucide-react'
import { getCurrentUser } from '../lib/currentUser'
import {
  getAddisNow,
  remainingLabel,
  getPunchState,
  subscribePunch,
  applyPunchStatus,
  WORK_END_MINUTES,
  WORK_START_MINUTES,
  isWorkDay,
} from '../lib/workTime'
import { emergencyCheckOutApi, fetchPunchStatusApi } from '../lib/punchApi'
import { broadcastPunchFeedback } from './PunchWidget'
import { getPunchLocation, PUNCH_RADIUS_METERS, formatDistance } from '../lib/geo'
import GeoBlockModal from './GeoBlockModal'

// ─────────────────────────────────────────────────────────────
// Attendance page — punch status + emergency check-out.
// The Punch Card was removed: check-in / check-out live in the
// header (PunchWidget). This page shows status cards (average
// late, early departures, overtime, pending check-out) and the
// Emergency Check-Out button (backend-notified to HR).
// ─────────────────────────────────────────────────────────────

function StatusCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
    </div>
  )
}

export function EmergencyCheckOutButton({ onEvent }) {
  const user = getCurrentUser()
  const employeeName = user?.name || 'Employee'
  const employeeId = user?.employeeId || user?.email || 'EMP-0000'

  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [emergencyError, setEmergencyError] = useState('')
  const [busy, setBusy] = useState(false)
  const [geoBlock, setGeoBlock] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => subscribePunch(setPunch), [])

  useEffect(() => {
    fetchPunchStatusApi()
      .then(applyPunchStatus)
      .catch(() => {})
  }, [])

  const { minutes, day, dateKey, timeLabel } = useMemo(() => getAddisNow(), [tick])
  const { checkedIn, checkedOut, checkInAt } = punch

  const canEmergencyCheckOut =
    checkedIn && !checkedOut && isWorkDay(day) && minutes >= WORK_START_MINUTES && minutes < WORK_END_MINUTES

  async function submitEmergency(e) {
    e.preventDefault()
    if (!canEmergencyCheckOut || busy) return

    const reason = remark.trim()
    if (reason.length < 5) {
      setEmergencyError('Please describe the reason (at least 5 characters).')
      return
    }
    setEmergencyError('')

    try {
      setBusy(true)
      const coords = await getPunchLocation()
      if (coords.distanceMeters > PUNCH_RADIUS_METERS) {
        setGeoBlock(
          `You are ${formatDistance(coords.distanceMeters)} from the office. Emergency check-out is blocked outside the ${PUNCH_RADIUS_METERS}m radius.`
        )
        setEmergencyOpen(false)
        setRemark('')
        return
      }
      const res = await emergencyCheckOutApi(reason, coords)
      applyPunchStatus({
        checkedIn: true,
        checkedOut: true,
        checkOut: res.record?.checkOut,
      })
      broadcastPunchFeedback({
        tone: 'ok',
        text: res.message || 'Emergency check-out recorded. HR has been notified.',
      })
      onEvent?.({ type: 'emergency-check-out', date: dateKey, time: timeLabel })
      setEmergencyOpen(false)
      setRemark('')
    } catch (err) {
      if (err.code === 'OUTSIDE_PUNCH_RADIUS' || err.code === 'LOCATION_REQUIRED') {
        setGeoBlock(String(err.message || 'You must be inside the office for an emergency check-out.'))
        setEmergencyOpen(false)
        setRemark('')
      } else {
        setEmergencyError(
          err.message ||
            'Could not reach HR. Your check-out was NOT recorded — try again or contact HR directly.'
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!canEmergencyCheckOut || busy) return
          setEmergencyError('')
          setEmergencyOpen(true)
        }}
        disabled={!canEmergencyCheckOut || busy}
        title={
          !checkedIn
            ? 'Check in first (from the header)'
            : checkedOut
            ? 'Day already closed'
            : !isWorkDay(day)
            ? 'Emergency check-out is unavailable on weekends'
            : minutes < WORK_START_MINUTES
            ? 'Emergency check-out opens at 8:00 AM (UTC+3)'
            : minutes >= WORK_END_MINUTES
            ? 'Use Check Out after 5:30 PM (UTC+3)'
            : 'Leave early with a reason — HR is notified'
        }
        className={`h-9 px-3 rounded-lg border-2 flex items-center gap-1.5 text-[11px] font-bold transition-all ${
          canEmergencyCheckOut && !busy
            ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer shadow-xs dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-[#1c2026] dark:border-[#262b31] dark:text-slate-500'
        }`}
      >
        Emergency Check Out
      </button>

      {emergencyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#15181d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#262b31] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between bg-rose-50/70 dark:bg-[#1c2026]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <Siren size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                    Emergency Check-Out
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    HR Manager will be notified immediately
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmergencyOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitEmergency} className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#262b31] p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Employee</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {employeeName} ({employeeId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Checked in at</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {checkInAt}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Departing at</span>
                  <span className="font-mono font-bold text-rose-600">{timeLabel} (UTC+3)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Reason / Remark <span className="text-rose-600">*</span>
                </label>
                <textarea
                  autoFocus
                  rows={4}
                  value={remark}
                  onChange={(e) => {
                    setRemark(e.target.value)
                    if (emergencyError) setEmergencyError('')
                  }}
                  placeholder="e.g. Family emergency — need to leave for St. Paul's Hospital now."
                  className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 resize-none ${
                    emergencyError
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
                  }`}
                />
                {emergencyError && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {emergencyError}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-[#262b31] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#33383f] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {busy ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Siren size={13} /> Confirm & Notify HR
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GeoBlockModal message={geoBlock} onClose={() => setGeoBlock(null)} />
    </>
  )
}

export default function PunchCard() {
  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())
  const [checkOutUnlocked, setCheckOutUnlocked] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => subscribePunch(setPunch), [])

  useEffect(() => {
    fetchPunchStatusApi()
      .then(applyPunchStatus)
      .catch(() => {})
  }, [])

  const { minutes, day } = useMemo(() => getAddisNow(), [tick])
  const { checkedIn, checkedOut, checkOutAt } = punch

  useEffect(() => {
    setCheckOutUnlocked(minutes >= WORK_END_MINUTES && isWorkDay(day))
  }, [minutes, day])

  const stats = {
    avgLateMin: 0,
    avgEarlyMin: 0,
    overtimeHours: 0,
    pendingCheckOut: checkedIn && !checkedOut,
  }

  return (
    <div className="space-y-4">
      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={TrendingUp}
          label="Avg Late Time"
          value={`${stats.avgLateMin}m`}
          hint="Average minutes past 8:00 AM"
          tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        />
        <StatusCard
          icon={TrendingDown}
          label="Avg Early Departure"
          value={`${stats.avgEarlyMin}m`}
          hint="Average minutes before 5:30 PM"
          tone="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        />
        <StatusCard
          icon={Clock}
          label="Overtime"
          value={`${stats.overtimeHours}h`}
          hint="This month"
          tone="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
        />
        <StatusCard
          icon={Hourglass}
          label="Check-out"
          value={stats.pendingCheckOut ? 'Pending' : checkedOut ? 'Done' : 'Not in'}
          hint={
            stats.pendingCheckOut
              ? checkOutUnlocked
                ? 'Unlocked now — 5:30 PM passed'
                : `${remainingLabel(minutes)} until 5:30 PM`
              : checkedOut
              ? `Out at ${checkOutAt}`
              : 'Check in from the header'
          }
          tone={
            stats.pendingCheckOut
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          }
        />
      </div>


    </div>
  )
}
