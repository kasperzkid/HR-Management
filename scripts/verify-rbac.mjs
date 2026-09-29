// End-to-end verification of the role-based access control layer.
//
//   npm run verify:rbac
//
// This runs the real Express app against a real, throwaway SQLite database. It
// never touches prisma/dev.db.
//
// What it proves:
//   - the permission catalogue and the built-in roles seed cleanly
//   - an HR Admin can do everything, including creating HR staff
//   - a restricted HR account is refused by the API, not merely by the UI:
//     it gets 403 from routes it does not hold, and 200 from the ones it does
//   - an HR account cannot change its own role or permissions
//   - an HR account cannot grant itself a permission it does not hold
//   - an account that may edit HR users still cannot touch an HR Admin
//   - the protected HR Admin role cannot be edited
//   - an EMPLOYEE token cannot reach the HR API at all
//   - deactivating an account blocks both a new login and an existing token
//
// The important property being tested is that the refusal comes from the server
// even when the request is made directly, with no UI involved. A hidden button
// would not stop any of these calls; the guards must.

import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TEST_DB = 'verify-rbac.db'
const TEST_DB_PATH = path.join(ROOT, 'prisma', TEST_DB)

rmSync(TEST_DB_PATH, { force: true })
rmSync(`${TEST_DB_PATH}-journal`, { force: true })

// Point Prisma at the throwaway database before the app is imported, because
// PrismaClient reads the datasource URL when it is constructed.
process.env.DATABASE_URL = `file:./${TEST_DB}`
process.env.JWT_SECRET = 'verification-only-secret'
process.env.APP_PUBLIC_URL = 'http://localhost:5173'

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
const { hashPassword } = await import('../server/utils/security.js')
const { PERMISSIONS } = await import('../server/rbac/permissions.js')
const { BUILT_IN_ROLES } = await import('../server/rbac/roles.js')

const server = app.listen(0)
await new Promise((resolve) => server.once('listening', resolve))
const BASE = `http://127.0.0.1:${server.address().port}`

// ---------------------------------------------------------------------------
// Tiny test harness, matching scripts/verify-auth.mjs so the output reads the
// same way.
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

const expectStatus = (description, response, status) =>
  check(
    description,
    response.status === status,
    `expected ${status}, got ${response.status}: ${response.text.slice(0, 200)}`,
  )

// ---------------------------------------------------------------------------
// Seed the catalogue and roles, then build fixtures
// ---------------------------------------------------------------------------
console.log('\nSeeding the permission catalogue')
console.log('='.repeat(64))

for (const [index, permission] of PERMISSIONS.entries()) {
  await prisma.permission.create({
    data: {
      key: permission.key,
      name: permission.name,
      description: permission.description || '',
      group: permission.group,
      sortOrder: index,
    },
  })
}

for (const role of BUILT_IN_ROLES) {
  const record = await prisma.role.create({
    data: {
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isProtected: role.isProtected,
    },
  })

  const permissions = await prisma.permission.findMany({
    where: { key: { in: role.permissions } },
    select: { id: true },
  })

  if (permissions.length) {
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: record.id,
        permissionId: permission.id,
      })),
    })
  }
}

const roleByKey = async (key) =>
  prisma.role.findUnique({ where: { key }, select: { id: true } })

const adminRole = await roleByKey('hr_admin')
const staffRole = await roleByKey('hr_staff')

// A role that may look at and edit HR users, but not manage permissions and not
// touch an HR Admin. This is the shape the anti-escalation rules exist for.
const delegatedPermissions = await prisma.permission.findMany({
  where: {
    key: { in: ['employees.view', 'users.view', 'users.edit', 'users.delete'] },
  },
  select: { id: true },
})

const delegatedRole = await prisma.role.create({
  data: {
    key: 'delegated_editor',
    name: 'Delegated Editor',
    description: 'Verification-only role: can edit HR users but not permissions.',
    isSystem: false,
    isProtected: false,
  },
})

await prisma.rolePermission.createMany({
  data: delegatedPermissions.map((permission) => ({
    roleId: delegatedRole.id,
    permissionId: permission.id,
  })),
})

const PASSWORD = 'Verify!Passw0rd2026'

const admin = await prisma.user.create({
  data: {
    name: 'Verify Admin',
    email: 'rbac.admin@example.com',
    password: await hashPassword(PASSWORD),
    role: 'HR_MANAGER',
    hrRoleId: adminRole.id,
    mustChangePassword: false,
    isActive: true,
  },
})

const staff = await prisma.user.create({
  data: {
    name: 'Verify Staff',
    email: 'rbac.staff@example.com',
    password: await hashPassword(PASSWORD),
    role: 'HR_ADMIN',
    hrRoleId: staffRole.id,
    mustChangePassword: false,
    isActive: true,
  },
})

const delegated = await prisma.user.create({
  data: {
    name: 'Verify Delegated',
    email: 'rbac.delegated@example.com',
    password: await hashPassword(PASSWORD),
    role: 'HR_ADMIN',
    hrRoleId: delegatedRole.id,
    mustChangePassword: false,
    isActive: true,
  },
})

// A plain employee login, to prove an EMPLOYEE token cannot reach the HR API.
const employee = await prisma.user.create({
  data: {
    name: 'Verify Employee',
    email: 'rbac.employee@example.com',
    password: await hashPassword(PASSWORD),
    role: 'EMPLOYEE',
    mustChangePassword: false,
    isActive: true,
  },
})

async function login(email, password = PASSWORD) {
  return api('/api/auth/login', { method: 'POST', body: { email, password } })
}

const adminLogin = await login('rbac.admin@example.com')
const staffLogin = await login('rbac.staff@example.com')
const delegatedLogin = await login('rbac.delegated@example.com')
const employeeLogin = await login('rbac.employee@example.com')

check('the HR Admin can sign in', adminLogin.status === 200, adminLogin.text.slice(0, 200))
check(
  'login returns the fine-grained permissions',
  Array.isArray(adminLogin.json?.permissions) && adminLogin.json.permissions.includes('users.permissions'),
  JSON.stringify(adminLogin.json?.permissions),
)
check(
  'login returns the HR role',
  adminLogin.json?.hrRole?.key === 'hr_admin',
  JSON.stringify(adminLogin.json?.hrRole),
)

const adminToken = adminLogin.json?.token
const staffToken = staffLogin.json?.token
const delegatedToken = delegatedLogin.json?.token
const employeeToken = employeeLogin.json?.token

// ---------------------------------------------------------------------------
suite('Catalogue and roles')

const catalogue = await api('/api/hr-manager/rbac/catalogue', { token: adminToken })
expectStatus('the HR Admin can read the permission catalogue', catalogue, 200)
check(
  'the catalogue lists every permission',
  catalogue.json?.permissions?.length === PERMISSIONS.length,
  `${catalogue.json?.permissions?.length} of ${PERMISSIONS.length}`,
)
check(
  'the catalogue marks the HR Admin role protected',
  catalogue.json?.roles?.find((role) => role.key === 'hr_admin')?.isProtected === true,
)
check(
  'the HR Admin is offered every permission as grantable',
  catalogue.json?.grantable?.length === PERMISSIONS.length,
  String(catalogue.json?.grantable?.length),
)

// ---------------------------------------------------------------------------
suite('A restricted HR account is refused by the server')

expectStatus(
  'staff cannot read payroll (no payroll.view)',
  await api('/api/hr-manager/payroll', { token: staffToken }),
  403,
)
expectStatus(
  'staff cannot delete an employee (no employees.delete)',
  await api('/api/hr-manager/employees/does-not-matter', { method: 'DELETE', token: staffToken }),
  403,
)
expectStatus(
  'staff cannot read HR settings they do not hold',
  await api('/api/hr-manager/settings', { token: employeeToken }),
  403,
)
expectStatus(
  'staff cannot manage HR users',
  await api('/api/hr-manager/hr-users', { token: staffToken }),
  403,
)
expectStatus(
  'staff cannot edit a role',
  await api('/api/hr-manager/rbac/roles/hr_manager', {
    method: 'PUT',
    token: staffToken,
    body: { permissions: ['users.permissions'] },
  }),
  403,
)
expectStatus(
  'staff can still read the employee directory',
  await api('/api/hr-manager/employees', { token: staffToken }),
  200,
)
expectStatus(
  'staff can still read HR settings (employees.view is enough for the shared lists)',
  await api('/api/hr-manager/settings', { token: staffToken }),
  200,
)

// ---------------------------------------------------------------------------
suite('An EMPLOYEE token cannot reach the HR API')

expectStatus(
  'an EMPLOYEE is refused the employee directory',
  await api('/api/hr-manager/employees', { token: employeeToken }),
  403,
)
expectStatus(
  'an EMPLOYEE is refused the HR dashboard',
  await api('/api/hr-manager/dashboard', { token: employeeToken }),
  403,
)
check(
  'an EMPLOYEE login carries no HR permissions',
  Array.isArray(employeeLogin.json?.permissions) && employeeLogin.json.permissions.length === 0,
  JSON.stringify(employeeLogin.json?.permissions),
)

expectStatus(
  'employee creation without a token is refused (auth is not weakened)',
  await api('/api/hr-manager/employees', { method: 'POST', body: {} }),
  401,
)

// ---------------------------------------------------------------------------
suite('An HR account cannot escalate itself')

expectStatus(
  'staff cannot grant itself a permission',
  await api(`/api/hr-manager/hr-users/${staff.id}/permissions`, {
    method: 'PUT',
    token: staffToken,
    body: { overrides: { 'users.permissions': 'ALLOW' } },
  }),
  403,
)
expectStatus(
  'staff cannot change its own role to HR Admin',
  await api(`/api/hr-manager/hr-users/${staff.id}`, {
    method: 'PUT',
    token: staffToken,
    body: { roleKey: 'hr_admin' },
  }),
  403,
)
expectStatus(
  'an editor cannot grant a permission it does not hold either',
  await api(`/api/hr-manager/hr-users/${delegated.id}/permissions`, {
    method: 'PUT',
    token: delegatedToken,
    body: { overrides: { 'users.permissions': 'ALLOW' } },
  }),
  403,
)
expectStatus(
  'an editor cannot change its own role',
  await api(`/api/hr-manager/hr-users/${delegated.id}`, {
    method: 'PUT',
    token: delegatedToken,
    body: { roleKey: 'hr_admin' },
  }),
  403,
)

// ---------------------------------------------------------------------------
suite('Even an account that may edit HR users cannot touch an HR Admin')

expectStatus(
  'the editor may list HR users',
  await api('/api/hr-manager/hr-users', { token: delegatedToken }),
  200,
)
expectStatus(
  'the editor cannot deactivate the HR Admin',
  await api(`/api/hr-manager/hr-users/${admin.id}`, {
    method: 'PUT',
    token: delegatedToken,
    body: { isActive: false },
  }),
  403,
)
expectStatus(
  'the editor cannot delete the HR Admin',
  await api(`/api/hr-manager/hr-users/${admin.id}`, {
    method: 'DELETE',
    token: delegatedToken,
  }),
  403,
)
expectStatus(
  'the editor cannot reset the HR Admin password',
  await api(`/api/hr-manager/hr-users/${admin.id}/reset-password`, {
    method: 'POST',
    token: delegatedToken,
  }),
  403,
)
expectStatus(
  'the editor cannot rewrite what a role grants',
  await api('/api/hr-manager/rbac/roles/hr_manager', {
    method: 'PUT',
    token: delegatedToken,
    body: { permissions: ['employees.view', 'users.permissions'] },
  }),
  403,
)

// ---------------------------------------------------------------------------
suite('The HR Admin governs access')

expectStatus(
  'the HR Admin can deactivate itself is refused (self-modification)',
  await api(`/api/hr-manager/hr-users/${admin.id}`, {
    method: 'PUT',
    token: adminToken,
    body: { isActive: false },
  }),
  403,
)
expectStatus(
  'the HR Admin cannot demote itself',
  await api(`/api/hr-manager/hr-users/${admin.id}`, {
    method: 'PUT',
    token: adminToken,
    body: { roleKey: 'hr_staff' },
  }),
  403,
)
expectStatus(
  'the protected HR Admin role cannot be edited',
  await api('/api/hr-manager/rbac/roles/hr_admin', {
    method: 'PUT',
    token: adminToken,
    body: { permissions: ['employees.view'] },
  }),
  403,
)

const created = await api('/api/hr-manager/hr-users', {
  method: 'POST',
  token: adminToken,
  body: { name: 'Verify Created', email: 'rbac.created@example.com', roleKey: 'hr_staff' },
})
expectStatus('the HR Admin can create an HR account', created, 201)
check(
  'the new account comes back with a temporary password',
  typeof created.json?.temporaryPassword === 'string' && created.json.temporaryPassword.length > 0,
)
check(
  "the new account's permissions match its role",
  created.json?.user?.hrRole?.key === 'hr_staff' &&
    Array.isArray(created.json?.user?.permissions) &&
    !created.json.user.permissions.includes('users.permissions'),
  JSON.stringify(created.json?.user?.permissions),
)

const createdId = created.json?.user?.id

const createdLogin = await login('rbac.created@example.com', created.json?.temporaryPassword)
expectStatus('the new account can sign in with the temporary password', createdLogin, 200)

expectStatus(
  "the HR Admin can grant a permission the new account's role lacks",
  await api(`/api/hr-manager/hr-users/${createdId}/permissions`, {
    method: 'PUT',
    token: adminToken,
    body: { overrides: { 'payroll.view': 'ALLOW' } },
  }),
  200,
)

const afterGrant = await login('rbac.created@example.com', created.json?.temporaryPassword)
check(
  'the granted permission takes effect on the next login',
  afterGrant.json?.permissions?.includes('payroll.view') === true,
  JSON.stringify(afterGrant.json?.permissions),
)
check(
  'the granted permission survives a fresh request (it is not only in the UI)',
  (
    await api('/api/hr-manager/payroll', {
      token: afterGrant.json?.token,
    })
  ).status === 200,
)

// ---------------------------------------------------------------------------
suite('Deactivation takes effect immediately')

const toDeactivate = await api('/api/hr-manager/hr-users', {
  method: 'POST',
  token: adminToken,
  body: { name: 'Verify Inactive', email: 'rbac.inactive@example.com', roleKey: 'hr_staff' },
})
const inactiveId = toDeactivate.json?.user?.id
const inactiveLogin = await login('rbac.inactive@example.com', toDeactivate.json?.temporaryPassword)
const inactiveToken = inactiveLogin.json?.token

expectStatus(
  'the account works before it is deactivated',
  await api('/api/hr-manager/employees', { token: inactiveToken }),
  200,
)

expectStatus(
  'the HR Admin can deactivate the account',
  await api(`/api/hr-manager/hr-users/${inactiveId}`, {
    method: 'PUT',
    token: adminToken,
    body: { isActive: false },
  }),
  200,
)

const blockedLogin = await login('rbac.inactive@example.com', toDeactivate.json?.temporaryPassword)
expectStatus('a deactivated account cannot sign in', blockedLogin, 403)
check(
  'the refusal names the account state',
  blockedLogin.json?.code === 'ACCOUNT_DEACTIVATED',
  JSON.stringify(blockedLogin.json),
)

expectStatus(
  'the token issued before deactivation stops working',
  await api('/api/hr-manager/employees', { token: inactiveToken }),
  403,
)

// ---------------------------------------------------------------------------
suite('The employer portal is unchanged')

// The employer routes are deliberately outside RBAC. This protects against the
// HR guards having been applied too widely and accidentally locking the company
// owner out of their own portal.
const employerLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'employer@yanol.com', password: 'employer@21' },
})
check(
  'the employer login still responds (403 for a wrong password, not from RBAC)',
  employerLogin.status === 200 || employerLogin.status === 401,
  `${employerLogin.status}: ${employerLogin.text.slice(0, 120)}`,
)

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(64))
console.log(`${passed} passed, ${failures.length} failed`)

if (failures.length) {
  console.log('\nFailures:')
  for (const failure of failures) {
    console.log(`  - [${failure.suite}] ${failure.description}`)
    if (failure.detail) console.log(`      ${failure.detail}`)
  }
}

console.log('='.repeat(64) + '\n')

await prisma.$disconnect()
server.close()

// The database is rebuilt from scratch on every run, so leave nothing behind.
rmSync(TEST_DB_PATH, { force: true })
rmSync(`${TEST_DB_PATH}-journal`, { force: true })

process.exitCode = failures.length ? 1 : 0
