import express from 'express'

import {
  login,
  changePassword,
  forgotPassword,
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

router.post(
  '/forgot-password',
  forgotPassword,
)

export default router