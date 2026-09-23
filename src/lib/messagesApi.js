import { getToken } from './auth'

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    ...(token && !token.startsWith('session-') ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  if (!token || token.startsWith('session-')) {
    throw new Error('Local session mode')
  }

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

export const updateMessageApi = (contactId, messageId, text) =>
  apiFetch(`/${contactId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({ text }),
  })

export const deleteMessageApi = (contactId, messageId) =>
  apiFetch(`/${contactId}/messages/${messageId}`, { method: 'DELETE' })

export const bulkDeleteMessagesApi = (contactId, ids) =>
  apiFetch(`/${contactId}/messages/bulk`, {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  })

export const sendAttachmentApi = (contactId, file, caption) => {
  const form = new FormData()
  form.append('file', file)
  if (caption && caption.trim()) form.append('caption', caption.trim())
  return apiFetch(`/${contactId}/upload`, { method: 'POST', body: form })
}

export const markReadApi = (contactId) =>
  apiFetch(`/${contactId}/read`, { method: 'POST' })

export const clearChatApi = (contactId) =>
  apiFetch(`/${contactId}/messages`, { method: 'DELETE' })

export const deleteChatApi = (contactId) =>
  apiFetch(`/${contactId}`, { method: 'DELETE' })