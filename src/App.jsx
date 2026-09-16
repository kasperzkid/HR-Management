import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import EmployerApp from './Employer/EmployerApp'
import HRManagerApp from './HR-Manager/HRManagerApp'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/employer" replace />} />
        <Route path="/employer/*" element={<EmployerApp />} />
        <Route path="/hr-manager/*" element={<HRManagerApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App