import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarCheck,
  Check,
  Info,
  Menu,
  MessageSquare,
  Wallet,
} from 'lucide-react'
import ProfileMenu from '../../Employer/components/ProfileMenu'
import { useMessaging } from '../../Employer/context/messagingStore'

const NOTIF_ICONS = {
  leave: { icon: CalendarCheck, color: 'bg-slate-100 text-slate-700' },
  payroll: { icon: Wallet, color: 'bg-slate-200 text-slate-900' },
  message: { icon: MessageSquare, color: 'bg-slate-100 text-slate-600' },
}

const SECTION_NAMES = {
  '/hr-manager/employees': 'Employees',
  '/hr-manager/attendance': 'Attendance',
  '/hr-manager/leave': 'Leave',
  '/hr-manager/payroll': 'Payroll',
  '/hr-manager/payslips': 'Payment Slips',
  '/hr-manager/reports': 'Reports',
  '/hr-manager/settings': 'Settings',
}

function getSection(pathname) {
  if (
    pathname === '/hr-manager' ||
    pathname === '/hr-manager/' ||
    pathname.startsWith('/hr-manager/dashboard')
  ) {
    return 'Dashboard'
  }
  const match = Object.entries(SECTION_NAMES).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`)
  )
  return match ? match[1] : 'HR Manager'
}

function HRTopbar({ onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const section = getSection(location.pathname)

  const {
    totalUnread,
    notifications,
    unreadNotifications,
    markAllNotificationsReadAndRemove,
    dismissNotification,
  } = useMessaging()

  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleAllRead = (e) => {
    e.stopPropagation()
    markAllNotificationsReadAndRemove()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] backdrop-blur sm:px-6">
      {/* Left: mobile menu + breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/hr-manager/dashboard"
            className="truncate text-sm font-semibold text-slate-400 transition-colors hover:text-slate-700"
          >
            HR Manager
          </Link>
          <span className="text-xs text-slate-300">/</span>
          <span className="truncate text-sm font-semibold text-slate-900">
            {section}
          </span>
        </div>
      </div>

      {/* Right: inbox, notifications, profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Messages / Inbox */}
        <button
          onClick={() => navigate('/hr-manager/inbox')}
          className="relative rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          title="Inbox"
        >
          <MessageSquare size={19} />
          {totalUnread > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>

        {/* Notifications / Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadNotifications > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Notifications
                </h3>
                <button
                  onClick={handleAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-950 hover:text-slate-700"
                >
                  <Check size={13} /> Mark all read
                </button>
              </div>

              <div className="max-h-80 divide-y divide-slate-50 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-slate-400">
                    You're all caught up.
                  </p>
                )}
                {notifications.map((n) => {
                  const meta =
                    NOTIF_ICONS[n.type] || {
                      icon: Info,
                      color: 'bg-slate-100 text-slate-500',
                    }
                  const Icon = meta.icon
                  const goToMessage = () => {
                    if (n.contactId) {
                      navigate(`/hr-manager/inbox/${n.contactId}`)
                      setNotifOpen(false)
                      dismissNotification(n.id)
                    }
                  }
                  return (
                    <div
                      key={n.id}
                      onClick={goToMessage}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        n.type === 'message'
                          ? 'cursor-pointer hover:bg-slate-50'
                          : ''
                      } ${n.unread ? 'bg-slate-50/60' : ''}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {n.title}
                          </p>
                          {n.unread && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-950" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-slate-100 p-2">
                <button
                  onClick={() => navigate('/hr-manager/inbox')}
                  className="w-full rounded-xl py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Open Inbox
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        {/* Profile / account dropdown */}
        <ProfileMenu basePath="/hr-manager" />
      </div>
    </header>
  )
}

export default HRTopbar