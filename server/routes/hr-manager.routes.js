import { Router } from 'express'
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
  createEmployee,
  updateEmployee,
  deleteEmployee,

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
router.get('/employees/:id', getEmployee)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)
// HR Settings
router.get('/settings', getHRSettings)
router.put('/settings', updateHRSettings)
router.get('/reports', getHRReports)

// ============================================================
// ATTENDANCE
// ============================================================

router.get('/attendance', getAttendance)

router.get('/attendance/:id', getAttendanceRecord)

// Existing HR attendance CRUD
router.post('/attendance', createAttendance)

router.put('/attendance/:id', updateAttendance)

router.delete('/attendance/:id', deleteAttendance)

// Automatic employee attendance
router.post('/attendance/check-in', employeeCheckIn)

router.post('/attendance/check-out', employeeCheckOut)

// HR late-attendance review
router.put('/attendance/:id/accept-late', acceptLateAttendance)

// ============================================================
// LEAVE MANAGEMENT
// ============================================================

router.get('/leave', getLeaveRequests)
router.get('/leave/:id', getLeaveRequest)
router.post('/leave', createLeaveRequest)
router.put('/leave/:id', updateLeaveRequest)
router.delete('/leave/:id', deleteLeaveRequest)

// ============================================================
// PAYROLL
// ============================================================

router.get('/payroll', getPayroll)
router.get('/payroll/:id', getPayrollRecord)
router.post('/payroll', createPayroll)
router.put('/payroll/:id', updatePayroll)
router.delete('/payroll/:id', deletePayroll)

export default router