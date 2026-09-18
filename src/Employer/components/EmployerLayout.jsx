import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BadgeDollarSign,
  Search,
  ChevronDown,
  Menu,
  X,
Check,
  BarChart3,
  MessageSquare,
  Settings as SettingsIcon,
} from 'lucide-react'
import Topbar from './Topbar'
import ProfileMenu from './ProfileMenu'
import { useMessaging } from '../context/messagingStore'

function EmployerLayout() {
  const location = useLocation()
  const { totalUnread } = useMessaging()
  const [isHovered, setIsHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Expandable sections in the sidebar
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    finance: true,
  })

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const isRouteActive = (path) => {
    if (path === '/employer/dashboard' && (location.pathname === '/employer/dashboard' || location.pathname === '/employer' || location.pathname === '/employer/')) {
      return true
    }
    return location.pathname === path
  }

  const collapsed = !isHovered

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] dark:bg-[#0a0d10] text-gray-800 dark:text-gray-200 flex flex-col antialiased print:h-auto print:overflow-visible print:bg-white">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden print:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#15181d] border-b border-gray-200 dark:border-[#262b31] sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black dark:bg-[#3a4149] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v6m0 6v6" />
                <path d="M3 12h6m6 0h6" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-gray-950 dark:text-gray-100 text-sm">Yanol-HR</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/employer/inbox"
            className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            aria-label="Inbox"
          >
            <MessageSquare size={18} />
            {totalUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gray-500" />
            )}
          </Link>
          <ProfileMenu compact />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar with Hover Collapse/Expand Resizing */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-[#0d1014] border-r border-gray-200/80 dark:border-[#262b31]
            flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none print:hidden
            ${collapsed ? 'lg:w-[72px]' : 'lg:w-[250px]'}
            ${mobileOpen ? 'translate-x-0 w-[260px] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo & Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 dark:border-[#262b31]">
            <div className={`flex items-center gap-2.5 overflow-hidden transition-all duration-200 ${collapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-[#3a4149] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
                </svg>
              </div>
              {!collapsed && (
                <span className="font-extrabold tracking-tight text-gray-950 dark:text-gray-100 text-sm font-sans whitespace-nowrap">
                  Yanol-HR
                </span>
              )}
            </div>
          </div>

          {/* Quick Search */}
          {!collapsed ? (
            <div className="px-3 pt-3 pb-1">
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-12 py-1.5 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white dark:bg-[#15181d] dark:hover:bg-[#1c2026] dark:focus:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 rounded-lg border border-gray-200/70 dark:border-[#33383f] focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder:text-gray-400"
                />
                <span className="absolute right-2 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-[#1c2026] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#33383f] shadow-2xs">
                  ⌘ F
                </span>
              </div>
            </div>
          ) : (
            <div className="px-3 pt-3 flex justify-center">
              <div className="p-2 text-gray-400 rounded-lg" title="Hover to expand">
                <Search size={16} />
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm custom-scrollbar overflow-x-hidden">
            {/* Dashboard Item */}
            <Link
              to="/employer/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isRouteActive('/employer/dashboard') && !location.pathname.includes('/employee')
                  ? 'bg-gray-100 text-gray-950 font-semibold dark:bg-[#1c2026] dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-[#1c2026]'
              }`}
              title={collapsed ? 'Dashboard' : undefined}
            >
              <LayoutDashboard size={16} className="shrink-0 text-gray-500" />
              {!collapsed && <span>Dashboard</span>}
            </Link>

            {/* Teams Section (Expandable) */}
            <div className="pt-1">
              <button
                onClick={() => !collapsed && toggleSection('teams')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors whitespace-nowrap ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={16} className="shrink-0 text-gray-500" />
                  {!collapsed && <span className="font-semibold text-gray-900 dark:text-gray-100">Teams</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${
                      expandedSections.teams ? '' : '-rotate-90'
                    }`}
                  />
                )}
              </button>

              {/* Sub items under Teams */}
              {(!collapsed && expandedSections.teams) && (
                <div className="pl-4 pr-1 mt-0.5 space-y-0.5 whitespace-nowrap">
                  <Link
                    to="/employer/employee"
                    data-nav-active={isRouteActive('/employer/employee') ? 'true' : undefined}
                    className={`relative flex items-center px-3 py-1.5 text-xs rounded-md ${
                      isRouteActive('/employer/employee')
                        ? 'text-gray-950 dark:text-white font-semibold bg-gray-50/60 dark:bg-[#1c2026]'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                    }`}
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-gray-950 dark:bg-gray-100 rounded-r-full" />
                    <span className="ml-1">Employee</span>
                  </Link>
                  <Link
                    to="/employer/attendance"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors"
                  >
                    Attendance
                  </Link>
                  <Link
                    to="/employer/leave"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors"
                  >
                    Leave
                  </Link>
                </div>
              )}
            </div>

            {/* Finance Section (Expandable) */}
            <div className="pt-1">
              <button
                onClick={() => !collapsed && toggleSection('finance')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors whitespace-nowrap ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <BadgeDollarSign size={16} className="shrink-0 text-gray-500" />
                  {!collapsed && <span className="font-semibold text-gray-900 dark:text-gray-100">Finance</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${
                      expandedSections.finance ? '' : '-rotate-90'
                    }`}
                  />
                )}
              </button>

              {(!collapsed && expandedSections.finance) && (
                <div className="pl-4 pr-1 mt-0.5 space-y-0.5 whitespace-nowrap">
                  <Link
                    to="/employer/payroll"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors"
                  >
                    Payroll
                  </Link>
                  <Link
                    to="/employer/payslips"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors"
                  >
                    Payslips
                  </Link>
                  <Link
                    to="/employer/payment-info"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors"
                  >
                    Payment information
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom utility navigation */}
            <div className="pt-6 space-y-1 border-t border-gray-100 dark:border-[#262b31]">
              <Link
                to="/employer/reports"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isRouteActive('/employer/reports')
                    ? 'bg-gray-100 text-gray-950 font-semibold dark:bg-[#1c2026] dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-[#1c2026]'
                }`}
                title={collapsed ? 'Reports' : undefined}
              >
                <BarChart3 size={16} className="shrink-0 text-gray-500" />
                {!collapsed && <span>Reports</span>}
              </Link>
            </div>
          </div>

          {/* Bottom Settings Button */}
          <div className="p-3 border-t border-gray-100 dark:border-[#262b31]">
            <Link
              to="/employer/settings"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isRouteActive('/employer/settings') || isRouteActive('/employer/admin')
                  ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1c2026] font-medium'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? 'Settings' : undefined}
            >
              <SettingsIcon size={18} className="shrink-0" />
              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-xs">Settings</span>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase font-semibold">Config</span>
                </div>
              )}
            </Link>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#f4f5f7] dark:bg-[#0a0d10] print:overflow-visible print:bg-white print:h-auto print:p-0">
          <div className="print:hidden">
            <Topbar />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default EmployerLayout
