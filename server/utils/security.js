// Password hashing, password-reset tokens, and email validation.
//
// Hashing note
// ------------
// This database was created before passwords were hashed, so every account
// originally stored its password in plaintext. That has been fully migrated:
// `npm run auth:migrate` converts each row to bcrypt in place, and any value
// that could not be converted is replaced with an unusable random hash so the
// account can only be recovered through the password-reset flow.
//
// Because no plaintext row should remain, verifyPassword refuses to
// authenticate against anything that is not a bcrypt hash. Accepting a
// plaintext fallback "just in case" would mean that any row which somehow
// ended up unhashed was still a valid login credential, which is exactly the
// state this module exists to eliminate.

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export const MIN_PASSWORD_LENGTH = 8

// bcrypt hashes are always "$2a$"/"$2b$"/"$2y$" + 56 chars.
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$/

export function isBcryptHash(value) {
  return typeof value === 'string' && BCRYPT_PATTERN.test(value)
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/**
 * A hash of random bytes that nobody knows.
 *
 * Used to disable an account's password without deleting it. The row still
 * looks like a normal hashed account, but the only way back in is the
 * "Forgot password" flow, which is the secure forced-reset path.
 */
export function generateUnusablePasswordHash() {
  return bcrypt.hash(crypto.randomBytes(48).toString('base64url'), BCRYPT_ROUNDS)
}

/**
 * Compare a submitted password against the stored bcrypt hash.
 *
 * Returns { valid }. A non-hash stored value is never accepted; it is
 * reported so the caller can log that the row still needs migrating.
 */
export async function verifyPassword(plain, stored) {
  if (!isBcryptHash(stored)) {
    return { valid: false, needsMigration: true }
  }

  return { valid: await bcrypt.compare(plain, stored) }
}

/**
 * Single-use password-reset token.
 *
 * The raw token goes into the email link and is never stored. Only its
 * SHA-256 hash goes in the database, so a leaked database dump cannot be
 * used to reset anybody's password.
 */
export function createResetToken() {
  const token = crypto.randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hashResetToken(token),
  }
}

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function resetTokenExpiry(ttlMinutes) {
  return new Date(Date.now() + ttlMinutes * 60 * 1000)
}

/**
 * Shared, deliberately permissive email check.
 *
 * A strict RFC 5322 parser is not the goal - the goal is rejecting obvious
 * mistakes (missing @, missing domain, spaces) before they become a login
 * account that can never receive mail. Real-world addresses that fail here
 * are not addresses we can deliver to anyway.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function isValidEmail(value) {
  const email = String(value ?? '').trim()
  if (!email || email.length > 254) return false
  return EMAIL_PATTERN.test(email)
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * Minimum password rule, shared by change-password and reset-password so the
 * two flows cannot drift apart. Returns null when the password is acceptable.
 */
export function passwordPolicyError(plain) {
  const value = String(plain ?? '')

  if (!value) {
    return 'A new password is required.'
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  return null
}
