import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  ArrowRight,
  LayoutGrid,
  Table2,
  Building2,
  ChevronDown,
  Mail,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { Table } from '../../components/ui'

const API_URL = 'http://localhost:4000/api/hr-manager'

const EMPLOYMENT_TYPES = [
  'Permanent',
  'Contractual',
  'Intern',
]

const STATUSES = [
  'Active',
  'On Leave',
  'Resigned',
]

const GENDERS = [
  'Male',
  'Female',
]

const DEFAULT_DEPARTMENTS = [
  'HR',
]

const emptyForm = {
  employeeId: '',
  firstName: '',
  lastName: '',
  gender: 'Male',
  dateOfBirth: '',
  email: '',
  phone: '',
  address: '',
  emergencyContact: '',
  department: '',
  position: '',
  employmentType: 'Permanent',
  status: 'Active',
  hireDate: '',
  notes: '',
  basicSalary: '',
  transportAllowance: '',
  housingAllowance: '',
  mealAllowance: '',
  otherAllowance: '',
  bankName: '',
  bankAccount: '',
  tin: '',
  pensionId: '',
}

function AnimatedStatNumber({ value }) {
  const numericValue = Number(value || 0)
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let animationFrameId
    const startTime = performance.now()
    const duration = 700

    const animate = (currentTime) => {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1,
      )

      const easedProgress = 1 - Math.pow(1 - progress, 3)

      setDisplayValue(
        Math.round(numericValue * easedProgress),
      )

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(animate)
      }
    }

    animationFrameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [numericValue])

  return displayValue
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getEmployeeName(employee) {
  if (employee?.name) {
    return employee.name
  }

  return (
    [
      employee?.firstName,
      employee?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Unnamed Employee'
  )
}

function getEmployeeId(employee) {
  return employee?.employeeId || employee?.id || '—'
}

function getInitials(employee) {
  if (employee?.initials) {
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

function normalizeEmployee(employee) {
  const name = getEmployeeName(employee)
  const nameParts = name.split(' ').filter(Boolean)

  return {
    ...employee,

    id: employee.id || employee.employeeId,

    employeeId:
      employee.employeeId ||
      employee.id ||
      '',

    name,

    firstName:
      employee.firstName ||
      nameParts[0] ||
      '',

    lastName:
      employee.lastName ||
      nameParts.slice(1).join(' ') ||
      '',

    gender:
      employee.gender ||
      'Male',

    dateOfBirth:
      employee.dateOfBirth ||
      employee.dob ||
      '',

    joinDate:
      employee.joinDate ||
      employee.hireDate ||
      '',

    hireDate:
      employee.hireDate ||
      employee.joinDate ||
      '',

    jobTitle:
      employee.jobTitle ||
      employee.position ||
      '',

    position:
      employee.position ||
      employee.jobTitle ||
      '',

    department:
      employee.department ||
      'HR',

    employmentType:
      employee.employmentType ||
      'Permanent',

    employmentStatus:
      employee.employmentStatus ||
      employee.status ||
      'Active',

    status:
      employee.status ||
      employee.employmentStatus ||
      'Active',

    basicSalary: Number(
      employee.basicSalary || 0,
    ),

    transportAllowance: Number(
      employee.transportAllowance || 0,
    ),

    housingAllowance: Number(
      employee.housingAllowance || 0,
    ),

    mealAllowance: Number(
      employee.mealAllowance || 0,
    ),

    otherAllowance: Number(
      employee.otherAllowance || 0,
    ),

    bankName:
      employee.bankName || '',

    bankAccount:
      employee.bankAccount || '',

    tin:
      employee.tin || '',

    pensionId:
      employee.pensionId || '',

    phone:
      employee.phone || '',

    email:
      employee.email || '',

    address:
      employee.address || '',

    emergencyContact:
      employee.emergencyContact || '',

    notes:
      employee.notes || '',

    avatar:
      employee.avatar || '',

    location:
      employee.location || '',

    manager:
      employee.manager || '',

    roleType:
      employee.roleType || '',
  }
}

function statusClasses(status) {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700'

    case 'On Leave':
      return 'bg-amber-50 text-amber-700'

    case 'Resigned':
      return 'bg-slate-100 text-slate-600'

    default:
      return 'bg-red-50 text-red-700'
  }
}

function Field({
  label,
  children,
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  )
}

function inputClassName() {
  return [
    'w-full rounded-xl border border-slate-200',
    'bg-white px-3.5 py-2.5 text-sm text-slate-900',
    'outline-none transition',
    'placeholder:text-slate-400',
    'focus:border-[#4755AE]',
    'focus:ring-2 focus:ring-[#4755AE]/10',
  ].join(' ')
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   EXISTING EDIT EMPLOYEE MODAL
   Exit Date has been removed only.
========================================================= */

function EmployeeModal({
  employee,
  departments,
  onClose,
  onSave,
  saving,
}) {
  const editing = Boolean(employee)

  const [form, setForm] = useState(() => {
    return {
      ...emptyForm,
      ...employee,

      employeeId:
        employee.employeeId ||
        employee.id ||
        '',

      firstName:
        employee.firstName || '',

      lastName:
        employee.lastName || '',

      gender:
        employee.gender || 'Male',

      dateOfBirth:
        employee.dateOfBirth ||
        employee.dob ||
        '',

      email:
        employee.email || '',

      phone:
        employee.phone || '',

      address:
        employee.address || '',

      emergencyContact:
        employee.emergencyContact || '',

      department:
        employee.department ||
        departments[0] ||
        'HR',

      position:
        employee.position ||
        employee.jobTitle ||
        '',

      employmentType:
        employee.employmentType ||
        'Permanent',

      status:
        employee.status ||
        employee.employmentStatus ||
        'Active',

      hireDate:
        employee.hireDate ||
        employee.joinDate ||
        '',

      notes:
        employee.notes || '',

      basicSalary:
        employee.basicSalary ?? '',

      transportAllowance:
        employee.transportAllowance ?? '',

      housingAllowance:
        employee.housingAllowance ?? '',

      mealAllowance:
        employee.mealAllowance ?? '',

      otherAllowance:
        employee.otherAllowance ?? '',

      bankName:
        employee.bankName || '',

      bankAccount:
        employee.bankAccount || '',

      tin:
        employee.tin || '',

      pensionId:
        employee.pensionId || '',
    }
  })

  const [error, setError] = useState('')

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.employeeId.trim()) {
      setError('Employee ID is required.')
      return
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setError(
        'First name and last name are required.',
      )
      return
    }

    if (!form.dateOfBirth) {
      setError('Date of birth is required.')
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
      setError('Job title is required.')
      return
    }

    if (!form.hireDate) {
      setError('Join date is required.')
      return
    }

    const firstName =
      form.firstName.trim()

    const lastName =
      form.lastName.trim()

    const employeeData = {
      ...(employee || {}),
      ...form,

      employeeId:
        form.employeeId.trim(),

      firstName,
      lastName,

      name:
        `${firstName} ${lastName}`,

      gender:
        form.gender || 'Male',

      dateOfBirth:
        form.dateOfBirth,

      position:
        form.position.trim(),

      jobTitle:
        form.position.trim(),

      department:
        form.department,

      employmentType:
        form.employmentType,

      status:
        form.status,

      employmentStatus:
        form.status,

      hireDate:
        form.hireDate,

      joinDate:
        form.hireDate,

      basicSalary:
        Number(form.basicSalary || 0),

      transportAllowance:
        Number(
          form.transportAllowance || 0,
        ),

      housingAllowance:
        Number(
          form.housingAllowance || 0,
        ),

      mealAllowance:
        Number(
          form.mealAllowance || 0,
        ),

      otherAllowance:
        Number(
          form.otherAllowance || 0,
        ),

      bankName:
        form.bankName.trim(),

      bankAccount:
        form.bankAccount.trim(),

      tin:
        form.tin.trim(),

      pensionId:
        form.pensionId.trim(),

      phone:
        form.phone.trim(),

      email:
        form.email.trim(),

      address:
        form.address.trim(),

      emergencyContact:
        form.emergencyContact.trim(),

      notes:
        form.notes.trim(),
    }

    onSave(employeeData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Employee Management
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Edit Employee
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-6 py-6"
        >
          <div className="space-y-8">

            {/* Identification */}
            <section>
              <SectionTitle
                icon={Users}
                title="Employee Identification"
                description="Employee ID and personal information."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field
                  label="Employee ID"
                  required
                >
                  <input
                    className={inputClassName()}
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleChange}
                    placeholder="e.g. EMP-001"
                    disabled
                  />

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Employee ID cannot be changed after creation.
                  </p>
                </Field>

                <Field
                  label="First Name"
                  required
                >
                  <input
                    className={inputClassName()}
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="e.g. Abebe"
                  />
                </Field>

                <Field
                  label="Last Name"
                  required
                >
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
                    {GENDERS.map(
                      (gender) => (
                        <option
                          key={gender}
                          value={gender}
                        >
                          {gender}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field
                  label="Date of Birth"
                  required
                >
                  <input
                    type="date"
                    className={inputClassName()}
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                  />
                </Field>

                <Field
                  label="Email"
                  required
                >
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

                <Field label="Address">
                  <input
                    className={inputClassName()}
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Employee address"
                  />
                </Field>

                <Field label="Emergency Contact">
                  <input
                    className={inputClassName()}
                    name="emergencyContact"
                    value={form.emergencyContact}
                    onChange={handleChange}
                    placeholder="Name / phone"
                  />
                </Field>

              </div>
            </section>

            {/* Employment */}
            <section>
              <SectionTitle
                icon={BriefcaseBusiness}
                title="Employment Information"
                description="Job, department, employment type and dates."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field
                  label="Department"
                  required
                >
                  <select
                    className={inputClassName()}
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    {departments.map(
                      (department) => (
                        <option
                          key={department}
                          value={department}
                        >
                          {department}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field
                  label="Job Title"
                  required
                >
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
                    {EMPLOYMENT_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Employment Status">
                  <select
                    className={inputClassName()}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field
                  label="Join Date"
                  required
                >
                  <input
                    type="date"
                    className={inputClassName()}
                    name="hireDate"
                    value={form.hireDate}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    className={`${inputClassName()} min-h-[92px] resize-none`}
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Additional employee notes"
                  />
                </Field>

              </div>
            </section>

            {/* Compensation */}
            <section>
              <SectionTitle
                icon={Building2}
                title="Compensation"
                description="Salary and allowance information used by payroll."
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

            {/* Payroll */}
            <section>
              <SectionTitle
                icon={Building2}
                title="Payroll Information"
                description="Bank, TIN and pension identification details."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field label="Bank Name">
                  <input
                    className={inputClassName()}
                    name="bankName"
                    value={form.bankName}
                    onChange={handleChange}
                    placeholder="Bank name"
                  />
                </Field>

                <Field label="Bank Account">
                  <input
                    className={inputClassName()}
                    name="bankAccount"
                    value={form.bankAccount}
                    onChange={handleChange}
                    placeholder="Account number"
                  />
                </Field>

                <Field label="TIN">
                  <input
                    className={inputClassName()}
                    name="tin"
                    value={form.tin}
                    onChange={handleChange}
                    placeholder="Tax Identification Number"
                  />
                </Field>

                <Field label="Pension / SSN ID">
                  <input
                    className={inputClassName()}
                    name="pensionId"
                    value={form.pensionId}
                    onChange={handleChange}
                    placeholder="Pension ID"
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
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#4755AE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>

          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================
   NEW ADD EMPLOYEE DRAWER
   Existing employee fields are preserved.
========================================================= */

function AddEmployeeDrawer({
  departments,
  onClose,
  onSave,
  saving,
}) {
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    ...emptyForm,
    department:
      departments[0] || 'HR',
  })

  const [error, setError] = useState('')

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (error) {
      setError('')
    }
  }

  function validateStep(currentStep) {
    setError('')

    if (currentStep === 1) {
      if (!form.employeeId.trim()) {
        setError('Employee ID is required.')
        return false
      }

      if (!form.firstName.trim()) {
        setError('First name is required.')
        return false
      }

      if (!form.lastName.trim()) {
        setError('Last name is required.')
        return false
      }

      if (!form.dateOfBirth) {
        setError('Date of birth is required.')
        return false
      }

      if (!form.email.trim()) {
        setError('Email address is required.')
        return false
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailPattern.test(form.email.trim())) {
        setError('Please enter a valid email address.')
        return false
      }

      return true
    }

    if (currentStep === 2) {
      if (!form.department) {
        setError('Department is required.')
        return false
      }

      if (!form.position.trim()) {
        setError('Job title is required.')
        return false
      }

      if (!form.hireDate) {
        setError('Join date is required.')
        return false
      }

      return true
    }

    return true
  }

  function handleContinue() {
    if (!validateStep(step)) {
      return
    }

    setStep((current) =>
      Math.min(current + 1, 4),
    )
  }

  function handleBack() {
    setError('')

    setStep((current) =>
      Math.max(current - 1, 1),
    )
  }

  function buildEmployeeData() {
    const firstName =
      form.firstName.trim()

    const lastName =
      form.lastName.trim()

    return {
      ...form,

      employeeId:
        form.employeeId.trim(),

      firstName,
      lastName,

      name:
        `${firstName} ${lastName}`,

      gender:
        form.gender || 'Male',

      dateOfBirth:
        form.dateOfBirth,

      position:
        form.position.trim(),

      jobTitle:
        form.position.trim(),

      department:
        form.department,

      employmentType:
        form.employmentType,

      status:
        form.status,

      employmentStatus:
        form.status,

      hireDate:
        form.hireDate,

      joinDate:
        form.hireDate,

      basicSalary:
        Number(form.basicSalary || 0),

      transportAllowance:
        Number(
          form.transportAllowance || 0,
        ),

      housingAllowance:
        Number(
          form.housingAllowance || 0,
        ),

      mealAllowance:
        Number(
          form.mealAllowance || 0,
        ),

      otherAllowance:
        Number(
          form.otherAllowance || 0,
        ),

      bankName:
        form.bankName.trim(),

      bankAccount:
        form.bankAccount.trim(),

      tin:
        form.tin.trim(),

      pensionId:
        form.pensionId.trim(),

      phone:
        form.phone.trim(),

      email:
        form.email.trim(),

      address:
        form.address.trim(),

      emergencyContact:
        form.emergencyContact.trim(),

      notes:
        form.notes.trim(),
    }
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (step < 4) {
      handleContinue()
      return
    }

    if (!validateStep(1)) {
      setStep(1)
      return
    }

    if (!validateStep(2)) {
      setStep(2)
      return
    }

    onSave(buildEmployeeData())
  }

  const steps = [
    {
      number: 1,
      title: 'Identification',
    },
    {
      number: 2,
      title: 'Employment',
    },
    {
      number: 3,
      title: 'Compensation',
    },
    {
      number: 4,
      title: 'Review',
    },
  ]

  return (
    <div className="fixed inset-0 z-50">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={() => {
          if (!saving) {
            onClose()
          }
        }}
      />

      {/* Drawer */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 bg-white">

          <div className="flex items-center justify-between px-5 py-5 sm:px-7">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Employee Management
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Add Employee
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Step {step} of 4
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={20} />
            </button>

          </div>

          {/* Step indicator */}
          <div className="px-5 pb-5 sm:px-7">

            <div className="flex items-center gap-2">

              {steps.map(
                (item, index) => (
                  <div
                    key={item.number}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          item.number < step
                        ) {
                          setError('')
                          setStep(
                            item.number,
                          )
                        }
                      }}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                        step === item.number
                          ? 'bg-[#4755AE] text-white'
                          : step >
                              item.number
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {item.number}
                    </button>

                    <span
                      className={`hidden truncate text-xs font-semibold sm:block ${
                        step === item.number
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.title}
                    </span>

                    {index <
                      steps.length - 1 && (
                      <div className="h-px flex-1 bg-slate-200" />
                    )}

                  </div>
                ),
              )}

            </div>

          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">

            {/* STEP 1 */}
            {step === 1 && (
              <div className="animate-add-step">

                <SectionTitle
                  icon={Users}
                  title="Employee Identification"
                  description="Employee ID and personal information."
                />

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Employee ID"
                    required
                  >
                    <input
                      className={inputClassName()}
                      name="employeeId"
                      value={form.employeeId}
                      onChange={handleChange}
                      placeholder="e.g. EMP-001"
                    />
                  </Field>

                  <Field
                    label="Gender"
                  >
                    <select
                      className={inputClassName()}
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                    >
                      {GENDERS.map(
                        (gender) => (
                          <option
                            key={gender}
                            value={gender}
                          >
                            {gender}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="First Name"
                    required
                  >
                    <input
                      className={inputClassName()}
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="e.g. Abebe"
                    />
                  </Field>

                  <Field
                    label="Last Name"
                    required
                  >
                    <input
                      className={inputClassName()}
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Kebede"
                    />
                  </Field>

                  <Field
                    label="Date of Birth"
                    required
                  >
                    <input
                      type="date"
                      className={inputClassName()}
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field
                    label="Email"
                    required
                  >
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

                  <Field label="Address">
                    <input
                      className={inputClassName()}
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Employee address"
                    />
                  </Field>

                  <Field label="Emergency Contact">
                    <input
                      className={inputClassName()}
                      name="emergencyContact"
                      value={form.emergencyContact}
                      onChange={handleChange}
                      placeholder="Name / phone"
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="animate-add-step">

                <SectionTitle
                  icon={BriefcaseBusiness}
                  title="Employment Information"
                  description="Job, department, employment type and dates."
                />

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Department"
                    required
                  >
                    <select
                      className={inputClassName()}
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                    >
                      {departments.map(
                        (department) => (
                          <option
                            key={department}
                            value={department}
                          >
                            {department}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="Job Title"
                    required
                  >
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
                      {EMPLOYMENT_TYPES.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field label="Employment Status">
                    <select
                      className={inputClassName()}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      {STATUSES.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="Join Date"
                    required
                  >
                    <input
                      type="date"
                      className={inputClassName()}
                      name="hireDate"
                      value={form.hireDate}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field label="Notes">
                    <textarea
                      className={`${inputClassName()} min-h-[110px] resize-none`}
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="Additional employee notes"
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="animate-add-step space-y-8">

                {/* Compensation */}
                <section>
                  <SectionTitle
                    icon={Building2}
                    title="Compensation"
                    description="Salary and allowance information used by payroll."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">

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

                {/* Payroll */}
                <section>
                  <SectionTitle
                    icon={Building2}
                    title="Payroll Information"
                    description="Bank, TIN and pension identification details."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">

                    <Field label="Bank Name">
                      <input
                        className={inputClassName()}
                        name="bankName"
                        value={form.bankName}
                        onChange={handleChange}
                        placeholder="Bank name"
                      />
                    </Field>

                    <Field label="Bank Account">
                      <input
                        className={inputClassName()}
                        name="bankAccount"
                        value={form.bankAccount}
                        onChange={handleChange}
                        placeholder="Account number"
                      />
                    </Field>

                    <Field label="TIN">
                      <input
                        className={inputClassName()}
                        name="tin"
                        value={form.tin}
                        onChange={handleChange}
                        placeholder="Tax Identification Number"
                      />
                    </Field>

                    <Field label="Pension / SSN ID">
                      <input
                        className={inputClassName()}
                        name="pensionId"
                        value={form.pensionId}
                        onChange={handleChange}
                        placeholder="Pension ID"
                      />
                    </Field>

                  </div>
                </section>

              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="animate-add-step">

                <div className="mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Users size={20} />
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    Review Employee
                  </h3>

                  <p className="mt-2 text-base text-slate-500 sm:text-[17px]">
                    Review the information before creating the employee.
                  </p>
                </div>

                <div className="space-y-4">

                  {/* Identity */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Employee Identification
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(1)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Employee ID"
                        value={form.employeeId}
                      />

                      <InfoItem
                        label="Full Name"
                        value={`${form.firstName} ${form.lastName}`}
                      />

                      <InfoItem
                        label="Gender"
                        value={form.gender}
                      />

                      <InfoItem
                        label="Date of Birth"
                        value={formatDate(form.dateOfBirth)}
                      />

                      <InfoItem
                        label="Email"
                        value={form.email}
                      />

                      <InfoItem
                        label="Phone"
                        value={form.phone}
                      />

                      <InfoItem
                        label="Address"
                        value={form.address}
                      />

                      <InfoItem
                        label="Emergency Contact"
                        value={form.emergencyContact}
                      />

                    </div>
                  </div>

                  {/* Employment */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Employment Information
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(2)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Department"
                        value={form.department}
                      />

                      <InfoItem
                        label="Job Title"
                        value={form.position}
                      />

                      <InfoItem
                        label="Employment Type"
                        value={form.employmentType}
                      />

                      <InfoItem
                        label="Status"
                        value={form.status}
                      />

                      <InfoItem
                        label="Join Date"
                        value={formatDate(form.hireDate)}
                      />

                      <InfoItem
                        label="Notes"
                        value={form.notes}
                      />

                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Compensation
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(3)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Basic Salary"
                        value={`ETB ${formatCurrency(
                          form.basicSalary,
                        )}`}
                      />

                      <InfoItem
                        label="Transport Allowance"
                        value={`ETB ${formatCurrency(
                          form.transportAllowance,
                        )}`}
                      />

                      <InfoItem
                        label="Housing Allowance"
                        value={`ETB ${formatCurrency(
                          form.housingAllowance,
                        )}`}
                      />

                      <InfoItem
                        label="Meal Allowance"
                        value={`ETB ${formatCurrency(
                          form.mealAllowance,
                        )}`}
                      />

                      <InfoItem
                        label="Other Allowance"
                        value={`ETB ${formatCurrency(
                          form.otherAllowance,
                        )}`}
                      />

                    </div>
                  </div>

                  {/* Payroll */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Payroll Information
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(3)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Bank Name"
                        value={form.bankName}
                      />

                      <InfoItem
                        label="Bank Account"
                        value={form.bankAccount}
                      />

                      <InfoItem
                        label="TIN"
                        value={form.tin}
                      />

                      <InfoItem
                        label="Pension / SSN ID"
                        value={form.pensionId}
                      />

                    </div>
                  </div>

                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <div className="flex gap-3">

                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#4755AE] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#4755AE] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? 'Adding Employee...'
                      : 'Add Employee'}
                  </button>
                )}

              </div>

            </div>
          </div>

        </form>
      </aside>

      <style>{`
        @keyframes addEmployeeStep {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-add-step {
          animation: addEmployeeStep 220ms ease-out;
        }
      `}</style>
    </div>
  )
}

/* =========================================================
   VIEW EMPLOYEE
========================================================= */

function EmployeeViewModal({
  employee,
  onClose,
}) {
  if (!employee) return null

  const name =
    getEmployeeName(employee)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Employee Directory
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Employee Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
          >
            <X size={19} />
          </button>

        </div>

        <div className="p-6">

          <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center">

            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#4755AE] text-xl font-bold text-white">
                {getInitials(employee)}
              </div>
            )}

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h3 className="text-xl font-bold text-slate-950">
                  {name}
                </h3>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                    employee.status,
                  )}`}
                >
                  {employee.status}
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                {employee.jobTitle ||
                  employee.position ||
                  'Employee'}
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                {getEmployeeId(employee)}
              </p>

            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">

            <InfoItem
              label="Department"
              value={employee.department}
            />

            <InfoItem
              label="Employment Type"
              value={employee.employmentType}
            />

            <InfoItem
              label="Date of Birth"
              value={formatDate(
                employee.dateOfBirth,
              )}
            />

            <InfoItem
              label="Date Joined"
              value={formatDate(
                employee.joinDate,
              )}
            />

            <InfoItem
              label="Email"
              value={employee.email}
            />

            <InfoItem
              label="Phone"
              value={employee.phone}
            />

            <InfoItem
              label="Basic Salary"
              value={`ETB ${formatCurrency(
                employee.basicSalary,
              )}`}
            />

            <InfoItem
              label="Bank"
              value={
                employee.bankName ||
                employee.bankAccount
                  ? `${employee.bankName || 'Bank'}${
                      employee.bankAccount
                        ? ` · ${employee.bankAccount}`
                        : ''
                    }`
                  : '—'
              }
            />

            <InfoItem
              label="TIN"
              value={employee.tin}
            />

            <InfoItem
              label="Pension / SSN ID"
              value={employee.pensionId}
            />

            <InfoItem
              label="Address"
              value={employee.address}
            />

            <InfoItem
              label="Emergency Contact"
              value={
                employee.emergencyContact
              }
            />

          </div>

          {employee.notes && (
            <div className="mt-5 rounded-2xl border border-slate-200 p-4">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Notes
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {employee.notes}
              </p>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">

      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-slate-800">
        {value || '—'}
      </p>

    </div>
  )
}

/* =========================================================
   EMPLOYEE CARD
========================================================= */

function EmployeeCard({
  employee,
  onEdit,
  onView,
  onDelete,
}) {
  const name =
    getEmployeeName(employee)

  const position =
    employee.jobTitle ||
    employee.position ||
    'Employee'

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">

          {employee.avatar ? (
            <img
              src={employee.avatar}
              alt={name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
              {getInitials(employee)}
            </div>
          )}

          <div className="min-w-0">

            <h3 className="truncate text-sm font-bold text-slate-900">
              {name}
            </h3>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {position}
            </p>

          </div>
        </div>

        <div className="relative">

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses(
              employee.status,
            )}`}
          >
            {employee.status}
          </span>

        </div>
      </div>

      <div className="mt-4">

        <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400">
          {getEmployeeId(employee)}
        </span>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">

        <div>

          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Department
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
            {employee.department || '—'}
          </p>

        </div>

        <div>

          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Date of Joining
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
            {formatDate(
              employee.joinDate,
            )}
          </p>

        </div>

      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2">

        <div className="flex min-w-0 items-center gap-2 border-b border-slate-200 py-2">

          <Mail
            size={14}
            className="shrink-0 text-slate-400"
          />

          <span className="truncate text-xs text-slate-600">
            {employee.email ||
              'No email'}
          </span>

        </div>

        <div className="flex min-w-0 items-center gap-2 py-2">

          <Phone
            size={14}
            className="shrink-0 text-slate-400"
          />

          <span className="truncate text-xs text-slate-600">
            {employee.phone ||
              'No phone'}
          </span>

        </div>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">

        <button
          type="button"
          onClick={() => onEdit(employee)}
          className="rounded-xl bg-blue-100 px-3 py-2.5 text-xs font-bold text-[#4755AE] transition hover:bg-blue-200"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onView(employee)}
          className="rounded-xl bg-[#4755AE] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#3d4998]"
        >
          View
        </button>

      </div>

      <button
        type="button"
        onClick={() => onDelete(employee)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={13} />
        Delete Employee
      </button>

    </article>
  )
}

function EmployeeTable({
  employees,
  onEdit,
  onView,
  onDelete,
  onQuickUpdate,
}) {
  const [editingRowId, setEditingRowId] = useState(null)
  const [draftEmployeeId, setDraftEmployeeId] = useState('')
  const [draftStatus, setDraftStatus] = useState('Active')
  const [savingRowId, setSavingRowId] = useState(null)

  const statusOptions = ['Active', 'On Leave', 'Resigned']

  function startRowEdit(employee) {
    setEditingRowId(employee.id)
    setDraftEmployeeId(getEmployeeId(employee))
    setDraftStatus(employee.status || employee.employmentStatus || 'Active')
  }

  function cancelRowEdit() {
    setEditingRowId(null)
    setDraftEmployeeId('')
    setDraftStatus('Active')
  }

  async function saveRowEdit(employee) {
    const nextEmployeeId = draftEmployeeId.trim()
    if (!nextEmployeeId) return

    setSavingRowId(employee.id)
    try {
      await onQuickUpdate(employee, {
        employeeId: nextEmployeeId,
        status: draftStatus,
        employmentStatus: draftStatus,
      })
      cancelRowEdit()
    } finally {
      setSavingRowId(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <div className="overflow-x-auto">
        <Table className="min-w-[980px] w-full border-collapse">
          <Table.Header>
            <Table.Row className="bg-slate-50/90">
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Job Title</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Join Date</Table.Head>
              <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {employees.map((employee) => {
              const name = getEmployeeName(employee)
              const position = employee.jobTitle || employee.position || 'Employee'

              return (
                <Table.Row key={employee.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                  <Table.Cell className="px-4 py-3.5">
                    <div className="flex min-w-[220px] items-center gap-3">
                      {employee.avatar ? (
                        <img src={employee.avatar} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                          {getInitials(employee)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                        <p className="truncate text-xs text-slate-400">{employee.email || 'No email'}</p>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="px-4 py-3.5">
                    {editingRowId === employee.id ? (
                      <input
                        value={draftEmployeeId}
                        onChange={(event) => setDraftEmployeeId(event.target.value)}
                        className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        aria-label={`Edit employee ID for ${name}`}
                      />
                    ) : (
                      <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        {getEmployeeId(employee)}
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="px-4 py-3.5 text-xs font-semibold text-slate-600">{employee.department || '—'}</Table.Cell>
                  <Table.Cell className="px-4 py-3.5 text-xs font-semibold text-slate-600">{position}</Table.Cell>
                  <Table.Cell className="px-4 py-3.5">
                    {editingRowId === employee.id ? (
                      <select
                        value={draftStatus}
                        onChange={(event) => setDraftStatus(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        aria-label={`Edit status for ${name}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses(employee.status)}`}>
                        {employee.status}
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatDate(employee.joinDate)}</Table.Cell>
                  <Table.Cell className="px-4 py-3.5">
                    <div className="flex justify-end gap-2">
                      {editingRowId === employee.id ? (
                        <>
                          <button type="button" onClick={() => saveRowEdit(employee)} disabled={savingRowId === employee.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                            {savingRowId === employee.id ? 'Saving...' : 'Save'}
                          </button>
                          <button type="button" onClick={cancelRowEdit} disabled={savingRowId === employee.id} className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startRowEdit(employee)} className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-bold text-[#4755AE] transition hover:bg-blue-100">Edit</button>
                          <button type="button" onClick={() => onView(employee)} className="rounded-lg bg-[#4755AE] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#3d4998]">View</button>
                          <button type="button" onClick={() => onDelete(employee)} className="rounded-lg px-2.5 py-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${name}`}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}

/* =========================================================
   EMPLOYEES PAGE
========================================================= */

export default function Employees() {
  const [employees, setEmployees] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [departmentFilter, setDepartmentFilter] =
    useState('All')

  const [statusFilter, setStatusFilter] =
    useState('All')

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editingEmployee, setEditingEmployee] =
    useState(null)

  const [viewEmployee, setViewEmployee] =
    useState(null)

  const [activeSummaryCard, setActiveSummaryCard] =
    useState(null)

  const [directoryView, setDirectoryView] =
    useState('card')

  async function loadEmployees() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}/employees`,
        {
          cache: 'no-store',
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Unable to load employees.',
        )
      }

      setEmployees(
        Array.isArray(data)
          ? data.map(normalizeEmployee)
          : [],
      )
    } catch (err) {
      console.error(
        'Load employees error:',
        err,
      )

      setError(
        err.message ||
          'Unable to load employees.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const departments = useMemo(() => {
    const values = [
      ...DEFAULT_DEPARTMENTS,

      ...employees
        .map(
          (employee) =>
            employee.department,
        )
        .filter(Boolean),
    ]

    return Array.from(
      new Set(values),
    )
  }, [employees])

  const filteredEmployees =
    useMemo(() => {
      const query =
        search.trim().toLowerCase()

      return employees.filter(
        (employee) => {
          const name =
            getEmployeeName(
              employee,
            ).toLowerCase()

          const employeeId =
            String(
              getEmployeeId(employee),
            ).toLowerCase()

          const email =
            String(
              employee.email || '',
            ).toLowerCase()

          const position =
            String(
              employee.position ||
                employee.jobTitle ||
                '',
            ).toLowerCase()

          const matchesSearch =
            !query ||
            name.includes(query) ||
            employeeId.includes(query) ||
            email.includes(query) ||
            position.includes(query)

          const matchesDepartment =
            departmentFilter ===
              'All' ||
            employee.department ===
              departmentFilter

          const matchesStatus =
            statusFilter === 'All' ||
            employee.status ===
              statusFilter

          return (
            matchesSearch &&
            matchesDepartment &&
            matchesStatus
          )
        },
      )
    }, [
      employees,
      search,
      departmentFilter,
      statusFilter,
    ])

  const activeCount =
    employees.filter(
      (employee) =>
        employee.status === 'Active',
    ).length

  const onLeaveCount =
    employees.filter(
      (employee) =>
        employee.status ===
        'On Leave',
    ).length

  const resignedCount =
    employees.filter(
      (employee) =>
        employee.status ===
        'Resigned',
    ).length

  function openAddModal() {
    setError('')
    setSuccessMessage('')
    setEditingEmployee(null)
    setModalOpen(true)
  }

  function openEditModal(employee) {
    setError('')
    setSuccessMessage('')
    setEditingEmployee(employee)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingEmployee(null)
  }

  async function handleSave(
    employeeData,
  ) {
    try {
      setSaving(true)
      setError('')
      setSuccessMessage('')

      const employeeId =
        employeeData.employeeId?.trim()

      if (!employeeId) {
        throw new Error(
          'Employee ID is required.',
        )
      }

      const databaseId =
        editingEmployee?.id ||
        employeeData.id ||
        employeeId

      const payload = {
        id: databaseId,

        employeeId,

        name:
          employeeData.name ||
          'Unnamed Employee',

        gender:
          employeeData.gender ||
          'Male',

        dateOfBirth:
          employeeData.dateOfBirth ||
          '',

        joinDate:
          employeeData.joinDate ||
          employeeData.hireDate ||
          '',

        jobTitle:
          employeeData.jobTitle ||
          employeeData.position ||
          '',

        department:
          employeeData.department ||
          'HR',

        employmentType:
          employeeData.employmentType ||
          'Permanent',

        basicSalary:
          Number(
            employeeData.basicSalary || 0,
          ),

        transportAllowance:
          Number(
            employeeData.transportAllowance ||
              0,
          ),

        housingAllowance:
          Number(
            employeeData.housingAllowance ||
              0,
          ),

        mealAllowance:
          Number(
            employeeData.mealAllowance ||
              0,
          ),

        otherAllowance:
          Number(
            employeeData.otherAllowance ||
              0,
          ),

        otherDeductions:
          Number(
            employeeData.otherDeductions ||
              0,
          ),

        loanDeductions:
          Number(
            employeeData.loanDeductions ||
              0,
          ),

        bankName:
          employeeData.bankName || '',

        bankAccount:
          employeeData.bankAccount || '',

        tin:
          employeeData.tin || '',

        pensionId:
          employeeData.pensionId || '',

        phone:
          employeeData.phone || '',

        email:
          employeeData.email || '',

        address:
          employeeData.address || '',

        emergencyContact:
          employeeData.emergencyContact ||
          '',

        employmentStatus:
          employeeData.employmentStatus ||
          employeeData.status ||
          'Active',

        notes:
          employeeData.notes || '',

        status:
          employeeData.status ||
          employeeData.employmentStatus ||
          'Active',

        avatar:
          employeeData.avatar || '',

        location:
          employeeData.location || '',

        salary:
          Number(
            employeeData.salary ||
              employeeData.basicSalary ||
              0,
          ),

        manager:
          employeeData.manager || '',

        roleType:
          employeeData.roleType || '',

        initials:
          employeeData.initials ||
          getInitials(employeeData),
      }

      const isEditing =
        Boolean(editingEmployee)

      const url = isEditing
        ? `${API_URL}/employees/${editingEmployee.id}`
        : `${API_URL}/employees`

      const response = await fetch(
        url,
        {
          method: isEditing
            ? 'PUT'
            : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            payload,
          ),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (response.status === 409
              ? 'Employee ID already exists.'
              : 'Failed to save employee.'),
        )
      }

      const savedEmployee =
        normalizeEmployee(data)

      setEmployees(
        (current) => {
          if (isEditing) {
            return current.map(
              (employee) =>
                employee.id ===
                editingEmployee.id
                  ? savedEmployee
                  : employee,
            )
          }

          return [
            ...current,
            savedEmployee,
          ]
        },
      )

      setSuccessMessage(
        isEditing
          ? 'Employee updated successfully.'
          : 'Employee added successfully.',
      )

      setModalOpen(false)
      setEditingEmployee(null)

      await loadEmployees()
    } catch (err) {
      console.error(
        'Save employee error:',
        err,
      )

      setError(
        err.message ||
          'Unable to save employee.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickTableUpdate(employee, changes) {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(`${API_URL}/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to update employee.')
      }

      const updatedEmployee = normalizeEmployee(data)

      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id ? updatedEmployee : item,
        ),
      )

      setSuccessMessage('Employee ID and employment status updated successfully.')
    } catch (err) {
      console.error('Quick employee update error:', err)
      setError(err.message || 'Unable to update employee.')
      throw err
    }
  }

  async function handleDelete(
    employee,
  ) {
    const name =
      getEmployeeName(employee)

    const employeeId =
      getEmployeeId(employee)

    const confirmed =
      window.confirm(
        `Delete ${name} (${employeeId})? This action cannot be undone.`,
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(
        `${API_URL}/employees/${employee.id}`,
        {
          method: 'DELETE',
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Failed to delete employee.',
        )
      }

      setEmployees(
        (current) =>
          current.filter(
            (item) =>
              item.id !== employee.id,
          ),
      )

      setSuccessMessage(
        'Employee deleted successfully.',
      )
    } catch (err) {
      console.error(
        'Delete employee error:',
        err,
      )

      setError(
        err.message ||
          'Unable to delete employee.',
      )
    }
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">

      <main className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">

        {/* Header */}
        <header className="animate-employee-hero mb-8 flex flex-col justify-between gap-5 bg-[#F3F4F6] px-6 py-2 sm:px-10 sm:py-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-base font-medium tracking-normal text-cyan-600">
                Employee Management
              </p>
              <h1 className="mt-1 text-[36px] font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-[40px]">
                Manage Your Team
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View, add, edit and manage all employees in your organization.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="animate-add-employee-button flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
          >
            <UserPlus size={18} />
            Add Employee
          </button>
        </header>

        {/* Summary */}
        <section className="animate-employee-summary mb-9 grid gap-4 bg-[#F3F4F6] p-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: 'total', title: 'Total Employees', description: 'Employees in the company', value: employees.length, icon: Users, iconClass: 'bg-blue-100 text-blue-600' },
            { key: 'active', title: 'Active Employees', description: 'Currently working', value: activeCount, icon: Users, iconClass: 'bg-emerald-100 text-emerald-600' },
            { key: 'leave', title: 'On Leave', description: 'Currently on leave', value: onLeaveCount, icon: BriefcaseBusiness, iconClass: 'bg-orange-100 text-orange-600' },
            { key: 'resigned', title: 'Resigned', description: 'Left the company', value: resignedCount, icon: UserPlus, iconClass: 'bg-violet-100 text-violet-600' },
          ].map((stat, statIndex) => {
            const StatIcon = stat.icon
            const avatarEmployees = employees.slice(0, 4)
            const avatarColors = [
              'bg-sky-100 text-sky-700',
              'bg-rose-100 text-rose-700',
              'bg-emerald-100 text-emerald-700',
              'bg-violet-100 text-violet-700',
            ]

            return (
              <div
                key={stat.key}
                className={`animate-employee-stat group relative overflow-hidden rounded-[18px] border border-slate-200/80 bg-[#E8F1F9] p-5 shadow-[0_3px_14px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)] ${activeSummaryCard === stat.key ? 'animate-employee-stat-click' : ''}`}
                style={{ animationDelay: `${statIndex * 120}ms` }}
                onClick={() => {
                  setActiveSummaryCard(stat.key)
                  window.setTimeout(() => setActiveSummaryCard(null), 700)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${stat.iconClass}`}>
                    <StatIcon size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/60 text-slate-500 shadow-sm ring-1 ring-slate-200/60 transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight size={17} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-800">{stat.title}</p>
                  <p className="mt-1 text-[12px] font-medium text-slate-400">{stat.description}</p>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">People</p>
                    <p className="mt-0.5 text-[27px] font-bold leading-none tracking-tight text-slate-950">
                      <AnimatedStatNumber value={stat.value} />
                    </p>
                  </div>
                  {avatarEmployees.length > 0 && (
                    <div className="flex items-center pb-0.5 pl-2">
                      {avatarEmployees.slice(0, 3).map((employee, index) => {
                        const initials = employee?.initials || employee?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EM'
                        return (
                          <div
                            key={employee?.id || employee?.employeeId || index}
                            className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[8px] font-bold ${index > 0 ? '-ml-2' : ''} ${avatarColors[index % avatarColors.length]}`}
                            title={employee?.name || 'Employee'}
                          >
                            {employee?.photo || employee?.profileImage || employee?.avatar ? (
                              <img src={employee.photo || employee.profileImage || employee.avatar} alt="" className="h-full w-full object-cover" />
                            ) : initials}
                          </div>
                        )
                      })}
                      {employees.length > 3 && (
                        <span className="-ml-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-white/80 px-1.5 text-[9px] font-bold text-slate-500 shadow-sm">
                          +{Math.max(employees.length - 3, 0)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {/* Search + Filters */}
        <section className="animate-employee-search mb-8 rounded-2xl bg-[#F3F4F6] p-0">

          <div className="grid gap-3 lg:grid-cols-[1fr_220px_200px]">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search employees..."
                className="animate-employee-search-input w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#4755AE] focus:bg-white focus:ring-2 focus:ring-[#4755AE]/10"
              />

            </div>

            <div className="relative">

              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-[#4755AE]"
              >

                <option value="All">
                  All Departments
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department}
                      value={department}
                    >
                      {department}
                    </option>
                  ),
                )}

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
                  setStatusFilter(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-[#4755AE]"
              >

                <option value="All">
                  All Statuses
                </option>

                {STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}

              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

            </div>

          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

        {/* Directory */}
        <section>

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Employee Directory
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Showing{' '}
                {filteredEmployees.length}{' '}
                of {employees.length}{' '}
                employees
              </p>

            </div>

            <div className="flex items-center gap-3">

              <div className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70">
                <button
                  type="button"
                  onClick={() => setDirectoryView('table')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    directoryView === 'table'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Table2 size={15} />
                  Table
                </button>

                <button
                  type="button"
                  onClick={() => setDirectoryView('card')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    directoryView === 'card'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid size={15} />
                  Card
                </button>
              </div>

              <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Database connected
              </div>

            </div>

          </div>

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

              <div className="text-center">

                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#4755AE]" />

                <p className="mt-4 text-sm font-medium text-slate-500">
                  Loading employees...
                </p>

              </div>

            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users size={24} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800">
                No employees found
              </h3>

              <p className="mt-1 max-w-md text-xs text-slate-400">
                Try changing your search or filters,
                or add a new employee.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 flex items-center gap-2 rounded-xl bg-[#4755AE] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#3d4998]"
              >
                <UserPlus size={15} />
                Add Employee
              </button>

            </div>
          ) : (
            directoryView === 'table' ? (
              <EmployeeTable
                employees={filteredEmployees}
                onEdit={openEditModal}
                onView={setViewEmployee}
                onDelete={handleDelete}
                onQuickUpdate={handleQuickTableUpdate}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {filteredEmployees.map(
                  (employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      onEdit={openEditModal}
                      onView={setViewEmployee}
                      onDelete={handleDelete}
                    />
                  ),
                )}
              </div>
            )
          )}

        </section>

      </main>

      {/* ADD = NEW DRAWER
          EDIT = ORIGINAL MODAL */}
      {modalOpen && (
        editingEmployee ? (
          <EmployeeModal
            employee={editingEmployee}
            departments={departments}
            onClose={closeModal}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <AddEmployeeDrawer
            departments={departments}
            onClose={closeModal}
            onSave={handleSave}
            saving={saving}
          />
        )
      )}

      {viewEmployee && (
        <EmployeeViewModal
          employee={viewEmployee}
          onClose={() =>
            setViewEmployee(null)
          }
        />
      )}

      <style>{`
        @keyframes employeeHeroIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes employeeButtonIn {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          60% {
            opacity: 1;
            transform: translateY(2px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes employeeButtonGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(71, 85, 174, 0);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(71, 85, 174, 0.08);
          }
        }

        @keyframes employeeStatIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes employeeStatClick {
          0% {
            transform: translateY(0) scale(1);
          }
          35% {
            transform: translateY(-7px) scale(1.012);
          }
          65% {
            transform: translateY(-4px) scale(1.006);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        .animate-employee-stat-click {
          animation: employeeStatClick 700ms cubic-bezier(.22, 1, .36, 1);
        }

        @keyframes employeeSearchIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes employeeSearchFieldIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-employee-hero {
          animation: employeeHeroIn 420ms ease-out both;
        }

        .animate-add-employee-button {
          animation:
            employeeButtonIn 500ms cubic-bezier(.22, 1, .36, 1) both,
            employeeButtonGlow 2.8s ease-in-out 700ms infinite;
        }

        .animate-employee-stat {
          opacity: 0;
          animation: employeeStatIn 420ms cubic-bezier(.22, 1, .36, 1) both;
        }

        .animate-employee-search {
          animation: employeeSearchIn 480ms ease-out 180ms both;
        }

        .animate-employee-search-input {
          animation: employeeSearchFieldIn 420ms ease-out 300ms both;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-employee-hero,
          .animate-add-employee-button,
          .animate-employee-stat,
          .animate-employee-search,
          .animate-employee-search-input {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

    </div>
  )
}