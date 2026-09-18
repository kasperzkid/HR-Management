import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  UserPlus,
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building,
  DollarSign,
  CreditCard,
  FileText,
  UploadCloud,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MapPin,
  HeartHandshake,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react'
import { HR_SETTINGS } from '../data/settingsData'
import { lookupTax, isExempt } from '../lib/payroll'

const ETHIOPIAN_BANKS = [
  'Commercial Bank of Ethiopia',
  'Awash Bank',
  'Dashen Bank',
  'Bank of Abyssinia',
  'Wegagen Bank',
  'Zemen Bank',
  'Nib International Bank',
  'Hibret Bank',
  'Cooperative Bank of Oromia',
  'Oromia International Bank',
  'Berhan Bank',
  'Bunna International Bank',
  'Other',
]

function generateNextId(existingEmployees = []) {
  const nums = existingEmployees
    .map((e) => {
      const m = e.employeeId?.match(/EMP-(\d+)/i)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => !isNaN(n) && n > 0)
  const max = nums.length > 0 ? Math.max(...nums) : 8
  return `EMP-${String(max + 1).padStart(3, '0')}`
}

export default function AddEmployeeModal({ isOpen, onClose, onSave, existingEmployees = [] }) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const initialForm = useMemo(
    () => ({
      // 1. Identification & Personal
      employeeId: generateNextId(existingEmployees),
      name: '',
      gender: 'Female',
      dateOfBirth: '',
      phone: '',
      email: '',
      address: '',
      emergencyContact: '',

      // 2. Job & Employment
      jobTitle: '',
      department: HR_SETTINGS.departments[0] || 'Human Resources',
      employmentType: 'Permanent',
      employmentStatus: 'Active',
      joinDate: todayStr,
      exitDate: '',

      // 3. Compensation & Allowances
      basicSalary: '',
      transportAllowance: '2500',
      housingAllowance: '3500',
      mealAllowance: '1800',
      otherAllowance: '0',

      // 4. Banking & Statutory Tax
      bankName: 'Commercial Bank of Ethiopia',
      bankAccount: '',
      tin: '',
      pensionId: '',

      certificates: [],
      cv: [],

      // 5. Notes
      notes: '',
    }),
    [existingEmployees, todayStr]
  )

  const [formData, setFormData] = useState(initialForm)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'personal' | 'job' | 'compensation' | 'banking'
  const [errors, setErrors] = useState({})

  // Re-sync default Employee ID whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialForm,
        employeeId: generateNextId(existingEmployees),
      })
      setErrors({})
    }
  }, [isOpen, initialForm, existingEmployees])

  if (!isOpen) return null

  // ─────────────────────────────────────────────────────────────
  // CONDITIONAL FIELD LOGIC:
  // Exit Date is hidden for "Permanent" employees unless status is Resigned/Terminated.
  // For "Contractual" and "Intern", Exit Date is displayed.
  // ─────────────────────────────────────────────────────────────
  const isPermanent = formData.employmentType === 'Permanent'
  const isExitedStatus = formData.employmentStatus === 'Resigned' || formData.employmentStatus === 'Terminated'
  const shouldShowExitDate = !isPermanent || isExitedStatus

  // ─────────────────────────────────────────────────────────────
  // LIVE STATUTORY & DATA CHECK COMPUTATIONS
  // ─────────────────────────────────────────────────────────────
  const basicSalaryNum = Math.max(0, Number(formData.basicSalary) || 0)
  const transportNum = Math.max(0, Number(formData.transportAllowance) || 0)
  const housingNum = Math.max(0, Number(formData.housingAllowance) || 0)
  const mealNum = Math.max(0, Number(formData.mealAllowance) || 0)
  const otherNum = Math.max(0, Number(formData.otherAllowance) || 0)
  const totalAllowances = transportNum + housingNum + mealNum + otherNum
  const grossMonthly = basicSalaryNum + totalAllowances

  const exempt = isExempt(formData.employmentType)
  const estIncomeTax = exempt ? 0 : lookupTax(grossMonthly)
  const estPensionEmp = exempt ? 0 : Math.round((basicSalaryNum * HR_SETTINGS.pension.employeeRate + Number.EPSILON) * 100) / 100
  const estPensionOrg = exempt ? 0 : Math.round((basicSalaryNum * HR_SETTINGS.pension.employerRate + Number.EPSILON) * 100) / 100
  const estNetSalary = Math.max(0, grossMonthly - estIncomeTax - estPensionEmp)

  // Data check validations
  const isDuplicateId = existingEmployees.some(
    (e) => e.employeeId?.trim().toLowerCase() === formData.employeeId?.trim().toLowerCase()
  )
  const isDuplicateTin =
    Boolean(formData.tin.trim()) &&
    existingEmployees.some((e) => e.tin && e.tin.trim().toLowerCase() === formData.tin.trim().toLowerCase())

  const hasName = Boolean(formData.name.trim())
  const hasJobTitle = Boolean(formData.jobTitle.trim())
  const hasValidSalary = basicSalaryNum > 0
  const hasTin = Boolean(formData.tin.trim())
  const hasBankAccount = Boolean(formData.bankAccount.trim())
  const hasExitDateWhenNeeded = !shouldShowExitDate || Boolean(formData.exitDate)

  // Overall Data Check Status
  const criticalIssues = []
  if (!formData.employeeId.trim()) criticalIssues.push('Employee ID is required')
  if (isDuplicateId) criticalIssues.push('Employee ID is already in use')
  if (!hasName) criticalIssues.push('Full Name is required')
  if (!hasJobTitle) criticalIssues.push('Job Title is required')
  if (!hasValidSalary) criticalIssues.push('Basic Monthly Salary must be greater than 0')

  const auditWarnings = []
  if (!hasTin) auditWarnings.push('Missing TIN (Will trigger audit review per Proc. 1395/2025)')
  if (isDuplicateTin) auditWarnings.push('Duplicate TIN detected across directory')
  if (!hasBankAccount) auditWarnings.push('Missing Bank Account (Required for direct deposit)')
  if (shouldShowExitDate && !formData.exitDate) {
    auditWarnings.push(`Missing Exit Date for ${formData.employmentType} / ${formData.employmentStatus}`)
  }

  let dataCheckBadge = {
    status: 'OK',
    label: 'Data Check: OK (Audit Ready)',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
  }

  if (criticalIssues.length > 0) {
    dataCheckBadge = {
      status: 'INVALID',
      label: `Data Check: Incomplete (${criticalIssues.length} required missing)`,
      color: 'bg-rose-50 text-rose-800 border-rose-300',
      icon: AlertCircle,
    }
  } else if (auditWarnings.length > 0) {
    dataCheckBadge = {
      status: 'REVIEW',
      label: `Data Check: Needs Review (${auditWarnings.length} statutory warning${auditWarnings.length > 1 ? 's' : ''})`,
      color: 'bg-amber-50 text-amber-900 border-amber-300',
      icon: AlertTriangle,
    }
  }

  const handleChange = (field, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val }
      // If switching to Permanent and status is Active, clear exit date
      if (field === 'employmentType' && val === 'Permanent' && updated.employmentStatus === 'Active') {
        updated.exitDate = ''
      }
      return updated
    })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  const handleFileChange = (field, e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (field === 'cv') {
      setFormData((prev) => ({ ...prev, cv: [files[0]] }))
    } else {
      setFormData((prev) => ({ ...prev, certificates: [...prev.certificates, ...files] }))
    }
    e.target.value = ''
  }

  const removeFile = (field, index) => {
    setFormData((prev) => {
      const list = [...prev[field]]
      list.splice(index, 1)
      return { ...prev, [field]: list }
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!formData.employeeId.trim()) newErrors.employeeId = 'Employee ID is required'
    if (isDuplicateId) newErrors.employeeId = 'Employee ID is already in use'
    if (!formData.name.trim()) newErrors.name = 'Full Name is required'
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job Title is required'
    if (!formData.department) newErrors.department = 'Department is required'
    if (!basicSalaryNum || basicSalaryNum <= 0) newErrors.basicSalary = 'Basic salary must be greater than 0'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const payload = {
      id: `emp-${Date.now()}`,
      employeeId: formData.employeeId.trim(),
      name: formData.name.trim(),
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || null,
      joinDate: formData.joinDate || todayStr,
      jobTitle: formData.jobTitle.trim(),
      department: formData.department,
      employmentType: formData.employmentType,
      basicSalary: basicSalaryNum,
      transportAllowance: transportNum,
      housingAllowance: housingNum,
      mealAllowance: mealNum,
      otherAllowance: otherNum,
      otherDeductions: 0,
      loanDeductions: 0,
      bankName: formData.bankName || 'Commercial Bank of Ethiopia',
      bankAccount: formData.bankAccount.trim(),
      tin: formData.tin.trim(),
      pensionId: formData.pensionId.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      emergencyContact: formData.emergencyContact.trim(),
      employmentStatus: formData.employmentStatus,
      exitDate: shouldShowExitDate && formData.exitDate ? formData.exitDate : null,
      certificates: formData.certificates.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified,
      })),
      cv: formData.cv.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified,
      })),
      notes: formData.notes.trim(),
      dataCheck: dataCheckBadge.status,
      dataCheckWarnings: auditWarnings,
    }

    onSave(payload)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-employee-title"
    >
      <div className="bg-white dark:bg-[#15181d] rounded-2xl shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-[#262b31] w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* ─────────────────────────────────────────────────────────────
            MODAL HEADER
           ───────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#262b31] bg-gradient-to-r from-gray-50 dark:from-[#1c2026] via-white dark:via-[#15181d] to-gray-50 dark:to-[#1c2026] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center shadow-xs shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="add-employee-title" className="text-base font-black text-gray-950 dark:text-gray-100">
                  New Employee Registration
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-[#1c2026] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
                  HR &amp; Payroll Master
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Onboard employee record with Ethiopian statutory tax compliance, allowances &amp; data checks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#1c2026] rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            LIVE DATA CHECK & COMPLIANCE BANNER
           ───────────────────────────────────────────────────────────── */}
        <div className="px-6 py-2.5 bg-gray-50 dark:bg-[#1c2026] border-b border-gray-200/80 dark:border-[#262b31] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700 dark:text-gray-300">Audit Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${dataCheckBadge.color}`}
            >
              <dataCheckBadge.icon size={13} />
              {dataCheckBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-gray-600 dark:text-gray-400 font-mono">
            <span>
              Est. Gross:{' '}
              <strong className="text-gray-900 dark:text-gray-100 font-bold">
                ETB {grossMonthly.toLocaleString()}
              </strong>
            </span>
            <span>
              Est. Net:{' '}
              <strong className="text-emerald-700 font-bold">
                ETB {estNetSalary.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            FORM BODY (Scrollable)
           ───────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Section 1: Identification & Personal Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
              <User size={15} className="text-gray-900 dark:text-gray-100" />
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                1. Identification &amp; Personal Info
              </h4>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                (Fields marked <span className="text-rose-600 font-bold">*</span> are required; others can be edited later)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Employee ID */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Employee ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  className={`w-full px-3 py-2 font-mono text-xs rounded-lg border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                    errors.employeeId || isDuplicateId
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
                  }`}
                  placeholder="EMP-009"
                />
                {isDuplicateId && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> ID already assigned to another employee
                  </p>
                )}
                {errors.employeeId && !isDuplicateId && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.employeeId}</p>
                )}
              </div>

              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Almaz Bekele Kebede"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                    errors.name ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
                  }`}
                />
                {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Gender */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Gender</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other / Unspecified</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Date of Birth</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Phone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Phone</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="tel"
                  placeholder="+251 911 234 567"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Email</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="email"
                  placeholder="employee@yanol.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Address</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Bole Sub-City, Addis Ababa"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Emergency Contact</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="text"
                  placeholder="+251 911 000 111 (Name/Relation)"
                  value={formData.emergencyContact}
                  onChange={(e) => handleChange('emergencyContact', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Job & Employment Details */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
              <Briefcase size={15} className="text-gray-900 dark:text-gray-100" />
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                2. Job &amp; Employment Details
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Department */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Department <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                >
                  {HR_SETTINGS.departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Title */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Job Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Operations Officer"
                  value={formData.jobTitle}
                  onChange={(e) => handleChange('jobTitle', e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                    errors.jobTitle ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
                  }`}
                />
                {errors.jobTitle && <p className="text-[11px] text-rose-600 mt-1">{errors.jobTitle}</p>}
              </div>

              {/* Employment Type */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Employment Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => handleChange('employmentType', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-medium"
                >
                  {HR_SETTINGS.employmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  {formData.employmentType === 'Permanent'
                    ? 'Permanent role (No Exit Date required)'
                    : `${formData.employmentType} role requires an Exit / Contract End Date`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Employment Status */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Employment Status <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => handleChange('employmentStatus', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-medium"
                >
                  {HR_SETTINGS.employmentStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Join Date */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Join Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.joinDate}
                  onChange={(e) => handleChange('joinDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Exit Date — Dynamically shown for Contractual, Intern, or Resigned/Terminated */}
              {shouldShowExitDate ? (
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span>Exit Date</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded">
                        {formData.employmentType !== 'Permanent'
                          ? `${formData.employmentType} End`
                          : formData.employmentStatus}
                      </span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-medium">Expected</span>
                  </div>
                  <input
                    type="date"
                    value={formData.exitDate}
                    onChange={(e) => handleChange('exitDate', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-400/40 bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">
                    {formData.employmentType !== 'Permanent'
                      ? `Contract duration endpoint for ${formData.employmentType}`
                      : `Statutory exit date for ${formData.employmentStatus} record`}
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1c2026] border border-dashed border-gray-200 dark:border-[#262b31] flex flex-col justify-center text-gray-400 dark:text-gray-500">
                  <span className="font-semibold text-[11px] text-gray-500 dark:text-gray-400">Exit Date: N/A</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    Not applicable for Permanent staff (enabled on Contractual, Intern, or Resigned/Terminated)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Compensation & Allowances */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
              <div className="flex items-center gap-2">
                <DollarSign size={15} className="text-gray-900 dark:text-gray-100" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                  3. Compensation &amp; Allowances (ETB)
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-400">
                Total Monthly Gross: ETB {grossMonthly.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Basic Salary */}
              <div className="sm:col-span-1">
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Basic Salary <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    placeholder="e.g. 30000"
                    value={formData.basicSalary}
                    onChange={(e) => handleChange('basicSalary', e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 font-mono font-semibold ${
                      errors.basicSalary
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
                    }`}
                  />
                </div>
                {errors.basicSalary && <p className="text-[11px] text-rose-600 mt-1">{errors.basicSalary}</p>}
              </div>

              {/* Transport Allowance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200 truncate">Transport Allow.</label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={formData.transportAllowance}
                  onChange={(e) => handleChange('transportAllowance', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-mono"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">Optional</span>
              </div>

              {/* Housing Allowance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200 truncate">Housing Allow.</label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={formData.housingAllowance}
                  onChange={(e) => handleChange('housingAllowance', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-mono"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">Optional</span>
              </div>

              {/* Meal Allowance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200 truncate">Meal Allow.</label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={formData.mealAllowance}
                  onChange={(e) => handleChange('mealAllowance', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-mono"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">Optional</span>
              </div>

              {/* Other Allowance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200 truncate">Other Allow.</label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={formData.otherAllowance}
                  onChange={(e) => handleChange('otherAllowance', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-mono"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">Optional</span>
              </div>
            </div>
          </div>

          {/* Section 4: Banking & Statutory Tax */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-gray-900 dark:text-gray-100" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                  4. Banking &amp; Statutory Identification
                </h4>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Can be entered now or updated later</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Bank Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Bank Name</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <select
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
                >
                  {ETHIOPIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank Account Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Bank Account No.</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="text"
                  placeholder="1000123456781"
                  value={formData.bankAccount}
                  onChange={(e) => handleChange('bankAccount', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-mono"
                />
                {!hasBankAccount && (
                  <span className="text-[10px] text-amber-600 mt-1 block">
                    Will show &quot;Missing Bank&quot; audit check
                  </span>
                )}
              </div>

              {/* Tax Identification Number (TIN) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">TIN</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="text"
                  placeholder="TIN-40019290"
                  value={formData.tin}
                  onChange={(e) => handleChange('tin', e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 font-mono ${
                    isDuplicateTin ? 'border-rose-400 bg-rose-50/40' : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
                  }`}
                />
                {isDuplicateTin ? (
                  <span className="text-[10px] text-rose-600 mt-1 block">Duplicate TIN detected</span>
                ) : !hasTin ? (
                  <span className="text-[10px] text-amber-600 mt-1 block">
                    Will show &quot;Missing TIN&quot; audit check
                  </span>
                ) : null}
              </div>

              {/* Pension ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 dark:text-gray-200">Pension ID</label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
                </div>
                <input
                  type="text"
                  placeholder="PEN-00109"
                  value={formData.pensionId}
                  onChange={(e) => handleChange('pensionId', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Certificates & CV Documents */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
              <div className="flex items-center gap-2">
                <UploadCloud size={15} className="text-gray-900 dark:text-gray-100" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                  5. Certificates &amp; CV Documents
                </h4>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CV Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  Curriculum Vitae (CV)
                </label>
                {formData.cv.length === 0 ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-[#33383f] rounded-xl cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50/50 dark:bg-[#1c2026] transition-colors">
                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Upload CV (PDF, DOC)</span>
                    <span className="text-[10px] text-gray-400">Max file size 10MB</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleFileChange('cv', e)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={16} className="text-blue-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                          {formData.cv[0].name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatFileSize(formData.cv[0].size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('cv', 0)}
                      className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                      title="Remove CV"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Certificates Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                    Certificates &amp; Credentials
                  </label>
                  <span className="text-[10px] text-gray-400">Multiple allowed</span>
                </div>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-[#33383f] rounded-xl cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50/50 dark:bg-[#1c2026] transition-colors">
                  <UploadCloud size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Add Certificates</span>
                  <span className="text-[10px] text-gray-400">PDF, Images, etc.</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="hidden"
                    onChange={(e) => handleFileChange('certificates', e)}
                  />
                </label>
              </div>
            </div>

            {/* Certificates List */}
            {formData.certificates.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                  Uploaded Certificates ({formData.certificates.length})
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {formData.certificates.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={15} className="text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile('certificates', idx)}
                        className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                        title="Remove Certificate"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Notes */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-gray-900 dark:text-gray-100" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                  6. Notes &amp; Remarks
                </h4>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
            </div>
            <textarea
              rows={2}
              placeholder="Internal HR onboarding notes, probation clauses, equipment assigned, or special conditions..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Section 7: Data Check & Statutory Audit Summary Box */}
          <div className="pt-2">
            <div className="rounded-xl border border-gray-200 dark:border-[#262b31] bg-gray-50/80 dark:bg-[#1c2026] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-gray-900 dark:text-gray-100" />
                  <span className="text-xs font-bold text-gray-950 dark:text-gray-100">
                    7. Data Check &amp; Statutory Audit Preview
                  </span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${dataCheckBadge.color}`}>
                  {dataCheckBadge.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white dark:bg-[#15181d] p-2.5 rounded-lg border border-gray-200 dark:border-[#262b31]">
                  <span className="text-gray-500 dark:text-gray-400 block">ID Validation</span>
                  <span
                    className={`font-bold inline-flex items-center gap-1 mt-0.5 ${
                      !formData.employeeId || isDuplicateId ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {!formData.employeeId || isDuplicateId ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                    {isDuplicateId ? 'Duplicate' : formData.employeeId ? 'Unique & Valid' : 'Missing'}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#15181d] p-2.5 rounded-lg border border-gray-200 dark:border-[#262b31]">
                  <span className="text-gray-500 dark:text-gray-400 block">TIN Status</span>
                  <span
                    className={`font-bold inline-flex items-center gap-1 mt-0.5 ${
                      hasTin ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {hasTin ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {hasTin ? 'Provided' : 'Missing (Audit Flag)'}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#15181d] p-2.5 rounded-lg border border-gray-200 dark:border-[#262b31]">
                  <span className="text-gray-500 dark:text-gray-400 block">Bank Account</span>
                  <span
                    className={`font-bold inline-flex items-center gap-1 mt-0.5 ${
                      hasBankAccount ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {hasBankAccount ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {hasBankAccount ? 'Provided' : 'Missing (Payroll Flag)'}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#15181d] p-2.5 rounded-lg border border-gray-200 dark:border-[#262b31]">
                  <span className="text-gray-500 dark:text-gray-400 block">Exit Date Rule</span>
                  <span
                    className={`font-bold inline-flex items-center gap-1 mt-0.5 ${
                      !shouldShowExitDate
                        ? 'text-gray-600 dark:text-gray-400'
                        : formData.exitDate
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {!shouldShowExitDate ? (
                      <CheckCircle2 size={12} className="text-gray-400 dark:text-gray-500" />
                    ) : formData.exitDate ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertTriangle size={12} />
                    )}
                    {!shouldShowExitDate ? 'Permanent (N/A)' : formData.exitDate ? 'Set' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Statutory deductions preview row */}
              <div className="pt-2 border-t border-gray-200/60 dark:border-[#262b31] flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-600 dark:text-gray-400">
                <span>
                  Basic: <strong>ETB {basicSalaryNum.toLocaleString()}</strong>
                </span>
                <span>
                  Total Allowances: <strong>ETB {totalAllowances.toLocaleString()}</strong>
                </span>
                <span>
                  Tax Rate:{' '}
                  <strong>{exempt ? 'Exempt (0%)' : `Proc. 1395/2025 (ETB ${estIncomeTax.toLocaleString()})`}</strong>
                </span>
                <span>
                  Pension (7% + 11%):{' '}
                  <strong>
                    {exempt
                      ? 'Exempt (0%)'
                      : `ETB ${(estPensionEmp + estPensionOrg).toLocaleString()} (Proc. 715)`}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              FOOTER / ACTIONS
             ───────────────────────────────────────────────────────────── */}
          <div className="pt-4 border-t border-gray-200 dark:border-[#262b31] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center sm:text-left">
              Employee will immediately sync with Ethiopian statutory payroll, department headcount &amp; data checks.
            </p>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#15181d] hover:bg-gray-100 dark:hover:bg-[#1c2026] border border-gray-300 dark:border-[#33383f] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-gray-950 hover:bg-black dark:hover:bg-gray-600 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <UserPlus size={15} />
                <span>Save Employee</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
