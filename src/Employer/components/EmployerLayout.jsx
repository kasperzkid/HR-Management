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
  const [showOrgMenu, setShowOrgMenu] = useState(false)
  const [currentOrg, setCurrentOrg] = useState({ name: 'Wishbone', members: '61 members', code: 'WB' })

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

  const organizations = [
    { name: 'Wishbone', members: '61 members', code: 'WB', active: true },
    { name: 'Acme Corp', members: '142 members', code: 'AC', active: false },
    { name: 'Starlight Inc', members: '34 members', code: 'SI', active: false },
  ]

  const isRouteActive = (path) => {
    if (path === '/employer/dashboard' && (location.pathname === '/employer/dashboard' || location.pathname === '/employer' || location.pathname === '/employer/')) {
      return true
    }
    return location.pathname === path
  }

  const collapsed = !isHovered

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] text-gray-800 flex flex-col antialiased">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v6m0 6v6" />
                <path d="M3 12h6m6 0h6" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-gray-950 text-sm">Yanol-HR</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/employer/inbox"
            className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
            fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200/80
            flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none
            ${collapsed ? 'lg:w-[72px]' : 'lg:w-[250px]'}
            ${mobileOpen ? 'translate-x-0 w-[260px] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo & Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100">
            <div className={`flex items-center gap-2.5 overflow-hidden transition-all duration-200 ${collapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
                </svg>
              </div>
              {!collapsed && (
                <span className="font-extrabold tracking-tight text-gray-950 text-sm font-sans whitespace-nowrap">
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
                  className="w-full pl-9 pr-12 py-1.5 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white text-xs text-gray-800 rounded-lg border border-gray-200/70 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder:text-gray-400"
                />
                <span className="absolute right-2 text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-2xs">
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
                  ? 'bg-gray-100 text-gray-950 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={16} className="shrink-0 text-gray-500" />
                  {!collapsed && <span className="font-semibold text-gray-900">Teams</span>}
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
                    className="relative flex items-center px-3 py-1.5 text-xs rounded-md text-gray-950 font-semibold bg-gray-50/60 hover:bg-gray-100/70 transition-colors group"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-gray-950 rounded-r-full" />
                    <span className="ml-1">Employee</span>
                  </Link>
                  <Link
                    to="/employer/attendance"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Attendance
                  </Link>
                  <Link
                    to="/employer/leave"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
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
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <BadgeDollarSign size={16} className="shrink-0 text-gray-500" />
                  {!collapsed && <span className="font-semibold text-gray-900">Finance</span>}
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
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Payroll
                  </Link>
                  <Link
                    to="/employer/payslips"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Payslips
                  </Link>
                  <Link
                    to="/employer/payment-info"
                    className="flex items-center px-4 py-1.5 text-xs rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Payment information
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom utility navigation */}
            <div className="pt-6 space-y-1 border-t border-gray-100">
              <Link
                to="/employer/reports"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isRouteActive('/employer/reports')
                    ? 'bg-gray-100 text-gray-950 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={collapsed ? 'Reports' : undefined}
              >
                <BarChart3 size={16} className="shrink-0 text-gray-500" />
                {!collapsed && <span>Reports</span>}
              </Link>
              <Link
                to="/employer/settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isRouteActive('/employer/settings') || isRouteActive('/employer/admin')
                    ? 'bg-gray-100 text-gray-950 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={collapsed ? 'Settings' : undefined}
              >
                <SettingsIcon size={16} className="shrink-0 text-gray-500" />
                {!collapsed && <span>Settings</span>}
              </Link>
            </div>
          </div>

          {/* Logout */}
          <div className="px-3 pb-2">
            <button
              onClick={() => { redirectToLogin() }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Logout' : undefined}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {!collapsed && <span>Logout</span>}
            </button>
          </div>

          {/* Bottom Organization Card */}
          <div className="p-3 border-t border-gray-100 relative">
            <button
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className={`w-full flex items-center justify-between p-2 rounded-xl bg-gray-100/90 hover:bg-gray-200/70 border border-gray-200/60 transition-colors text-left ${
                collapsed ? 'justify-center p-1.5' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gray-950 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {currentOrg.code}
                </div>
                {!collapsed && (
                  <div className="truncate">
                    <p className="text-xs font-semibold text-gray-900 truncate">{currentOrg.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{currentOrg.members}</p>
                  </div>
                )}
              </div>
              {!collapsed && <ChevronDown size={14} className="text-gray-500 shrink-0 ml-1" />}
            </button>

            {/* Org Switcher Dropdown */}
            {showOrgMenu && !collapsed && (
              <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-xl border border-gray-200/90 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 px-2.5 py-1">
                  Organizations
                </p>
                {organizations.map((org) => (
                  <button
                    key={org.name}
                    onClick={() => {
                      setCurrentOrg(org)
                      setShowOrgMenu(false)
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      org.name === currentOrg.name
                        ? 'bg-gray-100 text-gray-950 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-950 text-white text-[10px] font-bold flex items-center justify-center">
                        {org.code}
                      </div>
                      <span>{org.name}</span>
                    </div>
                    {org.name === currentOrg.name && <Check size={14} className="text-gray-900" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#f4f5f7]">
          <Topbar />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default EmployerLayout
