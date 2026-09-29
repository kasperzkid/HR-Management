
import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom'

import HRLayout from './layouts/HRLayout'
import HRDashboard from './pages/HRDashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import PaymentSlips from './pages/PaymentSlips'
import HRReports from './pages/HRReports'
import HRSettings from './pages/HRSettings'
import CompanyAnnouncements from './pages/CompanyAnnouncements'
import UserRoles from './pages/UserRoles'
import Inbox from '../Employer/pages/Inbox'
import { RequirePermission } from '../lib/rbac'

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

function ModuleAccess({ permission, children }) {
  const { accessPermissions } = useOutletContext()
  if (accessPermissions?.[permission] === false) {
    return (
      <div className="min-h-full bg-[#F3F4F6] px-4 py-8 sm:px-8 sm:py-12">
        <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{permission} is disabled</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">This module is unavailable because access has been turned off in HR Settings. Contact an HR administrator to re-enable it.</p>
        </section>
      </div>
    )
  }
  return children
}

/**
 * Shown when an HR account is signed in but does not hold the permission for a
 * screen. The wording says "no access" rather than "forbidden" on purpose: this
 * is a normal outcome of a role being set up that way, not an error, and the
 * person reading it needs to know who to ask.
 */
function NoAccess({ title }) {
  return (
    <div className="min-h-full bg-[#F3F4F6] px-4 py-8 sm:px-8 sm:py-12">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {title} is not part of your access
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Your HR role does not include this module. An HR administrator can grant it from
          User &amp; Role Management if you need it.
        </p>
      </section>
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
          element={
            <RequirePermission
              anyOf={[
                'employees.view',
                'attendance.view',
                'leave.view',
                'payroll.view',
                'payment_slips.view',
                'reports.view',
                'users.view',
              ]}
              deniedFallback={<NoAccess title="The dashboard" />}
            >
              <HRDashboard />
            </RequirePermission>
          }
        />
        <Route path="inbox" element={<Inbox basePath="/hr-manager/inbox" canStartChat />} />
        <Route path="inbox/:contactId" element={<Inbox basePath="/hr-manager/inbox" canStartChat />} />

        <Route
          path="announcements"
          element={
            <RequirePermission
              permission="announcements.view"
              deniedFallback={<NoAccess title="Company Announcements" />}
            >
              <CompanyAnnouncements />
            </RequirePermission>
          }
        />

        {/* HR modules. Each is gated twice: once by the HR Settings module
            switch that the whole company shares, and once by this account's own
            permission. */}
      <Route
  path="employees"
  element={
    <ModuleAccess permission="Employee Management">
      <RequirePermission permission="employees.view" deniedFallback={<NoAccess title="Employees" />}>
        <Employees />
      </RequirePermission>
    </ModuleAccess>
  }
/>

     <Route
  path="attendance"
  element={
    <ModuleAccess permission="Attendance Management">
      <RequirePermission permission="attendance.view" deniedFallback={<NoAccess title="Attendance" />}>
        <Attendance />
      </RequirePermission>
    </ModuleAccess>
  }
/>

     <Route
  path="leave"
  element={
    <ModuleAccess permission="Leave Management">
      <RequirePermission permission="leave.view" deniedFallback={<NoAccess title="Leave Management" />}>
        <Leave />
      </RequirePermission>
    </ModuleAccess>
  }
/>

      <Route
  path="payroll"
  element={
    <ModuleAccess permission="Payroll Management">
      <RequirePermission permission="payroll.view" deniedFallback={<NoAccess title="Payroll" />}>
        <Payroll />
      </RequirePermission>
    </ModuleAccess>
  }
/>

      <Route
  path="payslips"
  element={
    <ModuleAccess permission="Payment Slips">
      <RequirePermission permission="payment_slips.view" deniedFallback={<NoAccess title="Payment Slips" />}>
        <PaymentSlips />
      </RequirePermission>
    </ModuleAccess>
  }
/>

    <Route
  path="reports"
  element={
    <ModuleAccess permission="HR Reports">
      <RequirePermission permission="reports.view" deniedFallback={<NoAccess title="HR Reports" />}>
        <HRReports />
      </RequirePermission>
    </ModuleAccess>
  }
/>

      <Route
  path="settings"
  element={
    <RequirePermission permission="settings.view" deniedFallback={<NoAccess title="HR Settings" />}>
      <HRSettings />
    </RequirePermission>
  }
/>

      <Route
  path="users"
  element={
    <RequirePermission
      anyOf={['users.view', 'users.permissions']}
      deniedFallback={<NoAccess title="User &amp; Role Management" />}
    >
      <UserRoles />
    </RequirePermission>
  }
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
