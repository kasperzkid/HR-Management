import { useState } from 'react'
import { X, User, Mail, Briefcase, Building, Calendar, Hash, Check } from 'lucide-react'
import LuxuryDatePicker from '../components/LuxuryDatePicker'
import { SETTINGS } from '../data/settingsData'
const DEPARTMENTS = ['All Departments', ...(SETTINGS.departments || [])]

function AddEmployeeModal({ isOpen, onClose, onAdd, editingEmployee = null, onEdit = null }) {
  const [formData, setFormData] = useState(() => {
    if (editingEmployee) {
      return {
        name: editingEmployee.name || '',
        email: editingEmployee.email || '',
        jobTitle: editingEmployee.jobTitle || '',
        department: editingEmployee.department || 'Design Team',
        employeeId: editingEmployee.employeeId || '',
        joinDate: editingEmployee.joinDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        status: editingEmployee.status || editingEmployee.employmentStatus || 'Active',
        avatar: editingEmployee.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        location: editingEmployee.location || 'Remote',
        salary: editingEmployee.salary || (editingEmployee.basicSalary != null ? `$${Number(editingEmployee.basicSalary).toLocaleString('en-US')}` : '$95,000')
      }
    }
    return {
      name: '',
      email: '',
      jobTitle: '',
      department: 'Design Team',
      employeeId: `A0${Math.floor(Math.random() * 9 + 1)}DEVP${Math.floor(Math.random() * 900 + 100)}`,
      joinDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      location: 'Remote',
      salary: '$95,000'
    }
  })

  if (!isOpen) return null

  const isEditing = Boolean(editingEmployee)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.jobTitle.trim()) return

    const initials = formData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()

    const payload = {
      ...formData,
      initials: initials || 'EM'
    }

    if (isEditing && onEdit) {
      onEdit({
        ...editingEmployee,
        ...payload,
        id: editingEmployee.id
      })
    } else {
      onAdd({
        id: `emp-${Date.now()}`,
        ...payload
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-[#262b31] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#262b31]">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isEditing ? 'Edit Employee' : 'Add New Employee'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditing ? `Update details for ${editingEmployee.name}` : 'Enter details to onboard a new team member'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-[#2a3139] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="alex@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">Job Title</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Product Designer"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">Department</label>
              <div className="relative">
                <Building size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 bg-white"
                >
                  {DEPARTMENTS.filter(d => d !== 'All Departments').map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                  {formData.department && !DEPARTMENTS.includes(formData.department) && (
                    <option value={formData.department}>{formData.department}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">Employee ID</label>
              <div className="relative">
                <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">Join Date</label>
              <div className="relative">
                <LuxuryDatePicker
              value={formData.joinDate}
              onChange={(date) => setFormData({ ...formData, joinDate: date })}
              placeholder="Select date"
            />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">Employment Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['Active', 'Onboarding', 'Inactive'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: st })}
                  className={`py-2 px-3 text-xs rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-all ${
                    formData.status === st
                      ? st === 'Active'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : st === 'Onboarding'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-[#33383f] dark:text-gray-400 dark:hover:bg-[#1c2026]'
                  }`}
                >
                  {formData.status === st && <Check size={13} />}
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#262b31]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-[#1c2026] dark:hover:bg-[#2a3139] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-gray-950 hover:bg-gray-800 dark:bg-[#1c2026] dark:hover:bg-[#2a3139] rounded-lg shadow-xs transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddEmployeeModal
