import { getToken } from './auth'

const API_BASE = '/api/hr-manager'

export function authHeaders(extra = {}) {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

export async function hrFetch(path, options = {}) {
  const isForm = options.body instanceof FormData
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(
      isForm ? {} : { 'Content-Type': 'application/json', ...(options.headers || {}) }
    ),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

/**
 * Turns a 401 into something the HR admin can actually act on.
 *
 * The server answers an unauthenticated request with the bare words
 * "Authentication required". Shown next to a form the admin just filled in,
 * that reads like a broken button, when the usual cause is simply a session
 * that ran out - login tokens last 8 hours, so it is a normal thing to hit
 * after a long shift.
 *
 * Non-401 failures are left alone and return '', so callers fall through to
 * their own message. This does not weaken anything: the server has already
 * rejected the request by the time this runs, and it only rewords the
 * explanation.
 */
export function describeAuthFailure(response, data) {
  if (response.status !== 401) return ''
  return getToken()
    ? 'Your session has expired. Please log in again, then retry.'
    : 'You are not signed in. Please log in, then retry.'
}

export const fetchEmployeesApi = () => hrFetch('/employees')

export const createEmployeeApi = (payload) =>
  hrFetch('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateEmployeeApi = (id, payload) =>
  hrFetch(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const importEmployeesApi = (file) => {
  const form = new FormData()
  form.append('file', file)
  return hrFetch('/employees/import', {
    method: 'POST',
    body: form,
  })
}

export async function uploadEmployeeFile(file) {
  const form = new FormData()
  form.append('file', file)
  return hrFetch('/uploads', {
    method: 'POST',
    body: form,
  })
}

export async function uploadOrLocal(file) {
  if (!file) return null
  return uploadEmployeeFile(file)
}

export async function downloadEmployeeResume(employeeId) {
  const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(employeeId)}/resume`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to download employee resume')
  }
  return res.blob()
}
