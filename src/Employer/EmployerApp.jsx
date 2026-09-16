import { Route, Routes, Navigate } from 'react-router-dom'
import EmployerLayout from './components/EmployerLayout'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Salary from './pages/Salary'
import Profile from './pages/Profile'

function EmployerApp() {
  return (
    <Routes>
      <Route element={<EmployerLayout />}>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leave" element={<Leave />} />
        <Route path="salary" element={<Salary />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default EmployerApp