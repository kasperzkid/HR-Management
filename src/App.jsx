import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EmployerApp from './Employer/EmployerApp'
import HRManagerApp from './HR-Manager/HRManagerApp'

function useAuth() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    try {
      const stored = JSON.parse(raw)
      return stored && stored.role ? stored : null
    } catch {
      return null
    }
  })

  const [status, setStatus] = useState(() => {
    const raw = localStorage.getItem('user')
    if (!raw) return 'anonymous'
    try {
      const stored = JSON.parse(raw)
      return stored && stored.role ? 'authenticated' : 'anonymous'
    } catch {
      return 'anonymous'
    }
  })

  useEffect(() => {
    let cancelled = false
    const raw = localStorage.getItem('user')

    if (!raw) {
      setStatus('anonymous')
      setUser(null)
      return
    }

    let stored
    try {
      stored = JSON.parse(raw)
    } catch {
      setStatus('anonymous')
      setUser(null)
      return
    }

    if (!stored || !stored.role) {
      setStatus('anonymous')
      setUser(null)
      return
    }

    setUser(stored)
    setStatus('authenticated')

    // If backend token is present, attempt background sync without logging user out on error
    if (stored.token && !stored.token.startsWith('session-')) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored.token}` } })
        .then(async (res) => {
          if (cancelled) return
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
            setStatus('authenticated')
          } else if (res.status === 401) {
            // Token rejected by the server — drop the broken session and re-login
            localStorage.removeItem('user')
            setUser(null)
            setStatus('anonymous')
          }
        })
        .catch(() => {
          // Server offline, keep local authenticated session
        })
    }

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

  if (allowedRole && user.role && user.role !== allowedRole) {
    return <Navigate to={user.role === 'HR_MANAGER' ? '/hr-manager/dashboard' : '/employer/dashboard'} replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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
        <Route path="/hr-manager" element={<Navigate to="/hr-manager/dashboard" replace />} />
        <Route path="/payroll" element={<Navigate to="/hr-manager/payroll" replace />} />
        <Route path="/leave" element={<Navigate to="/hr-manager/leave" replace />} />
        <Route path="/attendance" element={<Navigate to="/hr-manager/attendance" replace />} />
        <Route path="/employees/new" element={<Navigate to="/hr-manager/employees/new" replace />} />
        <Route path="/employees" element={<Navigate to="/hr-manager/employees" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App