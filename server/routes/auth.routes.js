import { Router } from 'express'
import { login, me, logout } from '../controllers/auth.controller.js'
import { authenticate, requireSession } from '../middleware/auth.js'

const router = Router()

router.post('/login', login)
router.get('/me', authenticate, requireSession, me)
router.post('/logout', authenticate, requireSession, logout)

export default router
