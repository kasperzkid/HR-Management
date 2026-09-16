import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import HRManagerLayout from './components/HRManagerLayout'
import HRDashboard from './pages/Dashboard'
import HREmployees from './pages/Employees'
import HRPayroll from './pages/Payroll'
import HRLeave from './pages/Leave'
import HRAttendance from './pages/Attendance'

export default function HRManagerApp() {
  return (
    <Routes>
      <Route element={<HRManagerLayout />}>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HRDashboard />} />
        <Route path="employees" element={<HREmployees />} />
        <Route path="employees/new" element={<HREmployees />} />
        <Route path="employee" element={<HREmployees />} />
        <Route path="payroll" element={<HRPayroll />} />
        <Route path="leave" element={<HRLeave />} />
        <Route path="attendance" element={<HRAttendance />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}