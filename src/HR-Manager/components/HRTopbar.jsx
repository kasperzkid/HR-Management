import {
  Bell,
  Menu,
  Search,
} from 'lucide-react'

function HRTopbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuClick}
        className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={21} />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search employees, payroll, reports..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* Mobile search */}
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell size={20} />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            HR
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">
              HR Manager
            </p>

            <p className="text-xs text-slate-500">
              Human Resources
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default HRTopbar