import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'

import {
  getHRSettings,
  updateHRSettings,
} from '../controllers/hr-settings.controller.js'

import {
  getHRReports,
} from '../controllers/hr-reports.controller.js'

import {
  getDashboard,

  getEmployees,
  getEmployee,
  downloadEmployeeResume,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,

  getAttendance,
  getAttendanceRecord,
  createAttendance,
  updateAttendance,
  deleteAttendance,

  employeeCheckIn,
  employeeCheckOut,
  acceptLateAttendance,

  getLeaveRequests,
  getLeaveRequest,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,

  getPayroll,
  getPayrollRecord,
  createPayroll,
  updatePayroll,
  deletePayroll,
} from '../controllers/hr-manager.controller.js'

const router = Router()

// ============================================================
// DASHBOARD
// ============================================================

router.get('/dashboard', getDashboard)

// ============================================================
// EMPLOYEES
// ============================================================

router.get('/employees', getEmployees)
router.get('/employees/:id/resume', requireAuth, downloadEmployeeResume)
router.get('/employees/:id', getEmployee)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)
router.post('/employees/:id/reset-password', resetEmployeePassword)

// ============================================================
// SETTINGS
// ============================================================

router.get('/settings', getHRSettings)
router.put('/settings', updateHRSettings)

// ============================================================
// REPORTS
// ============================================================

router.get('/reports', getHRReports)

// ============================================================
// ATTENDANCE
// ============================================================

router.get('/attendance', getAttendance)
router.get('/attendance/:id', getAttendanceRecord)

router.post('/attendance', createAttendance)
router.put('/attendance/:id', updateAttendance)
router.delete('/attendance/:id', deleteAttendance)

router.post(
  '/attendance/check-in',
  employeeCheckIn,
)

router.post(
  '/attendance/check-out',
  employeeCheckOut,
)

router.put(
  '/attendance/:id/accept-late',
  acceptLateAttendance,
)

// ============================================================
// LEAVE REQUESTS
// ============================================================

router.get('/leave', getLeaveRequests)
router.get('/leave/:id', getLeaveRequest)

router.post(
  '/leave',
  createLeaveRequest,
)

router.put(
  '/leave/:id',
  updateLeaveRequest,
)

router.delete(
  '/leave/:id',
  deleteLeaveRequest,
)

// ============================================================
// PAYROLL
// ============================================================

router.get('/payroll', getPayroll)
router.get('/payroll/:id', getPayrollRecord)

router.post(
  '/payroll',
  createPayroll,
)

router.put(
  '/payroll/:id',
  updatePayroll,
)

router.delete(
  '/payroll/:id',
  deletePayroll,
)

export default router