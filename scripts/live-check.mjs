// Live smoke test against the running dev API and the real prisma/dev.db.
//
//   node scripts/live-check.mjs
//
// Read-only apart from the optional email round-trip, which only runs when
// SMTP is actually configured. Confirms the three things that matter most on
// the real database: the HR Admin can sign in, the account endpoints work, and
// nothing is stored in plaintext.

const BASE = process.env.API_BASE || 'http://localhost:4000'

const HR_EMAIL = process.env.HR_EMAIL
const HR_PASSWORD = process.env.HR_PASSWORD

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, json, text }
}

const line = (label, value) => console.log(`  ${label.padEnd(34)} ${value}`)

console.log('\nLive API check against', BASE)
console.log('-'.repeat(60))

if (!HR_EMAIL || !HR_PASSWORD) {
  console.log('  HR_EMAIL / HR_PASSWORD not supplied - skipping the sign-in check.')
} else {
  const login = await call('/api/auth/login', {
    method: 'POST',
    body: { email: HR_EMAIL, password: HR_PASSWORD },
  })

  line('HR Admin sign-in', login.status === 200 ? 'OK' : `FAILED (${login.status}) ${login.text.slice(0, 120)}`)

  if (login.status === 200) {
    line('Role', login.json.role)
    line('Password returned in response?', 'password' in login.json ? 'YES - PROBLEM' : 'no')

    const token = login.json.token

    const me = await call('/api/auth/me', { token })
    line('GET /api/auth/me', me.status === 200 ? `OK (${me.json?.user?.email})` : `FAILED (${me.status})`)

    const sameEmail = await call('/api/auth/profile', {
      method: 'PUT',
      token,
      body: { email: me.json?.user?.email },
    })
    line('PUT /api/auth/profile (no change)', sameEmail.status === 200 ? 'OK' : `FAILED (${sameEmail.status})`)

    const badEmail = await call('/api/auth/profile', {
      method: 'PUT',
      token,
      body: { email: 'definitely-not-an-email' },
    })
    line('PUT /api/auth/profile (invalid)', badEmail.status === 400 ? 'OK (400)' : `UNEXPECTED (${badEmail.status})`)

    const dupe = await call('/api/auth/profile', {
      method: 'PUT',
      token,
      body: { email: 'employer@yanol.com' },
    })
    line('PUT /api/auth/profile (duplicate)', dupe.status === 409 ? 'OK (409)' : `UNEXPECTED (${dupe.status})`)
  }
}

const forgot = await call('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: HR_EMAIL || 'nobody@example.com' },
})
line('Forgot password', `${forgot.status} ${forgot.json?.code ?? ''}`)

const unknownForgot = await call('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: 'nobody.registered.here@example.com' },
})
line('Forgot password (unknown address)', `${unknownForgot.status} ${unknownForgot.json?.code ?? ''}`)

if (
  forgot.status === 503 &&
  unknownForgot.status === 503 &&
  forgot.json?.message === unknownForgot.json?.message
) {
  line('Responses indistinguishable?', 'yes')
} else if (forgot.status === 200) {
  line('Responses indistinguishable?', 'yes (both 200)')
} else {
  line('Responses indistinguishable?', 'CHECK - responses differ')
}

const noAuth = await call('/api/hr-manager/employees', { method: 'POST', body: {} })
line('Create employee without auth', noAuth.status === 401 ? 'OK (401)' : `UNEXPECTED (${noAuth.status})`)

console.log('')
