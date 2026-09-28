import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { handleResumeUpload } from '../middleware/resume-upload.js'

import {
  getDashboard,
  getEmployees,
  getMyProfile,
  updateMyProfile,
  uploadMyResume,
  downloadMyResume,
  getAttendance,
  getAttendanceConfig,
  checkIn,
  checkOut,
  emergencyCheckOut,
  getLeaveRequests,
  createLeaveRequest,
  getPayroll,
} from '../controllers/employer.controller.js'

import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
} from '../controllers/hr-manager.controller.js'

const router = Router()

// Every employee-dashboard request requires a valid JWT.
router.use(requireAuth)

// Dashboard
router.get('/dashboard', getDashboard)

// Employee information used by the existing employee dashboard
router.get('/employees', getEmployees)
router.get('/profile', getMyProfile)
router.put('/profile', updateMyProfile)
router.post('/profile/resume', handleResumeUpload, uploadMyResume)
router.get('/profile/resume', downloadMyResume)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)
router.post('/employees/:id/reset-password', resetEmployeePassword)

// Attendance
router.get('/attendance', getAttendance)
router.get('/attendance/config', getAttendanceConfig)
router.post('/attendance/check-in', checkIn)
router.post('/attendance/check-out', checkOut)
router.post('/attendance/emergency-check-out', emergencyCheckOut)

// Leave
router.get('/leave', getLeaveRequests)
router.post('/leave', createLeaveRequest)

// Payroll
router.get('/payroll', getPayroll)

export default router