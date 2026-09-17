import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import HRManagerLayout from './components/HRManagerLayout'
import { MessagingProvider } from '../Employer/context/MessagingContext'
import HRDashboard from './pages/Dashboard'
import HREmployees from './pages/Employees'
import HRPayroll from './pages/Payroll'
import HRLeave from './pages/Leave'
import HRAttendance from './pages/Attendance'
import HRInbox from './pages/Inbox'
import Reports from '../Employer/pages/Reports'

export default function HRManagerApp() {
  return (
    <MessagingProvider>
      <Routes>
        <Route element={<HRManagerLayout />}>
          <Route index element={<HRDashboard />} />
          <Route path="dashboard" element={<HRDashboard />} />
          <Route path="employees" element={<HREmployees />} />
          <Route path="employees/new" element={<HREmployees />} />
          <Route path="employee" element={<HREmployees />} />
          <Route path="payroll" element={<HRPayroll />} />
          <Route path="reports" element={<Reports />} />
          <Route path="leave" element={<HRLeave />} />
          <Route path="attendance" element={<HRAttendance />} />
          <Route path="inbox" element={<HRInbox />} />
          <Route path="inbox/:contactId" element={<HRInbox />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </MessagingProvider>
  )
}