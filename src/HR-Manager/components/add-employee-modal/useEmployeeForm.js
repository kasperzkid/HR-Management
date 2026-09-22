import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { HR_SETTINGS } from '../../data/settingsData'
import { lookupTax, isExempt } from '../../lib/payroll'
import { generateNextId } from './constants'
import { formatAge } from './formSections'
import { uploadEmployeeFile } from '../../../lib/hrApi'

// Compute DOB validity for audit warnings (DOB is optional, but implausible values get flagged)
export function dobStatus(dateStr) {
  if (!dateStr) return null
  const dob = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return { tone: 'invalid', text: 'Invalid date of birth' }
  const today = new Date()
  if (dob.getTime() > today.getTime()) return { tone: 'invalid', text: 'Date of birth is in the future' }
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
  const earliestLegal = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
  const maxSupported = new Date(today.getFullYear() - 75, today.getMonth(), today.getDate())
  if (dob.getTime() > earliestLegal.getTime())
    return { tone: 'warning', text: 'Age below 14 — implausible for employment' }
  if (dob.getTime() < maxSupported.getTime())
    return { tone: 'warning', text: 'Age over 75 — please verify the date' }
  return null
}

// Valid Ethiopian mobile prefix list (09X / +2519X)
const VALID_MOBILE_PREFIXES = [
  '90', '91', '92', '93', '94', '95', '96', '97', '98', '99',
]
const VALID_LANDLINE_PREFIXES = ['11', '22', '33', '34', '44', '46', '47', '57', '58']

const PHONE_COUNTRIES = [
  { code: '+251', maxDigits: 9 },
  { code: '+254', maxDigits: 9 },
  { code: '+255', maxDigits: 9 },
  { code: '+256', maxDigits: 9 },
  { code: '+252', maxDigits: 9 },
  { code: '+253', maxDigits: 8 },
  { code: '+211', maxDigits: 9 },
  { code: '+27', maxDigits: 9 },
  { code: '+20', maxDigits: 10 },
  { code: '+212', maxDigits: 9 },
  { code: '+1', maxDigits: 10 },
  { code: '+44', maxDigits: 10 },
  { code: '+971', maxDigits: 9 },
]

function fileFromUrl(url, name, type = '', size = 0) {
  return {
    name: name || String(url || '').split('/').pop() || 'document',
    size,
    type,
    lastModified: 0,
    url,
  }
}

async function uploadOrReuse(file) {
  if (!file) return null
  if (file.url) {
    return {
      url: file.url,
      name: file.name,
      type: file.type || '',
      size: file.size || 0,
    }
  }
  return uploadEmployeeFile(file)
}

// Validate a phone number (may carry a country code from the dropdown).
// Returns null if valid (or empty), or an error message string otherwise.
export function validatePhone(raw) {
  if (!raw || !raw.trim()) return null
  const clean = raw.replace(/[\s\-().]/g, '')
  if (!/^\+?[0-9]+$/.test(clean)) return 'Use digits only (e.g. +251 911 234 567)'

  const digits = clean.replace(/^\+/, '')

  // Known international code from the dropdown
  const country = PHONE_COUNTRIES.find((c) => digits.startsWith(c.code.slice(1)))
  if (country) {
    const national = digits.slice(country.code.length - 1)
    if (national.length > country.maxDigits) return `Number must be max ${country.maxDigits} digits`
    if (national.length < country.maxDigits) return `Enter the remaining ${country.maxDigits - national.length} digits`
    if (country.code === '+251') {
      const prefix = national.slice(0, 2)
      if (VALID_MOBILE_PREFIXES.includes(prefix)) return null
      if (VALID_LANDLINE_PREFIXES.includes(prefix.slice(0, 2))) return null
      return `"0${prefix}..." is not a valid Ethiopian area/mobile prefix`
    }
    return null
  }

  // Ethiopian local forms (0911..., 9...)
  let national = digits
  if (digits.length === 10 && digits.startsWith('0')) national = digits
  else if (digits.length === 9 && digits.startsWith('9')) national = '0' + digits
  else if (digits.startsWith('251') && digits.length === 12) national = '0' + digits.slice(3)
  else return 'Use Ethiopian format (e.g. +251 911 234 567 or 0911234567)'

  const prefix = national.slice(1, 3)
  if (VALID_MOBILE_PREFIXES.includes(prefix)) return null
  if (VALID_LANDLINE_PREFIXES.includes(prefix)) return null
  return `"0${prefix}..." is not a valid Ethiopian area/mobile prefix`
}

export function buildInitialForm({ editingEmployee, existingEmployees, todayStr }) {
  const identityFile = editingEmployee?.identityFrontUrl
    ? fileFromUrl(
      editingEmployee.identityFrontUrl,
      editingEmployee.identityFrontName,
      '',
      0,
    )
    : null
  const cvFile = editingEmployee?.cvUrl
    ? fileFromUrl(editingEmployee.cvUrl, editingEmployee.cvName, '', 0)
    : null
  const existingCertificates = Array.isArray(editingEmployee?.certifications)
    ? editingEmployee.certifications
    : []

  return {
    // 1. Identification & Personal
    employeeId: editingEmployee?.employeeId || generateNextId(existingEmployees),
    name: editingEmployee?.name || '',
    gender: editingEmployee?.gender || 'Female',
    dateOfBirth: editingEmployee?.dateOfBirth || '',
    phone: editingEmployee?.phone || '',
    email: editingEmployee?.email || '',
    address: editingEmployee?.address || '',
    emergencyContact: editingEmployee?.emergencyContact || '',

    // 1b. Government ID Verification
    identityIdType: editingEmployee?.identityIdType || editingEmployee?.identityType || 'National ID (ET)',
    identityIdNumber: editingEmployee?.identityIdNumber || editingEmployee?.identityNumber || '',
    identityIssuedBy: editingEmployee?.identityIssuedBy || editingEmployee?.identityIssuer || '',
    identityIssuedDate: editingEmployee?.identityIssuedDate || editingEmployee?.identityIssueDate || '',
    identityDocument: Array.isArray(editingEmployee?.identityDocument)
      ? editingEmployee.identityDocument
      : identityFile
        ? [identityFile]
        : [],

    // 2. Job & Employment
    jobTitle: editingEmployee?.jobTitle || '',
    department: editingEmployee?.department || HR_SETTINGS.departments[0] || 'Human Resources',
    employmentType: editingEmployee?.employmentType || 'Permanent',
    employmentStatus: editingEmployee?.employmentStatus || editingEmployee?.status || 'Active',
    joinDate: editingEmployee?.joinDate || todayStr,
    exitDate: editingEmployee?.exitDate || '',

    // 3. Compensation & Allowances
    basicSalary: editingEmployee?.basicSalary != null ? String(editingEmployee.basicSalary) : '',
    transportAllowance:
      editingEmployee?.transportAllowance != null ? String(editingEmployee.transportAllowance) : '2500',
    housingAllowance:
      editingEmployee?.housingAllowance != null ? String(editingEmployee.housingAllowance) : '3500',
    mealAllowance: editingEmployee?.mealAllowance != null ? String(editingEmployee.mealAllowance) : '1800',
    otherAllowance: editingEmployee?.otherAllowance != null ? String(editingEmployee.otherAllowance) : '0',

    // 4. Banking & Statutory Tax
    bankName: editingEmployee?.bankName || 'Commercial Bank of Ethiopia',
    bankAccount: editingEmployee?.bankAccount || '',
    tin: editingEmployee?.tin || '',
    pensionId: editingEmployee?.pensionId || '',

    certificates: existingCertificates.length > 0
      ? existingCertificates.map((c) => ({
          id: c.id || `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: c.title || c.name || '',
          issuer: c.issuer || '',
          issueDate: c.issueDate || '',
          expiryDate: c.expiryDate || '',
          file: c.fileUrl
            ? fileFromUrl(c.fileUrl, c.fileName, c.mimeType, c.fileSize)
            : null,
          fileUrl: c.fileUrl || '',
          fileName: c.fileName || '',
          mimeType: c.mimeType || '',
          fileSize: c.fileSize || 0,
        }))
      : Array.isArray(editingEmployee?.certificates)
        ? editingEmployee.certificates.map((c) => ({
            id: c.id || `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: c.title || c.name || '',
            issuer: c.issuer || '',
            issueDate: c.issueDate || '',
            expiryDate: c.expiryDate || '',
            file: c.file || null,
          }))
        : [],
    cv: Array.isArray(editingEmployee?.cv)
      ? editingEmployee.cv
      : cvFile
        ? [cvFile]
        : [],

    // 5. Notes
    notes: editingEmployee?.notes || '',
  }
}

export function useEmployeeForm({ isOpen, onClose, onSave, existingEmployees, editingEmployee, onEdit }) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const initialForm = useMemo(
    () => buildInitialForm({ editingEmployee, existingEmployees, todayStr }),
    [editingEmployee, existingEmployees, todayStr],
  )

  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})

  // Re-sync default Employee ID whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialForm,
        employeeId: initialForm.employeeId || generateNextId(existingEmployees),
      })
      setErrors({})
    }
  }, [isOpen, initialForm, existingEmployees])

  // ── Conditional field logic ────────────────────────────────
  const isPermanent = formData.employmentType === 'Permanent'
  const isExitedStatus =
    formData.employmentStatus === 'Resigned' || formData.employmentStatus === 'Terminated'
  const shouldShowExitDate = !isPermanent || isExitedStatus

  // ── Live statutory computations ────────────────────────────
  const basicSalaryNum = Math.max(0, Number(formData.basicSalary) || 0)
  const transportNum = Math.max(0, Number(formData.transportAllowance) || 0)
  const housingNum = Math.max(0, Number(formData.housingAllowance) || 0)
  const mealNum = Math.max(0, Number(formData.mealAllowance) || 0)
  const otherNum = Math.max(0, Number(formData.otherAllowance) || 0)
  const totalAllowances = transportNum + housingNum + mealNum + otherNum
  const grossMonthly = basicSalaryNum + totalAllowances

  const exempt = isExempt(formData.employmentType)
  const estIncomeTax = exempt ? 0 : lookupTax(grossMonthly)
  const estPensionEmp =
    exempt ? 0 : Math.round((basicSalaryNum * HR_SETTINGS.pension.employeeRate + Number.EPSILON) * 100) / 100
  const estPensionOrg =
    exempt ? 0 : Math.round((basicSalaryNum * HR_SETTINGS.pension.employerRate + Number.EPSILON) * 100) / 100
  const estNetSalary = Math.max(0, grossMonthly - estIncomeTax - estPensionEmp)

  // ── Data check validations ─────────────────────────────────
  const isDuplicateId = existingEmployees.some(
    (e) =>
      e.id !== editingEmployee?.id &&
      e.employeeId?.trim().toLowerCase() === formData.employeeId?.trim().toLowerCase(),
  )
  const isDuplicateTin =
    Boolean(formData.tin.trim()) &&
    existingEmployees.some(
      (e) =>
        e.id !== editingEmployee?.id &&
        e.tin &&
        e.tin.trim().toLowerCase() === formData.tin.trim().toLowerCase(),
    )

  const hasName = Boolean(formData.name.trim())
  const hasJobTitle = Boolean(formData.jobTitle.trim())
  const hasValidSalary = basicSalaryNum > 0
  const hasTin = Boolean(formData.tin.trim())
  const hasBankAccount = Boolean(formData.bankAccount.trim())
  const hasIdentity = formData.identityDocument.length > 0
  const hasExitDateWhenNeeded = !shouldShowExitDate || Boolean(formData.exitDate)

  // ── Audit summary ──────────────────────────────────────────
  const criticalIssues = []
  if (!formData.employeeId.trim()) criticalIssues.push('Employee ID is required')
  if (isDuplicateId) criticalIssues.push('Employee ID is already in use')
  if (!hasName) criticalIssues.push('Full Name is required')
  if (!hasJobTitle) criticalIssues.push('Job Title is required')
  if (!hasValidSalary) criticalIssues.push('Basic Monthly Salary must be greater than 0')

  const auditWarnings = []
  if (!hasTin) auditWarnings.push('Missing TIN (Will trigger audit review per Proc. 1395/2025)')
  if (isDuplicateTin) auditWarnings.push('Duplicate TIN detected across directory')
  if (!hasIdentity) auditWarnings.push('Missing Government ID (Identity verification incomplete)')
  if (!hasBankAccount) auditWarnings.push('Missing Bank Account (Required for direct deposit)')
  const dobAudit = dobStatus(formData.dateOfBirth)
  if (dobAudit) auditWarnings.push(`Date of Birth: ${dobAudit.text}`)
  const phoneError = validatePhone(formData.phone)
  if (phoneError) auditWarnings.push(`Phone: ${phoneError}`)
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

  // ── Handlers ───────────────────────────────────────────────
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
    if (field === 'cv' || field === 'identityDocument') {
      setFormData((prev) => ({ ...prev, [field]: [files[0]] }))
    } else {
      setFormData((prev) => ({
        ...prev,
        certificates: [
          ...prev.certificates,
          ...files.map((f) => ({
            id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: f.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '),
            issuer: '',
            issueDate: '',
            file: f,
          })),
        ],
      }))
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

  const addCertificateEntry = () => {
    setFormData((prev) => ({
      ...prev,
      certificates: [
        ...prev.certificates,
        {
          id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: '',
          issuer: '',
          issueDate: '',
          file: null,
        },
      ],
    }))
  }

  const updateCertificateEntry = (certId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      certificates: prev.certificates.map((c) => (c.id === certId ? { ...c, [field]: value } : c)),
    }))
  }

  const removeCertificate = (certId) => {
    setFormData((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((c) => c.id !== certId),
    }))
  }

  const buildPayload = async () => {
    const identityUpload = await uploadOrReuse(formData.identityDocument[0] || null)
    const cvUpload = await uploadOrReuse(formData.cv[0] || null)
    const certifications = (await Promise.all(
      formData.certificates.map(async (c) => {
        const uploaded = await uploadOrReuse(c.file)
        return {
          id: c.id,
          name: c.title.trim() || uploaded?.name || c.name || 'Untitled',
          issuer: c.issuer.trim(),
          issueDate: c.issueDate || '',
          expiryDate: c.expiryDate || '',
          fileName: uploaded?.name || c.file?.name || c.fileName || '',
          fileUrl: uploaded?.url || c.fileUrl || '',
          mimeType: uploaded?.type || c.file?.type || c.mimeType || '',
          fileSize: uploaded?.size || c.file?.size || c.fileSize || 0,
        }
      }),
    )).filter((c) => c.name)

    return {
      id: editingEmployee?.id || `emp-${Date.now()}`,
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
      identityType: formData.identityIdType,
      identityNumber: formData.identityIdNumber.trim(),
      identityIssueDate: formData.identityIssuedDate,
      identityExpiryDate: editingEmployee?.identityExpiryDate || '',
      identityFrontUrl: identityUpload?.url || '',
      identityFrontName: identityUpload?.name || '',
      identityBackUrl: editingEmployee?.identityBackUrl || '',
      identityBackName: editingEmployee?.identityBackName || '',
      cvUrl: cvUpload?.url || '',
      cvName: cvUpload?.name || '',
      employmentStatus: formData.employmentStatus,
      exitDate: shouldShowExitDate && formData.exitDate ? formData.exitDate : null,
      certifications,
      notes: formData.notes.trim(),
      dataCheck: dataCheckBadge.status,
      dataCheckWarnings: auditWarnings,
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!formData.employeeId.trim()) newErrors.employeeId = 'Employee ID is required'
    if (isDuplicateId) newErrors.employeeId = 'Employee ID is already in use'
    if (!formData.name.trim()) newErrors.name = 'Full Name is required'
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job Title is required'
    if (!formData.department) newErrors.department = 'Department is required'
    if (!basicSalaryNum || basicSalaryNum <= 0) newErrors.basicSalary = 'Basic salary must be greater than 0'
    const submitPhoneError = validatePhone(formData.phone)
    if (submitPhoneError) newErrors.phone = submitPhoneError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }

    try {
      const payload = await buildPayload()

      if (editingEmployee && onEdit) {
        await onEdit(payload)
      } else {
        await onSave(payload)
      }
      onClose()
      return true
    }
  }

  return {
    formData,
    errors,
    todayStr,
    isPermanent,
    isExitedStatus,
    shouldShowExitDate,
    basicSalaryNum,
    transportNum,
    housingNum,
    mealNum,
    otherNum,
    totalAllowances,
    grossMonthly,
    exempt,
    estIncomeTax,
    estPensionEmp,
    estPensionOrg,
    estNetSalary,
    isDuplicateId,
    isDuplicateTin,
    hasName,
    hasJobTitle,
    hasValidSalary,
    hasTin,
    hasBankAccount,
    hasIdentity,
    hasExitDateWhenNeeded,
    auditWarnings,
    dataCheckBadge,
    handleChange,
    handleFileChange,
    removeFile,
    addCertificateEntry,
    updateCertificateEntry,
    removeCertificate,
    handleSubmit,
  }
}
