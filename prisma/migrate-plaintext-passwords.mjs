// One-time password migration: remove every plaintext password from the
// database.
//
//   npm run auth:migrate                      convert what can be converted
//   npm run auth:migrate -- --audit           report only, change nothing
//   npm run auth:migrate -- --force-reset <email> ...
//                                            disable passwords, force the
//                                            secure "Forgot password" flow
//
// Why this exists
// ---------------
// This database predates password hashing, so every account originally stored
// its password as readable text. Passwords are now always written as bcrypt
// hashes, and verifyPassword refuses to authenticate against a non-hash, so
// anything still stored in plaintext is dead weight that can only ever be a
// liability. This script finishes that job.
//
// What it does with each affected account
// --------------------------------------
// 1. The password is read from the row, hashed once, and written straight back.
//    The plaintext is never logged, printed, returned by an API, emailed, or
//    written anywhere else. After the update it no longer exists in the
//    database, so this is a conversion rather than a retention of plaintext.
//    The user keeps the password they already have.
//
// 2. A value that cannot be converted - empty, whitespace, or otherwise
//    unusable - is replaced with a hash of random bytes that nobody knows, and
//    mustChangePassword is set. That account is locked out of password login
//    and can only return through "Forgot password", which is the secure
//    forced-reset path. It is listed at the end so HR can contact them.
//
// 3. --force-reset applies step 2 to an account deliberately, which is how a
//    known-compromised password is retired without anyone knowing the new one.
//
// Safe to run repeatedly: an account that is already a bcrypt hash is skipped.
//
// The script never prints password material - only the account, the role, and
// whether the value was hashed or in plaintext.

import { PrismaClient } from '@prisma/client'
import {
  isBcryptHash,
  hashPassword,
  generateUnusablePasswordHash,
} from '../server/utils/security.js'

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const auditOnly = args.includes('--audit')
const forceResetEmails = args
  .slice(args.indexOf('--force-reset') + 1)
  .filter((value) => value.includes('@'))
  .map((value) => value.trim().toLowerCase())

// A stored value that is obviously not a usable password.
function isUnusable(value) {
  return typeof value !== 'string' || value.trim().length === 0
}

async function main() {
  console.log(
    auditOnly
      ? 'Auditing stored passwords (read-only)...'
      : 'Migrating stored passwords...',
  )
  console.log('')

  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
    },
  })

  const plaintext = users.filter((user) => !isBcryptHash(user.password))
  const alreadyHashed = users.length - plaintext.length

  console.log(`  ${users.length} account(s) total`)
  console.log(`  ${alreadyHashed} already hashed`)
  console.log(`  ${plaintext.length} still stored in plaintext`)
  console.log('')

  if (plaintext.length === 0) {
    console.log('No plaintext passwords remain. Nothing to do.')
    return
  }

  console.log('Affected accounts:')
  for (const user of plaintext) {
    console.log(
      `  id=${user.id}  ${user.email}  role=${user.role}  name="${user.name}"  stored=PLAINTEXT`,
    )
  }
  console.log('')

  if (auditOnly) {
    console.log('Audit only. Re-run without --audit to migrate these accounts.')
    return
  }

  const converted = []
  const forced = []

  for (const user of plaintext) {
    // Take a local copy, immediately overwrite the field so the plaintext is
    // not left sitting in a long-lived object, and blank it once the new hash
    // is written. It is never passed to console, fetch, or anything else.
    const existing = user.password
    user.password = ''

    const forceIt = forceResetEmails.includes(user.email.toLowerCase())

    if (forceIt) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: await generateUnusablePasswordHash(),
          mustChangePassword: true,
        },
      })

      forced.push(user.email)
      console.log(`  forced reset  ${user.email}  (password disabled)`)
      continue
    }

    if (isUnusable(existing)) {
      // Nothing to convert - no password was ever set, or it is blank. Lock
      // the account to the reset flow rather than leaving a guessable value.
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: await generateUnusablePasswordHash(),
          mustChangePassword: true,
        },
      })

      forced.push(user.email)
      console.log(
        `  no password stored  ${user.email}  (locked to "Forgot password")`,
      )
      continue
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(existing),
      },
    })

    converted.push(user.email)
    console.log(`  hashed        ${user.email}  (existing password still works)`)
  }

  console.log('')
  console.log(`  ${converted.length} account(s) converted to bcrypt`)
  console.log(`  ${forced.length} account(s) forced through "Forgot password"`)

  if (forced.length > 0) {
    console.log('')
    console.log(
      'These accounts cannot sign in with an old password. Ask each person to use',
    )
    console.log('"Forgot password" on the login page to set a new one:')
    for (const email of forced) {
      console.log(`  - ${email}`)
    }
  }

  // Final proof, read back from the database rather than assumed.
  const after = await prisma.user.findMany({
    select: { email: true, password: true },
  })
  const remaining = after.filter((user) => !isBcryptHash(user.password))

  console.log('')

  if (remaining.length > 0) {
    console.error(
      `FAILED: ${remaining.length} account(s) still hold a non-hash password.`,
    )
    for (const user of remaining) {
      console.error(`  - ${user.email}`)
    }
    process.exitCode = 1
    return
  }

  console.log(
    `Verified: all ${after.length} account(s) now store a bcrypt hash. No plaintext passwords remain.`,
  )
}

main()
  .catch((error) => {
    console.error('\nMigration failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
