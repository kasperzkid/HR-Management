import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Edit3,
  Mail,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { INITIAL_EMPLOYEES } from '../../Employer/data/employeeData'

const DEPARTMENTS = [
  'All',
  ...Array.from(
    new Set(INITIAL_EMPLOYEES.map((employee) => employee.department).filter(Boolean)),
  ),
]

const EMPLOYMENT_TYPES = ['Permanent', 'Contractual', 'Intern']

const STATUSES = ['Active', 'On Leave', 'Resigned']

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: 'HR',
  position: '',
  employmentType: 'Permanent',
  status: 'Active',
  gender: 'Male',
  hireDate: '',
  exitDate: '',
  basicSalary: '',
  transportAllowance: '',
  housingAllowance: '',
  mealAllowance: '',
  otherAllowance: '',
  bankAccount: '',
  tin: '',
  annualLeaveEntitled: '',
  annualLeaveTaken: 0,
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function getEmployeeName(employee) {
  if (employee.name) {
    return employee.name
  }

  return [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Unnamed Employee'
}

function getInitials(employee) {
  if (employee.initials) {
    return employee.initials
  }

  const name = getEmployeeName(employee)

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getEmployeeId(employee) {
  return employee.employeeId || employee.id || '—'
}

function normalizeEmployee(employee) {
  const name = getEmployeeName(employee)
  const nameParts = name.split(' ').filter(Boolean)

  return {
    ...employee,
    id: employee.id || employee.employeeId,
    employeeId: employee.employeeId || employee.id,
    name,
    firstName: employee.firstName || nameParts[0] || '',
    lastName:
      employee.lastName ||
      nameParts.slice(1).join(' ') ||
      '',
    position: employee.position || employee.jobTitle || '',
    jobTitle: employee.jobTitle || employee.position || '',
    department: employee.department || 'HR',
    employmentType: employee.employmentType || 'Permanent',
    status: employee.status || employee.employmentStatus || 'Active',
    employmentStatus:
      employee.employmentStatus || employee.status || 'Active',
    basicSalary: Number(employee.basicSalary || 0),
    transportAllowance: Number(employee.transportAllowance || 0),
    housingAllowance: Number(employee.housingAllowance || 0),
    mealAllowance: Number(employee.mealAllowance || 0),
    otherAllowance: Number(employee.otherAllowance || 0),
    annualLeaveEntitled: Number(employee.annualLeaveEntitled || 0),
    annualLeaveTaken: Number(employee.annualLeaveTaken || 0),
  }
}

function Field({ label, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  )
}

function inputClassName() {
  return 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10'
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>
    </div>
  )
}

function EmployeeModal({ employee, onClose, onSave }) {
  const editing = Boolean(employee)

  const [form, setForm] = useState(() => {
    if (!employee) {
      return { ...emptyForm }
    }

    return {
      ...emptyForm,
      ...employee,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department || 'HR',
      position: employee.position || employee.jobTitle || '',
      employmentType: employee.employmentType || 'Permanent',
      status: employee.status || employee.employmentStatus || 'Active',
      gender: employee.gender || 'Male',
      hireDate: employee.hireDate || employee.joinDate || '',
      exitDate: employee.exitDate || '',
      basicSalary: employee.basicSalary ?? '',
      transportAllowance: employee.transportAllowance ?? '',
      housingAllowance: employee.housingAllowance ?? '',
      mealAllowance: employee.mealAllowance ?? '',
      otherAllowance: employee.otherAllowance ?? '',
      bankAccount: employee.bankAccount || '',
      tin: employee.tin || '',
      annualLeaveEntitled: employee.annualLeaveEntitled ?? '',
      annualLeaveTaken: employee.annualLeaveTaken ?? 0,
    }
  })

  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required.')
      return
    }

    if (!form.email.trim()) {
      setError('Email address is required.')
      return
    }

    if (!form.department) {
      setError('Department is required.')
      return
    }

    if (!form.position.trim()) {
      setError('Position is required.')
      return
    }

    if (!form.hireDate) {
      setError('Hire date is required.')
      return
    }

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()

    const employeeData = {
      ...(employee || {}),
      ...form,

      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      position: form.position.trim(),
      jobTitle: form.position.trim(),

      basicSalary: Number(form.basicSalary || 0),
      transportAllowance: Number(form.transportAllowance || 0),
      housingAllowance: Number(form.housingAllowance || 0),
      mealAllowance: Number(form.mealAllowance || 0),
      otherAllowance: Number(form.otherAllowance || 0),

      annualLeaveEntitled: Number(
        form.annualLeaveEntitled || 0,
      ),

      annualLeaveTaken: Number(
        form.annualLeaveTaken || 0,
      ),

      employmentStatus: form.status,
      status: form.status,
      hireDate: form.hireDate,
      joinDate: form.hireDate,
    }

    onSave(employeeData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Employee Management
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {editing ? 'Edit Employee' : 'Add Employee'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* Modal body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-6 py-6"
        >
          <div className="space-y-8">
            {/* Personal */}
            <section>
              <SectionTitle
                icon={Users}
                title="Personal Information"
                description="Basic employee identification and contact information."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="First Name" required>
                  <input
                    className={inputClassName()}
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="e.g. Abebe"
                  />
                </Field>

                <Field label="Last Name" required>
                  <input
                    className={inputClassName()}
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="e.g. Kebede"
                  />
                </Field>

                <Field label="Gender">
                  <select
                    className={inputClassName()}
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    className={inputClassName()}
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="employee@yanoltech.com"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    className={inputClassName()}
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+251 9..."
                  />
                </Field>
              </div>
            </section>

            {/* Employment */}
            <section>
              <SectionTitle
                icon={BriefcaseBusiness}
                title="Employment Information"
                description="Department, position, employment status and dates."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Department" required>
                  <select
                    className={inputClassName()}
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    {DEPARTMENTS.filter(
                      (department) => department !== 'All',
                    ).map((department) => (
                      <option
                        key={department}
                        value={department}
                      >
                        {department}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Position" required>
                  <input
                    className={inputClassName()}
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    placeholder="e.g. HR Officer"
                  />
                </Field>

                <Field label="Employment Type">
                  <select
                    className={inputClassName()}
                    name="employmentType"
                    value={form.employmentType}
                    onChange={handleChange}
                  >
                    {EMPLOYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    className={inputClassName()}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Hire Date" required>
                  <input
                    type="date"
                    className={inputClassName()}
                    name="hireDate"
                    value={form.hireDate}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Exit Date">
                  <input
                    type="date"
                    className={inputClassName()}
                    name="exitDate"
                    value={form.exitDate || ''}
                    onChange={handleChange}
                  />
                </Field>
              </div>
            </section>

            {/* Compensation */}
            <section>
              <SectionTitle
                icon={Building2}
                title="Compensation"
                description="Salary and employee allowance information."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Basic Salary">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="basicSalary"
                    value={form.basicSalary}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Transport Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="transportAllowance"
                    value={form.transportAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Housing Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="housingAllowance"
                    value={form.housingAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Meal Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="mealAllowance"
                    value={form.mealAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Other Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="otherAllowance"
                    value={form.otherAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>
              </div>
            </section>

            {/* Payroll / leave */}
            <section>
              <SectionTitle
                icon={BriefcaseBusiness}
                title="Payroll & Leave Information"
                description="Bank details, TIN and annual leave configuration."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Bank Account">
                  <input
                    className={inputClassName()}
                    name="bankAccount"
                    value={form.bankAccount}
                    onChange={handleChange}
                    placeholder="Bank account number"
                  />
                </Field>

                <Field label="TIN">
                  <input
                    className={inputClassName()}
                    name="tin"
                    value={form.tin}
                    onChange={handleChange}
                    placeholder="TIN"
                  />
                </Field>

                <Field label="Annual Leave Entitlement">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={inputClassName()}
                    name="annualLeaveEntitled"
                    value={form.annualLeaveEntitled}
                    onChange={handleChange}
                    placeholder="e.g. 18"
                  />
                </Field>

                <Field label="Annual Leave Taken">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={inputClassName()}
                    name="annualLeaveTaken"
                    value={form.annualLeaveTaken}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </Field>
              </div>
            </section>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#4755AE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998]"
            >
              {editing ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
    useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    try {
      setLoading(true)
      setApiError('')

      const response = await fetch(
        'http://localhost:4000/api/hr-manager/employees',
      )

      if (!response.ok) {
        throw new Error('Failed to load employees')
      }

      const data = await response.json()

      setEmployees(data.map(normalizeEmployee))
    } catch (error) {
      console.error('Employee loading error:', error)

      setApiError(
        'Unable to load employees from the database. Make sure the API server is running.',
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()

    return employees.filter((employee) => {
      const name = getEmployeeName(employee).toLowerCase()
      const employeeId = getEmployeeId(employee).toLowerCase()
      const email = String(employee.email || '').toLowerCase()
      const position = String(
        employee.position || employee.jobTitle || '',
      ).toLowerCase()

      const matchesSearch =
        !query ||
        name.includes(query) ||
        employeeId.includes(query) ||
        email.includes(query) ||
        position.includes(query)

      const matchesDepartment =
        departmentFilter === 'All' ||
        employee.department === departmentFilter

      const matchesStatus =
        statusFilter === 'All' ||
        employee.status === statusFilter

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus
      )
    })
  }, [
    employees,
    search,
    departmentFilter,
    statusFilter,
  ])

  const activeCount = employees.filter(
    (employee) => employee.status === 'Active',
  ).length

  const onLeaveCount = employees.filter(
    (employee) => employee.status === 'On Leave',
  ).length

  const inactiveCount = employees.filter(
    (employee) =>
      employee.status === 'Resigned' ||
      employee.status === 'Terminated',
  ).length

  function openAddModal() {
    setEditingEmployee(null)
    setModalOpen(true)
  }

  function openEditModal(employee) {
    setEditingEmployee(employee)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEmployee(null)
  }

    async function handleSave(employeeData) {
    try {
      setApiError('')

      const editing = Boolean(editingEmployee)

      const employeeId =
        employeeData.employeeId ||
        editingEmployee?.employeeId ||
        `EMP-${String(employees.length + 1).padStart(3, '0')}`

      const databaseId =
        employeeData.id ||
        editingEmployee?.id ||
        employeeId

      const payload = {
        id: databaseId,
        employeeId,

        name: employeeData.name || 'Unnamed Employee',
        gender: employeeData.gender || 'Male',

        dateOfBirth:
          employeeData.dateOfBirth ||
          employeeData.dob ||
          '',

        joinDate:
          employeeData.joinDate ||
          employeeData.hireDate ||
          '',

        jobTitle:
          employeeData.jobTitle ||
          employeeData.position ||
          '',

        department: employeeData.department || 'HR',

        employmentType:
          employeeData.employmentType || 'Permanent',

        basicSalary: Number(employeeData.basicSalary || 0),
        transportAllowance: Number(
          employeeData.transportAllowance || 0,
        ),
        housingAllowance: Number(
          employeeData.housingAllowance || 0,
        ),
        mealAllowance: Number(
          employeeData.mealAllowance || 0,
        ),
        otherAllowance: Number(
          employeeData.otherAllowance || 0,
        ),

        otherDeductions: Number(
          employeeData.otherDeductions || 0,
        ),

        loanDeductions: Number(
          employeeData.loanDeductions || 0,
        ),

        bankName: employeeData.bankName || '',
        bankAccount: employeeData.bankAccount || '',
        tin: employeeData.tin || '',
        pensionId: employeeData.pensionId || '',

        phone: employeeData.phone || '',
        email: employeeData.email || '',
        address: employeeData.address || '',
        emergencyContact:
          employeeData.emergencyContact || '',

        employmentStatus:
          employeeData.employmentStatus ||
          employeeData.status ||
          'Active',

        exitDate: employeeData.exitDate || null,

        notes: employeeData.notes || '',

        status:
          employeeData.status ||
          employeeData.employmentStatus ||
          'Active',

        avatar: employeeData.avatar || '',
        location: employeeData.location || '',
        salary: Number(
          employeeData.salary ||
            employeeData.basicSalary ||
            0,
        ),

        manager: employeeData.manager || '',
        roleType: employeeData.roleType || '',
        initials:
          employeeData.initials ||
          getInitials(employeeData),
      }

      const url = editing
        ? `http://localhost:4000/api/hr-manager/employees/${editingEmployee.id}`
        : 'http://localhost:4000/api/hr-manager/employees'

      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.message || 'Failed to save employee',
        )
      }

      await loadEmployees()
      closeModal()
    } catch (error) {
      console.error('Save employee error:', error)

      setApiError(
        error.message || 'Failed to save employee.',
      )
    }
  }

   async function handleDelete(employee) {
    const name = getEmployeeName(employee)
    const id = getEmployeeId(employee)

    const confirmed = window.confirm(
      `Delete ${name} (${id})? This action cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setApiError('')

      const response = await fetch(
        `http://localhost:4000/api/hr-manager/employees/${employee.id}`,
        {
          method: 'DELETE',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.message || 'Failed to delete employee',
        )
      }

      await loadEmployees()
    } catch (error) {
      console.error('Delete employee error:', error)

      setApiError(
        error.message || 'Failed to delete employee.',
      )
    }
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">
            {apiError && (
        <div className="mx-auto max-w-[1600px] px-5 pt-5 sm:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {apiError}
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              HR Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Employees
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage employee records and workforce information.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex w-fit items-center gap-2 rounded-xl bg-[#4755AE] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d4998]"
          >
            <UserPlus size={18} />
            Add Employee
          </button>
        </header>

        {/* Summary */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Employees
              </p>

              <Users
                size={19}
                className="text-slate-400"
              />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {employees.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Active
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                On Leave
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {onLeaveCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Inactive
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {inactiveCount}
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_200px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by name, ID, email or position..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#4755AE] focus:bg-white focus:ring-2 focus:ring-[#4755AE]/10"
              />
            </div>

            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-[#4755AE]"
              >
                <option value="All">
                  All Departments
                </option>

                {DEPARTMENTS.filter(
                  (department) => department !== 'All',
                ).map((department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-[#4755AE]"
              >
                <option value="All">
                  All Statuses
                </option>

                {STATUSES.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </section>

      
{/* Table */}
<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
    <div>
      <h2 className="font-bold">
        Employee Directory
      </h2>

      <p className="mt-1 text-xs text-slate-400">
        Showing {filteredEmployees.length} of{' '}
        {employees.length} employees
      </p>
    </div>

    <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Database connected
    </div>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full min-w-[1050px]">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Employee
          </th>

          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Department
          </th>

          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Position
          </th>

          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Employment
          </th>

          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Salary
          </th>

          <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Status
          </th>

          <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Actions
          </th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td
              colSpan="7"
              className="px-6 py-16 text-center"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />

                <p className="mt-3 text-sm font-medium text-slate-500">
                  Loading employees...
                </p>
              </div>
            </td>
          </tr>
        ) : (
          <>
            {filteredEmployees.map((employee) => (
              <tr
                key={employee.id}
                className="border-b border-slate-50 transition hover:bg-slate-50/60"
              >
                {/* Employee */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {getInitials(employee)}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {getEmployeeName(employee)}
                      </p>

                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">
                          {getEmployeeId(employee)}
                        </span>

                        {employee.email && (
                          <>
                            <span className="text-slate-300">
                              •
                            </span>

                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Mail size={11} />
                              {employee.email}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Department */}
                <td className="px-6 py-4">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                    {employee.department || '—'}
                  </span>
                </td>

                {/* Position */}
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-700">
                    {employee.position ||
                      employee.jobTitle ||
                      '—'}
                  </p>
                </td>

                {/* Employment Type */}
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-700">
                    {employee.employmentType || '—'}
                  </p>
                </td>

                {/* Salary */}
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    ETB{' '}
                    {formatCurrency(
                      employee.basicSalary,
                    )}
                  </p>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      employee.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : employee.status === 'On Leave'
                          ? 'bg-amber-50 text-amber-700'
                          : employee.status === 'Resigned'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {employee.status || 'Unknown'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        openEditModal(employee)
                      }
                      title="Edit employee"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(employee)
                      }
                      title="Delete employee"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {filteredEmployees.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-16 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Users size={21} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No employees found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Try changing your search or filters.
                  </p>
                </td>
              </tr>
            )}
          </>
        )}
      </tbody>
    </table>
  </div>
</section>

        {/* Mobile contact hint */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 sm:hidden">
          <Phone size={13} />
          Swipe horizontally to view all employee information.
        </div>
      </main>

      {modalOpen && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Employees