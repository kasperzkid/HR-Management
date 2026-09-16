import React, { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  FileText,
} from 'lucide-react'
import { HR_SETTINGS } from '../data/settingsData'
import { MOCK_EMPLOYEES } from '../data/mockData'
import { formatETB } from '../lib/payroll'

export default function HREmployees() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES)
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeEmployeeDetail, setActiveEmployeeDetail] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    employeeId: `EMP-00${employees.length + 1}`,
    jobTitle: '',
    department: HR_SETTINGS.departments[0],
    employmentType: 'Permanent',
    employmentStatus: 'Active',
    basicSalary: '30000',
    transportAllowance: '2500',
    housingAllowance: '3500',
    mealAllowance: '1800',
    otherAllowance: '0',
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '',
    tin: '',
    phone: '',
    email: '',
  })

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        emp.jobTitle.toLowerCase().includes(search.toLowerCase())
      const matchDept = selectedDept === 'All' || emp.department === selectedDept
      const matchStatus = selectedStatus === 'All' || emp.employmentStatus === selectedStatus
      return matchSearch && matchDept && matchStatus
    })
  }, [employees, search, selectedDept, selectedStatus])

  const handleAddEmployee = (e) => {
    e.preventDefault()
    const newEmp = {
      ...formData,
      id: `emp-${Date.now()}`,
      basicSalary: Number(formData.basicSalary) || 0,
      transportAllowance: Number(formData.transportAllowance) || 0,
      housingAllowance: Number(formData.housingAllowance) || 0,
      mealAllowance: Number(formData.mealAllowance) || 0,
      otherAllowance: Number(formData.otherAllowance) || 0,
      otherDeductions: 0,
      loanDeductions: 0,
      joinDate: new Date().toISOString().slice(0, 10),
      exitDate: null,
    }
    setEmployees([newEmp, ...employees])
    setIsModalOpen(false)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">Employee Directory</h1>
          <p className="text-xs text-gray-500 mt-1">
            Master employee record repository • Scoped to {HR_SETTINGS.company.name}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {HR_SETTINGS.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              {HR_SETTINGS.employmentStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Job Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Basic Salary</th>
                <th className="py-3 px-4">TIN Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredEmployees.map((emp) => {
                const isTerminated = emp.employmentStatus === 'Terminated' || emp.employmentStatus === 'Resigned'
                const hasTin = Boolean(emp.tin && emp.tin.trim() !== '')

                return (
                  <tr key={emp.employeeId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{emp.employeeId}</td>
                    <td className="py-3 px-4 font-bold text-gray-950">
                      <div>{emp.name}</div>
                      <div className="text-[10px] font-normal text-gray-400">{emp.email}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">{emp.department}</td>
                    <td className="py-3 px-4 text-gray-600">{emp.jobTitle}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {emp.employmentType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.employmentStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : emp.employmentStatus === 'On Leave'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                      {formatETB(emp.basicSalary)}
                    </td>
                    <td className="py-3 px-4">
                      {hasTin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 size={12} /> {emp.tin}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <AlertCircle size={12} /> Missing TIN
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveEmployeeDetail(emp)}
                        className="text-[11px] font-bold text-gray-900 hover:text-black underline cursor-pointer"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 text-[11px] text-gray-500 flex items-center justify-between">
          <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
          <span className="font-mono text-[10px]">Master Directory Sync • EAT</span>
        </div>
      </div>

      {/* Employee Detail Modal */}
      {activeEmployeeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-sm font-bold text-gray-950">{activeEmployeeDetail.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{activeEmployeeDetail.employeeId} • {activeEmployeeDetail.jobTitle}</p>
              </div>
              <button
                onClick={() => setActiveEmployeeDetail(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Department</span>
                  <span className="font-semibold text-gray-900">{activeEmployeeDetail.department}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Status</span>
                  <span className="font-bold text-emerald-700">{activeEmployeeDetail.employmentStatus}</span>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Basic Monthly Salary:</span>
                  <span className="font-bold text-gray-950">{formatETB(activeEmployeeDetail.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Transport Allowance:</span>
                  <span className="font-semibold text-gray-800">{formatETB(activeEmployeeDetail.transportAllowance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Housing Allowance:</span>
                  <span className="font-semibold text-gray-800">{formatETB(activeEmployeeDetail.housingAllowance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Meal Allowance:</span>
                  <span className="font-semibold text-gray-800">{formatETB(activeEmployeeDetail.mealAllowance)}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <CreditCard size={14} className="text-gray-400" />
                  <span>Bank: {activeEmployeeDetail.bankName} • {activeEmployeeDetail.bankAccount || 'Missing Account #'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText size={14} className="text-gray-400" />
                  <span>TIN: {activeEmployeeDetail.tin || 'Not registered'}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setActiveEmployeeDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-900 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <h3 className="text-sm font-bold text-gray-950">Add New Employee</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  >
                    {HR_SETTINGS.departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Basic Salary (ETB)</label>
                  <input
                    type="number"
                    required
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">TIN</label>
                  <input
                    type="text"
                    placeholder="TIN-..."
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-950 text-white rounded-lg font-semibold"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
