import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react'

/**
 * Step 2 of the password reset flow.
 *
 * The user arrives here from the emailed link, which carries a single-use,
 * time-limited token in the query string. The token is posted to the server,
 * which decides whether it is valid, expired or already used. The token is
 * never inspected or validated on the client - only the server can tell.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Derived rather than stored, so a link with no token explains itself on the
  // very first paint instead of flashing an empty form first.
  const missingToken = !token

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (missingToken) {
      setError(
        'This password reset link is missing its security token. Please request a new one.',
      )
      return
    }

    if (!password) {
      setError('Please enter a new password.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password, confirmPassword }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to reset the password.')
      }

      setDone(true)
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err?.message || 'Unable to reset the password.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100'

  return (
    <div className="min-h-full bg-[#F3F4F6] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0092B8]">
            YanolTech HR
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Choose a new password
          </h1>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <div className="p-6 sm:p-7">
            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={25} strokeWidth={1.8} />
                </div>
                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  Password updated
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Your password has been changed. You can now sign in with it.
                </p>
                <Link
                  to="/hr-manager/login"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#007a99] focus:outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]">
                    <Lock size={19} />
                  </div>
                  <p className="pt-1 text-sm leading-6 text-slate-500">
                    Pick a new password for your account. You will use it every
                    time you sign in.
                  </p>
                </div>

                {(error || missingToken) && (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    {error ||
                      'This password reset link is missing its security token. Please request a new one.'}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      New password
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      autoFocus
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Confirm new password
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your new password"
                      className={inputClass}
                    />
                  </label>

                  <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    <Link
                      to="/hr-manager/login"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={loading || missingToken}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#007a99] focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Lock size={16} />
                      )}
                      {loading ? 'Saving…' : 'Update password'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>

        {!done && (
          <p className="mt-4 text-center text-xs text-slate-500">
            Link expired or already used?{' '}
            <Link
              to="/hr-manager/login"
              className="font-semibold text-[#007a99] hover:underline"
            >
              Request a new reset link
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
