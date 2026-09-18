import { getAddisNow, isWorkDay, isWithinCheckInWindow, isCheckOutTime, getPunchState, setPunchState, recordPunch } from './workTime'

// Punch handler used by the header widget. Validates the work-time rules,
// updates the shared punch state, and broadcasts a feedback event so any
// mounted UI (header toast / Attendance punch card) can show a confirmation.

export const PUNCH_FEEDBACK_EVENT = 'punch-feedback'

export function broadcastPunchFeedback(detail) {
  window.dispatchEvent(new CustomEvent(PUNCH_FEEDBACK_EVENT, { detail }))
}

function nowLabel() {
  return getAddisNow()
}

export function punch(type) {
  const { day, minutes, dateKey, timeLabel } = nowLabel()
  const state = getPunchState()

  if (!isWorkDay(day)) {
    broadcastPunchFeedback({ tone: 'err', text: 'Weekend — punching is disabled (Mon–Fri only).' })
    return
  }

  if (type === 'check-in') {
    if (state.checkedIn) {
      broadcastPunchFeedback({ tone: 'err', text: `Already checked in at ${state.checkInAt}.` })
      return
    }
    if (state.checkedOut) {
      broadcastPunchFeedback({ tone: 'err', text: 'Day already closed — you already checked out.' })
      return
    }
    if (!isWithinCheckInWindow(minutes)) {
      broadcastPunchFeedback({ tone: 'err', text: 'Check-in is closed (08:00 – 14:00 UTC+3 only).' })
      return
    }
    setPunchState({ busy: 'in' })
    recordPunch({ type: 'check-in', date: dateKey, time: timeLabel })
    setPunchState({ busy: null })
    broadcastPunchFeedback({ tone: 'ok', text: `Checked in at ${timeLabel} (UTC+3). Have a productive day!` })
    return
  }

  if (type === 'check-out') {
    if (state.checkedOut) {
      broadcastPunchFeedback({ tone: 'err', text: `Already checked out at ${state.checkOutAt}.` })
      return
    }
    if (!state.checkedIn) {
      broadcastPunchFeedback({ tone: 'err', text: 'Check in first before checking out.' })
      return
    }
    if (!isCheckOutTime(minutes)) {
      broadcastPunchFeedback({ tone: 'err', text: 'Check-out opens at 5:30 PM (17:30 UTC+3).' })
      return
    }
    setPunchState({ busy: 'out' })
    recordPunch({ type: 'check-out', date: dateKey, time: timeLabel })
    setPunchState({ busy: null })
    broadcastPunchFeedback({ tone: 'ok', text: `Checked out at ${timeLabel} (UTC+3). See you tomorrow!` })
  }
}
