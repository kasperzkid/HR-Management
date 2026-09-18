import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  DollarSign,
  Trash2,
  Pencil,
  IdCard,
  BadgeCheck,
  Briefcase,
  CreditCard,
  User,
} from 'lucide-react'

function EmployeeDetailsModal({ employee, isOpen, onClose, onUpdateStatus, onDelete, onEdit }) {
  if (!isOpen || !employee) return null

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'border-emerald-400 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:text-emerald-400'
      case 'Inactive':
        return 'border-rose-400 text-rose-600 bg-rose-50/50 dark:bg-rose-950/30 dark:text-rose-400'
      case 'Onboarding':
        return 'border-amber-400 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30 dark:text-amber-400'
      default:
        return 'border-gray-300 text-gray-600 dark:border-[#33383f] dark:text-gray-400'
    }
  }

  const status = employee.status || employee.employmentStatus || 'Active'
  const identityType = employee.identityType || employee.identityIdType
  const identityNumber = employee.identityNumber || employee.identityIdNumber
  const compensation =
    employee.basicSalary != null
      ? `$${Number(employee.basicSalary).toLocaleString('en-US')} / yr`
      : employee.salary || '$95,000 / yr'

  const info = [
    { icon: Mail, label: 'Email', value: employee.email || '-' },
    { icon: Phone, label: 'Phone', value: employee.phone || '+1 (555) 000-0000' },
    { icon: MapPin, label: 'Location', value: employee.location || 'Remote' },
    { icon: User, label: 'Gender', value: employee.gender || '-' },
    { icon: Calendar, label: 'Join Date', value: employee.joinDate || '-' },
    { icon: Briefcase, label: 'Employment Type', value: employee.employmentType || '-' },
    { icon: Building, label: 'Department', value: employee.department || '-' },
    { icon: DollarSign, label: 'Compensation', value: compensation },
  ]

  const hasIdentity = Boolean(identityNumber && identityType)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-[#262b31] overflow-hidden">
        {/* Header cover banner */}
        <div className="h-28 bg-gradient-to-r from-gray-900 via-slate-800 to-slate-700 relative px-6 flex items-start justify-between">
          <span className="mt-6 text-white/70 text-xs font-mono tracking-wider">
            ID: {employee.employeeId || '-'}
          </span>
          <button
            onClick={onClose}
            className="mt-5 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile head */}
        <div className="px-6 pb-6 -mt-14 relative">
          <div className="flex justify-between items-end mb-4">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-[#15181d] shadow-lg bg-gray-100 dark:bg-[#1c2026]"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }}
            />
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(status)}`}>
              {status}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-950 dark:text-gray-100">{employee.name}</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                {employee.jobTitle || '-'} • {employee.department || '-'}
              </p>
            </div>
            {onEdit && (
              <button
                onClick={() => onEdit(employee)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
              >
                <Pencil size={14} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Contact & job grid */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {info.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3"
                >
                  <Icon size={16} className="text-gray-400 shrink-0 dark:text-gray-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">{item.label}</p>
                    <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Identity & finance */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasIdentity ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                <IdCard size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Identity / KYC</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">
                  {hasIdentity ? `${identityType}: ${identityNumber}` : 'Not verified'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-[#1c2026] dark:text-gray-300">
                <BadgeCheck size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">TIN</p>
                <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">
                  {employee.tin || 'Not registered'}
                </p>
              </div>
            </div>

            {(employee.bankName || employee.bankAccount) && (
              <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] flex items-center gap-3 sm:col-span-2">
                <div className="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-[#1c2026] dark:text-gray-300">
                  <CreditCard size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">Bank Account</p>
                  <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-300">
                    {employee.bankName || 'Bank'} • {employee.bankAccount || '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick status change */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[#262b31]">
            <p className="text-xs font-semibold text-gray-700 mb-2 dark:text-gray-300">Change Status</p>
            {onUpdateStatus && (
              <div className="flex gap-2">
                {['Active', 'Onboarding', 'Inactive'].map((st) => (
                  <button
                    key={st}
                    onClick={() => onUpdateStatus(employee.id, st)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      status === st
                        ? 'bg-gray-900 text-white border-gray-900 shadow-2xs dark:bg-[#1c2026] dark:border-[#262b31]'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-[#33383f] dark:text-gray-400 dark:hover:bg-[#1c2026]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
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
              className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Remove Employee</span>
            </button>
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(employee)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-[#1c2026] dark:hover:bg-[#2a3139] rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDetailsModal