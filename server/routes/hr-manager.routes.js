// ------------------------------------------------------------------
// HR-MANAGER TEAM — OWN THIS FILE
// Place all HR-Manager endpoints here (hiring, employees, payroll, etc.)
// The Employer team will never touch this file.
// ------------------------------------------------------------------

import { Router } from 'express'
import { getDashboard } from '../controllers/hr-manager.controller.js'

const router = Router()

router.get('/dashboard', getDashboard)

export default router