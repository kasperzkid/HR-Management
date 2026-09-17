import { X, Mail, Phone, MapPin, Calendar, Building, DollarSign, Trash2 } from 'lucide-react'

function EmployeeDetailsModal({ employee, isOpen, onClose, onUpdateStatus, onDelete }) {
  if (!isOpen || !employee) return null

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'border border-emerald-400 text-emerald-600 bg-emerald-50/50'
      case 'Inactive':
        return 'border border-rose-400 text-rose-600 bg-rose-50/50'
      case 'Onboarding':
        return 'border border-amber-400 text-amber-600 bg-amber-50/50'
      default:
        return 'border border-gray-300 text-gray-600 dark:border-[#33383f] dark:text-gray-400'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-[#262b31] overflow-hidden">
        {/* Header background banner */}
        <div className="h-24 bg-gradient-to-r from-gray-900 to-slate-800 relative px-6 flex items-center justify-between">
          <span className="text-white/80 text-xs font-mono tracking-wider">
            ID: {employee.employeeId}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Card Head */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex justify-between items-end -mt-10 mb-4">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-[#262b31] shadow-md bg-gray-100 dark:bg-[#1c2026]"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }}
            />
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(employee.status)}`}>
              {employee.status}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">{employee.name}</h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{employee.jobTitle} • {employee.department}</p>
          </div>

          {/* Details Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3">
              <Mail size={16} className="text-gray-400 shrink-0 dark:text-gray-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Email</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">{employee.email}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3">
              <Phone size={16} className="text-gray-400 shrink-0 dark:text-gray-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Phone</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">{employee.phone || '+1 (555) 000-0000'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3">
              <MapPin size={16} className="text-gray-400 shrink-0 dark:text-gray-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Location</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">{employee.location || 'Remote'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3">
              <Calendar size={16} className="text-gray-400 shrink-0 dark:text-gray-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Join Date</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">{employee.joinDate}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3">
              <Building size={16} className="text-gray-400 shrink-0 dark:text-gray-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Department</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">{employee.department}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3">
              <DollarSign size={16} className="text-gray-400 shrink-0 dark:text-gray-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Compensation</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">{employee.salary || '$95,000 / yr'}</p>
              </div>
            </div>
          </div>

          {/* Quick status change */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[#262b31]">
            <p className="text-xs font-semibold text-gray-700 mb-2 dark:text-gray-300">Change Status</p>
            <div className="flex gap-2">
              {['Active', 'Onboarding', 'Inactive'].map((st) => (
                <button
                  key={st}
                  onClick={() => onUpdateStatus(employee.id, st)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    employee.status === st
                      ? 'bg-gray-900 text-white border-gray-900 shadow-2xs dark:bg-[#1c2026] dark:border-[#262b31]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-[#33383f] dark:text-gray-400 dark:hover:bg-[#1c2026]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[#262b31] flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to remove ${employee.name}?`)) {
                  onDelete(employee.id)
                  onClose()
                }
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 size={15} />
              <span>Remove Employee</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-[#1c2026] dark:hover:bg-[#2a3139] rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDetailsModal
