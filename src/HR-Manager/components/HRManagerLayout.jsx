import React, { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Plane,
  BadgeDollarSign,
  Search,
  Menu,
  X,
  Bell,
  ChevronDown,
  LogOut,
  Building,
  Check,
} from 'lucide-react'

export default function HRManagerLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showOrgMenu, setShowOrgMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [currentOrg, setCurrentOrg] = useState({
    name: 'Yanol Technology PLC',
    code: 'YT',
    role: 'HR Manager Portal',
  })

  const orgs = [
    { name: 'Yanol Technology PLC', code: 'YT', role: 'HQ • Addis Ababa' },
    { name: 'Yanol Logistics Branch', code: 'YL', role: 'Operations Hub' },
  ]

  const navLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/hr-manager/dashboard' },
    { label: 'Employees', icon: Users, path: '/hr-manager/employees' },
    { label: 'Attendance', icon: CalendarCheck, path: '/hr-manager/attendance' },
    { label: 'Leave', icon: Plane, path: '/hr-manager/leave' },
    { label: 'Payroll', icon: BadgeDollarSign, path: '/hr-manager/payroll' },
  ]

  const isLinkActive = (path) => {
    if (path === '/hr-manager/dashboard') {
      return (
        location.pathname === '/hr-manager/dashboard' ||
        location.pathname === '/hr-manager' ||
        location.pathname === '/hr-manager/'
      )
    }
    return location.pathname.startsWith(path)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
              </svg>
            </div>
            <span className="font-black tracking-tight text-gray-950 text-sm">Yanol HR</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
            HR Manager
          </span>
          <button onClick={handleLogout} className="p-1.5 text-gray-500 hover:text-red-600">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200/80
          flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-[240px]'}
          ${mobileOpen ? 'translate-x-0 w-[260px] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gray-950 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
              </svg>
            </div>
            {!collapsed && (
              <div>
                <span className="font-extrabold tracking-tight text-gray-950 text-sm block">
                  Yanol-HR
                </span>
                <span className="text-[10px] font-semibold text-gray-400 block -mt-0.5">
                  HR Manager Portal
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Search */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 text-xs text-gray-800 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const active = isLinkActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-gray-950 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-950 hover:bg-gray-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} className={active ? 'text-white' : 'text-gray-500'} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Portal Switcher & User info */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <Link
            to="/employer/dashboard"
            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-[11px] font-semibold text-gray-700 transition-colors border border-gray-200/60"
            title="Switch to Employer View"
          >
            <div className="flex items-center gap-2 truncate">
              <Building size={14} className="text-gray-500 shrink-0" />
              {!collapsed && <span className="truncate">Switch to Employer</span>}
            </div>
            {!collapsed && <span className="text-gray-400">→</span>}
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
