import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './pages/Login'
import HRManagerApp from './HR-Manager/HRManagerApp'
import EmployerApp from './Employer/EmployerApp'

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase()

  if (value === 'EMPLOYER' || value === 'EMPLOYEE') {
    return 'EMPLOYEE'
  }

  if (
    value === 'ADMIN' ||
    value === 'HR' ||
    value === 'HR_ADMIN' ||
    value === 'HR_MANAGER'
  ) {
    return 'HR_MANAGER'
  }

  return value
}

function ProtectedRoute({ children, allowedRole, loginPath }) {
  const user = getStoredUser()

  if (!user?.token) {
    return <Navigate to={loginPath} replace />
  }

  if (normalizeRole(user.role) !== allowedRole) {
    return <Navigate to={loginPath} replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* HR ADMIN LOGIN */}
        <Route
          path="/hr-manager/login"
          element={<Login />}
        />

        {/* EMPLOYEE LOGIN */}
        <Route
          path="/employer/login"
          element={<Login />}
        />

        {/* KEEP OLD LOGIN URL WORKING */}
        <Route
          path="/login"
          element={
            <Navigate
              to="/hr-manager/login"
              replace
            />
          }
        />

        {/* HR MANAGER / HR DASHBOARD */}
        <Route
          path="/hr-manager/*"
          element={
            <ProtectedRoute
              allowedRole="HR_MANAGER"
              loginPath="/hr-manager/login"
            >
              <HRManagerApp />
            </ProtectedRoute>
          }
        />

        {/* EMPLOYEE PORTAL */}
        <Route
          path="/employer/*"
          element={
            <ProtectedRoute
              allowedRole="EMPLOYEE"
              loginPath="/employer/login"
            >
              <EmployerApp />
            </ProtectedRoute>
          }
        />

        {/* MAIN ROUTE → HR DASHBOARD */}
        <Route
          path="/"
          element={
            <Navigate
              to="/hr-manager"
              replace
            />
          }
        />

        {/* UNKNOWN ROUTES → HR DASHBOARD */}
        <Route
          path="*"
          element={
            <Navigate
              to="/hr-manager"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  )
}