import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'

import HRSidebar from '../components/HRSidebar'
import HRTopbar from '../components/HRTopbar'
import GlobalSearchModal from '../../components/GlobalSearchModal'

const HR_SEARCH_ENTRIES = [
  {
    id: 'dashboard',
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [{ label: 'Dashboard', path: '/hr-manager/dashboard' }],
  },
  {
    id: 'teams',
    section: 'Teams',
    icon: Users,
    items: [
      { label: 'Employees', path: '/hr-manager/employees' },
      { label: 'Attendance', path: '/hr-manager/attendance' },
      { label: 'Leave Management', path: '/hr-manager/leave' },
    ],
  },
  {
    id: 'finance',
    section: 'Finance',
    icon: Wallet,
    items: [
      { label: 'Payroll', path: '/hr-manager/payroll' },
      { label: 'Payment Slips', path: '/hr-manager/payslips' },
      { label: 'Reports', path: '/hr-manager/reports' },
    ],
  },
  {
    id: 'messages',
    section: 'Messages',
    icon: MessageSquare,
    items: [{ label: 'Inbox', path: '/hr-manager/inbox' }],
  },
  {
    id: 'system',
    section: 'System',
    icon: Settings,
    items: [{ label: 'Settings', path: '/hr-manager/settings' }],
  },
]

function HRLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'k')) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F3F4F6] dark:bg-[#0a0d10] text-gray-800 dark:text-gray-200">
      <div className="relative flex flex-1 overflow-hidden dark:bg-[#0a0d10]">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <HRSidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <HRTopbar
            onMenuClick={() => setSidebarOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />
          <Outlet />
        </main>
      </div>

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={() => setSidebarOpen(false)}
        entries={HR_SEARCH_ENTRIES}
      />
    </div>
  )
}

export default HRLayout