import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EmployerApp from './Employer/EmployerApp'
import HRManagerApp from './HR-Manager/HRManagerApp'

function useAuth() {
  const [status, setStatus] = useState(() => {
    // loading | authenticated | anonymous — derived once from storage
    const raw = localStorage.getItem('user')
    if (!raw) return 'anonymous'
    try {
      const stored = JSON.parse(raw)
      return stored.token ? 'loading' : 'anonymous'
    } catch {
      return 'anonymous'
    }
  })
  const [user, setUser] = useState(null)

  useEffect(() => {
    let cancelled = false
    const raw = localStorage.getItem('user')

    if (!raw) {
      localStorage.removeItem('user')
      return
    }

    let stored
    try {
      stored = JSON.parse(raw)
    } catch {
      localStorage.removeItem('user')
      return
    }

    if (!stored.token) {
      localStorage.removeItem('user')
      return
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored.token}` } })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          localStorage.removeItem('user')
          setStatus('anonymous')
          return
        }
        const data = await res.json()
        setUser(data.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { status, user }
}

function ProtectedRoute({ children, allowedRole }) {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-950 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/login" replace />
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
        <Route path="/payroll" element={<Navigate to="/hr-manager/payroll" replace />} />
        <Route path="/leave" element={<Navigate to="/hr-manager/leave" replace />} />
        <Route path="/attendance" element={<Navigate to="/hr-manager/attendance" replace />} />
        <Route path="/employees/new" element={<Navigate to="/hr-manager/employees/new" replace />} />
        <Route path="/employees" element={<Navigate to="/hr-manager/employees" replace />} />
        <Route path="*" element={<Navigate to="/employer" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App