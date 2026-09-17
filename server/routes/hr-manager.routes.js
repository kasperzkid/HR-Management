import { Router } from 'express'

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
} from '../controllers/hr-manager.controller.js'

const router = Router()

// Dashboard
router.get('/dashboard', getDashboard)

// Employees
router.get('/employees', getEmployees)
router.get('/employees/:id', getEmployee)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)

// Attendance
router.get('/attendance', getAttendance)
router.get('/attendance/:id', getAttendanceRecord)
router.post('/attendance', createAttendance)
router.put('/attendance/:id', updateAttendance)
router.delete('/attendance/:id', deleteAttendance)

export default router