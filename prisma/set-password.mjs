// Sets an account's password to a bcrypt hash of a value passed on the
// command line.
//
//   node prisma/set-password.mjs <email> <password>
//
// Used to install the initial HR Admin's temporary setup password, and to
// restore one after a verification run.
//
// The password is never written to source, never stored anywhere but the
// database as a hash, and never echoed back by the script. Pass it as an
// argument rather than in a file, so it does not end up in a shell history you
// later commit. The script does not accept a password from the environment
// either, for the same reason.

import { PrismaClient } from '@prisma/client'
import { hashPassword, isBcryptHash } from '../server/utils/security.js'

const prisma = new PrismaClient()

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error(
    'usage: node prisma/set-password.mjs <email> <password>',
  )
  process.exit(1)
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const normalized = email.trim().toLowerCase()

const existing = await prisma.user.findUnique({
  where: { email: normalized },
  select: { id: true },
})

if (!existing) {
  console.error(`No account found for ${normalized}.`)
  process.exit(1)
}

const user = await prisma.user.update({
  where: { id: existing.id },
  data: {
    password: await hashPassword(password),
    // Flagged so the settings page reminds them to replace the temporary
    // password before the system is handed over.
    mustChangePassword: true,
  },
  select: {
    email: true,
    role: true,
    mustChangePassword: true,
    password: true,
  },
})

console.log(`${user.email} (${user.role})`)
console.log(`  password stored as bcrypt : ${isBcryptHash(user.password)}`)
console.log(`  hash length               : ${user.password.length}`)
console.log(`  flagged must-change       : ${user.mustChangePassword}`)

await prisma.$disconnect()
console.log('')
