// Verification of the employee personal-info changes: the TIN and pension ID
// becoming editable, and the new status document upload.
//
//   npm run verify:employee-profile
//
// Runs the real Express app against a throwaway SQLite database, so it never
// touches prisma/dev.db and never needs a credential for a real account.
//
// What it proves:
//   - the TIN and pension ID come back on the profile and can be written
//   - the server refuses a nonsense value rather than storing it
//   - a partial update does NOT erase the other fields - this is the property
//     that was silently broken before, where uploading a profile photo wiped the
//     professional links and the skills
//   - a status document uploads, replaces, downloads and is cleaned up when a
//     new one replaces it
//   - the wrong kind of file is refused, and the size ceiling is enforced
//   - one employee cannot read another employee's document
//   - a previous document is removed from disk when it is replaced, so the
//     uploads directory does not grow without bound

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { STATUS_DOCUMENT_DIRECTORY } from '../server/middleware/status-document-upload.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TEST_DB = 'verify-employee-profile.db'
const TEST_DB_PATH = path.join(ROOT, 'prisma', TEST_DB)

rmSync(TEST_DB_PATH, { force: true })
rmSync(`${TEST_DB_PATH}-journal`, { force: true })

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

const server = app.listen(0)
await new Promise((resolve) => server.once('listening', resolve))
const BASE = `http://127.0.0.1:${server.address().port}`

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

const expectStatus = (description, response, status) =>
  check(
    description,
    response.status === status,
    `expected ${status}, got ${response.status}: ${response.text.slice(0, 200)}`,
  )

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

async function login(email, password) {
  return api('/api/auth/login', { method: 'POST', body: { email, password } })
}

/** A multipart upload, built by hand so the file bytes are ours to control. */
async function upload(pathname, field, filename, mimeType, bytes, token) {
  const form = new FormData()
  form.append(field, new Blob([bytes], { type: mimeType }), filename)

  const res = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
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

async function download(pathname, token) {
  const res = await fetch(`${BASE}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status, text: res.headers.get('content-type'), bytes: Buffer.from(await res.arrayBuffer()) }
}

function makePdf(marker) {
  // Enough of a PDF header to be a plausible file. The server stores what it is
  // given rather than parsing it, so the content only has to be distinguishable.
  return Buffer.from(`%PDF-1.4\n% ${marker}\n%%EOF\n`)
}

// ── Fixtures ────────────────────────────────────────────────────────────

const stamp = Date.now().toString().slice(-6)

const employer = {
  email: `profile.owner.${stamp}@example.com`,
  password: 'OwnerPass-4471!',
}

const alice = {
  name: 'Profile Alice',
  email: `profile.alice.${stamp}@example.com`,
  password: 'AlicePass-5523!',
}

const bob = {
  name: 'Profile Bob',
  email: `profile.bob.${stamp}@example.com`,
  password: 'BobPass-8814!',
}

await prisma.user.create({
  data: {
    name: 'Profile Owner',
    email: employer.email,
    password: await hashPassword(employer.password),
    role: 'EMPLOYER',
    isActive: true,
  },
})

for (const person of [alice, bob]) {
  const employee = await prisma.employee.create({
    data: {
      id: `EMP-PROFILE-${person.email}`,
      employeeId: `E-${stamp}-${person.email.length}`,
      name: person.name,
      gender: 'Female',
      dateOfBirth: '1990-01-01',
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
      tin: '0000000000',
      pensionId: 'PEN-0000',
      phone: '',
      email: person.email,
      address: '',
      emergencyContact: '',
      employmentStatus: 'Active',
      status: 'Active',
      avatar: '',
      location: '',
      salary: 1000,
      manager: '',
      roleType: 'Staff',
      initials: 'PA',
      githubUrl: 'https://github.com/alice',
      linkedinUrl: 'https://linkedin.com/in/alice',
      portfolioUrl: 'https://alice.example.com',
      skills: 'Excel, SQL',
    },
  })

  await prisma.user.create({
    data: {
      name: person.name,
      email: person.email,
      password: await hashPassword(person.password),
      role: 'EMPLOYEE',
      employeeId: employee.id,
      isActive: true,
    },
  })
}

const aliceLogin = await login(alice.email, alice.password)
const bobLogin = await login(bob.email, bob.password)
const aliceToken = aliceLogin.json?.token
const bobToken = bobLogin.json?.token

// ── The TIN and pension ID are readable and writable ─────────────────────

suite('The TIN and pension ID come back on the profile')

const initialProfile = await api('/api/employer/profile', { token: aliceToken })
expectStatus('the profile loads', initialProfile, 200)
check(
  'the TIN is on the profile',
  initialProfile.json?.tin === '0000000000',
  JSON.stringify(initialProfile.json?.tin),
)
check(
  'the pension ID is on the profile',
  initialProfile.json?.pensionId === 'PEN-0000',
  JSON.stringify(initialProfile.json?.pensionId),
)

suite('The TIN and pension ID can be corrected by the employee')

const corrected = await api('/api/employer/profile', {
  method: 'PUT',
  token: aliceToken,
  body: { tin: '0009876543', pensionId: 'PEN-20481' },
})
expectStatus('the correction is accepted', corrected, 200)
check(
  'the new TIN is stored',
  corrected.json?.tin === '0009876543',
  JSON.stringify(corrected.json?.tin),
)
check(
  'the new pension ID is stored',
  corrected.json?.pensionId === 'PEN-20481',
  JSON.stringify(corrected.json?.pensionId),
)
check(
  'it survives a fresh read',
  (await api('/api/employer/profile', { token: aliceToken })).json?.tin === '0009876543',
)

const spaced = await api('/api/employer/profile', {
  method: 'PUT',
  token: aliceToken,
  body: { tin: '  000-987-6543  ' },
})
check(
  'surrounding whitespace is trimmed',
  spaced.json?.tin === '000-987-6543',
  JSON.stringify(spaced.json?.tin),
)

check(
  'a form with dashes and letters is accepted',
  (
    await api('/api/employer/profile', {
      method: 'PUT',
      token: aliceToken,
      body: { tin: 'TIN-AB 12' },
    })
  ).status === 200,
)

suite('The server refuses a value that is not an identifier')

const scriptInjection = await api('/api/employer/profile', {
  method: 'PUT',
  token: aliceToken,
  body: { tin: '<script>alert(1)</script>' },
})
expectStatus('a value with markup is refused', scriptInjection, 400)
check(
  'the refusal explains the rule',
  /letters, numbers, spaces and dashes/i.test(scriptInjection.json?.message || ''),
  JSON.stringify(scriptInjection.json),
)

expectStatus(
  'an over-long value is refused',
  await api('/api/employer/profile', {
    method: 'PUT',
    token: aliceToken,
    body: { pensionId: '9'.repeat(33) },
  }),
  400,
)

check(
  'the refused values did not change what is stored',
  (await api('/api/employer/profile', { token: aliceToken })).json?.pensionId === 'PEN-20481',
)

// ── A partial update must not erase the rest ─────────────────────────────

suite('A partial update leaves the other fields alone')

// This is the property that was broken: the handler used to default anything
// absent from the body to the empty string, so uploading a profile photo wiped
// the links and the skills. Uploading a photo is the exact call that does this.
const beforePhoto = await api('/api/employer/profile', { token: aliceToken })

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

// The avatar takes base64 through the JSON body, not a multipart upload, so
// the realistic call here is a JSON update carrying the avatar and nothing else.
const avatarOnly = await api('/api/employer/profile', {
  method: 'PUT',
  token: aliceToken,
  body: {
    avatar: `data:image/png;base64,${tinyPng.toString('base64')}`,
  },
})
expectStatus('an avatar-only update is accepted', avatarOnly, 200)
check(
  'the TIN survived the avatar update',
  avatarOnly.json?.tin === beforePhoto.json?.tin,
  `${beforePhoto.json?.tin} -> ${avatarOnly.json?.tin}`,
)
check(
  'the pension ID survived the avatar update',
  avatarOnly.json?.pensionId === beforePhoto.json?.pensionId,
  `${beforePhoto.json?.pensionId} -> ${avatarOnly.json?.pensionId}`,
)
check(
  'the GitHub link survived the avatar update',
  avatarOnly.json?.githubUrl === 'https://github.com/alice',
  JSON.stringify(avatarOnly.json?.githubUrl),
)
check(
  'the LinkedIn link survived the avatar update',
  avatarOnly.json?.linkedinUrl === 'https://linkedin.com/in/alice',
  JSON.stringify(avatarOnly.json?.linkedinUrl),
)
check(
  'the portfolio survived the avatar update',
  avatarOnly.json?.portfolioUrl === 'https://alice.example.com',
  JSON.stringify(avatarOnly.json?.portfolioUrl),
)
check(
  'the skills survived the avatar update',
  avatarOnly.json?.skills === 'Excel, SQL',
  JSON.stringify(avatarOnly.json?.skills),
)

const linksOnly = await api('/api/employer/profile', {
  method: 'PUT',
  token: aliceToken,
  body: { skills: 'Excel, SQL, Power BI' },
})
check(
  'a skills-only update does not touch the TIN',
  linksOnly.json?.tin === beforePhoto.json?.tin,
  JSON.stringify(linksOnly.json?.tin),
)
check(
  'a skills-only update does not touch the links',
  linksOnly.json?.githubUrl === 'https://github.com/alice',
  JSON.stringify(linksOnly.json?.githubUrl),
)

expectStatus(
  'an empty update is refused rather than silently blanking the record',
  await api('/api/employer/profile', { method: 'PUT', token: aliceToken, body: {} }),
  400,
)

check(
  'the refused empty update changed nothing',
  (await api('/api/employer/profile', { token: aliceToken })).json?.skills ===
    'Excel, SQL, Power BI',
)

// ── The status document ──────────────────────────────────────────────────

suite('Uploading a status document')

check(
  'the profile starts with no status document',
  (await api('/api/employer/profile', { token: aliceToken })).json?.statusFileName == null,
)

expectStatus(
  'a request with no file is refused',
  await api('/api/employer/profile/status-document', { method: 'POST', token: aliceToken }),
  400,
)

const firstUpload = await upload(
  '/api/employer/profile/status-document',
  'statusDocument',
  'transfer-letter.pdf',
  'application/pdf',
  makePdf('first'),
  aliceToken,
)
expectStatus('a PDF status document uploads', firstUpload, 200)
check(
  'the profile reports the file name',
  firstUpload.json?.statusFileName === 'transfer-letter.pdf',
  JSON.stringify(firstUpload.json?.statusFileName),
)
check(
  'the profile reports a size',
  firstUpload.json?.statusFileSize > 0,
  JSON.stringify(firstUpload.json?.statusFileSize),
)
check(
  'the TIN is untouched by the upload',
  firstUpload.json?.tin === beforePhoto.json?.tin,
  JSON.stringify(firstUpload.json?.tin),
)

const storedRow = await prisma.employee.findFirst({ where: { email: alice.email } })
const firstStorageName = storedRow?.statusFileStorageName
check(
  'the stored name is a random one, not the uploaded file name',
  firstStorageName && firstStorageName !== 'transfer-letter.pdf',
  firstStorageName,
)
check(
  'the stored name has no path separator',
  firstStorageName && firstStorageName === path.basename(firstStorageName),
  firstStorageName,
)

suite('Downloading the status document')

const fetched = await download('/api/employer/profile/status-document', aliceToken)
expectStatus('the document downloads', fetched, 200)
check(
  'what comes back is the PDF that was uploaded',
  fetched.bytes.toString().includes('% first'),
  fetched.bytes.toString().slice(0, 80),
)

expectStatus(
  'an employee with no document is told so, not given a broken file',
  await download('/api/employer/profile/status-document', bobToken),
  404,
)

suite('Replacing the document removes the old file')

const filesBefore = existsSync(STATUS_DOCUMENT_DIRECTORY)
  ? readdirSync(STATUS_DOCUMENT_DIRECTORY).length
  : 0

const secondUpload = await upload(
  '/api/employer/profile/status-document',
  'statusDocument',
  'medical-cert.png',
  'image/png',
  tinyPng,
  aliceToken,
)
check('a PNG status document uploads', secondUpload.status === 200, secondUpload.text.slice(0, 120))
check(
  'the profile now reports the new file name',
  secondUpload.json?.statusFileName === 'medical-cert.png',
  JSON.stringify(secondUpload.json?.statusFileName),
)

check(
  'the previous file is gone from disk',
  !existsSync(path.join(STATUS_DOCUMENT_DIRECTORY, firstStorageName)),
  firstStorageName,
)
const filesAfter = existsSync(STATUS_DOCUMENT_DIRECTORY)
  ? readdirSync(STATUS_DOCUMENT_DIRECTORY).length
  : 0
check(
  'the uploads directory did not grow by keeping the old file',
  filesAfter === filesBefore,
  `${filesBefore} -> ${filesAfter}`,
)

const refetched = await download('/api/employer/profile/status-document', aliceToken)
check(
  'the download now returns the new document',
  refetched.bytes.equals(tinyPng),
  `${refetched.bytes.length} bytes`,
)

suite('The wrong kind of file is refused')

const wrongType = await upload(
  '/api/employer/profile/status-document',
  'statusDocument',
  'payload.exe',
  'application/x-msdownload',
  Buffer.from('MZ not really an executable'),
  aliceToken,
)
expectStatus('an executable is refused', wrongType, 400)

const lyingExtension = await upload(
  '/api/employer/profile/status-document',
  'statusDocument',
  'sneaky.pdf',
  'application/x-msdownload',
  Buffer.from('MZ not really a PDF'),
  aliceToken,
)
expectStatus('a PDF name with a non-PDF type is refused', lyingExtension, 400)

const oversized = await upload(
  '/api/employer/profile/status-document',
  'statusDocument',
  'huge.pdf',
  'application/pdf',
  Buffer.alloc(10 * 1024 * 1024 + 1024, 0x41),
  aliceToken,
)
expectStatus('a file over the ceiling is refused', oversized, 413)

check(
  'the refusals left the good document in place',
  (await api('/api/employer/profile', { token: aliceToken })).json?.statusFileName ===
    'medical-cert.png',
)

suite('One employee cannot touch another employee’s document')

const bobUpload = await upload(
  '/api/employer/profile/status-document',
  'statusDocument',
  'bob-letter.pdf',
  'application/pdf',
  makePdf('bob'),
  bobToken,
)
check("Bob's own upload works", bobUpload.status === 200, bobUpload.text.slice(0, 120))

const bobRow = await prisma.employee.findFirst({ where: { email: bob.email } })
check(
  "Bob's document is stored under his own record",
  bobRow?.statusFileName === 'bob-letter.pdf',
  JSON.stringify(bobRow?.statusFileName),
)
check(
  "Alice's document was not replaced by Bob's upload",
  (await api('/api/employer/profile', { token: aliceToken })).json?.statusFileName ===
    'medical-cert.png',
)

// ── The guards ───────────────────────────────────────────────────────────

suite('The document endpoints still require a sign-in')

for (const [description, response] of [
  ['reading the profile', await api('/api/employer/profile')],
  ['updating the profile', await api('/api/employer/profile', { method: 'PUT', body: { tin: '1' } })],
  [
    'downloading a document',
    await api('/api/employer/profile/status-document'),
  ],
]) {
  expectStatus(`${description} without a token is refused`, response, 401)
}

// ── Cleanup ──────────────────────────────────────────────────────────────

const rows = await prisma.employee.findMany({ where: { email: { in: [alice.email, bob.email] } } })
for (const row of rows) {
  if (row.statusFileStorageName) {
    rmSync(path.join(STATUS_DOCUMENT_DIRECTORY, row.statusFileStorageName), { force: true })
  }
}

await prisma.employee.deleteMany({ where: { email: { in: [alice.email, bob.email] } } })
await prisma.user.deleteMany({
  where: { email: { in: [employer.email, alice.email, bob.email] } },
})

await new Promise((resolve) => server.close(resolve))
await prisma.$disconnect()

rmSync(TEST_DB_PATH, { force: true })
rmSync(`${TEST_DB_PATH}-journal`, { force: true })

console.log('\n' + '='.repeat(64))
console.log(`${passed} passed, ${failures.length} failed`)

if (failures.length) {
  console.log('\nFailures:')
  for (const failure of failures) {
    console.log(`  [${failure.suite}] ${failure.description}`)
    if (failure.detail) console.log(`      ${failure.detail}`)
  }
}

process.exit(failures.length ? 1 : 0)
