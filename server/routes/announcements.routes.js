import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { createAnnouncement, deleteAnnouncement, listAnnouncements } from '../controllers/announcements.controller.js'

const router = Router()

router.use(requireAuth)
router.get('/', listAnnouncements)
router.post('/', createAnnouncement)
router.delete('/:id', deleteAnnouncement)

export default router
