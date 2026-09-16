import { Route, Routes, Navigate } from 'react-router-dom'
import EmployerLayout from './components/EmployerLayout'
import { MessagingProvider } from './context/MessagingContext'
import Dashboard from './pages/Dashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import Payslips from './pages/Payslips'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'
import Profile from './pages/Profile'
import PlaceholderPage from './pages/PlaceholderPage'
import Inbox from './pages/Inbox'

function EmployerApp() {
  return (
    <MessagingProvider>
      <Routes>
        <Route element={<EmployerLayout />}>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="my-dashboard" element={<EmployeeDashboard />} />
          <Route path="employee" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<Leave />} />
          <Route path="time-off" element={<Leave />} />

          {/* Payroll & Finance routes */}
          <Route path="payroll" element={<Payroll />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="salary" element={<Payroll />} />
          <Route path="payment-info" element={<Profile />} />

          {/* Reports & settings */}
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<SettingsPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<PlaceholderPage title="Help & Support" description="Documentation, live chat support, and community forum." />} />

          {/* Inbox / messages */}
          <Route path="inbox" element={<Inbox />} />
          <Route path="inbox/:contactId" element={<Inbox />} />
        </Route>
      </Routes>
    </MessagingProvider>
  )
}

export default EmployerApp