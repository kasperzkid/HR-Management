// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// Employer routes: punch clock + leave requests.
// ------------------------------------------------------------------

import { Router } from 'express'
import {
  getPunchStatus,
  punchCheckIn,
  punchCheckOut,
} from '../controllers/punch.controller.js'
import {
  getMyLeave,
  createLeave,
} from '../controllers/leave.controller.js'
import { getPayrollRecords } from '../controllers/employer-payroll.controller.js'
import {
  getEmployees,
  getAttendance,
  getCurrentUserEmployee,
} from '../controllers/hr-manager.controller.js'

const router = Router()

// Punch clock
router.get('/punch', getPunchStatus)
router.post('/punch/check-in', punchCheckIn)
router.post('/punch/check-out', punchCheckOut)

// Leave requests
router.get('/leave', getMyLeave)
router.post('/leave', createLeave)

// Employees & attendance (shared with HR-Manager queries)
router.get('/employees', getEmployees)
router.get('/attendance', getAttendance)

// Payroll run history (real PayrollRecord rows)
router.get('/payroll', getPayrollRecords)

// Current user's employee record
router.get('/me/employee', getCurrentUserEmployee)

export default router
