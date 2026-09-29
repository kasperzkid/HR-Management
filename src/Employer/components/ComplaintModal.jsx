import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  COMPLAINT_CATEGORIES,
  DEFAULT_COMPLAINT_CATEGORY,
  buildComplaintText,
} from '../lib/complaints'

// ─────────────────────────────────────────────────────────────
// ComplaintModal — lets an Employee raise a formal complaint and
// deliver it straight to the HR Admin inbox. The message is sent
// through the normal messaging pipeline with `isComplain: true`
// so HR sees it flagged inside the conversation thread.
// ─────────────────────────────────────────────────────────────

export default function ComplaintModal({
  open,
  onClose,
  hrContact = null,
  sendMessage,
  defaultCategory = DEFAULT_COMPLAINT_CATEGORY,
  onSent,
}) {
  const [category, setCategory] = useState(defaultCategory)
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Reset the form every time the modal is reopened
  useEffect(() => {
    if (open) {
      // oxlint-disable-next-line react/set-state-in-effect — the form must reset every time the modal reopens
      setCategory(defaultCategory)
      setDetails('')
      setSending(false)
      setSent(false)
      setError('')
    }
  }, [open, defaultCategory])

  if (!open) return null

  const selected = COMPLAINT_CATEGORIES.find((item) => item.value === category)

  async function handleSubmit(event) {
    event.preventDefault()
    const text = details.trim()

    if (!text) {
      setError('Please describe what happened so HR can act on it.')
      return
    }
    if (!hrContact) {
      setError('No HR Admin inbox is available yet. Please try again in a moment.')
      return
    }

    setError('')
    setSending(true)
    try {
      await sendMessage(hrContact.id, buildComplaintText(category, text), { isComplain: true })
      setSending(false)
      setSent(true)
      setDetails('')
      onSent?.(hrContact)
      window.setTimeout(() => onClose?.(), 1600)
    } catch {
      setSending(false)
      setError('Could not deliver your complaint. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-[#262b31] dark:bg-[#15181d]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 bg-slate-50/70 px-6 py-4 dark:border-[#262b31] dark:bg-[#1c2026]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                Send a complaint to HR Admin
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {hrContact
                  ? `Delivered privately to ${hrContact.name} · ${hrContact.roleLabel || 'HR Manager'}`
                  : 'Waiting for an HR Admin inbox to become available'}
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

        <div className="px-6 py-5 text-xs space-y-4">
          {sent ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 size={15} className="shrink-0" />
              <span className="font-semibold">
                Complaint sent to HR Admin — you can follow the reply in your Inbox.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                  <MessageSquare size={13} />
                  <span>
                    What is this about? <span className="text-rose-600">*</span>
                  </span>
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COMPLAINT_CATEGORIES.map((item) => {
                    const active = item.value === category
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCategory(item.value)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${active
                            ? 'border-amber-400 bg-amber-50 dark:border-amber-700/70 dark:bg-amber-950/30'
                            : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-[#33383f] dark:bg-[#15181d] dark:hover:bg-[#1c2026]'
                          }`}
                      >
                        <span
                          className={`block text-[11px] font-bold ${active
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-gray-800 dark:text-gray-200'
                            }`}
                        >
                          {item.value}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-gray-500 dark:text-gray-400">
                          {item.hint}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Details */}
              <div>
                <label
                  htmlFor="complaint-details"
                  className="mb-1 block font-bold text-gray-800 dark:text-gray-200"
                >
                  Tell HR what happened <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="complaint-details"
                  autoFocus
                  rows={5}
                  value={details}
                  onChange={(event) => {
                    setDetails(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Include dates, times and any details that help HR resolve this quickly."
                  className={`w-full resize-none rounded-xl border bg-white px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-1 dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 ${error
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-gray-300 focus:ring-gray-900 dark:border-[#33383f]'
                    }`}
                />
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span>
                    {selected ? `Filed under “${selected.value}”. ` : ''}
                    Only the HR Admin can read this complaint.
                  </span>
                </p>
                {error && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                    <AlertCircle size={11} /> {error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-[#262b31]">
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
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 font-bold text-white shadow-xs transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={13} /> Send complaint
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
