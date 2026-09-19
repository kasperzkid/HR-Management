import { Router } from 'express'

import {
  getDashboard,
  getEmployees,
  getEmployee,
  createEmployee,
  importEmployees,
  updateEmployee,
  deleteEmployee,
  getAttendance,
  getAttendanceRecord,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
  uploadEmployeeDocument,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
} from '../controllers/hr-manager.controller.js'
import { upload } from '../middleware/upload.js'

const router = Router()

// Dashboard
router.get('/dashboard', getDashboard)

// Employees
router.get('/employees', getEmployees)
router.get('/employees/:id', getEmployee)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)

// Employee imports & document uploads (multipart)
router.post('/employees/import', upload.single('file'), importEmployees)
router.post('/uploads', upload.single('file'), uploadEmployeeDocument)

// Attendance
router.get('/attendance', getAttendance)
router.get('/attendance/:id', getAttendanceRecord)
router.post('/attendance', createAttendance)
router.put('/attendance/:id', updateAttendance)
router.delete('/attendance/:id', deleteAttendance)

// Payroll
router.get('/payroll', getPayroll)
router.post('/payroll', createPayroll)
router.put('/payroll/:id', updatePayroll)
router.delete('/payroll/:id', deletePayroll)

// Leave
router.get('/leave', getLeaveRequests)
router.post('/leave', createLeaveRequest)
router.put('/leave/:id', updateLeaveRequest)

export default router