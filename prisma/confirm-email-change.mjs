// Confirms a pending login-email change from the server console.
//
//   node prisma/confirm-email-change.mjs                 list what is pending
//   node prisma/confirm-email-change.mjs <email>         confirm that account
//   node prisma/confirm-email-change.mjs <email> --undo  cancel the request
//
// Why this exists
// ---------------
// The normal way a new login email becomes active is a link emailed to the new
// address, which is what proves the requester owns it. On a brand new install
// the mail server is usually configured *after* the first admin account, so
// there is a window where the confirmation cannot be delivered.
//
// This is the way through that window for whoever is sitting at the server. It
// is deliberately a console command rather than an API route: no HTTP endpoint
// can skip the email proof, so there is no way to activate an address you do
// not control from a browser.
//
// It reuses the exact same activation path as the emailed link - the same
// uniqueness re-check, the same clearing of outstanding reset tokens, the same
// employee record sync - by calling the shared helper directly.

import { PrismaClient } from '@prisma/client'
import { activatePendingEmail } from '../server/services/email-change.service.js'

const prisma = new PrismaClient()

const [target, flag] = process.argv.slice(2)

function line() {
  console.log('-'.repeat(64))
}

async function listPending() {
  const pending = await prisma.user.findMany({
    where: { pendingEmail: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pendingEmail: true,
      pendingEmailRequestedAt: true,
      pendingEmailExpiresAt: true,
    },
  })

  if (pending.length === 0) {
    console.log('No email change is waiting to be confirmed.')
    return
  }

  console.log(
    `${pending.length} email change(s) waiting for confirmation:`,
  )
  line()

  for (const item of pending) {
    const expires =
      item.pendingEmailExpiresAt?.toISOString() || '(none)'
    const minutesLeft = item.pendingEmailExpiresAt
      ? Math.round(
          (item.pendingEmailExpiresAt.getTime() - Date.now()) /
            60000,
        )
      : 0

    console.log(`  account   : ${item.name} (${item.role})`)
    console.log(`  from      : ${item.email}`)
    console.log(`  to        : ${item.pendingEmail}`)
    console.log(`  requested : ${item.pendingEmailRequestedAt?.toISOString()}`)
    console.log(
      `  expires   : ${expires}${
        minutesLeft > 0 ? ` (${minutesLeft} min left)` : ' (expired)'
      }`,
    )
    line()
  }

  console.log(
    'Confirm with:  node prisma/confirm-email-change.mjs <email>',
  )
}

async function main() {
  if (!target) {
    await listPending()
    return
  }

  const email = target.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pendingEmail: true,
    },
  })

  if (!user) {
    console.error(`No account found for ${email}.`)
    process.exitCode = 1
    return
  }

  if (!user.pendingEmail) {
    console.error(
      `${email} has no email change waiting to be confirmed.`,
    )
    process.exitCode = 1
    return
  }

  if (flag === '--undo') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingEmail: null,
        pendingEmailTokenHash: null,
        pendingEmailExpiresAt: null,
        pendingEmailRequestedAt: null,
      },
    })

    console.log(
      `Cancelled the pending change. ${user.email} is still the login address.`,
    )
    return
  }

  const result = await activatePendingEmail(
    user.id,
    { source: 'console' },
  )

  if (!result.ok) {
    console.error(`Could not confirm: ${result.message}`)
    process.exitCode = 1
    return
  }

  console.log(`Confirmed for ${result.user.name} (${result.user.role})`)
  line()
  console.log(`  previous login email : ${user.email}`)
  console.log(`  new login email      : ${result.user.email}`)
  console.log(`  must change password : ${result.user.mustChangePassword}`)
  console.log(
    `  reset links voided   : ${result.resetTokensInvalidated}`,
  )
  line()
  console.log(
    `Sign in with ${result.user.email} from now on. "Forgot password" uses it too.`,
  )
}

try {
  await main()
} catch (error) {
  console.error(error?.message || error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
