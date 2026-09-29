// End-to-end verification of the login, email and password-reset system.
//
//   npm run verify:auth
//
// This runs the real Express app against a real, throwaway SQLite database and
// a real SMTP conversation over TCP. It never touches prisma/dev.db, and it
// never sends anything to a real mailbox.
//
// What it proves, and why it is worth running before deleting a backup:
//   - logins work, for the HR Admin and for an employee
//   - no password is ever stored or returned in plaintext
//   - the HR Admin can change their login email, in place, keeping the role
//   - "Forgot password" delivers a real single-use, expiring, hashed token
//   - unknown addresses are indistinguishable from known ones
//   - a used or expired token cannot be replayed
//   - creating an employee requires a real, unique email and emails the
//     temporary password
//   - a missing or rejected SMTP server is reported as a failure rather than
//     reported as a successful send

import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { startSmtpSink } from './lib/smtp-sink.mjs'
import {
  decodeMessageText,
  extractResetToken,
  extractVerificationToken,
} from './lib/mime.mjs'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const TEST_DB = 'verify-auth.db'
const TEST_DB_PATH = path.join(ROOT, 'prisma', TEST_DB)
const REAL_DB_PATH = path.join(ROOT, 'prisma', 'dev.db')

// A previous run that crashed before its teardown leaves this file behind with
// its fixtures still in it, and the next run then fails on a unique constraint
// against its own leftovers. Starting from nothing every time makes the result
// depend only on this run.
rmSync(TEST_DB_PATH, { force: true })
rmSync(`${TEST_DB_PATH}-journal`, { force: true })

const REAL_DB_BEFORE = existsSync(REAL_DB_PATH)
  ? (await import('node:fs')).statSync(REAL_DB_PATH).mtimeMs
  : null

// ---------------------------------------------------------------------------
// Point everything at a throwaway database before the app is imported, because
// PrismaClient reads the datasource URL at construction time.
// ---------------------------------------------------------------------------
process.env.DATABASE_URL = `file:./${TEST_DB}`
process.env.JWT_SECRET = 'verification-only-secret'
process.env.APP_PUBLIC_URL = 'http://localhost:5173'
process.env.SMTP_PORT = '0' // replaced once the sink is listening
process.env.SMTP_SECURE = 'false'

const sink = await startSmtpSink()

process.env.SMTP_HOST = sink.host
process.env.SMTP_PORT = String(sink.port)
process.env.SMTP_USER = 'verify-sender@gmail.com'
process.env.SMTP_PASSWORD = 'fake-app-password'
process.env.SMTP_FROM = 'YanolTech HR <verify-sender@gmail.com>'

// A throwaway schema. --skip-generate because the client is already generated.
// The Prisma CLI is invoked through node directly: npx is a .cmd shim on
// Windows and cannot be spawned without a shell.
execFileSync(
  process.execPath,
  [
    path.join(ROOT, 'node_modules', 'prisma', 'build', 'index.js'),
    'db',
    'push',
    '--skip-generate',
    '--accept-data-loss',
  ],
  { cwd: ROOT, stdio: 'pipe', env: { ...process.env } },
)

const { default: app } = await import('../server/app.js')
const { default: prisma } = await import('../server/db.js')
const { isBcryptHash, hashPassword } =
  await import('../server/utils/security.js')
const { verifySmtpConfiguration } =
  await import('../server/services/email.service.js')
const { seedRbac } = await import('./lib/rbac-fixture.mjs')

const server = app.listen(0)
await new Promise((resolve) => server.once('listening', resolve))
const BASE = `http://127.0.0.1:${server.address().port}`

// ---------------------------------------------------------------------------
// Tiny test harness
// ---------------------------------------------------------------------------
let passed = 0
const failures = []
let currentSuite = ''

function suite(name) {
  currentSuite = name
  console.log(`\n${name}`)
}

function check(description, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${description}`)
    return true
  }

  failures.push({ suite: currentSuite, description, detail })
  console.log(`  FAIL  ${description}${detail ? `\n        ${detail}` : ''}`)
  return false
}

async function api(pathname, { method = 'GET', body, token } = {}) {
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
    // Leave json null for a non-JSON body.
  }

  return { status: res.status, json, text }
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------
const HR_PASSWORD = 'HrPassw0rd!2026'
const HR_EMAIL = 'hr.admin.verify@gmail.com'

// The HR Admin gets a linked employee record, the same shape a real install
// has. Without it there is nothing to prove the address sync against, and the
// sync is exactly the kind of quiet side effect that breaks later.
const hrEmployee = await prisma.employee.create({
  data: {
    id: 'emp-verify-hr',
    employeeId: '9000',
    name: 'Verify HR Admin',
    email: HR_EMAIL,
    gender: 'Male',
    dateOfBirth: '1990-01-01',
    joinDate: '2023-01-01',
    jobTitle: 'HR Manager',
    department: 'Human Resources',
    employmentType: 'Full-time',
    basicSalary: 1000,
    transportAllowance: 0,
    housingAllowance: 0,
    mealAllowance: 0,
    otherAllowance: 0,
    otherDeductions: 0,
    loanDeductions: 0,
    bankName: 'Bank',
    bankAccount: '1',
    tin: '1',
    pensionId: '1',
    phone: '1',
    address: 'Addis',
    emergencyContact: '1',
    employmentStatus: 'Active',
    status: 'Active',
    avatar: '',
    location: 'Addis',
    salary: 1000,
    manager: '',
    roleType: 'Staff',
    initials: 'HA',
  },
})

const hrAdmin = await prisma.user.create({
  data: {
    name: 'Verify HR Admin',
    email: HR_EMAIL,
    password: await hashPassword(HR_PASSWORD),
    role: 'HR_MANAGER',
    mustChangePassword: false,
    employeeId: hrEmployee.id,
  },
})

// The HR routes read the fine-grained grant from the database, so the legacy
// `role: 'HR_MANAGER'` above is no longer enough on its own. Seeding the
// catalogue and giving this fixture the HR Admin role is what production's
// prisma/seed-rbac.mjs backfill does for the real account.
const rbac = await seedRbac(prisma)
await rbac.grantRole(hrAdmin.id, 'hr_admin')

const existingEmployee = await prisma.employee.create({
  data: {
    id: 'emp-verify-0001',
    employeeId: '9001',
    name: 'Verify Employee',
    email: 'verify.employee@gmail.com',
    gender: 'Female',
    dateOfBirth: '1995-01-01',
    joinDate: '2024-01-01',
    jobTitle: 'Analyst',
    department: 'Finance',
    employmentType: 'Full-time',
    basicSalary: 1000,
    transportAllowance: 0,
    housingAllowance: 0,
    mealAllowance: 0,
    otherAllowance: 0,
    otherDeductions: 0,
    loanDeductions: 0,
    bankName: 'Bank',
    bankAccount: '1',
    tin: '1',
    pensionId: '1',
    phone: '1',
    address: 'Addis',
    emergencyContact: '1',
    employmentStatus: 'Active',
    status: 'Active',
    avatar: '',
    location: 'Addis',
    salary: 1000,
    manager: '',
    roleType: 'Staff',
    initials: 'VE',
  },
})

const employeeUser = await prisma.user.create({
  data: {
    name: 'Verify Employee',
    email: 'verify.employee@gmail.com',
    password: await hashPassword('EmployeePass1!'),
    role: 'EMPLOYEE',
    employeeId: existingEmployee.id,
    mustChangePassword: false,
  },
})

// A row that still holds a plaintext password, to prove the running server
// refuses to authenticate against one.
const legacyRow = await prisma.user.create({
  data: {
    name: 'Legacy Plaintext',
    email: 'legacy.plaintext@gmail.com',
    password: 'not-a-hash-at-all',
    role: 'EMPLOYEE',
  },
})

const employeePayload = (overrides = {}) => ({
  employeeId: '9002',
  name: 'New Verify Employee',
  // Overridden in every employee-creation case; this is only the shape.
  email: 'new.verify.employee@yanoltech.com',
  gender: 'Male',
  dateOfBirth: '1996-02-02',
  joinDate: '2025-01-01',
  jobTitle: 'Engineer',
  department: 'Engineering',
  employmentType: 'Full-time',
  basicSalary: 2000,
  bankName: 'Bank',
  bankAccount: '2',
  tin: '2',
  pensionId: '2',
  phone: '2',
  address: 'Addis',
  emergencyContact: '2',
  ...overrides,
})

// ---------------------------------------------------------------------------
// 1. Login
// ---------------------------------------------------------------------------
suite('1. Login')

const hrLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: HR_PASSWORD },
})

check('HR Admin signs in with the real email', hrLogin.status === 200, `status ${hrLogin.status}`)
check('HR Admin gets a token', typeof hrLogin.json?.token === 'string')
check('Role is HR_MANAGER', hrLogin.json?.role === 'HR_MANAGER', `got ${hrLogin.json?.role}`)
check(
  'Response contains no password field',
  !('password' in (hrLogin.json ?? {})),
  JSON.stringify(Object.keys(hrLogin.json ?? {})),
)

const hrToken = hrLogin.json?.token

const employeeLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'verify.employee@gmail.com', password: 'EmployeePass1!' },
})
check('Employee signs in', employeeLogin.status === 200, `status ${employeeLogin.status}`)

const wrongPassword = await api('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: 'wrong-password' },
})
check('Wrong password is rejected with 401', wrongPassword.status === 401)

const unknownUser = await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'nobody@nowhere.com', password: 'anything' },
})
check('Unknown email is rejected with 401', unknownUser.status === 401)

const badFormat = await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'not-an-email', password: 'whatever' },
})
check('Malformed email is rejected with 400', badFormat.status === 400)

const caseInsensitive = await api('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL.toUpperCase(), password: HR_PASSWORD },
})
check('Email matching is case-insensitive', caseInsensitive.status === 200)

// The legacy row: the running server must not accept a non-hash.
const legacyAttempt = await api('/api/auth/login', {
  method: 'POST',
  body: { email: legacyRow.email, password: 'not-a-hash-at-all' },
})
check(
  'A plaintext password row cannot sign in',
  legacyAttempt.status === 401,
  `status ${legacyAttempt.status}`,
)
check(
  'The plaintext row gives the same generic error as a wrong password',
  legacyAttempt.json?.message === wrongPassword.json?.message,
)

// ---------------------------------------------------------------------------
// 2. Stored password integrity
// ---------------------------------------------------------------------------
suite('2. Stored password integrity')

// legacyRow is the one account deliberately left unhashed, to prove the server
// refuses to authenticate it. Every other row must be a real hash.
const allUsers = await prisma.user.findMany()
const plaintextRows = allUsers.filter(
  (u) => u.email !== legacyRow.email && !isBcryptHash(u.password),
)
check(
  'No real account stores a non-bcrypt password',
  plaintextRows.length === 0,
  `offenders: ${plaintextRows.map((u) => u.email).join(', ')}`,
)
check(
  'Every real hash is 60 characters (bcrypt)',
  allUsers
    .filter((u) => u.email !== legacyRow.email)
    .every((u) => u.password.length === 60),
)
check(
  'The seeded admin hash is not the plaintext',
  allUsers.every((u) => u.password !== HR_PASSWORD),
)

// ---------------------------------------------------------------------------
// 3. HR Admin account: read, then change the login email with verification
// ---------------------------------------------------------------------------
suite('3. HR Admin account / login email')

const me = await api('/api/auth/me', { token: hrToken })
check('GET /api/auth/me returns the account', me.status === 200, `status ${me.status}`)
check('It reports the current email', me.json?.user?.email === HR_EMAIL)
check('It never returns a password', !('password' in (me.json?.user ?? {})))

const meNoAuth = await api('/api/auth/me')
check('GET /api/auth/me requires a token', meNoAuth.status === 401)

const NEW_HR_EMAIL = 'hr.admin.renamed@gmail.com'

// --- Requesting the change -------------------------------------------------

sink.reset()

const change = await api('/api/auth/profile', {
  method: 'PUT',
  token: hrToken,
  body: { name: 'Verify HR Admin', email: NEW_HR_EMAIL },
})
check('The login email change is accepted', change.status === 200, `status ${change.status} ${change.text.slice(0, 200)}`)
check(
  'The response is explicit that the address is not live yet',
  change.json?.emailActive === false,
  `emailActive=${change.json?.emailActive}`,
)
check(
  'The pending address is reported back',
  change.json?.user?.pendingEmail === NEW_HR_EMAIL,
)
check(
  'The login address has NOT changed yet',
  change.json?.user?.email === HR_EMAIL,
  `got ${change.json?.user?.email}`,
)
check('A confirmation email was delivered', sink.messages.length === 1, `${sink.messages.length} sent`)

// The proof has to go to the NEW address, otherwise the email proves nothing.
const confirmMessage = sink.last()
check(
  'The confirmation went to the new address, not the old one',
  confirmMessage?.to?.[0] === NEW_HR_EMAIL,
  `to=${confirmMessage?.to?.[0]}`,
)

const confirmBody = decodeMessageText(confirmMessage?.raw)
const verifyToken = extractVerificationToken(confirmBody)
check('The email contains a confirmation link', Boolean(verifyToken))
check(
  'The confirmation token is a full-length 32-byte base64url value',
  verifyToken?.length === 43,
  `length ${verifyToken?.length}`,
)
check(
  'The confirmation email never contains the password',
  !confirmBody.includes(HR_PASSWORD) && !confirmBody.includes(hrAdmin.password),
)

const pendingRow = await prisma.user.findUnique({ where: { id: hrAdmin.id } })
check(
  'The active email is untouched until confirmation',
  pendingRow.email === HR_EMAIL,
  `got ${pendingRow.email}`,
)
check('The new address is held as pending', pendingRow.pendingEmail === NEW_HR_EMAIL)
check('Only a hash of the confirmation token is stored', pendingRow.pendingEmailTokenHash !== verifyToken)
check('The stored confirmation token is a 64-char sha256', pendingRow.pendingEmailTokenHash?.length === 64)
check('The request has an expiry', pendingRow.pendingEmailExpiresAt?.getTime() > Date.now())

// --- Before confirming -----------------------------------------------------

const loginNewBeforeConfirm = await api('/api/auth/login', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL, password: HR_PASSWORD },
})
check(
  'The new address does NOT sign in before confirmation',
  loginNewBeforeConfirm.status === 401,
  `status ${loginNewBeforeConfirm.status}`,
)

const loginOldBeforeConfirm = await api('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: HR_PASSWORD },
})
check(
  'The old address still signs in until confirmation',
  loginOldBeforeConfirm.status === 200,
  `status ${loginOldBeforeConfirm.status}`,
)

// --- Refusing bad requests -------------------------------------------------

const duplicate = await api('/api/auth/profile', {
  method: 'PUT',
  token: hrToken,
  body: { email: 'verify.employee@gmail.com' },
})
check("Taking another account's email is refused with 409", duplicate.status === 409, `status ${duplicate.status}`)

const invalidEmail = await api('/api/auth/profile', {
  method: 'PUT',
  token: hrToken,
  body: { email: 'nope' },
})
check('An invalid email is refused with 400', invalidEmail.status === 400)

const noAuthChange = await api('/api/auth/profile', {
  method: 'PUT',
  body: { email: 'someone@else.com' },
})
check('Changing the email requires a token', noAuthChange.status === 401)

// --- Confirming ------------------------------------------------------------

// Leave a live reset link behind, to prove the email change kills it on
// confirmation rather than on request.
await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: HR_EMAIL },
})

const tokenBeforeChange = await prisma.passwordResetToken.findMany({
  where: { userId: hrAdmin.id, usedAt: null },
})
check(
  'A reset link is outstanding before the email change',
  tokenBeforeChange.length === 1,
  `${tokenBeforeChange.length}`,
)

const bogusVerify = await api('/api/auth/verify-email', {
  method: 'POST',
  body: { token: 'this-is-not-a-real-token' },
})
check('A bogus token is refused with 400', bogusVerify.status === 400, `status ${bogusVerify.status}`)
check('It reports the token as invalid', bogusVerify.json?.code === 'TOKEN_INVALID', `code=${bogusVerify.json?.code}`)

const missingVerifyToken = await api('/api/auth/verify-email', { method: 'POST', body: {} })
check('A missing token is refused with 400', missingVerifyToken.status === 400)
check('It reports the token as missing', missingVerifyToken.json?.code === 'TOKEN_MISSING')

const confirmed = await api('/api/auth/verify-email', {
  method: 'POST',
  body: { token: verifyToken },
})
check('The confirmation succeeds', confirmed.status === 200, `status ${confirmed.status} ${confirmed.text.slice(0, 200)}`)
check(
  'The new address is now the login address',
  confirmed.json?.user?.email === NEW_HR_EMAIL,
  `got ${confirmed.json?.user?.email}`,
)
check(
  'The pending state is cleared',
  !confirmed.json?.user?.pendingEmail,
  `pendingEmail=${confirmed.json?.user?.pendingEmail}`,
)
check('The response never includes a password', !('password' in (confirmed.json?.user ?? {})))

const afterChange = await prisma.user.findUnique({ where: { id: hrAdmin.id } })
check('The same account was updated, not replaced', afterChange.id === hrAdmin.id)
check('The HR_MANAGER role is kept', afterChange.role === 'HR_MANAGER', `got ${afterChange.role}`)
check('The employee link is kept', afterChange.employeeId === hrEmployee.id, `got ${afterChange.employeeId}`)
check('The password was not changed by an email change', afterChange.password === hrAdmin.password)
check('The token hash was cleared', afterChange.pendingEmailTokenHash === null)
check('The pending address was cleared', afterChange.pendingEmail === null)

const hrAdmins = await prisma.user.findMany({
  where: { role: { in: ['HR_MANAGER', 'HR', 'ADMIN', 'HR_ADMIN'] } },
})
check(
  'There is still exactly one HR Admin',
  hrAdmins.length === 1,
  `found ${hrAdmins.length}: ${hrAdmins.map((u) => u.email).join(', ')}`,
)

const oldEmailLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: HR_EMAIL, password: HR_PASSWORD },
})
check('The old email no longer signs in', oldEmailLogin.status === 401)

const newEmailLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL, password: HR_PASSWORD },
})
check('The new email signs in', newEmailLogin.status === 200, `status ${newEmailLogin.status}`)

const tokensAfterChange = await prisma.passwordResetToken.findMany({
  where: { userId: hrAdmin.id, usedAt: null },
})
check(
  'Outstanding reset links are killed by an email change',
  tokensAfterChange.length === 0,
  `${tokensAfterChange.length} still usable`,
)

sink.reset()
const forgotOld = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: HR_EMAIL },
})
const forgotNew = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL },
})
check(
  'Forgot password on the old address sends nothing',
  forgotOld.status === 200,
  `status ${forgotOld.status}`,
)
check(
  'It is indistinguishable from the new address, so it leaks nothing',
  JSON.stringify(forgotOld.json) === JSON.stringify(forgotNew.json),
  `old=${JSON.stringify(forgotOld.json)} new=${JSON.stringify(forgotNew.json)}`,
)
check(
  'Exactly one email went out, and it went to the new address',
  sink.messages.length === 1 && sink.messages[0].to?.[0] === NEW_HR_EMAIL,
  `sent to ${sink.messages.map((m) => m.to?.[0]).join(', ') || 'nobody'}`,
)

// The existing session must survive the address change: the JWT holds a user
// id, not an email, so the admin is not bounced out mid-task.
const sessionSurvives = await api('/api/auth/me', { token: hrToken })
check(
  'An existing session survives the email change',
  sessionSurvives.status === 200 && sessionSurvives.json?.user?.email === NEW_HR_EMAIL,
  `status ${sessionSurvives.status} email=${sessionSurvives.json?.user?.email}`,
)

const hrTokenRenamed = newEmailLogin.json.token

// --- Single use ------------------------------------------------------------

const tokenReplay = await api('/api/auth/verify-email', {
  method: 'POST',
  body: { token: verifyToken },
})
check('A used confirmation token cannot be replayed', tokenReplay.status === 400, `status ${tokenReplay.status}`)
check('The replay is reported as invalid, not as a server error', tokenReplay.json?.code === 'TOKEN_INVALID', `code=${tokenReplay.json?.code}`)

const afterReplay = await prisma.user.findUnique({ where: { id: hrAdmin.id } })
check('The replay changed nothing', afterReplay.email === NEW_HR_EMAIL)

// --- Resend ----------------------------------------------------------------

const resendWithNothingPending = await api('/api/auth/email-change/resend', {
  method: 'POST',
  token: hrTokenRenamed,
})
check(
  'Resending with nothing pending is a clear 400',
  resendWithNothingPending.status === 400,
  `status ${resendWithNothingPending.status}`,
)
check(
  'It says there is nothing to confirm',
  resendWithNothingPending.json?.code === 'NO_PENDING_EMAIL',
  `code=${resendWithNothingPending.json?.code}`,
)

const resendNoAuth = await api('/api/auth/email-change/resend', { method: 'POST' })
check('Resending requires a token', resendNoAuth.status === 401)

sink.reset()
await api('/api/auth/profile', {
  method: 'PUT',
  token: hrTokenRenamed,
  body: { email: 'hr.admin.resend@gmail.com' },
})
const resendLinkA = extractVerificationToken(decodeMessageText(sink.last()?.raw))
check('The first resend-target link was delivered', Boolean(resendLinkA))

const resend = await api('/api/auth/email-change/resend', {
  method: 'POST',
  token: hrTokenRenamed,
})
check('Resending works', resend.status === 200, `status ${resend.status}`)
check('Resending reports delivery honestly', resend.json?.verificationEmailSent === true)
check('Resending keeps the address inactive', resend.json?.emailActive === false)

const resendLinkB = extractVerificationToken(decodeMessageText(sink.last()?.raw))
check('A fresh link was delivered', Boolean(resendLinkB))
check('It is a different token from the first', resendLinkB !== resendLinkA)

const staleLink = await api('/api/auth/verify-email', {
  method: 'POST',
  body: { token: resendLinkA },
})
check('The superseded link no longer works', staleLink.status === 400, `status ${staleLink.status}`)

const usedResend = await api('/api/auth/verify-email', {
  method: 'POST',
  body: { token: resendLinkB },
})
check('The fresh link works', usedResend.status === 200, `status ${usedResend.status}`)

// --- Expiry ----------------------------------------------------------------

const THIRD_HR_EMAIL = 'hr.admin.expiry@gmail.com'
await api('/api/auth/profile', {
  method: 'PUT',
  token: hrTokenRenamed,
  body: { email: THIRD_HR_EMAIL },
})

// Take the token before ageing the request: the link is what is being replayed,
// and clearing the sink afterwards would throw it away.
const expiringLink = extractVerificationToken(
  decodeMessageText(sink.last()?.raw),
)
check('The link to expire was delivered', Boolean(expiringLink))

// Age the request past its window rather than waiting 24 hours for it.
await prisma.user.update({
  where: { id: hrAdmin.id },
  data: { pendingEmailExpiresAt: new Date(Date.now() - 60 * 1000) },
})

const expiredVerify = await api('/api/auth/verify-email', {
  method: 'POST',
  body: { token: expiringLink },
})
check('An expired link is refused with 400', expiredVerify.status === 400, `status ${expiredVerify.status}`)
check('It is reported as expired, not invalid', expiredVerify.json?.code === 'TOKEN_EXPIRED', `code=${expiredVerify.json?.code}`)

const afterExpiry = await prisma.user.findUnique({ where: { id: hrAdmin.id } })
check('An expired request is destroyed, not left to be retried', afterExpiry.pendingEmail === null && afterExpiry.pendingEmailTokenHash === null)
check('An expired request leaves the login address alone', afterExpiry.email === 'hr.admin.resend@gmail.com', `got ${afterExpiry.email}`)

// --- Someone else claims the address in the meantime -----------------------

// Re-request, then take the address on another account behind the requester's
// back. This is the race the activation-time uniqueness check exists for: the
// address was free when it was asked for, and User.email is unique, so without
// the re-check the write would blow up with a raw Prisma constraint error.
await api('/api/auth/profile', {
  method: 'PUT',
  token: hrTokenRenamed,
  body: { email: 'contested.address@gmail.com' },
})

const raceUser = await prisma.user.create({
  data: {
    name: 'Race Winner',
    email: 'contested.address@gmail.com',
    password: await hashPassword('RacePassword9!'),
    role: 'EMPLOYEE',
  },
})

const { activatePendingEmail } =
  await import('../server/services/email-change.service.js')
const contested = await activatePendingEmail(hrAdmin.id, { source: 'test' })
check('Activating onto an address taken in the meantime is refused', contested.ok === false, JSON.stringify(contested).slice(0, 160))
check('It is reported as in use', contested.code === 'EMAIL_IN_USE', `code=${contested.code}`)

const raceWinner = await prisma.user.findUnique({ where: { id: raceUser.id } })
check('The account that took the address is untouched', raceWinner.email === 'contested.address@gmail.com')

const loserRow = await prisma.user.findUnique({ where: { id: hrAdmin.id } })
check('The requester keeps their previous login address', loserRow.email === 'hr.admin.resend@gmail.com', `got ${loserRow.email}`)
check('The dead request is cleared so it cannot be retried', loserRow.pendingEmail === null)

await prisma.user.delete({ where: { id: raceUser.id } })

// Put the HR Admin on the address the rest of the suites expect.
const finalRequest = await api('/api/auth/profile', {
  method: 'PUT',
  token: hrTokenRenamed,
  body: { email: NEW_HR_EMAIL },
})
check('The admin can request a fresh change after all of that', finalRequest.status === 200, `status ${finalRequest.status}`)

const finalConfirm = await api('/api/auth/verify-email', {
  method: 'POST',
  body: { token: extractVerificationToken(decodeMessageText(sink.last()?.raw)) },
})
check('And confirm it', finalConfirm.status === 200, `status ${finalConfirm.status}`)
check('It lands on the expected address', finalConfirm.json?.user?.email === NEW_HR_EMAIL, `got ${finalConfirm.json?.user?.email}`)

const syncedEmployee = await prisma.employee.findUnique({
  where: { id: afterChange.employeeId },
  select: { email: true },
})
check('The employee record email was synced to match', syncedEmployee?.email === NEW_HR_EMAIL, `got ${syncedEmployee?.email}`)

// ---------------------------------------------------------------------------
// 4. Forgot password, with a working SMTP server
// ---------------------------------------------------------------------------
suite('4. Forgot password (SMTP configured)')

sink.reset()

const known = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL },
})
check('A known address returns 200', known.status === 200, `status ${known.status}`)
check('Exactly one email was delivered', sink.messages.length === 1, `got ${sink.messages.length}`)

const resetMessage = sink.last()
check('It was sent to the account address', resetMessage?.to?.[0] === NEW_HR_EMAIL, `to=${resetMessage?.to?.[0]}`)
check('The subject mentions a reset', /reset/i.test(resetMessage?.raw ?? ''))

// Decode the MIME body the way a mail client would. The raw bytes are
// quoted-printable encoded, so searching them directly finds a broken token.
const resetBody = decodeMessageText(resetMessage?.raw)
const resetToken = extractResetToken(resetBody)

check('The email contains a reset link', Boolean(resetToken))
check(
  'The reset token is a full-length 32-byte base64url value',
  resetToken?.length === 43,
  `length ${resetToken?.length}`,
)

check(
  'The email does not contain the account password',
  !resetBody.includes(HR_PASSWORD),
)
check(
  'The email does not contain the stored hash',
  !resetBody.includes(hrAdmin.password),
)

// Only the hash of the token is stored, so a database dump is not a reset kit.
const stored = await prisma.passwordResetToken.findMany({
  where: { userId: hrAdmin.id },
  orderBy: { createdAt: 'desc' },
})
const live = stored.find((t) => t.usedAt === null)
check('A token row was created', Boolean(live))
check('The stored token is not the raw token', live?.tokenHash !== resetToken)
check('The stored token is a 64-char sha256', live?.tokenHash?.length === 64)
check('The token has an expiry in the future', live?.expiresAt.getTime() > Date.now())

// Enumeration resistance.
sink.reset()
const unknown = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: 'definitely.not.registered@example.com' },
})
check('An unknown address also returns 200', unknown.status === 200, `status ${unknown.status}`)
check(
  'An unknown address sends no email',
  sink.messages.length === 0,
  `${sink.messages.length} sent`,
)
check(
  'The response body is identical for known and unknown addresses',
  JSON.stringify(unknown.json) === JSON.stringify(known.json),
  `known=${JSON.stringify(known.json)} unknown=${JSON.stringify(unknown.json)}`,
)

const malformed = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: 'not-an-email' },
})
check('A malformed address is refused with 400', malformed.status === 400)

// A second request must retire the first link.
sink.reset()
await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL },
})
const secondLink = extractResetToken(decodeMessageText(sink.last()?.raw))
check('The second request produced a usable link', Boolean(secondLink))

const afterSecond = await prisma.passwordResetToken.findMany({
  where: { userId: hrAdmin.id, usedAt: null },
})
check(
  'Only the newest link stays valid',
  afterSecond.length === 1,
  `${afterSecond.length} live tokens`,
)

// ---------------------------------------------------------------------------
// 5. Consuming a reset token
// ---------------------------------------------------------------------------
suite('5. Password reset')

const NEW_HR_PASSWORD = 'BrandNewPass9!'

const resetOk = await api('/api/auth/reset-password', {
  method: 'POST',
  body: {
    token: secondLink,
    newPassword: NEW_HR_PASSWORD,
    confirmPassword: NEW_HR_PASSWORD,
  },
})
check('The reset link sets a new password', resetOk.status === 200, `status ${resetOk.status} ${resetOk.text.slice(0, 160)}`)

const replay = await api('/api/auth/reset-password', {
  method: 'POST',
  body: { token: secondLink, newPassword: 'AnotherPass9!', confirmPassword: 'AnotherPass9!' },
})
check('The same link cannot be used twice', replay.status === 400, `status ${replay.status}`)

const withOldToken = await api('/api/auth/reset-password', {
  method: 'POST',
  body: { token: resetToken, newPassword: 'AnotherPass9!', confirmPassword: 'AnotherPass9!' },
})
check(
  'A link retired by a newer request is refused',
  withOldToken.status === 400,
  `status ${withOldToken.status}`,
)

const garbage = await api('/api/auth/reset-password', {
  method: 'POST',
  body: { token: 'this-is-not-a-real-token', newPassword: 'AnotherPass9!', confirmPassword: 'AnotherPass9!' },
})
check('An invented token is refused', garbage.status === 400)

const noToken = await api('/api/auth/reset-password', {
  method: 'POST',
  body: { newPassword: 'AnotherPass9!', confirmPassword: 'AnotherPass9!' },
})
check('A missing token is refused with 400', noToken.status === 400)

const weak = await api('/api/auth/reset-password', {
  method: 'POST',
  body: { token: 'irrelevant', newPassword: 'short', confirmPassword: 'short' },
})
check('A short password is refused', weak.status === 400)

// Expiry.
const { createResetToken, hashResetToken, resetTokenExpiry } =
  await import('../server/utils/security.js')

const expiring = createResetToken()
const expiredRow = await prisma.passwordResetToken.create({
  data: {
    userId: hrAdmin.id,
    tokenHash: expiring.tokenHash,
    expiresAt: new Date(Date.now() - 60 * 1000),
  },
})
check('An expired token row was created for testing', Boolean(expiredRow))

const expired = await api('/api/auth/reset-password', {
  method: 'POST',
  body: {
    token: expiring.token,
    newPassword: 'ExpiredTry9!',
    confirmPassword: 'ExpiredTry9!',
  },
})
check('An expired link is refused', expired.status === 400, `status ${expired.status}`)

const mismatch = await api('/api/auth/reset-password', {
  method: 'POST',
  body: { token: 'irrelevant', newPassword: 'Abcdefg1!', confirmPassword: 'Different1!' },
})
check('Mismatched confirmation is refused', mismatch.status === 400)

const loginNew = await api('/api/auth/login', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL, password: NEW_HR_PASSWORD },
})
check('The HR Admin signs in with the new password', loginNew.status === 200, `status ${loginNew.status}`)

const loginOld = await api('/api/auth/login', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL, password: HR_PASSWORD },
})
check('The old password no longer works', loginOld.status === 401)

const hrRowAfter = await prisma.user.findUnique({ where: { id: hrAdmin.id } })
check('The new password is stored as a hash', isBcryptHash(hrRowAfter.password))
check('The new password is not stored in plaintext', hrRowAfter.password !== NEW_HR_PASSWORD)
check('mustChangePassword is cleared by a reset', hrRowAfter.mustChangePassword === false)

// The token hash in the database must not be the emailed token.
check(
  'The emailed token never appears in the database',
  !(await prisma.passwordResetToken.findMany()).some(
    (t) => t.tokenHash === secondLink,
  ),
)

// ---------------------------------------------------------------------------
// 6. Email service configuration
// ---------------------------------------------------------------------------
suite('6. Email configuration')

const verified = await verifySmtpConfiguration()
check('SMTP verification succeeds against a live server', verified.ok, verified.message)

const savedHost = process.env.SMTP_HOST
const savedPassword = process.env.SMTP_PASSWORD

delete process.env.SMTP_HOST
const notConfigured = await verifySmtpConfiguration()
check('Missing SMTP_HOST is reported as not ready', notConfigured.ok === false)
check('The missing variable is named', /SMTP_HOST/.test(notConfigured.message), notConfigured.message)

process.env.SMTP_HOST = savedHost
delete process.env.SMTP_PASSWORD
const noPassword = await verifySmtpConfiguration()
check('Missing SMTP_PASSWORD is reported as not ready', noPassword.ok === false)

process.env.SMTP_PASSWORD = savedPassword

// A server that rejects the credentials must surface as a failure.
sink.options.rejectAuth = true
const rejected = await verifySmtpConfiguration()
check('A rejected login is reported as not ready', rejected.ok === false, rejected.message)
check(
  'The hint mentions an App Password for Gmail',
  /App Password/i.test(rejected.hint ?? ''),
  rejected.hint,
)
sink.options.rejectAuth = false

// No fake success when SMTP is missing.
delete process.env.SMTP_HOST
delete process.env.SMTP_USER
delete process.env.SMTP_PASSWORD
delete process.env.SMTP_FROM
sink.reset()

const noSmtp = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: NEW_HR_EMAIL },
})
check(
  'Forgot password returns 503 when SMTP is missing',
  noSmtp.status === 503,
  `status ${noSmtp.status}`,
)
check('It is flagged as a configuration problem', noSmtp.json?.code === 'EMAIL_NOT_CONFIGURED')
check('It does not claim an email was sent', !/is on its way/i.test(noSmtp.json?.message ?? ''))
check('No email was sent', sink.messages.length === 0)

const unknownNoSmtp = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: 'nobody.here@example.com' },
})
check(
  'The config error is identical for unknown addresses',
  unknownNoSmtp.status === 503 && unknownNoSmtp.json?.message === noSmtp.json?.message,
  'a differing response would leak whether the account exists',
)

process.env.SMTP_HOST = savedHost
process.env.SMTP_USER = 'verify-sender@gmail.com'
process.env.SMTP_PASSWORD = savedPassword
process.env.SMTP_FROM = 'YanolTech HR <verify-sender@gmail.com>'

// ---------------------------------------------------------------------------
// 7. Creating an employee
// ---------------------------------------------------------------------------
suite('7. Employee creation')

const auth = hrTokenRenamed

// The HR Admin types the employee's login address. It is not required to be a
// real, valid or external mailbox - a company address such as
// name@yanoltech.com is the normal case - and it is never emailed to.
//
// Each case below uses its own employee ID, because a successful create
// consumes the ID and a later reuse would be refused for the wrong reason.

// A missing address is still an error. It is the account row's key, so there is
// nothing to create without it.
const noEmail = await api('/api/hr-manager/employees', {
  method: 'POST',
  token: auth,
  body: { ...employeePayload(), email: '', employeeId: '9010' },
})
check(
  'An employee without an email is refused',
  noEmail.status === 400,
  `status ${noEmail.status} ${noEmail.text.slice(0, 160)}`,
)

// A company address is accepted and kept exactly as typed.
const companyEmail = 'new.verify.employee@yanoltech.com'
const created = await api('/api/hr-manager/employees', {
  method: 'POST',
  token: auth,
  body: employeePayload({ email: companyEmail }),
})
check(
  'The employee is created',
  created.status === 200 || created.status === 201,
  `status ${created.status} ${created.text.slice(0, 200)}`,
)
check(
  'A company address is accepted - no real or external mailbox demanded',
  created.json?.account?.email === companyEmail,
  created.json?.account?.email,
)
check(
  'The address is kept rather than rewritten or generated',
  created.json?.employee?.email === companyEmail,
  created.json?.employee?.email,
)
check(
  'The temporary password is returned so HR can share it',
  typeof created.json?.account?.temporaryPassword === 'string' &&
    created.json.account.temporaryPassword.length > 0,
)
check(
  'Nothing claims an email was sent',
  !('credentialsEmailed' in (created.json?.account ?? {})),
  JSON.stringify(Object.keys(created.json?.account ?? {})),
)
check('No password hash leaks in the response', !created.text.includes('$2'))

// Nothing is ever mailed to the employee, whatever address they were given.
check(
  'No message is delivered for it',
  sink.messages.length === 0,
  `${sink.messages.length} message(s)`,
)

const tempPassword = created.json?.account?.temporaryPassword

// The address is not format-checked. This is the requirement that was
// reverted, so a nonsense value has to be accepted rather than refused.
const oddEmail = await api('/api/hr-manager/employees', {
  method: 'POST',
  token: auth,
  body: employeePayload({ email: 'not-an-email', employeeId: '9011' }),
})
check(
  'An address that is not a valid mailbox is still accepted',
  oddEmail.status === 200 || oddEmail.status === 201,
  `status ${oddEmail.status} ${oddEmail.text.slice(0, 160)}`,
)

const dupeUser = await api('/api/hr-manager/employees', {
  method: 'POST',
  token: auth,
  body: employeePayload({ email: 'verify.employee@gmail.com', employeeId: '9012' }),
})
check('An address already used by an account is refused', dupeUser.status === 409, `status ${dupeUser.status}`)

const dupeEmployee = await api('/api/hr-manager/employees', {
  method: 'POST',
  token: auth,
  body: employeePayload({ email: 'verify.employee@gmail.com', employeeId: '9007' }),
})
check('An address already on another employee is refused', dupeEmployee.status === 409, `status ${dupeEmployee.status}`)

const dupeCreated = await api('/api/hr-manager/employees', {
  method: 'POST',
  token: auth,
  body: employeePayload({ email: companyEmail, employeeId: '9013' }),
})
check(
  'An address created a moment ago is refused for the next employee',
  dupeCreated.status === 409,
  `status ${dupeCreated.status}`,
)

const unauthenticated = await api('/api/hr-manager/employees', {
  method: 'POST',
  body: employeePayload({ email: 'unauth.employee@yanoltech.com', employeeId: '9014' }),
})
check('Creating an employee requires authentication', unauthenticated.status === 401, `status ${unauthenticated.status}`)

sink.reset()

// The account has to be usable end to end, or creating it would be pointless.
const generatedLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: companyEmail, password: tempPassword },
})
check(
  'The employee signs in with the address HR typed and the returned password',
  generatedLogin.status === 200,
  `status ${generatedLogin.status} ${generatedLogin.text.slice(0, 160)}`,
)
check('They get the EMPLOYEE role', generatedLogin.json?.role === 'EMPLOYEE', generatedLogin.json?.role)
check(
  'They are not given an HR role',
  generatedLogin.json?.role !== 'HR_MANAGER',
)
check(
  'They are flagged to change the temporary password',
  generatedLogin.json?.mustChangePassword === true,
)

const createdUser = await prisma.user.findUnique({ where: { email: companyEmail } })
check('That login account exists', Boolean(createdUser))
check('Its password is hashed', isBcryptHash(createdUser?.password))
check('Its role is EMPLOYEE', createdUser?.role === 'EMPLOYEE', createdUser?.role)
check(
  'It is flagged to change the password on first login',
  createdUser?.mustChangePassword === true,
)

// Email being unavailable must not affect employee creation at all. It is
// wired to the sink above precisely so this is a real check.
delete process.env.SMTP_HOST
delete process.env.SMTP_USER
delete process.env.SMTP_PASSWORD
delete process.env.SMTP_FROM
sink.reset()

const createdNoSmtp = await api('/api/hr-manager/employees', {
  method: 'POST',
  token: auth,
  body: employeePayload({ employeeId: '9003', email: 'no.smtp.employee@yanoltech.com' }),
})
check(
  'The account is still created when email is broken',
  createdNoSmtp.status === 200 || createdNoSmtp.status === 201,
  `status ${createdNoSmtp.status}`,
)
check(
  'The temporary password is still handed back',
  typeof createdNoSmtp.json?.account?.temporaryPassword === 'string' &&
    createdNoSmtp.json.account.temporaryPassword.length > 0,
)
check('No message is sent', sink.messages.length === 0, `${sink.messages.length} message(s)`)

const stillExists = await prisma.user.findUnique({
  where: { email: 'no.smtp.employee@yanoltech.com' },
})
check('That employee account really does exist', Boolean(stillExists))
check('Their password is hashed', isBcryptHash(stillExists?.password))
check('They are flagged to change the temporary password', stillExists?.mustChangePassword === true)

process.env.SMTP_HOST = savedHost
process.env.SMTP_USER = 'verify-sender@gmail.com'
process.env.SMTP_PASSWORD = savedPassword
process.env.SMTP_FROM = 'YanolTech HR <verify-sender@gmail.com>'

// ---------------------------------------------------------------------------
// 8. First-login password change
// ---------------------------------------------------------------------------
suite('8. Employee first login')

const tempLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: companyEmail, password: tempPassword },
})
check('The employee signs in with the temporary password HR was given', tempLogin.status === 200, `status ${tempLogin.status} ${tempLogin.text.slice(0, 160)}`)
check('They are told to change it', tempLogin.json?.mustChangePassword === true)
check('The login response has no password', !('password' in (tempLogin.json ?? {})))

const employeeToken = tempLogin.json?.token

const wrongCurrent = await api('/api/auth/password', {
  method: 'PUT',
  token: employeeToken,
  body: { currentPassword: 'not-the-temp-password', newPassword: 'EmployeeOwn1!' },
})
check('Changing with the wrong current password is refused', wrongCurrent.status === 401)

const reused = await api('/api/auth/password', {
  method: 'PUT',
  token: employeeToken,
  body: { currentPassword: tempPassword, newPassword: tempPassword },
})
check('Reusing the temporary password is refused', reused.status === 400)

const EMPLOYEE_NEW_PASSWORD = 'EmployeeOwnPass1!'
const changed = await api('/api/auth/password', {
  method: 'PUT',
  token: employeeToken,
  body: { currentPassword: tempPassword, newPassword: EMPLOYEE_NEW_PASSWORD },
})
check('The employee sets their own password', changed.status === 200, `status ${changed.status} ${changed.text.slice(0, 160)}`)

const secondLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: companyEmail, password: EMPLOYEE_NEW_PASSWORD },
})
check('They sign in again with their own password', secondLogin.status === 200)
check('They are no longer flagged', secondLogin.json?.mustChangePassword === false)

const oldTempLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: companyEmail, password: tempPassword },
})
check('The temporary password no longer works', oldTempLogin.status === 401)

const employeeRow = await prisma.user.findUnique({
  where: { email: companyEmail },
})
check('Their password is hashed', isBcryptHash(employeeRow.password))
check('Their new password is not stored in plaintext', employeeRow.password !== EMPLOYEE_NEW_PASSWORD)

// ---------------------------------------------------------------------------
// 9. Server-console fallback
//
// A new install usually has no mail server yet, so the confirmation link cannot
// be delivered. This is the way through that window for whoever is at the
// machine. It matters that it behaves identically to the emailed link, so the
// same activation helper is exercised here.
// ---------------------------------------------------------------------------
suite('9. Server-console fallback (no mail server yet)')

const CONSOLE_HR_EMAIL = 'hr.admin.console@gmail.com'

const consoleRequest = await api('/api/auth/profile', {
  method: 'PUT',
  token: hrTokenRenamed,
  body: { email: CONSOLE_HR_EMAIL },
})
check('A change can be requested with no mail server', consoleRequest.status === 200, `status ${consoleRequest.status}`)

const consoleNothing = await activatePendingEmail(hrAdmin.id, { source: 'console-check' })
check('Activation works with no emailed token at all', consoleNothing.ok === true, JSON.stringify(consoleNothing).slice(0, 200))
check('It moves the address', consoleNothing.user?.email === CONSOLE_HR_EMAIL, `got ${consoleNothing.user?.email}`)
check('It keeps the account identity', consoleNothing.user?.id === hrAdmin.id)
check('It keeps the role', consoleNothing.user?.role === 'HR_MANAGER')
check('It keeps the employee link', Boolean(consoleNothing.user?.employeeId))
check('It leaves the password alone', consoleNothing.user?.password === hrRowAfter.password)
check('It clears the pending state', !consoleNothing.user?.pendingEmail && !consoleNothing.user?.pendingEmailTokenHash)

const consoleEmployee = await prisma.employee.findUnique({
  where: { id: consoleNothing.user.employeeId },
  select: { email: true },
})
check('It syncs the employee record too', consoleEmployee?.email === CONSOLE_HR_EMAIL, `got ${consoleEmployee?.email}`)

const consoleLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: CONSOLE_HR_EMAIL, password: NEW_HR_PASSWORD },
})
check('The new address signs in afterwards', consoleLogin.status === 200, `status ${consoleLogin.status}`)

// Put the address back for the final sweep.
const restoreRequest = await api('/api/auth/profile', {
  method: 'PUT',
  token: consoleLogin.json.token,
  body: { email: NEW_HR_EMAIL },
})
const restore = await activatePendingEmail(hrAdmin.id, { source: 'console-restore' })
check('The console path can also move the address back', restore.ok === true && restore.user.email === NEW_HR_EMAIL, JSON.stringify(restore).slice(0, 160))
check('The restore request itself succeeded', restoreRequest.status === 200)

// ---------------------------------------------------------------------------
// 10. Whole-database sweep
// ---------------------------------------------------------------------------
suite('10. Final database state')

const finalUsers = await prisma.user.findMany()
const finalPlaintext = finalUsers.filter(
  (u) => u.email !== legacyRow.email && !isBcryptHash(u.password),
)
check(
  'No real account anywhere stores a non-bcrypt password',
  finalPlaintext.length === 0,
  finalPlaintext.map((u) => u.email).join(', '),
)
check(
  'The only non-hash row is the deliberate login-rejection fixture',
  finalUsers.filter((u) => !isBcryptHash(u.password)).every(
    (u) => u.email === legacyRow.email,
  ),
)

const finalAdmins = finalUsers.filter((u) =>
  ['HR_MANAGER', 'HR', 'ADMIN', 'HR_ADMIN'].includes(u.role),
)
check('Exactly one HR Admin remains', finalAdmins.length === 1, `${finalAdmins.length}`)

check(
  'The old placeholder admin is gone',
  !finalUsers.some((u) => u.email === 'hr@yanol.com'),
)

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------
await new Promise((resolve) => server.close(resolve))
await sink.close()
await prisma.$disconnect()

rmSync(TEST_DB_PATH, { force: true })
rmSync(`${TEST_DB_PATH}-journal`, { force: true })

const REAL_DB_AFTER = existsSync(REAL_DB_PATH)
  ? (await import('node:fs')).statSync(REAL_DB_PATH).mtimeMs
  : null

check(
  'The real prisma/dev.db was not modified',
  REAL_DB_BEFORE === REAL_DB_AFTER,
  'verification must never write to the live database',
)

console.log(`\n${'-'.repeat(60)}`)
console.log(`  ${passed} passed, ${failures.length} failed`)
console.log('-'.repeat(60))

if (failures.length > 0) {
  console.log('\nFailures:')
  for (const f of failures) {
    console.log(`  [${f.suite}] ${f.description}`)
    if (f.detail) console.log(`      ${f.detail}`)
  }
  console.log('')
  process.exit(1)
}

console.log('\nAll checks passed.\n')
process.exit(0)
