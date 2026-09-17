import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Settings,
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
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col',
          'border-r border-slate-200 bg-white',
          'transition-transform duration-200',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              YT
            </div>

            <div>
              <p className="text-sm font-bold text-slate-950">
                Yanol Tech
              </p>
              <p className="text-xs text-slate-500">
                HR Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            HR Management
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-2.5',
                      'text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                    ].join(' ')
                  }
                >
                  <Icon size={19} strokeWidth={2} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Bottom user area */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              HR
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                HR Manager
              </p>
              <p className="truncate text-xs text-slate-500">
                Human Resources
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default HRSidebar