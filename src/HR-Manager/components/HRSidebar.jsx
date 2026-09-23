import { useEffect, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Moon,
  Settings,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigation = [
  {
    label: 'Dashboard',
    path: '/hr-manager',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Employees',
    path: '/hr-manager/employees',
    icon: Users,
  },
  {
    label: 'Attendance',
    path: '/hr-manager/attendance',
    icon: CalendarDays,
  },
  {
    label: 'Leave Management',
    path: '/hr-manager/leave',
    icon: ClipboardList,
  },
  {
    label: 'Payroll',
    path: '/hr-manager/payroll',
    icon: Wallet,
  },
  {
    label: 'Payment Slips',
    path: '/hr-manager/payslips',
    icon: FileText,
  },
  {
    label: 'HR Reports',
    path: '/hr-manager/reports',
    icon: FileBarChart,
  },
  {
    label: 'HR Settings',
    path: '/hr-manager/settings',
    icon: Settings,
  },
]

function HRSidebar({ mobileOpen = false, onClose }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('hr-theme') === 'dark'
  })

  const [hoveredItem, setHoveredItem] = useState(null)

  useEffect(() => {
    localStorage.setItem('hr-theme', darkMode ? 'dark' : 'light')

    window.dispatchEvent(
      new CustomEvent('hr-theme-change', {
        detail: {
          darkMode,
        },
      }),
    )
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode((current) => !current)
  }

  return (
    <>
      {/* -----------------------------------------------------------
          MOBILE OVERLAY
      ----------------------------------------------------------- */}
      <div
        className={[
          'fixed inset-0 z-40 lg:hidden',
          'bg-black/50 backdrop-blur-sm',
          'transition-all duration-300 ease-out',
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      {/* -----------------------------------------------------------
          SIDEBAR
      ----------------------------------------------------------- */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col',
          'overflow-hidden',
          'border-r',
          'shadow-xl shadow-slate-200/30',
          'transition-all duration-300 ease-out',

          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0',

          darkMode
            ? 'border-slate-800 bg-slate-950 text-white shadow-black/30'
            : 'border-slate-200 bg-white text-slate-900',
        ].join(' ')}
      >
        {/* ---------------------------------------------------------
            TOP BRAND
        --------------------------------------------------------- */}
        <div
          className={[
            'relative flex h-16 shrink-0 items-center justify-between',
            'border-b px-4',
            darkMode
              ? 'border-slate-800'
              : 'border-slate-200',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div
              className={[
                'relative flex h-10 w-10 items-center justify-center',
                'rounded-xl text-sm font-bold',
                'transition-all duration-300',
                'hover:scale-105 hover:rotate-3',
                darkMode
                  ? 'bg-white text-slate-950'
                  : 'bg-slate-900 text-white',
              ].join(' ')}
            >
              <span className="relative z-10">YT</span>

              <div
                className={[
                  'absolute inset-0 rounded-xl',
                  'opacity-0 transition-opacity duration-300',
                  'hover:opacity-100',
                  darkMode
                    ? 'bg-slate-200'
                    : 'bg-slate-700',
                ].join(' ')}
              />
            </div>

            <div className="min-w-0">
              <p
                className={[
                  'text-sm font-bold transition-colors duration-300',
                  darkMode
                    ? 'text-white'
                    : 'text-slate-950',
                ].join(' ')}
              >
                Yanol Tech
              </p>

              <p
                className={[
                  'text-xs transition-colors duration-300',
                  darkMode
                    ? 'text-slate-400'
                    : 'text-slate-500',
                ].join(' ')}
              >
                HR Management
              </p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className={[
              'rounded-lg p-2 transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'lg:hidden',
              darkMode
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* ---------------------------------------------------------
            NAVIGATION
        --------------------------------------------------------- */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className={[
              'px-3 pb-3 text-[11px] font-semibold uppercase',
              'tracking-[0.12em] transition-colors duration-300',
              darkMode
                ? 'text-slate-500'
                : 'text-slate-400',
            ].join(' ')}
          >
            HR Management
          </p>

          <div className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={onClose}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={({ isActive }) =>
                    [
                      'group relative flex items-center gap-3',
                      'overflow-hidden rounded-xl px-3 py-2.5',
                      'text-sm font-medium',
                      'transition-all duration-300 ease-out',

                      isActive
                        ? darkMode
                          ? 'bg-white text-slate-950 shadow-lg shadow-black/20'
                          : 'bg-slate-900 text-white shadow-md shadow-slate-300/50'
                        : darkMode
                          ? 'text-slate-400 hover:bg-slate-900 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',

                      hoveredItem === item.path && !isActive
                        ? 'translate-x-1'
                        : 'translate-x-0',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Animated active background glow */}
                      {isActive && (
                        <span
                          className={[
                            'absolute inset-y-0 left-0 w-1',
                            'rounded-r-full',
                            'transition-all duration-300',
                            darkMode
                              ? 'bg-slate-950'
                              : 'bg-white',
                          ].join(' ')}
                        />
                      )}

                      {/* Hover light sweep */}
                      <span
                        className={[
                          'absolute inset-0 -translate-x-full',
                          'bg-gradient-to-r from-transparent',
                          'to-transparent opacity-0',
                          'transition-all duration-500',
                          'group-hover:translate-x-full',
                          'group-hover:opacity-100',
                          darkMode
                            ? 'via-white/5'
                            : 'via-white/30',
                        ].join(' ')}
                      />

                      {/* Icon */}
                      <span
                        className={[
                          'relative z-10 flex h-5 w-5 shrink-0',
                          'items-center justify-center',
                          'transition-all duration-300',
                          isActive
                            ? 'scale-110'
                            : 'group-hover:scale-110 group-hover:rotate-[-3deg]',
                        ].join(' ')}
                      >
                        <Icon
                          size={19}
                          strokeWidth={isActive ? 2.3 : 2}
                          className="transition-all duration-300"
                        />
                      </span>

                      {/* Label */}
                      <span className="relative z-10 flex-1 truncate">
                        {item.label}
                      </span>

                      {/* Active arrow */}
                      <ChevronRight
                        size={16}
                        className={[
                          'relative z-10 shrink-0',
                          'transition-all duration-300',
                          isActive
                            ? 'translate-x-0 opacity-100'
                            : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60',
                        ].join(' ')}
                      />
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* ---------------------------------------------------------
            DARK MODE TOGGLE
        --------------------------------------------------------- */}
        <div
          className={[
            'border-t px-3 py-3',
            darkMode
              ? 'border-slate-800'
              : 'border-slate-200',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={toggleDarkMode}
            className={[
              'group flex w-full items-center gap-3 rounded-xl',
              'px-3 py-2.5 text-left',
              'transition-all duration-300',
              darkMode
                ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
            ].join(' ')}
          >
            {/* Animated icon container */}
            <span
              className={[
                'flex h-9 w-9 shrink-0 items-center justify-center',
                'rounded-lg transition-all duration-500',
                'group-hover:scale-105',
                darkMode
                  ? 'bg-slate-900'
                  : 'bg-slate-100',
              ].join(' ')}
            >
              {darkMode ? (
                <Moon
                  size={18}
                  className="rotate-[-15deg] transition-transform duration-500 group-hover:rotate-0"
                />
              ) : (
                <Sun
                  size={18}
                  className="transition-transform duration-500 group-hover:rotate-45"
                />
              )}
            </span>

            <span className="flex-1">
              <span className="block text-sm font-semibold">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>

              <span
                className={[
                  'block text-[11px] transition-colors duration-300',
                  darkMode
                    ? 'text-slate-500'
                    : 'text-slate-400',
                ].join(' ')}
              >
                {darkMode
                  ? 'Dark appearance enabled'
                  : 'Light appearance enabled'}
              </span>
            </span>

            {/* Toggle switch */}
            <span
              className={[
                'relative h-5 w-9 shrink-0 rounded-full',
                'transition-colors duration-300',
                darkMode
                  ? 'bg-white'
                  : 'bg-slate-300',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 h-4 w-4 rounded-full',
                  'shadow-sm transition-all duration-300',
                  darkMode
                    ? 'left-[18px] bg-slate-950'
                    : 'left-0.5 bg-white',
                ].join(' ')}
              />
            </span>
          </button>
        </div>

        {/* ---------------------------------------------------------
            BOTTOM USER AREA
        --------------------------------------------------------- */}
        <div
          className={[
            'border-t p-3',
            darkMode
              ? 'border-slate-800'
              : 'border-slate-200',
          ].join(' ')}
        >
          <div
            className={[
              'group flex items-center gap-3 rounded-xl px-3 py-3',
              'transition-all duration-300',
              darkMode
                ? 'bg-slate-900 hover:bg-slate-800'
                : 'bg-slate-50 hover:bg-slate-100',
            ].join(' ')}
          >
            {/* Avatar */}
            <div
              className={[
                'flex h-9 w-9 shrink-0 items-center justify-center',
                'rounded-full text-sm font-semibold',
                'transition-all duration-300',
                'group-hover:scale-105',
                darkMode
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-200 text-slate-700',
              ].join(' ')}
            >
              HR
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={[
                  'truncate text-sm font-semibold',
                  'transition-colors duration-300',
                  darkMode
                    ? 'text-white'
                    : 'text-slate-900',
                ].join(' ')}
              >
                HR Manager
              </p>

              <p
                className={[
                  'truncate text-xs transition-colors duration-300',
                  darkMode
                    ? 'text-slate-500'
                    : 'text-slate-500',
                ].join(' ')}
              >
                Human Resources
              </p>
            </div>

            <Check
              size={15}
              className={[
                'shrink-0 transition-all duration-300',
                darkMode
                  ? 'text-slate-500'
                  : 'text-slate-400',
              ].join(' ')}
            />
          </div>
        </div>
      </aside>
    </>
  )
}

export default HRSidebar