import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LifeBuoy, LogOut, ChevronDown, Mail, Lock, Save } from 'lucide-react'
import { logout } from '../../lib/auth'

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function ProfileMenu({ compact = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const raw = localStorage.getItem('user')
  let user = {
    name: 'Employer',
    email: 'employer@yanol.com',
    role: 'EMPLOYER',
    company: 'Yanol Technology',
  }
  if (raw) {
    try {
      user = { ...user, ...JSON.parse(raw) }
    } catch {
      /* ignore malformed stored user */
    }
  }

  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)

  const initials = getInitials(user.name)
  const roleLabel = String(user.role || 'EMPLOYER').replace('_', ' ')

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const close = () => setOpen(false)
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSave = () => {
    if (!email.trim()) return
    const next = { ...user, email }
    if (password.trim()) next.password = password
    localStorage.setItem('user', JSON.stringify(next))
    setSaved(true)
    setPassword('')
    setTimeout(() => setSaved(false), 2000)
  }

  const menuItemClass =
    'flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors'

  const inputClass =
    'w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 transition-colors'

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl transition-colors ${
          open ? 'bg-gray-100' : 'hover:bg-gray-100'
        }`}
        title={user.name}
      >
        <div className="w-8 h-8 rounded-full bg-gray-950 text-white text-xs font-bold flex items-center justify-center shadow-sm shrink-0">
          {initials}
        </div>
        {!compact && (
          <>
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-[11px] font-semibold text-gray-900 truncate max-w-[110px]">
                {user.name}
              </span>
              <span className="text-[10px] text-gray-400 capitalize truncate max-w-[110px]">
                {roleLabel}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden origin-top-right animate-in zoom-in-95 duration-150">
          {/* Profile header */}
          <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-950 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-950 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
              {roleLabel}
            </span>
          </div>

          {/* Email & password */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 block mb-2">
              Email & Password
            </span>
            <div className="space-y-2">
              <div className="relative">
                <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!email.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-gray-950 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saved ? (
                  <>
                    <span className="text-gray-300">Saved ✓</span>
                  </>
                ) : (
                  <>
                    <Save size={13} /> Update credentials
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="px-3 pb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 block mb-1">
              Support
            </span>
            <Link to="/employer/inbox" onClick={close} className={menuItemClass}>
              <LifeBuoy size={13} className="text-gray-400 shrink-0" /> Help & Support
            </Link>
          </div>

          {/* Logout */}
          <div className="p-2">
            <div className="h-px bg-gray-100 mb-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <LogOut size={13} className="shrink-0" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileMenu