import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Lock, CalendarCheck, AlertTriangle, Wallet, MessageSquare } from 'lucide-react'
import HRProfileMenu from './ProfileMenu'
import { MOCK_EMPLOYEES, MOCK_LEAVE_REQUESTS, MOCK_RECENT_ACTIVITIES } from '../data/mockData'
import { useMessaging } from '../../Employer/context/messagingStore'

const READ_KEY = 'hr-notifications-read'

const NOTIF_ICONS = {
  leave: { icon: CalendarCheck, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  alert: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  payroll: { icon: Wallet, color: 'bg-gray-100 text-gray-700 dark:bg-[#1c2026] dark:text-gray-200' },
}

function buildNotifications() {
  const list = []

  MOCK_LEAVE_REQUESTS.filter((l) => l.approvalStatus === 'Pending').forEach((l) => {
    list.push({
      id: `leave-${l.id}`,
      type: 'leave',
      title: `Leave request from ${l.employeeName}`,
      message: `${l.days} days ${l.leaveType} • ${l.startDate} → ${l.endDate}`,
      time: 'Awaiting approval',
      route: '/hr-manager/leave',
    })
  })

  const missing = MOCK_EMPLOYEES.filter(
    (e) =>
      e.employmentStatus === 'Active' &&
      (!e.tin || !e.tin.trim() || !e.bankAccount || !e.bankAccount.trim() || !e.basicSalary || e.basicSalary <= 0)
  )
  if (missing.length) {
    list.push({
      id: 'data-checks',
      type: 'alert',
      title: 'Statutory data checks',
      message: `${missing.length} active employee${missing.length === 1 ? '' : 's'} missing TIN, bank or salary details`,
      time: 'Needs attention',
      route: '/hr-manager/employees',
    })
  }

  MOCK_RECENT_ACTIVITIES.slice(0, 2).forEach((a) => {
    list.push({
      id: `activity-${a.id}`,
      type: 'payroll',
      title: a.title,
      message: a.detail,
      time: a.relativeTime,
      route: '/hr-manager/dashboard',
    })
  })

  return list
}

export default function HRTopbar() {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const navigate = useNavigate()
  const { totalUnread } = useMessaging()

  const notifications = useMemo(() => buildNotifications(), [])
  const unreadIds = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'))
    } catch {
      return new Set()
    }
  }, [])
  const [readIds, setReadIds] = useState(unreadIds)
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAllRead = (e) => {
    e.stopPropagation()
    const all = new Set(notifications.map((n) => n.id))
    setReadIds(all)
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...all]))
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="h-16 shrink-0 bg-white/90 dark:bg-[#0d1014]/90 backdrop-blur border-b border-gray-200/80 dark:border-[#262b31] hidden lg:flex items-center justify-between px-6 sticky top-0 z-30 shadow-2xs">
      {/* Breadcrumb / Portal Context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-gray-400 dark:text-gray-500">Portal</span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-gray-950 dark:text-gray-100 font-bold">HR Management</span>
          <Lock size={11} className="text-gray-300 dark:text-gray-600" />
        </div>
      </div>

      {/* Right Side: Notifications & Profile Menu */}
      <div className="flex items-center gap-2">
        {/* Messages / Inbox */}
        <button
          onClick={() => navigate('/hr-manager/inbox')}
          className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
          title="Inbox"
        >
          <MessageSquare size={19} />
          {totalUnread > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-500" />
          )}
        </button>

        {/* Notifications / Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-500" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] rounded-2xl shadow-xl dark:shadow-black/40 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#262b31]">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-semibold text-gray-950 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  <Check size={13} /> Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-[#262b31]">
                {notifications.length === 0 && (
                  <p className="px-4 py-8 text-xs text-gray-400 dark:text-gray-500 text-center">You’re all caught up.</p>
                )}
                {notifications.map((n) => {
                  const meta = NOTIF_ICONS[n.type] || NOTIF_ICONS.payroll
                  const Icon = meta.icon
                  const unread = !readIds.has(n.id)
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        setNotifOpen(false)
                        navigate(n.route)
                      }}
                      className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-100/60 dark:hover:bg-[#1c2026] ${
                        unread ? 'bg-gray-50/60 dark:bg-[#1c2026]/40' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${meta.color} flex items-center justify-center shrink-0`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{n.title}</p>
                          {unread && <span className="w-1.5 h-1.5 rounded-full bg-gray-950 dark:bg-gray-100 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{n.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown with theme toggle & logout */}
        <HRProfileMenu />
      </div>
    </header>
  )
}