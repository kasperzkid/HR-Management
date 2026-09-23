import { useState } from 'react'
import { MessageCircle, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { normalizeStatusLabel, hrStatusClass } from '../../lib/attendanceStatus'

// ─────────────────────────────────────────────────────────────
// FeedbackModal — shown in the employee portal after HR changes
// the status of the employee's attendance record. The employee
// can reply (a message is sent to HR through the in-app inbox).
// ─────────────────────────────────────────────────────────────

function findHrContact(contacts) {
  return (
    contacts.find((c) => c.role === 'HR_MANAGER') ||
    contacts.find((c) => (c.roleLabel || '').toLowerCase().includes('hr')) ||
    contacts[0] ||
    null
  )
}

export default function FeedbackModal({
  open,
  onClose,
  punch,
  contacts = [],
  sendMessage,
  prefill = '',
}) {
  const [message, setMessage] = useState(prefill)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const hrContact = findHrContact(contacts)

  const statusLabel = normalizeStatusLabel(punch?.status)
  const hrStatusLabel = punch?.hrStatus || null

  async function handleSubmit(e) {
    e.preventDefault()
    const text = message.trim()
    if (!text) {
      setError('Please write a short message for HR.')
      return
    }
    if (!hrContact) {
      setError('No HR contact available yet — try again in a moment.')
      return
    }

    setError('')
    setSending(true)
    try {
      const prefix = `Re: my attendance on ${punch?.date || 'today'} (${statusLabel || 'no status'}) — `
      await sendMessage(hrContact.id, `${prefix}${text}`)
      setSending(false)
      setSent(true)
      setMessage('')
      window.setTimeout(() => {
        setSent(false)
        onClose?.()
      }, 1800)
    } catch {
      setSending(false)
      setError('Could not send the message. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-[#262b31] dark:bg-[#15181d]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 bg-slate-50/70 px-6 py-4 dark:border-[#262b31] dark:bg-[#1c2026]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-[#3a4149]">
              <MessageCircle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                HR Feedback — Attendance
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Your status changed — reply if you have a request
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5 text-xs">
          {/* Status summary */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#262b31] dark:bg-[#1c2026]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400">Attendance status</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {statusLabel || '—'}
              </span>
            </div>
            {hrStatusLabel && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400">HR review</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${hrStatusClass(hrStatusLabel)}`}
                >
                  {hrStatusLabel}
                </span>
              </div>
            )}
            {punch?.hrNote && (
              <p className="rounded-lg bg-white px-2.5 py-2 text-[11px] leading-4 text-gray-700 dark:bg-[#15181d] dark:text-gray-300">
                <span className="font-bold">HR note:</span> {punch.hrNote}
              </p>
            )}
          </div>

          {sent ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 size={14} className="shrink-0" />
              Message sent to HR — they&apos;ll get back to you shortly.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="feedback-message"
                  className="mb-1 block font-bold text-gray-800 dark:text-gray-200"
                >
                  Your message <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="feedback-message"
                  autoFocus
                  rows={4}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="e.g. I believe this should be marked as approved — I submitted a leave request for that day."
                  className={`w-full resize-none rounded-xl border bg-white px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-1 dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 ${
                    error
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-gray-300 focus:ring-gray-900 dark:border-[#33383f]'
                  }`}
                />
                {error && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                    <AlertCircle size={11} /> {error}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-[#262b31]">
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-[#33383f] dark:text-gray-300 dark:hover:bg-[#1c2026]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
                >
                  {sending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={13} /> Send to HR
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
