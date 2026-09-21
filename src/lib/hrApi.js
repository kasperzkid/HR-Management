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

export const fetchEmployeesApi = () => hrFetch('/employees')

export const createEmployeeApi = (payload) =>
  hrFetch('/employees', {
    method: 'POST',
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

  try {
    const uploaded = await uploadEmployeeFile(file)
    return {
      url: uploaded.url,
      name: uploaded.name || file.name,
      type: uploaded.type || file.type,
      size: uploaded.size || file.size,
    }
  } catch {
    return {
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
    }
  }
}
