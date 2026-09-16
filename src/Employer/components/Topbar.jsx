import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, MessageSquare, Check, Info, CalendarCheck, Wallet } from 'lucide-react'
import { useMessaging } from '../context/messagingStore'
import ProfileMenu from './ProfileMenu'

const NOTIF_ICONS = {
  leave: { icon: CalendarCheck, color: 'bg-gray-100 text-gray-700' },
  payroll: { icon: Wallet, color: 'bg-gray-200 text-gray-900' },
  message: { icon: MessageSquare, color: 'bg-gray-100 text-gray-600' },
}

function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const { totalUnread, notifications, unreadNotifications, markAllRead, dismissNotification } =
    useMessaging()
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleAllRead = (e) => {
    e.stopPropagation()
    markAllRead()
  }

  return (
    <header className="h-16 shrink-0 bg-white/90 backdrop-blur border-b border-gray-200 hidden lg:flex items-center justify-between px-5 sticky top-0 z-30 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-3 min-w-0">
        {/* Breadcrumb / context */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/employer/dashboard"
            className="font-semibold text-sm text-gray-400 hover:text-gray-700 transition-colors truncate"
          >
            Employer
          </Link>
          <span className="text-gray-300 text-xs">/</span>
          <span className="font-semibold text-sm text-gray-900 truncate">Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Messages / Inbox */}
        <button
          onClick={() => navigate('/employer/inbox')}
          className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title="Inbox"
        >
          <MessageSquare size={19} />
          {totalUnread > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-500" />
          )}
        </button>

        {/* Notifications/Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-500" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                <button
                  onClick={handleAllRead}
                  className="text-[11px] font-semibold text-gray-950 hover:text-gray-700 flex items-center gap-1"
                >
                  <Check size={13} /> Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 && (
                  <p className="px-4 py-8 text-xs text-gray-400 text-center">You’re all caught up.</p>
                )}
                {notifications.map((n) => {
                  const meta = NOTIF_ICONS[n.type] || { icon: Info, color: 'bg-gray-100 text-gray-500' }
                  const Icon = meta.icon
                  const goToMessage = () => {
                    if (n.contactId) {
                      navigate(`/employer/inbox/${n.contactId}`)
                      setNotifOpen(false)
                      dismissNotification(n.id)
                    }
                  }
                  return (
                    <div
                      key={n.id}
                      onClick={goToMessage}
                      className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                        n.type === 'message' ? 'cursor-pointer hover:bg-gray-100/60' : ''
                      } ${n.unread ? 'bg-gray-50/60' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full ${meta.color} flex items-center justify-center shrink-0`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                          {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-gray-950 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={() => navigate('/employer/inbox')}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Open Inbox
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile / account dropdown */}
        <ProfileMenu />
      </div>
    </header>
  )
}

export default Topbar