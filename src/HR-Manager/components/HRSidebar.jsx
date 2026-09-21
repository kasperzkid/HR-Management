import { useState } from 'react'
import {
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
      { label: 'Reports', path: '/hr-manager/reports' },
    ],
  },
]

const bottomLinks = [
  { label: 'Settings', path: '/hr-manager/settings', icon: Settings },
]

function HRSidebar({ mobileOpen = false, onClose, onOpenSearch }) {
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    finance: true,
  })

  const collapsed = !isHovered

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

  const sidebarClass = (active, collapsedItem) =>
    [
      'relative flex items-center gap-3 border-l-[3px] px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
      active
        ? 'border-slate-900 bg-slate-100 text-slate-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-[#1c2026] dark:hover:text-slate-100',
      collapsedItem ? 'justify-center' : '',
    ].join(' ')

  const triggerSearch = () => {
    onOpenSearch?.()
  }

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
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-[#0d1014]',
          'border-r border-slate-200 dark:border-[#262b31]',
          'transition-all duration-300 ease-in-out select-none',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[250px]',
          mobileOpen
            ? 'translate-x-0 w-[260px] shadow-2xl'
            : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-[#262b31]">
          <div
            className={`flex items-center gap-3 overflow-hidden transition-all duration-200 ${
              collapsed ? 'w-full justify-center' : ''
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-[#3a4149] text-sm font-bold text-white">
              YT
            </div>
            {!collapsed && (
              <div className="whitespace-nowrap">
                <p className="text-sm font-bold text-slate-950 dark:text-gray-100">Yanol Tech</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">HR Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Search (opens global search modal) */}
        {!collapsed ? (
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={triggerSearch}
              className="relative flex w-full items-center rounded-lg border border-slate-200/70 bg-slate-50/80 py-2 pl-9 pr-12 text-left text-[13px] text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-slate-100/80 focus:border-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-300 dark:border-[#33383f] dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 dark:hover:bg-[#1c2026] dark:focus:bg-gray-900 dark:focus:ring-gray-600"
            >
              <Search
                size={15}
                className="pointer-events-none absolute left-3 text-slate-400 dark:text-gray-500"
              />
              <span className="truncate">Search…</span>
              <span className="absolute right-2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-2xs dark:border-[#33383f] dark:bg-[#15181d] dark:text-gray-500">
                ⌘ F
              </span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center px-3 pt-3">
            <button
              type="button"
              onClick={triggerSearch}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:text-gray-500 dark:hover:bg-[#1c2026] dark:hover:text-gray-200"
              title="Search (⌘F)"
            >
              <Search size={16} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <p className="px-3 pb-3 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500">
              HR Management
            </p>
          )}

          <div className="space-y-1">
            {/* Dashboard */}
            <Link
              to="/hr-manager/dashboard"
              onClick={onClose}
              title={collapsed ? 'Dashboard' : undefined}
              className={sidebarClass(
                isRouteActive('/hr-manager/dashboard'),
                collapsed
              )}
            >
              <LayoutDashboard
                size={19}
                strokeWidth={2}
                className="shrink-0 text-slate-500 dark:text-gray-400"
              />
              {!collapsed && <span>Dashboard</span>}
            </Link>

            {/* Expandable sections */}
            {sections.map((section) => {
              const SectionIcon = section.icon
              const sectionActive = section.items.some((item) =>
                isRouteActive(item.path)
              )

              return (
                <div key={section.key} className="pt-1">
                  <button
                    type="button"
                    onClick={() => !collapsed && toggleSection(section.key)}
                    onMouseEnter={() =>
                      !collapsed &&
                      setExpandedSections((prev) => ({ ...prev, [section.key]: true }))
                    }
                    title={collapsed ? section.label : undefined}
                    className={[
                      'flex w-full items-center justify-between border-l-[3px] px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                      collapsed ? 'justify-center' : '',
                      collapsed && sectionActive
                        ? 'border-slate-900 bg-slate-100/70 text-slate-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
                        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-[#1c2026] dark:hover:text-slate-100',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <SectionIcon
                        size={19}
                        strokeWidth={2}
                        className="shrink-0 text-slate-500 dark:text-gray-400"
                      />
                      {!collapsed && <span className="text-slate-700 dark:text-gray-200">{section.label}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 dark:text-gray-500 ${
                          expandedSections[section.key] ? '' : '-rotate-90'
                        }`}
                      />
                    )}
                  </button>

                  {!collapsed && expandedSections[section.key] && (
                    <div className="mt-0.5 space-y-0.5 pl-4 pr-1 whitespace-nowrap">
                      {section.items.map((item) => {
                        const active = isRouteActive(item.path)
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={[
                              'relative flex items-center border-l-[3px] px-3 py-2 text-sm transition-colors',
                              active
                                ? 'border-slate-900 bg-slate-50/60 font-semibold text-slate-950 dark:border-white dark:bg-slate-900/40 dark:text-white'
                                : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900/30 dark:hover:text-slate-100',
                            ].join(' ')}
                          >
                            <span>{item.label}</span>
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
          {bottomLinks.length > 0 && (
            <div className="space-y-1 border-t border-slate-200 px-3 py-4 dark:border-[#262b31]">
              {bottomLinks.map((item) => {
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
      </aside>
    </>
  )
}

export default HRSidebar
