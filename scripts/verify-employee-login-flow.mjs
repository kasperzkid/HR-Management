// End-to-end check of the whole Add Employee -> employee login chain.
//
//   npm run verify:employee-flow
//
// Covers the whole path, in order:
//
//   HR Admin login
//     -> create employee with the address the HR Admin typed
//        -> employee record, User record, EMPLOYEE role, bcrypt password
//        -> temporary password handed back to the HR Admin
//     -> a duplicate address is refused
//     -> an unrelated edit cannot wipe the address
//     -> employee login with that address and the temporary password
//     -> first-login password change
//     -> login again with the new password
//
// Also asserts that the "Authentication required" regression cannot come back,
// that nothing is ever emailed to the employee's address, and that the HR
// Admin's own real-email flows are untouched.
//
// Everything it creates against prisma/dev.db is removed again at the end, and
// the row counts are checked back to where they started.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { startSmtpSink } from './lib/smtp-sink.mjs'
import { decodeMessageText } from './lib/mime.mjs'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const HR_EMAIL = 'samuelwondimu467@gmail.com'
const HR_PASSWORD = 'samuel@21'
const NEW_PASSWORD = 'Flow-Check-9271x!'

const stamp = Date.now().toString().slice(-6)

// ── Start a real server on an ephemeral port, wired to the sink ────────────
// The sink stands in for Gmail. It matters here: it proves that nothing is ever
// actually sent to the employee's address, whatever the HR Admin typed into it.
const sink = await startSmtpSink()

process.env.SMTP_HOST = sink.host
process.env.SMTP_PORT = String(sink.port)
process.env.SMTP_SECURE = 'false'
process.env.SMTP_USER = 'flow-check@gmail.com'
process.env.SMTP_PASSWORD = 'flow-check-only'
process.env.SMTP_FROM = 'YANOL TECH HR <flow-check@gmail.com>'

const { default: app } = await import('../server/app.js')
const { default: prisma } = await import('../server/db.js')

const server = app.listen(0)
await new Promise((resolve) => server.once('listening', resolve))
const BASE = `http://127.0.0.1:${server.address().port}`

let failed = 0
function check(label, ok, detail = '') {
  if (!ok) failed += 1
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`,
  )
}

function section(title) {
  console.log('')
  console.log(title)
  console.log('-'.repeat(64))
}

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
  let json = {}
  try {
    json = JSON.parse(text)
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, text }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('')
console.log('Add Employee (HR-typed login email) -> employee login')
console.log('='.repeat(64))

// Recorded before anything runs, so the cleanup below can tell which reset
// tokens belong to this run and which were already there.
const runStartedAt = new Date(Date.now() - 5000)

const before = {
  users: await prisma.user.count(),
  employees: await prisma.employee.count(),
  payroll: await prisma.payrollRecord.count(),
  resetTokens: await prisma.passwordResetToken.count(),
}

const createdEmployeeIds = []
const createdUserEmails = []

// Distinct per run, so repeated runs cannot collide on the address.
const NAME_ONE = `Flow Check ${stamp}`
const NAME_TWO = `Flow Check Two ${stamp}`
const LOGIN_EMAIL = `flow.${stamp}@yanoltech.com`
const SECOND_EMAIL = `flow.two.${stamp}@yanoltech.com`

try {
  // ─────────────────────────────────────────────────────────────────────────
  section('1. The reported symptom is still fixed')

  const payload = {
    employeeId: `9${stamp.slice(-3)}`,
    name: NAME_ONE,
    gender: 'Female',
    dateOfBirth: '1994-02-11',
    joinDate: '2026-02-01',
    jobTitle: 'Payroll Officer',
    department: 'Finance',
    employmentType: 'Permanent',
    employmentStatus: 'Active',
    basicSalary: 38000,
    transportAllowance: 1500,
    housingAllowance: 2800,
    mealAllowance: 1100,
    otherAllowance: 0,
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: `1000${stamp}`,
    tin: `TIN-${stamp}`,
    pensionId: `PEN-${stamp}`,
    phone: '0911224400',
    // The address the HR Admin typed. A company address is the normal case, and
    // it is used exactly as given - nothing rewrites it.
    email: LOGIN_EMAIL,
    address: 'Bole, Addis Ababa',
    emergencyContact: '0911224411',
    notes: 'created by verify:employee-flow',
  }

  // Without the header: this is literally what the page used to send.
  const anonymous = await call('/api/hr-manager/employees', {
    method: 'POST',
    body: payload,
  })
  check(
    'A request with no token is still refused (auth not weakened)',
    anonymous.status === 401,
    `${anonymous.status} ${anonymous.json.message || ''}`,
  )
  check(
    'And it is refused with the exact reported message',
    anonymous.json.message === 'Authentication required',
    JSON.stringify(anonymous.json.message),
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('2. HR Admin signs in')

  const hrLogin = await call('/api/auth/login', {
    method: 'POST',
    body: { email: HR_EMAIL, password: HR_PASSWORD },
  })
  check('HR Admin logs in', hrLogin.status === 200, `status ${hrLogin.status}`)
  check('HR Admin role is HR_MANAGER', hrLogin.json.role === 'HR_MANAGER', hrLogin.json.role)
  check('A token is issued', Boolean(hrLogin.json.token))
  const hrToken = hrLogin.json.token

  // ─────────────────────────────────────────────────────────────────────────
  section('3. Add Employee with the address the HR Admin typed')

  const created = await call('/api/hr-manager/employees', {
    method: 'POST',
    body: payload,
    token: hrToken,
  })
  check(
    'Employee is created',
    created.status === 201,
    `${created.status} ${created.json.message || created.text.slice(0, 90)}`,
  )

  const employeeId = created.json.employee?.id || null
  const loginEmail = created.json.account?.email || null
  const temporaryPassword = created.json.account?.temporaryPassword || ''

  createdEmployeeIds.push(employeeId)
  createdUserEmails.push(loginEmail)

  check('The employee record exists', Boolean(employeeId))

  check(
    'The login email is used exactly as it was typed',
    loginEmail === LOGIN_EMAIL,
    `${loginEmail}  (typed ${LOGIN_EMAIL})`,
  )
  check(
    'The employee record carries that same address',
    created.json.employee?.email === loginEmail,
  )
  check(
    'A login account was created',
    Boolean(loginEmail),
    loginEmail,
  )
  check(
    'The temporary password is returned for the HR Admin to share',
    Boolean(temporaryPassword),
    temporaryPassword ? `${temporaryPassword.length} chars` : 'absent',
  )
  check(
    'Nothing claims to have been emailed',
    !('credentialsEmailed' in (created.json.account || {})),
    `credentialsEmailed=${created.json.account?.credentialsEmailed}`,
  )

  // The address is not required to be a real, external, or resolvable mailbox -
  // that was the requirement that has just been reverted. A company address must
  // therefore be accepted, and never sent to.
  check(
    'A company address is accepted, no real/external mailbox demanded',
    String(loginEmail).endsWith('@yanoltech.com'),
    loginEmail,
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('4. Nothing was emailed to the employee')

  const messages = sink.messages || []
  check(
    'No mail was sent at all',
    messages.length === 0,
    `${messages.length} message(s)`,
  )

  const decodedAll = messages.map((m) => decodeMessageText(m.raw || '')).join('\n')
  check(
    'The employee address is not in any outgoing mail',
    !decodedAll.includes(String(loginEmail)),
  )
  check(
    'The temporary password was not put in any outgoing mail',
    temporaryPassword && !decodedAll.includes(temporaryPassword),
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('5. What landed in the database')

  const user = await prisma.user.findUnique({
    where: { email: loginEmail },
  })

  check('A User row exists', Boolean(user))
  check('Its role is EMPLOYEE', user?.role === 'EMPLOYEE', user?.role)
  check(
    'It is flagged to change the password on first login',
    user?.mustChangePassword === true,
    String(user?.mustChangePassword),
  )
  check(
    'It is linked to the employee record it belongs to',
    user?.employeeId === employeeId,
  )
  check(
    'The password is a bcrypt hash, not the plaintext',
    /^\$2[aby]\$\d{2}\$/.test(user?.password || ''),
    (user?.password || '').slice(0, 7) + '...',
  )
  check(
    'The plaintext password is nowhere in the stored hash',
    !(user?.password || '').includes(temporaryPassword),
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('6. The address has to be unique')

  // There is no longer any automatic variation of the address, so a collision
  // has to be refused rather than silently fixed up. The account row is keyed on
  // it, so allowing it would fail deep inside the transaction instead.
  const clash = await call('/api/hr-manager/employees', {
    method: 'POST',
    body: { ...payload, employeeId: `7${stamp.slice(-3)}` },
    token: hrToken,
  })
  check(
    'A second employee cannot claim an address that is taken',
    clash.status === 409,
    `${clash.status} ${clash.json.message || ''}`,
  )
  check(
    'And nothing was written for the rejected attempt',
    !(await prisma.employee.findUnique({ where: { employeeId: `7${stamp.slice(-3)}` } })),
  )

  const second = await call('/api/hr-manager/employees', {
    method: 'POST',
    body: {
      ...payload,
      employeeId: `8${stamp.slice(-3)}`,
      name: NAME_TWO,
      email: SECOND_EMAIL,
      notes: 'second',
    },
    token: hrToken,
  })
  check(
    'A second employee on a different address is created',
    second.status === 201,
    `${second.status} ${second.json.message || ''}`,
  )

  const secondEmail = second.json.account?.email || null
  createdEmployeeIds.push(second.json.employee?.id)
  createdUserEmails.push(secondEmail)

  check(
    'Their address is exactly what was typed',
    secondEmail === SECOND_EMAIL,
    `${secondEmail}  (typed ${SECOND_EMAIL})`,
  )
  check(
    'And both accounts exist independently',
    Boolean(await prisma.user.findUnique({ where: { email: secondEmail } })),
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('7. Editing an employee cannot lose their login address')

  // employeeValues coalesces the field with ??, and '' is not nullish, so an
  // omitted or cleared address on an unrelated edit would silently store an
  // empty login identity unless the controller preserves the existing one.
  const blanked = await call(`/api/hr-manager/employees/${employeeId}`, {
    method: 'PUT',
    body: { ...payload, id: employeeId, email: '', jobTitle: 'Senior Payroll Officer' },
    token: hrToken,
  })
  check(
    'An edit with a blank email is accepted',
    blanked.status === 200,
    `${blanked.status} ${blanked.json.message || blanked.text.slice(0, 120)}`,
  )
  check(
    'The real edit still took effect',
    blanked.json?.jobTitle === 'Senior Payroll Officer',
    blanked.json?.jobTitle,
  )
  check(
    'The login address is preserved, not wiped',
    blanked.json?.email === loginEmail,
    `${loginEmail}  ->  ${blanked.json?.email}`,
  )
  check(
    'The account still points at the same address',
    (await prisma.user.findUnique({ where: { email: loginEmail } }))?.employeeId === employeeId,
  )

  // An omitted field entirely must behave the same way.
  const omitted = await call(`/api/hr-manager/employees/${employeeId}`, {
    method: 'PUT',
    body: { id: employeeId, jobTitle: 'Payroll Officer' },
    token: hrToken,
  })
  check(
    'An edit that omits the email entirely is accepted',
    omitted.status === 200,
    `${omitted.status} ${omitted.json.message || ''}`,
  )
  check(
    'And still keeps the address',
    omitted.json?.email === loginEmail,
    `${loginEmail}  ->  ${omitted.json?.email}`,
  )

  // A deliberate change onto a free address is honoured, and the login account
  // follows it, because the User row is keyed on the same address.
  const MOVED_EMAIL = `moved.${stamp}@yanoltech.com`
  const moved = await call(`/api/hr-manager/employees/${employeeId}`, {
    method: 'PUT',
    body: { ...payload, id: employeeId, email: MOVED_EMAIL },
    token: hrToken,
  })
  check(
    'Moving onto a free address is accepted',
    moved.status === 200,
    `${moved.status} ${moved.json.message || ''}`,
  )
  check(
    'The employee record follows it',
    moved.json?.email === MOVED_EMAIL,
    moved.json?.email,
  )
  check(
    'And so does the login account',
    Boolean(await prisma.user.findUnique({ where: { email: MOVED_EMAIL } })),
  )
  check(
    'The old address no longer belongs to anyone',
    !(await prisma.user.findUnique({ where: { email: loginEmail } })),
  )

  // Move back, so the sign-in checks below use the address this script knows.
  await call(`/api/hr-manager/employees/${employeeId}`, {
    method: 'PUT',
    body: { ...payload, id: employeeId, email: loginEmail },
    token: hrToken,
  })
  check(
    'Moving back onto the original address works too',
    (await prisma.employee.findUnique({ where: { id: employeeId } }))?.email === loginEmail,
  )

  // A deliberate change onto a taken address is refused.
  const renamed = await call(`/api/hr-manager/employees/${employeeId}`, {
    method: 'PUT',
    body: { ...payload, id: employeeId, email: secondEmail },
    token: hrToken,
  })
  check(
    'Moving onto an address another account holds is refused',
    renamed.status === 409,
    `${renamed.status} ${renamed.json.message || ''}`,
  )
  check(
    'And the original address survived that attempt',
    (await prisma.employee.findUnique({ where: { id: employeeId } }))?.email === loginEmail,
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('8. The employee signs in')

  const empLogin = await call('/api/auth/login', {
    method: 'POST',
    body: { email: loginEmail, password: temporaryPassword },
  })
  check(
    'Employee logs in with the address HR typed and that password',
    empLogin.status === 200,
    `${empLogin.status} ${empLogin.json.message || ''}`,
  )
  check('They get the EMPLOYEE role', empLogin.json.role === 'EMPLOYEE', empLogin.json.role)
  check(
    'They are NOT given the HR_ADMIN role',
    empLogin.json.role !== 'HR_MANAGER',
  )
  check(
    'They are told to set their own password',
    empLogin.json.mustChangePassword === true,
    String(empLogin.json.mustChangePassword),
  )
  const empToken = empLogin.json.token

  const wrongPassword = await call('/api/auth/login', {
    method: 'POST',
    body: { email: loginEmail, password: `${temporaryPassword}x` },
  })
  check(
    'A wrong password is still rejected',
    wrongPassword.status === 401,
    String(wrongPassword.status),
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('9. First-login password change still works')

  const changed = await call('/api/auth/password', {
    method: 'PUT',
    body: { currentPassword: temporaryPassword, newPassword: NEW_PASSWORD },
    token: empToken,
  })
  check(
    'The employee sets their own password',
    changed.status === 200,
    `${changed.status} ${changed.json.message || ''}`,
  )
  check(
    'The forced change flag is cleared',
    changed.json.mustChangePassword === false,
  )

  const oldStill = await call('/api/auth/login', {
    method: 'POST',
    body: { email: loginEmail, password: temporaryPassword },
  })
  check(
    'The temporary password no longer works',
    oldStill.status === 401,
    String(oldStill.status),
  )

  const empAgain = await call('/api/auth/login', {
    method: 'POST',
    body: { email: loginEmail, password: NEW_PASSWORD },
  })
  check(
    'They log in again with their new password',
    empAgain.status === 200,
    `${empAgain.status} ${empAgain.json.message || ''}`,
  )
  check('Still the EMPLOYEE role', empAgain.json.role === 'EMPLOYEE', empAgain.json.role)
  check(
    'No longer forced to change it',
    empAgain.json.mustChangePassword !== true,
    String(empAgain.json.mustChangePassword),
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('10. HR Admin real-email flows are untouched')

  check(
    'The HR Admin still logs in with their real address',
    hrLogin.json.user?.email === HR_EMAIL || hrLogin.json.email === HR_EMAIL,
    hrLogin.json.email,
  )

  // Forgot password must still refuse to say whether the address exists.
  const forgotKnown = await call('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: HR_EMAIL },
  })
  const forgotUnknown = await call('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: 'nobody.here@example.com' },
  })
  check(
    'Forgot password answers identically for known and unknown addresses',
    forgotKnown.status === forgotUnknown.status &&
      forgotKnown.text === forgotUnknown.text,
    `${forgotKnown.status} vs ${forgotUnknown.status}`,
  )

  // ─────────────────────────────────────────────────────────────────────────
  section('11. The frontend cannot regress to these bugs')

  const employeesPage = await readFile(
    path.join(ROOT, 'src/HR-Manager/pages/Employees.jsx'),
    'utf8',
  )
  const formHook = await readFile(
    path.join(
      ROOT,
      'src/HR-Manager/components/add-employee-modal/useEmployeeForm.js',
    ),
    'utf8',
  )

  // Auth regression guard.
  //
  // Every mutating fetch in the page is checked, rather than a hand-picked list
  // of line markers. A marker list is what let the original bug hide: "POST"
  // and "/import" appear all over the file, so the check passed while the save
  // call had no Authorization header at all.
  // Each call is examined with the text immediately before it too, because some
  // of these pass a `url` variable rather than the path inline - including the
  // Add Employee save itself, which would otherwise be missed entirely.
  const fetchCalls = [...employeesPage.matchAll(/await fetch\(/g)].map((m) =>
    employeesPage.slice(Math.max(0, m.index - 500), m.index + 500),
  )

  // Scoped to the employee endpoints, which are the ones behind requireAuth.
  // The settings call in this file is a PUT with no token and that is correct:
  // that route is deliberately still open.
  const mutating = fetchCalls.filter(
    (b) =>
      b.includes('/employees') &&
      /method:\s*(isEditing\s*\?\s*'PUT'\s*:\s*'POST'|'POST'|'PUT'|'DELETE')/.test(b),
  )

  check(
    'Every mutating employee request was found',
    mutating.length >= 5,
    `${mutating.length} mutating employee fetch call(s)`,
  )

  const withoutToken = mutating.filter((b) => !b.includes('authHeaders('))
  check(
    'Every mutating request sends the auth header',
    withoutToken.length === 0,
    withoutToken.length
      ? `${withoutToken.length} missing it`
      : `${mutating.length} call(s) checked`,
  )

  const controller = await readFile(
    path.join(ROOT, 'server/controllers/hr-manager.controller.js'),
    'utf8',
  )

  // Email regression guards.
  //
  // The requirement that was reverted was "the address must be a real, valid,
  // external mailbox". These assert that nothing has crept back in: no format
  // check in the form or the controller, and no generation, since the HR Admin
  // now types the address.
  const formSections = await readFile(
    path.join(
      ROOT,
      'src/HR-Manager/components/add-employee-modal/formSections.jsx',
    ),
    'utf8',
  )
  // Employees.jsx carries its own inline add/edit forms, separate from the
  // AddEmployeeModal component, so both have to be covered. The reverted
  // format check survived in one of them after it was gone from the other.
  const inlineEmailBlocks = [
    ...employeesPage.matchAll(/if \(!form\.email\.trim\(\)\)[\s\S]{0,400}?\n\s*\}/g),
  ].map((m) => m[0])

  check(
    'Both inline forms still require an address',
    inlineEmailBlocks.length >= 2 &&
      inlineEmailBlocks.every((b) => b.includes('Email address is required')),
    `${inlineEmailBlocks.length} block(s)`,
  )
  check(
    'The form does not format-check the address',
    !/newErrors\.email\s*=\s*'[^']*valid email/i.test(formHook) &&
      !/Please enter a valid email address/.test(employeesPage) &&
      !formSections.includes('Leave blank to generate'),
  )
  check(
    'No copy still asks for a real or external mailbox',
    !/real email address|real or external mailbox is|valid email address is required/i.test(
      employeesPage,
    ) && !formSections.includes("The employee's real email address"),
  )
  check(
    'Both add forms fill the address in from the name',
    formHook.includes('withEmailFromName') &&
      employeesPage.includes('withEmailFromName'),
  )
  check(
    'The shared helper is what decides, not a copy in each form',
    // Both forms must go through one tested helper. An inline copy in a form is
    // how the stale-state bug got in: it passed a source read-through.
    (formHook.match(/previewEmployeeEmail\(/g) || []).length === 0 &&
      (employeesPage.match(/previewEmployeeEmail\(/g) || []).length === 0,
  )
  check(
    'A typed-in address is never overwritten by the name',
    // Not while editing, and inside the helper only a still-generated field
    // follows the name.
    formHook.includes('!editingEmployee'),
  )
  check(
    'The address is still required - an empty field is not accepted',
    /newErrors\.email = 'Email address is required'/.test(formHook) &&
      inlineEmailBlocks.length >= 2,
  )
  check(
    'The controller does not format-check the address',
    !/isValidEmail\(/.test(controller),
  )
  check(
    'The controller does not require a real external mailbox',
    controller.includes('Employee ID, name, and email are required'),
  )

  // The password is handed to the HR Admin and never emailed.
  check(
    'The temporary password is offered to the HR Admin',
    employeesPage.includes('temporaryPassword'),
  )
  check(
    'The password is shown rather than only described',
    /credentials\.temporaryPassword\s*\?/.test(employeesPage),
  )
  check(
    'Nothing emails employee credentials any more',
    !controller.includes('sendEmployeeCredentialsEmail') &&
      !controller.includes('deliverCredentials'),
  )

  // Nothing was weakened.
  const routes = await readFile(
    path.join(ROOT, 'server/routes/hr-manager.routes.js'),
    'utf8',
  )
  check(
    'Employee creation is still behind authentication',
    // The route used to name requireAuth directly. It now goes through
    // requirePermission('employees.add'), which runs requireAuth first, so
    // either name means the request must carry a valid token before the
    // controller runs. The same section proves it with a tokenless call.
    /router\.post\(\s*'\/employees'[\s\S]{0,120}require(?:Auth|Permission)/.test(
      routes,
    ),
  )
  check(
    'The password is still hashed before it is stored',
    controller.includes('hashPassword(temporaryPassword)'),
  )
  check(
    'The plaintext is never stored on the User row',
    !/password:\s*temporaryPassword\b/.test(controller),
  )
} finally {
  // ─────────────────────────────────────────────────────────────────────────
  section('12. Cleanup')

  for (const id of createdEmployeeIds.filter(Boolean)) {
    // Order matters: the employee is referenced by these three.
    await prisma.payrollRecord.deleteMany({ where: { employeeId: id } })
    await prisma.attendance.deleteMany({ where: { employeeId: id } })
    await prisma.leaveRequest.deleteMany({ where: { employeeId: id } })
  }
  for (const email of createdUserEmails.filter(Boolean)) {
    await prisma.user.deleteMany({ where: { email } })
  }
  for (const id of createdEmployeeIds.filter(Boolean)) {
    await prisma.employee.deleteMany({ where: { id } })
  }
  if (createdEmployeeIds.length) {
    console.log(
      `  removed ${createdEmployeeIds.length} test employee(s), their login accounts and payroll rows`,
    )
  }

  // The forgot-password comparison above really does issue tokens - that is the
  // only honest way to compare the two responses - so remove them again rather
  // than leaving live reset links sitting in the HR Admin's account.
  const leftoverTokens = await prisma.passwordResetToken.deleteMany({
    where: { createdAt: { gte: runStartedAt } },
  })
  if (leftoverTokens.count) {
    console.log(`  removed ${leftoverTokens.count} password reset token(s) it issued`)
  }

  const after = {
    users: await prisma.user.count(),
    employees: await prisma.employee.count(),
    payroll: await prisma.payrollRecord.count(),
    resetTokens: await prisma.passwordResetToken.count(),
  }

  check(
    'User rows are back to the starting count',
    after.users === before.users,
    `${before.users} -> ${after.users}`,
  )
  check(
    'Employee rows are back to the starting count',
    after.employees === before.employees,
    `${before.employees} -> ${after.employees}`,
  )
  check(
    'Payroll rows are back to the starting count',
    after.payroll === before.payroll,
    `${before.payroll} -> ${after.payroll}`,
  )
  check(
    'Password reset tokens are back to the starting count',
    after.resetTokens === before.resetTokens,
    `${before.resetTokens} -> ${after.resetTokens}`,
  )
  for (const email of createdUserEmails.filter(Boolean)) {
    check(
      `The test account ${email} is gone`,
      !(await prisma.user.findUnique({ where: { email } })),
    )
  }

  // Both listeners have to be closed or Node never exits: the sink is a live
  // TCP server, and fetch's keep-alive connections keep server.close() waiting.
  await sink.close()
  server.closeAllConnections?.()
  server.close()
  await prisma.$disconnect()

  console.log('')
  console.log('='.repeat(64))
  console.log(failed === 0 ? '  All checks passed.' : `  ${failed} check(s) failed.`)
  console.log('='.repeat(64))
  console.log('')

  // Belt and braces: nothing here should be holding the loop open, but a
  // verification script that hangs instead of reporting is worse than one that
  // exits slightly forcefully.
  process.exit(failed > 0 ? 1 : 0)
}
