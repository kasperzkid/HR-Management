// One-time data migration: move the HR Admin onto a real email address.
//
// Run with:  node prisma/migrate-hr-admin.mjs
//
// What it does, and why:
//   1. Promotes the account HR_ADMIN_EMAIL to the HR_MANAGER role. That
//      address already existed as an employee login, so it is updated in
//      place rather than duplicated.
//   2. Deletes the old placeholder HR Admin, hr@yanol.com, so there is
//      exactly one HR Admin rather than two competing ones.
//   3. Leaves every other account completely untouched, including their
//      passwords.
//
// This script has already been run for this database - the HR Admin account
// is in place and the placeholder is gone. It is kept because it is the
// record of what happened and because it is safe to re-run.
//
// The address comes from HR_ADMIN_EMAIL (or SEED_HR_ADMIN_EMAIL) if either is
// set, and otherwise from the one account in the database that already holds
// the HR_MANAGER role. There is no hard-coded address anywhere in this file:
// nothing is baked into the authentication system, so the admin can change
// their own login email later from Account Settings, and login and "Forgot
// password" both follow whatever address the account currently holds.
//
// Plaintext passwords are NOT handled here. They are removed separately by
// `npm run auth:migrate`, which converts each one to a bcrypt hash. Nothing in
// the running server accepts a plaintext password, so leaving them for a
// future login would simply lock those people out.

import { PrismaClient } from '@prisma/client'
import { isBcryptHash } from '../server/utils/security.js'

const prisma = new PrismaClient()

// Deliberately no hard-coded fallback address. An earlier version of this file
// defaulted to the original developer's personal address, which meant the
// address lived in the source code as well as in the database - exactly the
// coupling this system is meant to be free of. The account's real address is
// whatever the User row currently holds; it is never written into a file.
const HR_ADMIN_EMAIL = (
  process.env.HR_ADMIN_EMAIL || process.env.SEED_HR_ADMIN_EMAIL || ''
)
  .trim()
  .toLowerCase()

const OLD_HR_ADMIN_EMAIL = 'hr@yanol.com'

const describe = (user) =>
  user
    ? `id=${user.id}  email=${user.email}  role=${user.role}  employeeId=${user.employeeId ?? '-'}  passwordHashed=${isBcryptHash(user.password)}`
    : '(not found)'

async function main() {
  // With no address given, fall back to the account that already holds the
  // HR_MANAGER role. That is the account this script is about, and finding it
  // from the database is what keeps the address out of the source code.
  let hrAdminEmail = HR_ADMIN_EMAIL

  if (!hrAdminEmail) {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['HR_MANAGER', 'HR_ADMIN', 'ADMIN', 'HR'] } },
      orderBy: { id: 'asc' },
    })

    if (admins.length === 1) {
      hrAdminEmail = admins[0].email
      console.log(
        `Using the existing HR Admin account found in the database: ${hrAdminEmail}`,
      )
    } else {
      throw new Error(
        'No HR_ADMIN_EMAIL was set and the database does not have exactly one ' +
          'HR Admin to work from. Set HR_ADMIN_EMAIL (or SEED_HR_ADMIN_EMAIL) ' +
          `to the right address. Found ${admins.length} candidate(s).`,
      )
    }
  }

  console.log('--- before ---')

  const before = await prisma.user.findMany({
    where: { email: { in: [hrAdminEmail, OLD_HR_ADMIN_EMAIL] } },
    orderBy: { id: 'asc' },
  })

  for (const user of before) console.log(`  ${describe(user)}`)

  const target = before.find((u) => u.email === hrAdminEmail)
  const oldAdmin = before.find((u) => u.email === OLD_HR_ADMIN_EMAIL)

  if (!target) {
    throw new Error(
      `${hrAdminEmail} does not exist. Create it before running this migration.`,
    )
  }

  // Step 1: promote. The employeeId link is kept on purpose so the HR Admin
  // retains their existing employee record and dashboard access.
  await prisma.user.update({
    where: { id: target.id },
    data: { role: 'HR_MANAGER' },
  })
  console.log(`\n[1] ${hrAdminEmail} -> role HR_MANAGER (employee record link kept)`)

  // Step 2: hand the placeholder's content to the surviving account, then
  // remove it, so there is exactly one HR Admin and nothing is lost.
  if (oldAdmin) {
    const moved = await prisma.$transaction(async (tx) => {
      const [announcements, sent, received, tokens] = await Promise.all([
        tx.announcement.updateMany({
          where: { authorId: oldAdmin.id },
          data: { authorId: target.id },
        }),
        tx.message.updateMany({
          where: { senderId: oldAdmin.id },
          data: { senderId: target.id },
        }),
        tx.message.updateMany({
          where: { receiverId: oldAdmin.id },
          data: { receiverId: target.id },
        }),
        tx.passwordResetToken.updateMany({
          where: { userId: oldAdmin.id },
          data: { userId: target.id },
        }),
      ])

      await tx.user.delete({ where: { id: oldAdmin.id } })

      return {
        announcements: announcements.count,
        sent: sent.count,
        received: received.count,
        tokens: tokens.count,
      }
    })

    console.log(
      `[2] moved ${moved.announcements} announcement(s), ${moved.sent} sent and ${moved.received} received message(s) to the surviving account`,
    )
    console.log(`[2] deleted the old placeholder HR Admin ${OLD_HR_ADMIN_EMAIL} (id=${oldAdmin.id})`)
  } else {
    console.log(`[2] ${OLD_HR_ADMIN_EMAIL} was already absent - nothing to delete`)
  }

  // Step 3: report remaining HR-role accounts, so a duplicate is visible.
  const hrAccounts = await prisma.user.findMany({
    where: { role: { in: ['HR_MANAGER', 'HR', 'ADMIN', 'HR_ADMIN'] } },
    orderBy: { id: 'asc' },
  })

  console.log(`\n--- after: ${hrAccounts.length} HR-role account(s) ---`)
  for (const user of hrAccounts) console.log(`  ${describe(user)}`)

  // Prisma has no regex filter on String, so this is counted in JS.
  const allUsers = await prisma.user.findMany({ select: { password: true } })
  const stillPlaintext = allUsers.filter((u) => !isBcryptHash(u.password)).length

  if (stillPlaintext > 0) {
    console.log(
      `\n${stillPlaintext} account(s) still hold a plaintext password. They cannot sign in until that is fixed - run "npm run auth:migrate".`,
    )
  } else {
    console.log('\nAll accounts store a bcrypt hash. No plaintext passwords remain.')
  }
}

main()
  .then(() => console.log('\nMigration complete.'))
  .catch((error) => {
    console.error('\nMigration failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
