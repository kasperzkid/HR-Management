import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MailCheck,
} from 'lucide-react'

import { verifyEmailApi } from '../lib/accountApi'

/**
 * Confirming a login-email change.
 *
 * The user arrives here from the emailed link, which carries a single-use,
 * time-limited token. Only the server can decide whether that token is valid,
 * so the page never inspects it.
 *
 * The confirm button is deliberate rather than firing on page load. Mail
 * clients and security scanners routinely open links in the background to check
 * them for malware, and an auto-confirming page would let one of those
 * background fetches activate the change without the owner ever seeing it.
 * Making it a click means the address only changes when a person decided to
 * change it.
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [result, setResult] = useState(null)

  // Derived, not stored, so a link with no token explains itself immediately
  // instead of flashing a button that cannot work.
  const missingToken = !token

  async function handleConfirm() {
    setError('')
    setErrorCode('')

    if (missingToken) {
      setError(
        'This confirmation link is missing its security token. Sign in and request a new one from Account Settings.',
      )
      return
    }

    setLoading(true)

    try {
      const data = await verifyEmailApi(token)
      setResult(data)
    } catch (err) {
      setError(
        err?.message ||
          'This confirmation link could not be used.',
      )
      setErrorCode(err?.code || '')
    } finally {
      setLoading(false)
    }
  }

  const recoverable = ['TOKEN_INVALID', 'TOKEN_EXPIRED'].includes(errorCode)

  return (
    <div className="min-h-full bg-[#F3F4F6] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0092B8]">
            YanolTech HR
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Confirm your login email
          </h1>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <div className="p-6 sm:p-7">
            {result ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={25} strokeWidth={1.8} />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  Login email updated
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  {result.message}
                </p>

                {result.user?.email && (
                  <p className="mt-4 inline-block rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800">
                    {result.user.email}
                  </p>
                )}

                <p className="mt-4 text-xs leading-5 text-slate-400">
                  Your old address no longer signs in and no longer receives
                  password reset links.
                </p>

                <Link
                  to="/hr-manager/login"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#007a99] focus:outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  Sign in with your new email
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]">
                    <MailCheck size={19} />
                  </div>
                  <p className="pt-1 text-sm leading-6 text-slate-500">
                    You asked to change the login email address on your account
                    to this one. Confirm it to make the change permanent.
                  </p>
                </div>

                {(error || missingToken) && (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <AlertCircle
                      size={16}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{error}</span>
                  </div>
                )}

                <p className="mb-5 text-xs leading-5 text-slate-400">
                  This link works once and expires. If you did not request this
                  change, close this page and nothing will happen.
                </p>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading || missingToken}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#007a99] focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Confirming...
                    </>
                  ) : (
                    'Confirm this email address'
                  )}
                </button>

                {recoverable && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      How to get a new link
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      Sign in with your current email, open{' '}
                      <span className="font-semibold">
                        Settings → My Account
                      </span>
                      , and press{' '}
                      <span className="font-semibold">
                        Resend confirmation
                      </span>
                      .
                    </p>
                    <Link
                      to="/hr-manager/login"
                      className="mt-3 inline-block text-sm font-bold text-[#0092B8] hover:underline"
                    >
                      Go to sign in
                    </Link>
                  </div>
                )}

                <div className="mt-5 text-center">
                  <Link
                    to="/hr-manager/login"
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Cancel and go back
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
