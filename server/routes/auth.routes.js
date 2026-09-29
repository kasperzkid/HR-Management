import express from 'express'

import {
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  resendEmailVerification,
  verifyEmailChange,
} from '../controllers/auth.controller.js'

import {
  requireAuth,
} from '../middleware/auth.middleware.js'

const router = express.Router()

router.post(
  '/login',
  login,
)

router.put(
  '/password',
  requireAuth,
  changePassword,
)

// The signed-in user's own account. These are how the HR Admin changes their
// login email, so they are authenticated rather than open like the reset flow.
router.get(
  '/me',
  requireAuth,
  getMe,
)

router.put(
  '/profile',
  requireAuth,
  updateProfile,
)

// The mail server may not have been working when the change was requested, so
// the confirmation can be sent again. Still authenticated.
router.post(
  '/email-change/resend',
  requireAuth,
  resendEmailVerification,
)

// Confirm a pending login-email change. Public, because it is reached from the
// emailed link and possession of the single-use token is the authorisation.
router.post(
  '/verify-email',
  verifyEmailChange,
)

// Step 1: email a single-use reset link.
router.post(
  '/forgot-password',
  forgotPassword,
)

// Step 2: consume the token from that link and set a new password.
router.post(
  '/reset-password',
  resetPassword,
)

export default router