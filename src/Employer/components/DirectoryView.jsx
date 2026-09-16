import { Mail, MapPin } from 'lucide-react'

function DirectoryView({ employees, onSelectEmployee, _onUpdateStatus }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'border-emerald-400 text-emerald-600 bg-emerald-50/50'
      case 'Inactive':
        return 'border-rose-400 text-rose-600 bg-rose-50/50'
      case 'Onboarding':
        return 'border-amber-400 text-amber-600 bg-amber-50/50'
      default:
        return 'border-gray-300 text-gray-600'
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {employees.map((emp) => (
        <div
          key={emp.id}
          className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="relative">
                <img
                  src={emp.avatar}
                  alt={emp.name}
                  className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-100"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }}
                />
                <span
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    emp.status === 'Active'
                      ? 'bg-emerald-500'
                      : emp.status === 'Onboarding'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(emp.status)}`}>
                {emp.status}
              </span>
            </div>

            <div className="mt-3.5">
              <h4
                onClick={() => onSelectEmployee(emp)}
                className="font-bold text-gray-900 text-sm hover:text-indigo-600 cursor-pointer transition-colors"
              >
                {emp.name}
              </h4>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{emp.jobTitle}</p>
              <p className="text-[11px] text-gray-400">{emp.department}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-2 truncate">
                <Mail size={13} className="text-gray-400 shrink-0" />
                <span className="truncate">{emp.email}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <MapPin size={13} className="text-gray-400 shrink-0" />
                <span className="truncate">{emp.location || 'Remote'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 underline decoration-gray-300">
              {emp.employeeId}
            </span>
            <button
              onClick={() => onSelectEmployee(emp)}
              className="text-xs font-semibold text-gray-700 hover:text-gray-950 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DirectoryView
