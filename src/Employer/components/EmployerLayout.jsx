import { Link, Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/employer/dashboard', icon: '📊' },
  { label: 'Attendance', path: '/employer/attendance', icon: '📅' },
  { label: 'Leave Requests', path: '/employer/leave', icon: '🗓️' },
  { label: 'Salary', path: '/employer/salary', icon: '💰' },
  { label: 'Profile', path: '/employer/profile', icon: '👤' },
]

function EmployerLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-indigo-400">YT-HR</h1>
          <p className="text-xs text-slate-500 mt-1">Employer Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
            AJ
          </div>
          <div>
            <p className="text-sm font-medium text-white">Alex Johnson</p>
            <p className="text-xs text-slate-500">Frontend Developer</p>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default EmployerLayout