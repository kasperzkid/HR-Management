import { getToken } from './auth'

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  }
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/messages${path}`, {
    ...options,
    headers: authHeaders(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return res.json()
}

export const fetchContactsApi = () => apiFetch('/contacts')

export const fetchUsersApi = () => apiFetch('/users')

export const startConversationApi = (payload) =>
  apiFetch('/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchThreadApi = (contactId) => apiFetch(`/${contactId}`)

export const sendMessageApi = (contactId, text) =>
  apiFetch(`/${contactId}`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })

export const sendAttachmentApi = (contactId, file) => {
  const form = new FormData()
  form.append('file', file)
  return apiFetch(`/${contactId}/upload`, { method: 'POST', body: form })
}

export const markReadApi = (contactId) =>
  apiFetch(`/${contactId}/read`, { method: 'POST' })

export const clearChatApi = (contactId) =>
  apiFetch(`/${contactId}/messages`, { method: 'DELETE' })

export const deleteChatApi = (contactId) =>
  apiFetch(`/${contactId}`, { method: 'DELETE' })