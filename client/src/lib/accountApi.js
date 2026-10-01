// The signed-in user's own account (name and login email).
//
// Backed by GET /api/auth/me and PUT /api/auth/profile. The email set here is
// the address used to sign in AND the address "Forgot password" sends the
// reset link to, so changing it moves both with no other configuration.

import { authHeaders } from './hrApi'

const API_BASE = '/api/auth'

async function accountFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(
      options.body
        ? { 'Content-Type': 'application/json' }
        : {},
    ),
  })

  const text = await res.text().catch(() => '')
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    let message = data.message
    if (!message) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        message = 'Server is temporarily unavailable. Please make sure the server is running.'
      } else if (res.status === 401) {
        message = 'Your session has expired. Please log in again.'
      } else {
        message = `Request failed: ${res.status}`
      }
    }
    const error = new Error(message)
    error.code = data.code
    throw error
  }

  return data
}

export const fetchMyAccount = () => accountFetch('/me')

export const updateMyAccount = (payload) =>
  accountFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

// Re-send the confirmation link for an email change that is still pending.
export const resendEmailVerificationApi = () =>
  accountFetch('/email-change/resend', {
    method: 'POST',
  })

export const changePasswordApi = (payload) =>
  accountFetch('/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

// Confirming an email change happens from the emailed link, where the visitor
// is not signed in yet, so it deliberately carries no auth header.
export async function verifyEmailApi(token) {
  const res = await fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(
      data?.message ||
        'This confirmation link could not be used.',
    )
    error.code = data?.code
    throw error
  }

  return data
}
