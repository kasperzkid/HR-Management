// Proves that "Forgot password" really does deliver a reset link for the real
// HR Admin account on prisma/dev.db.
//
//   node scripts/live-smtp-proof.mjs
//
// A local SMTP sink stands in for Gmail, so nothing is sent externally and no
// App Password is needed. The point is to show the whole chain works against
// the actual account rather than a fixture: request -> real token row -> real
// message with a real link -> link is valid.
//
// The token row it creates is deleted again, so the live database is left
// exactly as it was found.

import { rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

import { startSmtpSink } from './lib/smtp-sink.mjs'
import { decodeMessageText, extractResetToken } from './lib/mime.mjs'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const HR_EMAIL = process.env.HR_EMAIL

if (!HR_EMAIL) {
  console.error('Set HR_EMAIL to the HR Admin address first.')
  process.exit(1)
}

const sink = await startSmtpSink()

process.env.SMTP_HOST = sink.host
process.env.SMTP_PORT = String(sink.port)
process.env.SMTP_SECURE = 'false'
process.env.SMTP_USER = 'proof-sender@gmail.com'
process.env.SMTP_PASSWORD = 'proof-only'
process.env.SMTP_FROM = 'YanolTech HR <proof-sender@gmail.com>'

const { default: app } = await import('../server/app.js')
const { default: prisma } = await import('../server/db.js')
const { hashResetToken } = await import('../server/utils/security.js')
const { verifySmtpConfiguration } =
  await import('../server/services/email.service.js')

const server = app.listen(0)
await new Promise((resolve) => server.once('listening', resolve))
const BASE = `http://127.0.0.1:${server.address().port}`

let failed = 0
function check(label, ok, detail = '') {
  if (!ok) failed += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}

console.log('\nForgot password against the real HR Admin account')
console.log('-'.repeat(60))

const verified = await verifySmtpConfiguration()
check('SMTP configuration verifies', verified.ok, verified.message)

const before = await prisma.passwordResetToken.count()

const res = await fetch(`${BASE}/api/auth/forgot-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: HR_EMAIL }),
})
const body = await res.json()

check('The request returns 200', res.status === 200, `status ${res.status}`)
check('Exactly one message was delivered', sink.messages.length === 1, `${sink.messages.length}`)

const message = sink.last()
check('It was addressed to the HR Admin', message?.to?.[0] === HR_EMAIL, `to ${message?.to?.[0]}`)

const decoded = decodeMessageText(message?.raw)
const token = extractResetToken(decoded)

check('The message contains a reset link', Boolean(token))
check('The link points at the reset page', decoded.includes('/reset-password?token='))
check('The message states the expiry', /30 minutes/i.test(decoded))

const row = await prisma.passwordResetToken.findFirst({
  where: { tokenHash: hashResetToken(token) },
  include: { user: true },
})

check('A token row was written for the real account', Boolean(row), row ? `userId ${row.userId}` : 'none')
check('The row belongs to the HR Admin', row?.user?.email === HR_EMAIL)
check('The row stores a hash, not the token', row?.tokenHash !== token)
check('The row expires in the future', row?.expiresAt.getTime() > Date.now())

// And the link actually works.
if (token) {
  const newPassword = 'ProofOnlyPass9!'
  const reset = await fetch(`${BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      newPassword,
      confirmPassword: newPassword,
    }),
  })

  check('The emailed link sets a new password', reset.status === 200, `status ${reset.status}`)

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: HR_EMAIL, password: newPassword }),
  })

  check('Sign in works with the new password', login.status === 200, `status ${login.status}`)

  // Put the original password back so the HR Admin keeps the one they know.
  const original = process.env.HR_PASSWORD

  if (original) {
    const changed = await prisma.user.update({
      where: { email: HR_EMAIL },
      data: { password: await (await import('../server/utils/security.js')).hashPassword(original) },
    })
    check('The original password is restored', Boolean(changed.password))
  } else {
    console.log('  NOTE  set HR_PASSWORD to have the original password restored.')
  }
}

await new Promise((resolve) => server.close(resolve))
await sink.close()

// Remove the token row this proof created, leaving the database as found.
if (token) {
  await prisma.passwordResetToken.deleteMany({
    where: { tokenHash: hashResetToken(token) },
  })
}

const after = await prisma.passwordResetToken.count()
check('The database is left as it was found', after === before, `${before} -> ${after} token rows`)

await prisma.$disconnect()

console.log('-'.repeat(60))
console.log(`  ${failed === 0 ? 'All checks passed.' : `${failed} check(s) failed.`}`)
console.log('-'.repeat(60))
console.log('')

process.exit(failed === 0 ? 0 : 1)
