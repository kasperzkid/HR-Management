import { useEffect, useMemo, useState } from 'react'
import {
  LogIn,
  LogOut,
  Clock,
  CalendarDays,
  Siren,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { getCurrentUser } from '../lib/currentUser'
import { getToken } from '../../lib/auth'
import {
  sendMessageApi,
  startConversationApi,
} from '../../lib/messagesApi'
import {
  getAddisNow,
  isWorkDay,
  isWithinCheckInWindow,
  isCheckOutTime,
  getPunchState,
  setPunchState,
  recordPunch,
  subscribePunch,
} from '../lib/workTime'
import {
  broadcastPunchFeedback,
  PUNCH_FEEDBACK_EVENT,
} from '../lib/punchActions'

// ─────────────────────────────────────────────────────────────
// WORK TIME RULES (UTC+3 — Addis Ababa) — see lib/workTime.js
// Work day:    Mon–Fri, 08:00 → 17:30
// Check-in:    08:00 → 14:00 (disabled after 14:00)
// Check-out:   available at 17:30
// Emergency:   check-out with mandatory remark, notifies HR
//              (Attendance section only)
// Punch state is shared with the header widget via lib/workTime.js
// ─────────────────────────────────────────────────────────────

// Find the HR_MANAGER user id so emergency check-outs land in HR's inbox
async function findHrManagerUserId() {
  const res = await fetch('/api/messages/users', {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Unable to load directory')
  const { users = [] } = await res.json()
  const hr = users.find((u) => u.kind === 'user' && u.subtitle === 'HR Manager')
  return hr ? hr.id : null
}

function StatusPill({ active, tone, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
        active
          ? tone
          : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-[#1c2026] dark:text-slate-500 dark:border-[#262b31]'
      }`}
    >
      {children}
    </span>
  )
}

export default function PunchCard({ onEvent }) {
  const user = getCurrentUser()
  const employeeName = user?.name || 'Employee'
  const employeeId = user?.employeeId || user?.email || 'EMP-0000'

  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState()) // shared state (in/out + times)
  const [busy, setBusy] = useState(null) // 'in' | 'out' | 'emergency'
  const [feedback, setFeedback] = useState(null) // { tone: 'ok'|'err', text }
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [emergencyError, setEmergencyError] = useState('')

  // Re-evaluate the time rules every 30s
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // Mirror punches made anywhere (header widget or this card)
  useEffect(() => subscribePunch(setPunch), [])

  // Show feedback for any punch, including ones made from the header
  useEffect(() => {
    const onFeedback = (e) => setFeedback(e.detail)
    window.addEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
    return () => window.removeEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps — `tick` intentionally refreshes the clock every 30s
  const { day, minutes, dateKey, timeLabel } = useMemo(() => getAddisNow(), [tick])

  const isWeekend = !isWorkDay(day)
  const inWindow = isWithinCheckInWindow(minutes)
  const atCheckOut = isCheckOutTime(minutes)

  const checkedIn = punch.checkedIn
  const checkedOut = punch.checkedOut
  const checkInAt = punch.checkInAt
  const checkOutAt = punch.checkOutAt

  const canCheckIn = !isWeekend && inWindow && !checkedIn && !checkedOut
  const canCheckOut = !isWeekend && atCheckOut && checkedIn && !checkedOut
  const canEmergencyCheckOut = checkedIn && !checkedOut

  const showCheckInBlocked = isWeekend || (!inWindow && !checkedIn && !checkedOut)

  function punchIn() {
    setBusy('in')
    try {
      recordPunch({ type: 'check-in', date: dateKey, time: timeLabel })
      broadcastPunchFeedback({
        tone: 'ok',
        text: `Checked in at ${timeLabel} (UTC+3). Have a productive day!`,
      })
      onEvent?.({ type: 'check-in', date: dateKey, time: timeLabel })
    } finally {
      setBusy(null)
    }
  }

  function punchOut(isEmergency = false) {
    setBusy(isEmergency ? 'emergency' : 'out')
    try {
      recordPunch({
        type: isEmergency ? 'emergency-check-out' : 'check-out',
        date: dateKey,
        time: timeLabel,
      })
      broadcastPunchFeedback({
        tone: 'ok',
        text: isEmergency
          ? `Emergency check-out recorded at ${timeLabel} (UTC+3). HR has been notified with your remark.`
          : `Checked out at ${timeLabel} (UTC+3). See you tomorrow!`,
      })
      onEvent?.({
        type: isEmergency ? 'emergency-check-out' : 'check-out',
        date: dateKey,
        time: timeLabel,
      })
    } finally {
      setBusy(null)
    }
  }

  async function submitEmergency(e) {
    e.preventDefault()
    const reason = remark.trim()
    if (reason.length < 5) {
      setEmergencyError('Please describe the reason (at least 5 characters).')
      return
    }
    setEmergencyError('')

    try {
      setBusy('emergency')
      const hrId = await findHrManagerUserId()
      if (hrId) {
        // Ensure a conversation with HR exists, then notify
        await startConversationApi({ userId: hrId }).catch(() => {})
        await sendMessageApi(
          hrId,
          `🚨 EMERGENCY CHECK-OUT\n${employeeName} (${employeeId}) checked out at ${timeLabel} (UTC+3) on ${dateKey}.\nReason: ${reason}`
        )
      }
      punchOut(true)
      setEmergencyOpen(false)
      setRemark('')
    } catch (err) {
      console.error('Emergency check-out error:', err)
      setEmergencyError(
        'Could not reach HR. Your check-out was NOT recorded — try again or contact HR directly.'
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-[#262b31] bg-gradient-to-r from-slate-50/80 dark:from-[#1c2026] to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-950 dark:bg-[#3a4149] text-white flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-950 dark:text-gray-100">
              Punch Card
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Work time: 8:00 AM – 5:30 PM (UTC+3) • Monday to Friday
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">
            Local time (UTC+3)
          </p>
          <p className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {timeLabel}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill active={isWeekend} tone="bg-amber-50 text-amber-700 border-amber-200">
            <CalendarDays size={11} />
            {isWeekend ? 'Weekend — punches disabled' : 'Work day'}
          </StatusPill>
          <StatusPill active={checkedIn} tone="bg-emerald-50 text-emerald-700 border-emerald-200">
            <LogIn size={11} />
            {checkedIn ? `In at ${checkInAt}` : 'Not checked in'}
          </StatusPill>
          <StatusPill active={checkedOut} tone="bg-slate-900 text-white border-slate-900 dark:bg-[#3a4149] dark:border-[#3a4149]">
            <LogOut size={11} />
            {checkedOut ? `Out at ${checkOutAt}` : 'Not checked out'}
          </StatusPill>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
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

        {/* Punch buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* CHECK IN */}
          <button
            type="button"
            onClick={punchIn}
            disabled={!canCheckIn || busy === 'in'}
            title={
              isWeekend
                ? 'Check-in is disabled on weekends (Sat/Sun)'
                : !inWindow && !checkedIn
                ? 'Check-in opens at 8:00 AM and closes at 2:00 PM (UTC+3)'
                : checkedIn
                ? 'Already checked in'
                : 'Check in'
            }
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
              canCheckIn
                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer shadow-sm dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-[#1c2026] dark:border-[#262b31] dark:text-slate-500'
            }`}
          >
            {busy === 'in' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            <span className="text-sm font-bold">Check In</span>
            <span className="text-[10px] font-medium">
              {isWeekend
                ? 'Weekend'
                : checkedIn
                ? 'Done ✓'
                : inWindow
                ? 'Open now'
                : '8:00 AM–2:00 PM only'}
            </span>
          </button>

          {/* CHECK OUT */}
          <button
            type="button"
            onClick={() => punchOut(false)}
            disabled={!canCheckOut || busy === 'out'}
            title={
              isWeekend
                ? 'Check-out is disabled on weekends (Sat/Sun)'
                : !checkedIn
                ? 'Check in first'
                : !atCheckOut
                ? 'Check-out is available only at 5:30 PM (UTC+3)'
                : checkedOut
                ? 'Already checked out'
                : 'Check out'
            }
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
              canCheckOut
                ? 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 cursor-pointer shadow-sm dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300'
                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-[#1c2026] dark:border-[#262b31] dark:text-slate-500'
            }`}
          >
            {busy === 'out' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogOut size={20} />
            )}
            <span className="text-sm font-bold">Check Out</span>
            <span className="text-[10px] font-medium">
              {isWeekend
                ? 'Weekend'
                : checkedOut
                ? 'Done ✓'
                : !checkedIn
                ? 'Check in first'
                : atCheckOut
                ? 'Open now (5:30 PM)'
                : 'Available at 5:30 PM'}
            </span>
          </button>

          {/* EMERGENCY CHECK OUT */}
          <button
            type="button"
            onClick={() => {
              setEmergencyError('')
              setEmergencyOpen(true)
            }}
            disabled={!canEmergencyCheckOut}
            title={
              !checkedIn
                ? 'Check in first before an emergency check-out'
                : 'Leave early with a reason — HR is notified'
            }
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
              canEmergencyCheckOut
                ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer shadow-sm dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-[#1c2026] dark:border-[#262b31] dark:text-slate-500'
            }`}
          >
            <Siren size={20} />
            <span className="text-sm font-bold">Emergency</span>
            <span className="text-[10px] font-medium">
              {checkedIn ? 'Leave early + notify HR' : 'Check in first'}
            </span>
          </button>
        </div>

        {showCheckInBlocked && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-slate-400" />
            {isWeekend
              ? 'Today is a weekend — check-in and check-out are disabled.'
              : 'Check-in is accepted between 8:00 AM and 2:00 PM (UTC+3), Monday to Friday only. Check-out opens at 5:30 PM.'}
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
                  disabled={busy === 'emergency'}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {busy === 'emergency' ? (
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
