// Activating a pending login-email change.
//
// One implementation, two callers: the emailed confirmation link
// (server/controllers/auth.controller.js) and the server-console fallback for
// installs that have no mail server yet (prisma/confirm-email-change.mjs).
// Both have to do exactly the same thing, or the console path would slowly
// diverge into a second, sloppier way to change someone's login address.
//
// The order below matters and is deliberate:
//
//   1. Expiry is checked first, and an expired request is *destroyed* rather
//      than left in place. A link that is past its window must not be
//      revivable by a later fix.
//   2. Uniqueness is re-checked here, at activation time, and not only when
//      the change was requested. The address was free when it was asked for;
//      nothing stops somebody else taking it in the hours in between, and
//      User.email is unique so the write would otherwise throw a raw Prisma
//      error at the user.
//   3. The address and the clearing of the pending fields happen in a single
//      write. That is what makes the token single-use: it is consumed by the
//      same statement that activates it, so it cannot be replayed.
//   4. Only once the address is committed are the knock-on effects applied -
//      the employee record's contact address, and any password reset link that
//      was issued against the old one. Those are best-effort: neither should
//      be able to fail an address change the person has already proven they
//      own.

import prisma from '../db.js'

/**
 * The four fields that together represent "an email change is waiting to be
 * confirmed". Always written as a group, so no half-cleared state can exist.
 */
export const PENDING_EMAIL_FIELDS = {
  pendingEmail: null,
  pendingEmailTokenHash: null,
  pendingEmailExpiresAt: null,
  pendingEmailRequestedAt: null,
}

/**
 * Move a user with a valid pending email change onto the new address.
 *
 * @param {number} userId
 * @param {{ source?: string }} [meta] recorded in the log line only
 * @returns {Promise<{ok: true, user: object, resetTokensInvalidated: number} | {ok: false, code: string, message: string}>}
 */
export async function activatePendingEmail(userId, meta = {}) {
  const source = meta.source || 'unknown'

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return {
      ok: false,
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Account not found.',
    }
  }

  if (!user.pendingEmail) {
    return {
      ok: false,
      code: 'NO_PENDING_EMAIL',
      message:
        'There is no email change waiting to be confirmed.',
    }
  }

  if (
    !user.pendingEmailExpiresAt ||
    user.pendingEmailExpiresAt.getTime() < Date.now()
  ) {
    // Destroyed, not just rejected: an expired request should not linger where
    // something could keep retrying it.
    await prisma.user.update({
      where: { id: user.id },
      data: PENDING_EMAIL_FIELDS,
    })

    return {
      ok: false,
      code: 'TOKEN_EXPIRED',
      message:
        'This confirmation link has expired. Request a new one from Account Settings.',
    }
  }

  const newEmail = user.pendingEmail

  // Re-check uniqueness at activation time, not just at request time.
  const taken = await prisma.user.findUnique({
    where: { email: newEmail },
  })

  if (taken && taken.id !== user.id) {
    await prisma.user.update({
      where: { id: user.id },
      data: PENDING_EMAIL_FIELDS,
    })

    return {
      ok: false,
      code: 'EMAIL_IN_USE',
      message:
        'That email address has been taken by another account since it was requested. Please choose a different one.',
    }
  }

  // The activation and the token consumption are one write. There is no window
  // in which the address is live but the token still works.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      email: newEmail,
      ...PENDING_EMAIL_FIELDS,
    },
  })

  // Keep the employee roster's contact address in step with the login address,
  // so the two never disagree about how to reach this person. The employee
  // table has no unique constraint on email, so this should not fail, and a
  // warning beats failing a change the person has already proven they own.
  if (updated.employeeId) {
    try {
      await prisma.employee.updateMany({
        where: { id: updated.employeeId },
        data: { email: updated.email },
      })
    } catch (error) {
      console.warn(
        '[auth] could not sync the employee record email:',
        error?.message || error,
      )
    }
  }

  // A reset link issued against the old address must stop working: it was
  // mailed to an address that no longer belongs to this account.
  const { count } = await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  if (count > 0) {
    console.log(
      `[auth] invalidated ${count} password reset link(s) after an email change`,
    )
  }

  console.log(
    `[auth] account ${user.id} changed its login email via ${source} (${user.email} -> ${updated.email})`,
  )

  return {
    ok: true,
    user: updated,
    resetTokensInvalidated: count,
  }
}
