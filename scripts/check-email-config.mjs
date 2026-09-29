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

const { ok, message, hint } = await verifySmtpConfiguration()

console.log('')
console.log(ok ? '  READY - email will be delivered.' : '  NOT READY')
console.log(`  ${message}`)

if (!ok) {
  if (hint) console.log(`  ${hint}`)
  console.log('')
  process.exit(1)
}

console.log('')
process.exit(0)
