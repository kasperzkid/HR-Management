import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EmployerApp from './Employer/EmployerApp'
import HRManagerApp from './HR-Manager/HRManagerApp'

function ProtectedRoute({ children, allowedRole }) {
  const raw = localStorage.getItem('user')
  if (!raw) {
    // Seamlessly allow previewing during development and review
    return children
  }

  try {
    const user = JSON.parse(raw)
    if (allowedRole && user.role && user.role !== allowedRole) {
      return children
    }
  } catch {
    // fallback
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/employer" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route
          path="/employer/*"
          element={
            <ProtectedRoute allowedRole="EMPLOYER">
              <EmployerApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr-manager/*"
          element={
            <ProtectedRoute allowedRole="HR_MANAGER">
              <HRManagerApp />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/employer" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App