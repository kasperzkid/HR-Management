// Row-count sanity check across every table that matters, so it is obvious if
// anything was lost while the authentication migration ran.
// Read-only. Prints counts and a summary of how passwords are stored.
import { PrismaClient } from '@prisma/client'
import { isBcryptHash } from '../server/utils/security.js'

const prisma = new PrismaClient()

const tables = [
  ['User', 'user'],
  ['Employee', 'employee'],
  ['PasswordResetToken', 'passwordResetToken'],
  ['Announcement', 'announcement'],
  ['Message', 'message'],
  ['Attendance', 'attendance'],
  ['LeaveRequest', 'leaveRequest'],
  ['PayrollRecord', 'payrollRecord'],
  ['Setting', 'setting'],
]

console.log('\nRow counts')
console.log('-'.repeat(46))

let anyMissing = false

for (const [label, model] of tables) {
  try {
    const count = await prisma[model].count()
    console.log(`  ${label.padEnd(22)} ${count}`)
  } catch (error) {
    anyMissing = true
    console.log(`  ${label.padEnd(22)} ERROR ${error.message.slice(0, 60)}`)
  }
}

const users = await prisma.user.findMany({
  select: {
    email: true,
    password: true,
    role: true,
    mustChangePassword: true,
  },
  orderBy: { id: 'asc' },
})

const plaintext = users.filter((u) => !isBcryptHash(u.password))
const admins = users.filter((u) =>
  ['HR_MANAGER', 'HR', 'ADMIN', 'HR_ADMIN'].includes(u.role),
)

console.log('-'.repeat(46))
console.log(`  accounts                 ${users.length}`)
console.log(`  bcrypt hashed            ${users.length - plaintext.length}`)
console.log(`  plaintext remaining      ${plaintext.length}`)
console.log(`  HR admins                ${admins.length} (${admins.map((a) => a.email).join(', ')})`)
console.log(`  flagged must-change      ${users.filter((u) => u.mustChangePassword).length}`)

if (plaintext.length > 0) {
  console.log('\n  Still stored in plaintext:')
  for (const user of plaintext) console.log(`    - ${user.email}`)
}

await prisma.$disconnect()
console.log('')
process.exit(plaintext.length > 0 || anyMissing || admins.length !== 1 ? 1 : 0)
