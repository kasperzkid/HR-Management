import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  Users,
  Wallet,
  Plane,
  Building2,
  PieChart as PieChartIcon,
  AlertTriangle,
  Zap,
  Clock,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Check,
  Building,
} from 'lucide-react'
import { MOCK_EMPLOYEES } from '../data/mockData'

export default function HRManagerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const mainScrollRef = useRef(null)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [showOrgMenu, setShowOrgMenu] = useState(false)

  const [currentOrg, setCurrentOrg] = useState({
    name: 'Wishbone Global',
    members: 'HR Manager',
    code: 'WB',
  })

  const organizations = [
    { name: 'Wishbone Global', members: 'HR Manager', code: 'WB' },
    { name: 'Yanol Tech PLC', members: 'Employer Portal', code: 'YT' },
  ]

  // Live Needs Review count for badge
  const needsReviewCount = React.useMemo(() => {
    let count = 0
    MOCK_EMPLOYEES.forEach((e) => {
      if (!e.tin || e.tin.trim() === '') count += 1
      if (!e.bankAccount || e.bankAccount.trim() === '') count += 1
      if (!e.basicSalary || e.basicSalary <= 0) count += 1
    })
    count += 2 // pending leaves
    return count
  }, [])

  // The exact 8 HR dashboard sections
  const sections = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'payroll-summary', label: 'Payroll Summary', icon: Wallet },
    { id: 'leave-overview', label: 'Leave Overview', icon: Plane },
    { id: 'department-breakdown', label: 'Department Breakdown', icon: Building2 },
    { id: 'workforce-status', label: 'Workforce Status', icon: PieChartIcon },
    {
      id: 'alerts-data-checks',
      label: 'Alerts & Data Checks',
      icon: AlertTriangle,
      badge: needsReviewCount > 0 ? `${needsReviewCount}` : null,
    },
    { id: 'quick-actions', label: 'Quick Actions', icon: Zap },
    { id: 'recent-activity', label: 'Recent Activity', icon: Clock },
  ]

  // Track active section as user scrolls inside the main area
  useEffect(() => {
    const mainEl = mainScrollRef.current
    if (!mainEl) return

    const handleScroll = () => {
      const scrollPos = mainEl.scrollTop + 140
      for (const sec of sections) {
        const el = document.getElementById(sec.id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sec.id)
            break
          }
        }
      }
    }

    mainEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => mainEl.removeEventListener('scroll', handleScroll)
  }, [sections])

  const scrollToSection = (id) => {
    setMobileOpen(false)
    setActiveSection(id)
    if (
      location.pathname !== '/hr-manager' &&
      location.pathname !== '/hr-manager/dashboard' &&
      location.pathname !== '/hr-manager/'
    ) {
      navigate(`/hr-manager/dashboard#${id}`)
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el && mainScrollRef.current) {
          mainScrollRef.current.scrollTo({
            top: el.offsetTop - 80,
            behavior: 'smooth',
          })
        }
      }, 100)
    } else {
      const el = document.getElementById(id)
      if (el && mainScrollRef.current) {
        mainScrollRef.current.scrollTo({
          top: el.offsetTop - 80,
          behavior: 'smooth',
        })
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-gray-950 text-sm">Yanol-HR</span>
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Consistent Fixed-Width Sidebar Matching Employee Dashboard Design */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200/80
            flex flex-col shrink-0 w-[250px] min-w-[250px] max-w-[250px] h-full select-none
            transition-transform duration-200 ease-in-out
            ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo & Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
                </svg>
              </div>
              <div className="truncate">
                <span className="font-extrabold tracking-tight text-gray-950 text-sm font-sans block truncate">
                  Yanol-HR
                </span>
                <span className="text-[10px] font-semibold text-gray-400 block -mt-0.5 truncate">
                  HR Management
                </span>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dashboard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-1.5 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white text-xs text-gray-800 rounded-lg border border-gray-200/70 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder:text-gray-400"
              />
              <span className="absolute right-2 text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-2xs">
                ⌘ K
              </span>
            </div>
          </div>

          {/* Navigation Links — Exactly the 8 Dashboard Sections */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-sm custom-scrollbar overflow-x-hidden">
            <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Dashboard Sections
            </div>

            {sections.map((item) => {
              const isActive = activeSection === item.id
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gray-100 text-gray-950 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={16} className={`shrink-0 ${isActive ? 'text-gray-950' : 'text-gray-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white shrink-0 ml-1.5 shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Logout button */}
          <div className="px-3 pb-2 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>

          {/* Bottom Organization Card */}
          <div className="p-3 border-t border-gray-100 relative shrink-0">
            <button
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-gray-100/90 hover:bg-gray-200/70 border border-gray-200/60 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gray-950 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {currentOrg.code}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-gray-900 truncate">{currentOrg.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{currentOrg.members}</p>
                </div>
              </div>
              <ChevronDown size={14} className="text-gray-500 shrink-0 ml-1" />
            </button>

            {/* Org Switcher Dropdown */}
            {showOrgMenu && (
              <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-xl border border-gray-200/90 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 px-2.5 py-1">
                  Workspace
                </p>
                {organizations.map((org) => (
                  <button
                    key={org.name}
                    onClick={() => {
                      setCurrentOrg(org)
                      setShowOrgMenu(false)
                      if (org.code === 'YT') {
                        navigate('/employer/dashboard')
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      org.name === currentOrg.name
                        ? 'bg-gray-100 text-gray-950 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-gray-950 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {org.code}
                      </div>
                      <span className="truncate">{org.name}</span>
                    </div>
                    {org.name === currentOrg.name && <Check size={14} className="text-gray-900 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace Area — Independent Scroll, Rock Solid Sidebar */}
        <main
          ref={mainScrollRef}
          className="flex-1 min-w-0 overflow-y-auto bg-[#f4f5f7] scroll-smooth"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
