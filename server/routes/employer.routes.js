// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// Place all employer endpoints here (attendance, leave, salary, etc.)
// The HR-Manager team will never touch this file.
// ------------------------------------------------------------------

import { Router } from 'express'
import { getDashboard } from '../controllers/employer.controller.js'

const router = Router()

router.get('/dashboard', getDashboard)

export default router