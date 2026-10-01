export function getUser() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getToken() {
  const user = getUser()
  const token = user?.token
  if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string') {
    return null
  }
  return token
}

export async function logout() {
  const token = getToken()
  try {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  } catch {
    // ignore network errors — clear local session regardless
  }
  localStorage.removeItem('user')
}

export function redirectToLogin() {
  localStorage.removeItem('user')
  window.location.href = '/login'
}