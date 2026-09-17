
import { Navigate, Route, Routes } from 'react-router-dom'

import HRLayout from './layouts/HRLayout'
import HRDashboard from './pages/HRDashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import PaymentSlips from './pages/PaymentSlips'
import HRReports from './pages/HRReports'
import HRSettings from './pages/HRSettings'

function ComingSoon({ title }) {
  return (
    <div className="min-h-full bg-[#F3F4F6] p-6 sm:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">
          {title}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          This module will be built in the next Phase 1 step.
        </p>
      </div>
    </div>
  )
}

function HRManagerApp() {
  return (
    <Routes>
      <Route element={<HRLayout />}>
        {/* HR Dashboard */}
        <Route
          index
          element={<HRDashboard />}
        />

        {/* Future HR modules */}
      <Route
  path="employees"
  element={<Employees />}
/>

     <Route
  path="attendance"
  element={<Attendance />}
/>

     <Route
  path="leave"
  element={<Leave />}
/>

      <Route
  path="payroll"
  element={<Payroll />}
/>

      <Route
  path="payslips"
  element={<PaymentSlips />}
/>

    <Route
  path="reports"
  element={<HRReports />}
/>

      <Route
  path="settings"
  element={<HRSettings />}
/>
      </Route>

      {/* Unknown HR route */}
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
  )
}

export default HRManagerApp