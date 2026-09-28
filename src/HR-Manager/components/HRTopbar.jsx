import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMessagingOptional } from '../../Employer/context/messagingStore'

function HRTopbar() {
  const navigate = useNavigate()
  const messaging = useMessagingOptional()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const profileRef = useRef(null)
  const notificationsRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function loadLeaveNotifications() {
      try {
        const response = await fetch('http://localhost:4000/api/hr-manager/leave', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        const requests = Array.isArray(data) ? data : data.requests || data.leaveRequests || data.records || []
        if (!cancelled) {
          setPendingRequests(
            [...requests]
              .filter((request) => request.approvalStatus === 'Pending')
              .sort((left, right) =>
                String(right.createdAt || right.requestDate || '').localeCompare(
                  String(left.createdAt || left.requestDate || ''),
                ),
              ),
          )
        }
      } catch {
        // The Leave page remains the source of truth if notifications are unavailable.
      }
    }

    loadLeaveNotifications()
    const handleLeaveUpdated = () => loadLeaveNotifications()
    window.addEventListener('hr-leave-updated', handleLeaveUpdated)
    const interval = window.setInterval(loadLeaveNotifications, 15000)
    return () => {
      cancelled = true
      window.removeEventListener('hr-leave-updated', handleLeaveUpdated)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  function handleLogout() {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('authToken')

    setProfileOpen(false)

    navigate('/login')
  }

  function handleSearchSubmit(event) {
    event.preventDefault()

    const query = searchValue.trim()

    if (!query) return

    // Keep the current search behavior without changing
    // the rest of the HR dashboard functionality.
    window.dispatchEvent(
      new CustomEvent('hr-global-search', {
        detail: {
          query,
        },
      }),
    )
  }

  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-xl lg:px-7">
      {/* Left side */}
      <div className="flex min-w-0 items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            HR Management
          </p>

          <h2 className="mt-0.5 truncate text-[17px] font-bold tracking-[-0.02em] text-slate-950">
            HR Dashboard
          </h2>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div ref={notificationsRef} className="relative">
          {searchOpen ? (
            <form
              onSubmit={handleSearchSubmit}
              className="flex h-10 w-[220px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-slate-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-100 sm:w-[280px]"
            >
              <Search
                size={17}
                strokeWidth={1.9}
                className="shrink-0 text-slate-400"
              />

              <input
                ref={searchInputRef}
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(event.target.value)
                }
                placeholder="Search employees..."
                className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />

              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  setSearchOpen(false)
                }}
                className="ml-2 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
                aria-label="Close search"
              >
                Esc
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Search"
            >
              <Search size={19} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} />
            {pendingRequests.length + (messaging?.totalUnread || 0) > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {pendingRequests.length + (messaging?.totalUnread || 0) > 9 ? '9+' : pendingRequests.length + (messaging?.totalUnread || 0)}
              </span>
            ) : (
              <span className="absolute right-[9px] top-[8px] h-1.5 w-1.5 rounded-full bg-slate-300 ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Notifications</p>
                <span className="text-xs font-semibold text-slate-400">{pendingRequests.length + (messaging?.totalUnread || 0)} new</span>
              </div>
              <div className="grid grid-cols-2 border-b border-slate-100 p-1">
                <button type="button" onClick={() => { setNotificationsOpen(false); navigate('/hr-manager/leave#leave-review-inbox') }} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Leave requests ({pendingRequests.length})</button>
                <button type="button" onClick={() => { setNotificationsOpen(false); navigate('/hr-manager/inbox') }} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Employee messages ({messaging?.totalUnread || 0})</button>
              </div>
              {messaging?.contacts?.filter((contact) => contact.lastMessage || contact.unread > 0).slice(0, 4).map((contact) => (
                <button key={contact.id} type="button" onClick={() => { setNotificationsOpen(false); navigate(`/hr-manager/inbox/${contact.id}`) }} className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50">
                  <p className="text-xs font-bold text-slate-900">{contact.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{contact.lastMessage?.text || 'New employee message'}</p>
                </button>
              ))}
              {pendingRequests.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-500">No employee leave requests yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {pendingRequests.slice(0, 5).map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false)
                        navigate('/hr-manager/leave#leave-review-inbox')
                      }}
                      className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <p className="text-xs font-bold text-slate-900">{request.employeeName || 'Employee'}</p>
                      <p className="mt-1 text-xs text-slate-500">{request.leaveType || 'Leave'} · {request.days || 0} day(s) · {request.approvalStatus || 'Pending'}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{request.startDate || '—'} to {request.endDate || '—'}</p>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false)
                  navigate('/hr-manager/leave#leave-review-inbox')
                }}
                className="w-full px-4 py-3 text-left text-xs font-bold text-[#4755AE] hover:bg-indigo-50"
              >
                Open Leave Management
              </button>
            </div>
          )}
        </div>

        {/* HR Dashboard profile / logout */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 transition-all hover:border-slate-300 hover:bg-slate-50"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <UserRound
                size={17}
                strokeWidth={1.9}
              />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-[12px] font-bold leading-4 text-slate-900">
                HR Manager
              </p>

              <p className="text-[10px] font-medium leading-4 text-slate-400">
                Administrator
              </p>
            </div>

            <ChevronDown
              size={16}
              strokeWidth={1.8}
              className={`hidden text-slate-400 transition-transform sm:block ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
            >
              <div className="px-3 py-3">
                <p className="text-sm font-bold text-slate-900">
                  HR Manager
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  Administrator
                </p>
              </div>

              <div className="h-px bg-slate-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/hr-manager/settings')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings
                  size={17}
                  strokeWidth={1.8}
                />

                <span>Profile & Settings</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut
                  size={17}
                  strokeWidth={1.9}
                />

                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default HRTopbar
