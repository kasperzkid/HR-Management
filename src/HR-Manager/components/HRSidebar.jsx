import { useState } from 'react'
import {
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const sections = [
  {
    key: 'teams',
    label: 'Teams',
    icon: Users,
    items: [
      { label: 'Employees', path: '/hr-manager/employees' },
      { label: 'Attendance', path: '/hr-manager/attendance' },
      { label: 'Leave Management', path: '/hr-manager/leave' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: Wallet,
    items: [
      { label: 'Payroll', path: '/hr-manager/payroll' },
      { label: 'Payment Slips', path: '/hr-manager/payslips' },
    ],
  },
]

const bottomLinks = [
  { label: 'HR Reports', path: '/hr-manager/reports', icon: BarChart3 },
  { label: 'HR Settings', path: '/hr-manager/settings', icon: Settings },
]

function HRSidebar({ mobileOpen = false, onClose }) {
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    finance: true,
  })

  const collapsed = !isHovered
  const query = searchQuery.trim().toLowerCase()
  const isSearching = query.length > 0

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isRouteActive = (path) => {
    if (
      path === '/hr-manager/dashboard' &&
      (location.pathname === '/hr-manager/dashboard' ||
        location.pathname === '/hr-manager' ||
        location.pathname === '/hr-manager/')
    ) {
      return true
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const matches = (label) => label.toLowerCase().includes(query)

  const visibleDashboard = !isSearching || matches('Dashboard')
  const visibleSections = isSearching
    ? sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => matches(item.label)),
        }))
        .filter((section) => section.items.length > 0)
    : sections
  const visibleBottomLinks = isSearching
    ? bottomLinks.filter((item) => matches(item.label))
    : bottomLinks

  const sidebarClass = (active, collapsedItem) =>
    [
      'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
      active
        ? 'bg-slate-100 text-slate-950 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
      collapsedItem ? 'justify-center' : '',
    ].join(' ')

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={[
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white',
          'border-r border-slate-200',
          'transition-all duration-300 ease-in-out select-none',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[250px]',
          mobileOpen
            ? 'translate-x-0 w-[260px] shadow-2xl'
            : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div
            className={`flex items-center gap-3 overflow-hidden transition-all duration-200 ${
              collapsed ? 'w-full justify-center' : ''
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              YT
            </div>
            {!collapsed && (
              <div className="whitespace-nowrap">
                <p className="text-sm font-bold text-slate-950">Yanol Tech</p>
                <p className="text-xs text-slate-500">HR Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Search */}
        {!collapsed ? (
          <div className="px-3 pt-3 pb-1">
            <div className="relative flex items-center">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200/70 bg-slate-50/80 py-1.5 pl-9 pr-12 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-slate-100/80 focus:border-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-300"
              />
              <span className="absolute right-2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-2xs">
                ⌘ F
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center px-3 pt-3">
            <div
              className="rounded-lg p-2 text-slate-400"
              title="Hover to expand"
            >
              <Search size={16} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              HR Management
            </p>
          )}

          <div className="space-y-1">
            {/* Dashboard */}
            {visibleDashboard && (
              <Link
                to="/hr-manager/dashboard"
                onClick={onClose}
                title={collapsed ? 'Dashboard' : undefined}
                className={sidebarClass(
                  isRouteActive('/hr-manager/dashboard'),
                  collapsed
                )}
              >
                {isRouteActive('/hr-manager/dashboard') && (
                  <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-slate-900" />
                )}
                <LayoutDashboard
                  size={19}
                  strokeWidth={2}
                  className="shrink-0 text-slate-500"
                />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            )}

            {/* Expandable sections */}
            {visibleSections.map((section) => {
              const SectionIcon = section.icon
              const sectionActive = section.items.some((item) =>
                isRouteActive(item.path)
              )

              return (
                <div key={section.key} className="pt-1">
                  <button
                    type="button"
                    onClick={() => !collapsed && toggleSection(section.key)}
                    title={collapsed ? section.label : undefined}
                    className={[
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                      collapsed ? 'justify-center' : '',
                      sectionActive
                        ? 'text-slate-950'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <SectionIcon
                        size={19}
                        strokeWidth={2}
                        className="shrink-0 text-slate-500"
                      />
                      {!collapsed && <span>{section.label}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 ${
                          expandedSections[section.key] ? '' : '-rotate-90'
                        }`}
                      />
                    )}
                  </button>

                  {!collapsed &&
                    (isSearching || expandedSections[section.key]) && (
                      <div className="mt-0.5 space-y-0.5 pl-4 pr-1 whitespace-nowrap">
                        {section.items.map((item) => {
                          const active = isRouteActive(item.path)
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={onClose}
                              className={[
                                'relative flex items-center rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors',
                                active
                                  ? 'bg-slate-100/60 font-semibold text-slate-950'
                                  : 'hover:bg-slate-100 hover:text-slate-950',
                              ].join(' ')}
                            >
                              {active && (
                                <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-slate-900" />
                              )}
                              <span className={active ? 'ml-1' : ''}>
                                {item.label}
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                </div>
              )
            })}
          </div>

          {/* Bottom utility navigation */}
          {visibleBottomLinks.length > 0 && (
            <div className="mt-6 space-y-1 border-t border-slate-200 pt-4">
              {visibleBottomLinks.map((item) => {
                const Icon = item.icon
                const active = isRouteActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={sidebarClass(active, collapsed)}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-slate-900" />
                    )}
                    <Icon
                      size={19}
                      strokeWidth={2}
                      className="shrink-0 text-slate-500"
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          )}
        </nav>

        {/* Bottom user area */}
        <div className="border-t border-slate-200 p-3">
          <div
            className={`flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 ${
              collapsed ? 'justify-center px-1.5' : ''
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              HR
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  HR Manager
                </p>
                <p className="truncate text-xs text-slate-500">
                  Human Resources
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default HRSidebar