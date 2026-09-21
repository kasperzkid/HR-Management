import { useEffect, useState } from 'react'
import { BellRing, MessageCircle, Clock } from 'lucide-react'
import { useMessaging } from '../context/messagingStore'
import { getPunchState, subscribePunch } from '../lib/workTime'
import { normalizeStatusLabel, hrStatusClass, punchStatusTone } from '../../lib/attendanceStatus'
import FeedbackModal from './FeedbackModal'
import usePunchSync from '../hooks/usePunchSync'

const TONE_CLASSES = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
  emerald:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-[#262b31] dark:bg-[#1c2026] dark:text-slate-300',
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

// ─────────────────────────────────────────────────────────────
// HrStatusBanner — the employee-facing side of the HR review flow.
// Shows today's attendance status; when HR adjusts the record
// (Acknowledged / Absent / Approved / …) a highlighted banner plus
// a "Send Feedback" button appear. The button opens a modal where
// the employee can message HR about the change.
// ─────────────────────────────────────────────────────────────
export default function HrStatusBanner() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [punch, setPunch] = useState(getPunchState())
  const { contacts, sendMessage } = useMessaging()

  // Mirror the shared punch store (polling + socket kept fresh by usePunchSync).
  useEffect(() => subscribePunch(setPunch), [])

  const hasHrStatus = Boolean(punch?.hrStatus)
  const hasFeedback = Boolean(punch?.hrNote)
  const show = hasHrStatus || hasFeedback

  if (!show) return null

  const statusLabel = normalizeStatusLabel(punch.status)
  const tone = punchStatusTone(punch.status)

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 shadow-2xs ${TONE_CLASSES[tone] || TONE_CLASSES.slate}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <BellRing size={16} />
          </div>
          <div className="text-xs">
            <p className="font-bold">
              HR updated your attendance status
              {statusLabel ? ` — ${statusLabel}` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {punch.hrStatus && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${hrStatusClass(punch.hrStatus)}`}
                >
                  {punch.hrStatus}
                </span>
              )}
              {punch.hrUpdatedAt && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-75">
                  <Clock size={10} /> {timeAgo(punch.hrUpdatedAt)}
                </span>
              )}
            </div>
            {punch.hrNote && (
              <p className="mt-1.5 max-w-prose leading-4 opacity-90">{punch.hrNote}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
        >
          <MessageCircle size={13} />
          Send Feedback
        </button>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        punch={punch}
        contacts={contacts}
        sendMessage={sendMessage}
      />
    </div>
  )
}
