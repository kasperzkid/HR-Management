import { useEffect, useState } from 'react'
import {
  Bell,
  Menu,
  Search,
} from 'lucide-react'

const SEARCH_PLACEHOLDERS = [
  'Search employees, payroll, reports...',
  'Search employees...',
  'Search payroll...',
  'Search reports...',
]

function HRTopbar({ onMenuClick }) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlaceholderIndex((current) =>
        (current + 1) % SEARCH_PLACEHOLDERS.length,
      )
    }, 2600)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="mr-3 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={21} />
      </button>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search
          size={18}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-transform duration-300"
        />

        <div className="relative h-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300 focus-within:border-cyan-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(6,182,212,0.12)] hover:border-slate-300">
          <input
            key={placeholderIndex}
            type="text"
            placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
            className="animate-topbar-search-placeholder h-full w-full bg-transparent pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:-translate-y-0.5 md:hidden"
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:-translate-y-0.5"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
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

      <style>{`
        @keyframes topbarSearchPlaceholderIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-topbar-search-placeholder {
          animation: topbarSearchPlaceholderIn 420ms cubic-bezier(.22, 1, .36, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-topbar-search-placeholder {
            animation: none !important;
          }
        }
      `}</style>
    </header>
  )
}

export default HRTopbar
