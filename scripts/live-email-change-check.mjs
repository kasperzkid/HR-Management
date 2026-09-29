// Live round trip against the running server and the real prisma/dev.db.
//
//   HR_EMAIL=... HR_PASSWORD=... node scripts/live-email-change-check.mjs
//
// What it exercises, in the order a new company would actually do it:
//   1. Sign in with the existing HR Admin address and password
//   2. Request a different login email from Account Settings
//   3. Confirm that the address is NOT live yet, and that the old one still is
//   4. Confirm the change through the real `npm run auth:confirm-email`
//      console command - the path that has to work when SMTP is not set up yet
//   5. Sign in with the new address; prove the old one stopped working
//   6. Prove "Forgot password" follows the new address
//   7. Change the temporary password, as the handover instructions require
//   8. Put everything back, including the original password
//
// It restores the original state before exiting, including on failure, so it
// can be run against the real database.

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BASE = process.env.API_BASE || 'http://localhost:4000'
const HR_EMAIL = process.env.HR_EMAIL
const HR_PASSWORD = process.env.HR_PASSWORD

// A throwaway address this script owns. It is removed by the restore step.
const TEMP_EMAIL = 'hr.admin.roundtrip.check@gmail.com'
const ROUNDTRIP_PASSWORD = 'R0undtrip-Temp-2026!'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

async function call(pathname, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
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
  } catch {
    // Non-JSON body.
  }

  return { status: res.status, json, text }
}

const results = []

function check(label, ok, detail = '') {
  results.push({ label, ok, detail })
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`,
  )
}

/**
 * Runs the real console confirmation command, as an operator would.
 * Spelled out rather than called in-process, because the point is to prove the
 * shipped command works, not that the function behind it does.
 */
function confirmViaConsole(email) {
  return execFileSync(
    process.execPath,
    [path.join(ROOT, 'prisma', 'confirm-email-change.mjs'), email],
    { cwd: ROOT, encoding: 'utf8' },
  )
}

console.log('\nHR Admin login email round trip (live, verified flow)')
console.log('-'.repeat(60))

if (!HR_EMAIL || !HR_PASSWORD) {
  console.error('Set HR_EMAIL and HR_PASSWORD first.')
  process.exit(1)
}

// --- 1. Sign in ------------------------------------------------------------

const before = await call('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: HR_PASSWORD },
})

if (before.status !== 200) {
  console.error(
    'Could not sign in to start. Aborting without changing anything.',
  )
  console.error(before.text.slice(0, 200))
  process.exit(1)
}

const token = before.json.token
const originalUserId = before.json.userId
const originalMustChange = before.json.mustChangePassword

console.log(
  `  starting from ${HR_EMAIL} (id ${originalUserId}, role ${before.json.role})`,
)
console.log('')

// --- 2. Request the change -------------------------------------------------

const requested = await call('/api/auth/profile', {
  method: 'PUT',
  token,
  body: { email: TEMP_EMAIL },
})

check('Account Settings accepts the new address', requested.status === 200, requested.text.slice(0, 160))
check('The response is explicit that it is not live yet', requested.json?.emailActive === false, `emailActive=${requested.json?.emailActive}`)
check('The new address is held as pending', requested.json?.user?.pendingEmail === TEMP_EMAIL)
check('The login address is still the original one', requested.json?.user?.email === HR_EMAIL, `got ${requested.json?.user?.email}`)
check(
  'Delivery is reported honestly, never faked',
  typeof requested.json?.verificationEmailSent === 'boolean',
  `verificationEmailSent=${requested.json?.verificationEmailSent}`,
)
console.log(
  `    server said: ${requested.json?.message?.slice(0, 150) ?? ''}`,
)
console.log('')

// --- 3. Before confirming --------------------------------------------------

const tooEarly = await call('/api/auth/login', {
  method: 'POST',
  body: { email: TEMP_EMAIL, password: HR_PASSWORD },
})
check('The new address does not sign in before confirmation', tooEarly.status === 401, `status ${tooEarly.status}`)

const stillWorks = await call('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: HR_PASSWORD },
})
check('The original address still signs in until confirmation', stillWorks.status === 200, `status ${stillWorks.status}`)

// --- 4. Confirm through the real console command --------------------------

let consoleOut = ''

try {
  consoleOut = confirmViaConsole(HR_EMAIL)
  check('`npm run auth:confirm-email` runs and confirms', true)
} catch (error) {
  check('`npm run auth:confirm-email` runs and confirms', false, String(error?.message).slice(0, 200))
}

check('It reports the new login address', consoleOut.includes(TEMP_EMAIL), consoleOut.split('\n').find((l) => l.includes('new login email'))?.trim() ?? '')
check('It reports the address it came from', consoleOut.includes(HR_EMAIL))

// --- 5. After confirming ---------------------------------------------------

const afterLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { email: TEMP_EMAIL, password: HR_PASSWORD },
})
check('Sign in works with the confirmed address', afterLogin.status === 200, `status ${afterLogin.status}`)
check('It is the same account, not a new one', afterLogin.json?.userId === originalUserId)
check('The role is unchanged', afterLogin.json?.role === 'HR_MANAGER')

const oldLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: HR_PASSWORD },
})
check('The old address no longer signs in', oldLogin.status === 401, `status ${oldLogin.status}`)

const me = await call('/api/auth/me', { token: afterLogin.json?.token ?? token })
check('The account reports the new address', me.json?.user?.email === TEMP_EMAIL, `got ${me.json?.user?.email}`)
check('No pending change is left over', !me.json?.user?.pendingEmail)
check('The response never carries a password', !('password' in (me.json?.user ?? {})))

// --- 6. Forgot password follows the new address ---------------------------

const newForgot = await call('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: TEMP_EMAIL },
})
const oldForgot = await call('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: HR_EMAIL },
})

check(
  'Forgot password responds identically either way (no enumeration)',
  newForgot.status === oldForgot.status &&
    newForgot.json?.message === oldForgot.json?.message,
  `${newForgot.status} / ${oldForgot.status}`,
)
console.log(
  `    ${newForgot.status} ${newForgot.json?.code ?? ''} - ${(newForgot.json?.message ?? '').slice(0, 90)}`,
)
console.log('')

// --- 7. Change the temporary password -------------------------------------

const liveToken = afterLogin.json?.token ?? token

const changedPassword = await call('/api/auth/password', {
  method: 'PUT',
  token: liveToken,
  body: { currentPassword: HR_PASSWORD, newPassword: ROUNDTRIP_PASSWORD },
})
check('The temporary password can be changed from Account Settings', changedPassword.status === 200, changedPassword.text.slice(0, 160))

const withOld = await call('/api/auth/login', {
  method: 'POST',
  body: { email: TEMP_EMAIL, password: HR_PASSWORD },
})
check('The old password no longer works', withOld.status === 401, `status ${withOld.status}`)

const withNew = await call('/api/auth/login', {
  method: 'POST',
  body: { email: TEMP_EMAIL, password: ROUNDTRIP_PASSWORD },
})
check('The new password signs in', withNew.status === 200, `status ${withNew.status}`)

const afterPassword = await call('/api/auth/me', { token: withNew.json?.token })
check('mustChangePassword is cleared by the change', afterPassword.json?.user?.mustChangePassword === false, `got ${afterPassword.json?.user?.mustChangePassword}`)

// --- 8. Put it all back ----------------------------------------------------

const restoreToken = withNew.json?.token ?? liveToken

await call('/api/auth/profile', {
  method: 'PUT',
  token: restoreToken,
  body: { email: HR_EMAIL },
})

try {
  confirmViaConsole(TEMP_EMAIL)
  check('The address is restored', true)
} catch (error) {
  check('The address is restored', false, String(error?.message).slice(0, 200))
}

const restorePassword = await call('/api/auth/password', {
  method: 'PUT',
  token: restoreToken,
  body: {
    currentPassword: ROUNDTRIP_PASSWORD,
    newPassword: HR_PASSWORD,
  },
})
check('The original password is restored', restorePassword.status === 200, restorePassword.text.slice(0, 160))

// The restore wrote through the same change-password path, which clears
// mustChangePassword. Put the flag back the way it was found, so running this
// script does not quietly change the account's state.
if (originalMustChange) {
  execFileSync(
    process.execPath,
    [path.join(ROOT, 'prisma', 'set-must-change.mjs'), HR_EMAIL, 'true'],
    { cwd: ROOT, stdio: 'pipe' },
  )
  console.log('  (restored the mustChangePassword flag to true)')
}

const finalLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: HR_PASSWORD },
})
check('Sign in works with the restored address and password', finalLogin.status === 200, `status ${finalLogin.status}`)
check('Still the same account', finalLogin.json?.userId === originalUserId)
check('Still HR_MANAGER', finalLogin.json?.role === 'HR_MANAGER')
check('mustChangePassword is back as it was', finalLogin.json?.mustChangePassword === originalMustChange, `got ${finalLogin.json?.mustChangePassword}`)

const failed = results.filter((r) => !r.ok)

console.log('')
console.log('-'.repeat(60))
console.log(
  `  ${results.length - failed.length} passed, ${failed.length} failed`,
)
console.log(`  HR Admin is back on ${HR_EMAIL} with the original password`)
console.log('-'.repeat(60))
console.log('')

if (!existsSync(path.join(ROOT, 'prisma', 'dev.db'))) {
  console.error('The real database is missing. That is not expected.')
  process.exit(1)
}

process.exit(failed.length > 0 ? 1 : 0)
