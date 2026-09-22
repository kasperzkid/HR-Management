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
  updateAttendanceHrStatus,
  acknowledgeEmergencyDeparture,

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
router.post('/attendance', createAttendance)
router.put('/attendance/:id', updateAttendance)
router.delete('/attendance/:id', deleteAttendance)

// HR review status (separate endpoint — only hrStatus/hrNote, no punch data)
router.patch('/attendance/:id/hr-status', updateAttendanceHrStatus)
// Acknowledge an emergency check-out after HR review
router.post('/attendance/:id/acknowledge', acknowledgeEmergencyDeparture)

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