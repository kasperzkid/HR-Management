import { useEffect, useMemo, useState } from 'react'
import {
  Siren,
  X,
  AlertCircle,
  Loader2,
  Clock,
  Timer,
  TrendingUp,
  TrendingDown,
  LogOut,
  Hourglass,
  ShieldCheck,
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
} from '../lib/workTime'
import { emergencyCheckOutApi, fetchPunchStatusApi } from '../lib/punchApi'
import { PUNCH_FEEDBACK_EVENT, broadcastPunchFeedback } from './PunchWidget'

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

export default function PunchCard({ onEvent }) {
  const user = getCurrentUser()
  const employeeName = user?.name || 'Employee'
  const employeeId = user?.employeeId || user?.email || 'EMP-0000'

  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [emergencyError, setEmergencyError] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [checkOutUnlocked, setCheckOutUnlocked] = useState(false)

  // Clock tick every 30s — re-evaluates windows + countdown
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // Mirror punches made anywhere (header widget or this page)
  useEffect(() => subscribePunch(setPunch), [])

  // Load today's punch state from the backend on mount
  useEffect(() => {
    fetchPunchStatusApi()
      .then(applyPunchStatus)
      .catch(() => {})
  }, [])

  // Show feedback for punches made anywhere
  useEffect(() => {
    const onFeedback = (e) => setFeedback(e.detail)
    window.addEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
    return () => window.removeEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps — `tick` refreshes the clock
  const { minutes, day, dateKey, timeLabel } = useMemo(() => getAddisNow(), [tick])

  // 17:30 unlock check for the check-out hint (mirrors backend rule)
  useEffect(() => {
    setCheckOutUnlocked(minutes >= WORK_END_MINUTES && day >= 1 && day <= 5)
  }, [minutes, day])

  const { checkedIn, checkedOut, checkInAt, checkOutAt } = punch

  const canEmergencyCheckOut = checkedIn && !checkedOut

  // ── Emergency check-out submit (backend notifies HR) ────────
  async function submitEmergency(e) {
    e.preventDefault()
    const reason = remark.trim()
    if (reason.length < 5) {
      setEmergencyError('Please describe the reason (at least 5 characters).')
      return
    }
    setEmergencyError('')

    try {
      setBusy(true)
      const res = await emergencyCheckOutApi(reason)
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
      setEmergencyError(
        err.message ||
          'Could not reach HR. Your check-out was NOT recorded — try again or contact HR directly.'
      )
    } finally {
      setBusy(false)
    }
  }

  // ── Punch stats (zeroed until /api/employer/punch/stats is wired) ──
  const stats = {
    avgLateMin: 0,
    avgEarlyMin: 0,
    overtimeHours: 0,
    pendingCheckOut: checkedIn && !checkedOut,
  }

  const showCheckInBlocked = !checkedIn && !checkedOut

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

      {/* Punch status strip + Emergency button */}
      <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-950 dark:bg-[#3a4149] text-white flex items-center justify-center shrink-0">
              <Timer size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                Today's Punch Status
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Work time: 8:00 AM – 5:30 PM (UTC+3) • Monday to Friday
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status pills */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                checkedIn
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-[#1c2026] dark:text-slate-500 dark:border-[#262b31]'
              }`}
            >
              <CheckCircle2 size={11} />
              {checkedIn ? `In at ${checkInAt}` : 'Not checked in'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                checkedOut
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-[#3a4149] dark:border-[#3a4149]'
                  : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-[#1c2026] dark:text-slate-500 dark:border-[#262b31]'
              }`}
            >
              <LogOut size={11} />
              {checkedOut ? `Out at ${checkOutAt}` : 'Not checked out'}
            </span>

            {/* EMERGENCY CHECK OUT — Attendance section only */}
            <button
              type="button"
              onClick={() => {
                setEmergencyError('')
                setEmergencyOpen(true)
              }}
              disabled={!canEmergencyCheckOut}
              title={
                !checkedIn
                  ? 'Check in first (from the header)'
                  : checkedOut
                  ? 'Day already closed'
                  : 'Leave early with a reason — HR is notified'
              }
              className={`h-10 px-4 rounded-xl border-2 flex items-center gap-2 text-xs font-bold transition-all ${
                canEmergencyCheckOut
                  ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer shadow-sm dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-[#1c2026] dark:border-[#262b31] dark:text-slate-500'
              }`}
            >
              <Siren size={16} />
              Emergency Check Out
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
              feedback.tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
            }`}
          >
            {feedback.tone === 'ok' ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {showCheckInBlocked && (
          <p className="mt-4 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-slate-400" />
            Check-in is accepted between 8:00 AM and 2:00 PM (UTC+3), Monday to Friday only. Check-out
            unlocks at 5:30 PM and is enforced by the server.
          </p>
        )}
      </div>

      {/* Emergency remark modal */}
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
    </div>
  )
}
