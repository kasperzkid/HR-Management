import { Route, Routes, Navigate } from 'react-router-dom'
import EmployerLayout from './components/EmployerLayout'
import { MessagingProvider } from './context/MessagingContext'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import Payslips from './pages/Payslips'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'
import PaymentInfo from './pages/PaymentInfo'
import Profile from './pages/Profile'
import Inbox from './pages/Inbox'

function EmployerApp() {
  return (
    <MessagingProvider portalType="employer">
      <Routes>
        <Route element={<EmployerLayout />}>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<Leave />} />
          <Route path="time-off" element={<Leave />} />

          {/* Payroll & Finance routes */}
          <Route path="payroll" element={<Payroll />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="salary" element={<Payroll />} />
          <Route path="payment-info" element={<PaymentInfo />} />

          {/* Reports & settings */}
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<SettingsPage />} />
          <Route path="profile" element={<Profile />} />

          {/* Inbox / messages */}
          <Route path="inbox" element={<Inbox />} />
          <Route path="inbox/:contactId" element={<Inbox />} />
        </Route>
      </Routes>
    </MessagingProvider>
  )
}

export default EmployerApp