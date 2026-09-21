import { Router } from 'express'
import { login, me, updateProfile, changePassword, logout } from '../controllers/auth.controller.js'
import { authenticate, requireSession } from '../middleware/auth.js'

const router = Router()

router.post('/login', login)
router.get('/me', authenticate, requireSession, me)
router.put('/profile', authenticate, requireSession, updateProfile)
router.put('/password', authenticate, requireSession, changePassword)
router.post('/logout', authenticate, requireSession, logout)

export default router
