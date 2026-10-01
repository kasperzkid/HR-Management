// Standalone SMTP configuration check.
//
//   npm run email:check
//
// Opens a real connection to the configured mail server and authenticates,
// which is the only way to know that password resets and employee credential
// emails will actually be delivered. Prints nothing secret: the password is
// only ever reported as "set" or "not set".
//
// Exit code 0 = ready, 1 = not ready, so this can gate a deployment.

import '../server/env.js'
import { smtpStatus, verifySmtpConfiguration } from '../server/services/email.service.js'

const status = smtpStatus()

console.log('\nSMTP configuration')
console.log('------------------')
console.log(`  SMTP_HOST      : ${status.host ?? '(not set)'}`)
console.log(`  SMTP_PORT      : ${status.port}`)
console.log(`  SMTP_USER      : ${status.user ?? '(not set)'}`)
console.log(`  SMTP_PASSWORD  : ${status.passwordSet ? 'set' : 'NOT SET'}`)
console.log(`  SMTP_FROM      : ${status.from ?? '(not set)'}`)

const { ok, state, message, hint } = await verifySmtpConfiguration()

const headline = ok
  ? 'READY - email will be delivered.'
  : state === 'unconfigured'
  ? 'NOT SET UP YET - the mail settings have not been filled in.'
  : 'NOT READY - the mail settings are present but the server rejected them.'

console.log('')
console.log(`  ${headline}`)
console.log(`  ${message}`)

if (!ok) {
  if (hint) console.log(`  ${hint}`)

  if (state === 'unconfigured') {
    console.log('')
    console.log('  Nothing else in the system is affected. To turn email on:')
    console.log('    1. Open .env and fill in SMTP_HOST / SMTP_PORT / SMTP_SECURE /')
    console.log('       SMTP_USER / SMTP_PASSWORD / SMTP_FROM (see .env.example).')
    console.log('    2. Run "npm run email:check" again.')
    console.log('    3. Restart the server.')
  }

  console.log('')
  process.exit(1)
}

console.log('')
process.exit(0)
