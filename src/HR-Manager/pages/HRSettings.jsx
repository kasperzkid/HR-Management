import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  KeyRound,
  ListChecks,
  Lock,
  Mail,
  Percent,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { authHeaders } from '../../lib/hrApi'
import { getUser } from '../../lib/auth'
import { useTheme } from '../../lib/theme'

const API_URL = '/api/hr-manager'
const AUTH_URL = '/api/auth'

const EMPTY_SETTINGS = {
  departments: [],
  jobTitles: [],
  employmentTypes: [],
  employmentStatuses: [],
  genders: [],
  leaveTypes: [],
  attendanceStatuses: [],
  approvalStatuses: [],
  deductionTypes: [],
  attendanceCodes: {},
  payrollConfiguration: {
    overtimeRateMultiplier: 1.5,
    regularOvertimeMultiplier: 1.25,
    nightOvertimeMultiplier: 1.5,
    holidayOvertimeMultiplier: 2,
    standardMonthlyWorkingHours: 208,
    taxablePercentOfAllowances: 1,
    employeePensionRate: 0.07,
    employerPensionRate: 0.11,
  },
  taxBrackets: [
    { min: 0, max: 2000, rate: 0, fixedDeduction: 0 },
    { min: 2001, max: 4000, rate: 0.15, fixedDeduction: 300 },
    { min: 4001, max: 7000, rate: 0.2, fixedDeduction: 500 },
    { min: 7001, max: 10000, rate: 0.25, fixedDeduction: 850 },
    { min: 10001, max: 14000, rate: 0.3, fixedDeduction: 1350 },
    { min: 14001, max: null, rate: 0.35, fixedDeduction: 2050 },
  ],
  leaveEntitlements: {
    annualLeaveDays: 16,
    extraDayPerTwoYears: 1,
    sickLeaveDays: 10,
    maternityLeaveDays: 120,
    paternityLeaveDays: 3,
  },
  companyInformation: {
    companyName: 'Yanol Tech',
    address: '',
    phone: '',
    email: '',
    logo: '',
    currency: 'ETB',
    currencySymbol: 'Br',
    tin: '',
    registrationNumber: '',
  },
}

const NAV_GROUPS = [
  {
    label: 'General',
    items: [
      { id: 'profile', label: 'Profile', icon: UserRound, description: 'Your personal information' },
      { id: 'account', label: 'Account', icon: KeyRound, description: 'Login credentials and role' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { id: 'company', label: 'Company Info', icon: Building2, description: 'Details used system-wide' },
      { id: 'payroll', label: 'Payroll', icon: CircleDollarSign, description: 'Working hours and pensions' },
      { id: 'tax', label: 'Tax Rates', icon: Percent, description: 'Proclamation tax brackets' },
      { id: 'leave', label: 'Leave Config', icon: FileText, description: 'Annual and sick entitlements' },
      { id: 'lists', label: 'HR Lists', icon: ListChecks, description: 'Departments, job titles & types' },
      { id: 'codes', label: 'Attendance Codes', icon: Clock3, description: 'Status codes and labels' },
      { id: 'access', label: 'Access & Security', icon: ShieldCheck, description: 'Permissions and security' },
    ],
  },
]

const LIST_CONFIG = [
  { key: 'departments', label: 'Departments' },
  { key: 'jobTitles', label: 'Job Titles' },
  { key: 'employmentTypes', label: 'Employment Types' },
  { key: 'employmentStatuses', label: 'Employment Status' },
  { key: 'genders', label: 'Gender' },
  { key: 'leaveTypes', label: 'Leave Types' },
  { key: 'attendanceStatuses', label: 'Attendance Status' },
  { key: 'approvalStatuses', label: 'Approval Status' },
  { key: 'deductionTypes', label: 'Deduction Types' },
]

function cloneSettings(value) {
  return JSON.parse(JSON.stringify(value))
}

function getInitials(name) {
  return (name || 'HR')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={15} className="text-gray-500 dark:text-gray-400" />}
        <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">{title}</h3>
      </div>
      {description && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      )}
    </div>
  )
}

function Card({ icon: Icon, title, description, children, footer }) {
  return (
    <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6">
      {title && <SectionHeader icon={Icon} title={title} description={description} />}
      {children}
      {footer && <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#262b31]">{footer}</div>}
    </div>
  )
}

function Alert({ tone = 'error', children }) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'

  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] font-medium ${styles}`}>
      {tone === 'error' ? (
        <AlertIcon className="h-4 w-4 shrink-0" />
      ) : (
        <Check className="h-4 w-4 shrink-0" />
      )}
      {children}
    </div>
  )
}

function AlertIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '', hint, min, max, step }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 transition-colors"
      />
      {hint && <span className="mt-1.5 block text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
    </label>
  )
}

function PrimaryButton({ children, onClick, disabled, className = '', icon: Icon = Save }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white dark:focus:ring-gray-700/60 ${className}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function ListEditor({ title, items, onChange }) {
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    const value = newItem.trim()
    if (!value || items.includes(value)) return
    onChange([...items, value])
    setNewItem('')
  }

  const removeItem = (item) => {
    onChange(items.filter((current) => current !== item))
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white dark:border-[#33383f] dark:bg-[#16181d]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-[#262b31]">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-[#22262d] dark:text-slate-400">
          {items.length}
        </span>
      </div>

      <div className="p-4">
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addItem()
            }}
            placeholder={`Add ${title.toLowerCase().replace(/s$/, '')}`}
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-[#33383f] dark:bg-[#1b1e24] dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item}
              className="group flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-[#262b31] dark:bg-[#1b1e24]"
            >
              <span className="truncate text-sm text-slate-700 dark:text-slate-200">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="rounded-md p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                aria-label={`Remove ${item}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {!items.length && (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-[#33383f]">
              No values configured. Add one above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function AttendanceCodeEditor({ codes, onChange }) {
  const entries = useMemo(() => Object.entries(codes || {}), [codes])

  const updateCode = (oldCode, field, value) => {
    const next = { ...codes }
    const current = next[oldCode] || ''
    const updated = field === 'code' ? value.toUpperCase().trim() : value

    if (field === 'code') {
      if (!updated || (updated !== oldCode && next[updated])) return
      delete next[oldCode]
      next[updated] = current
    } else {
      next[oldCode] = updated
    }

    onChange(next)
  }

  const removeCode = (code) => {
    const next = { ...codes }
    delete next[code]
    onChange(next)
  }

  const addCode = () => {
    let index = 1
    let code = `NEW${index}`
    while (codes[code]) {
      index += 1
      code = `NEW${index}`
    }
    onChange({ ...codes, [code]: 'New Attendance Status' })
  }

  return (
    <div className="space-y-3">
      {entries.map(([code, label]) => (
        <div key={code} className="grid gap-2 sm:grid-cols-[110px_1fr_auto]">
          <input
            value={code}
            onChange={(event) => updateCode(code, 'code', event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold uppercase outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-[#33383f] dark:bg-[#1b1e24] dark:text-slate-100"
          />
          <input
            value={label}
            onChange={(event) => updateCode(code, 'label', event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-[#33383f] dark:bg-[#1b1e24] dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => removeCode(code)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:text-red-600 dark:border-[#33383f] dark:hover:border-red-500/40"
            aria-label={`Remove ${code}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCode}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#33383f] dark:text-slate-300 dark:hover:bg-[#22262d] dark:hover:text-white"
      >
        <Plus className="h-4 w-4" />
        Add Attendance Code
      </button>
    </div>
  )
}

function TaxBracketsEditor({ brackets, onChange }) {
  const toRows = (list) =>
    (list || []).map((bracket) => ({
      min: String(bracket.min ?? ''),
      max: bracket.max === null || bracket.max === undefined ? '' : String(bracket.max),
      rate: String(Math.round((Number(bracket.rate) || 0) * 100)),
      fixedDeduction: String(bracket.fixedDeduction ?? ''),
    }))

  const [rows, setRows] = useState(() => toRows(brackets))

  useEffect(() => {
    setRows(toRows(brackets))
  }, [brackets])

  const emit = (nextRows) => {
    setRows(nextRows)
    onChange(
      nextRows.map((row) => ({
        min: Number(row.min) || 0,
        max: row.max.trim() === '' ? null : Number(row.max),
        rate: (Number(row.rate) || 0) / 100,
        fixedDeduction: Number(row.fixedDeduction) || 0,
      })),
    )
  }

  const updateRow = (index, field, value) => {
    emit(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const removeRow = (index) => {
    emit(rows.filter((_, i) => i !== index))
  }

  const addRow = () => {
    const nextMin = rows.length
      ? Number(rows[rows.length - 1].max) || Number(rows[rows.length - 1].min) + 1000
      : 0
    emit([...rows, { min: String(nextMin), max: '', rate: '35', fixedDeduction: '0' }])
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/15 dark:border-[#33383f] dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500'

  return (
    <div>
      <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-1 pb-2 sm:grid">
        {['Income From (ETB)', 'Income Up To (ETB)', 'Rate (%)', 'Fixed Deduction (ETB)', ''].map((heading) => (
          <p key={heading} className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {heading}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] dark:border-[#33383f] dark:bg-[#1b1e24]">
            <input
              type="number"
              min="0"
              value={row.min}
              onChange={(event) => updateRow(index, 'min', event.target.value)}
              placeholder="0"
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              value={row.max}
              onChange={(event) => updateRow(index, 'max', event.target.value)}
              placeholder="Unlimited"
              className={inputClass}
            />
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={row.rate}
                onChange={(event) => updateRow(index, 'rate', event.target.value)}
                placeholder="0"
                className={`${inputClass} pr-8`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                %
              </span>
            </div>
            <input
              type="number"
              min="0"
              value={row.fixedDeduction}
              onChange={(event) => updateRow(index, 'fixedDeduction', event.target.value)}
              placeholder="0"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:text-red-600 dark:border-[#33383f] dark:hover:border-red-500/40"
              aria-label="Remove bracket"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-[#33383f] dark:text-slate-300 dark:hover:bg-[#22262d] dark:hover:text-white"
      >
        <Plus className="h-4 w-4" />
        Add Tax Bracket
      </button>
    </div>
  )
}

function InfoTile({ icon: Icon, title, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-[#33383f] dark:bg-[#1b1e24]">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      {description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  )
}

function ProfileSection({ profile, onUpdate }) {
  const [name, setName] = useState(profile.name || '')
  const [email, setEmail] = useState(profile.email || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  useEffect(() => {
    setName(profile.name || '')
    setEmail(profile.email || '')
  }, [profile.name, profile.email])

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaved(false)
      setError('')

      const response = await fetch(`${AUTH_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile.')
      }

      onUpdate(data.user)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (requestError) {
      setError(requestError.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card icon={UserRound} title="Profile" description="Your personal information in the HR management workspace.">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-lg font-bold text-white shadow-sm ring-4 ring-slate-100 dark:from-slate-500 dark:to-slate-800 dark:ring-[#22262d]">
            {getInitials(name) || getInitials(profile.name)}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{name || profile.name}</p>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              HR Manager · Member since {formatDate(profile.createdAt)}
            </p>
          </div>
          <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-[#33383f] dark:bg-[#22262d] dark:text-slate-300">
            HR Manager
          </span>
        </div>
      </Card>

      <Card icon={Settings} title="Personal Details" description="The name and email shown across the workspace.">
        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Profile updated successfully.</Alert>}

        <div className="mt-3 grid gap-4 pt-1 md:grid-cols-2">
          <Field label="Full Name" value={name} onChange={setName} placeholder="Your full name" />
          <Field label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@yanol.com" />
        </div>

        <div className="mt-5 flex justify-end">
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </PrimaryButton>
        </div>
      </Card>

      <Card icon={ShieldCheck} title="Appearance" description="Choose how the HR workspace looks for you.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Theme</p>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              Prefer light or dark for your workspace.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-[#22262d]">
            <button
              type="button"
              onClick={() => dark && toggleTheme()}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition ${
                !dark ? 'bg-white text-slate-900 shadow-sm dark:bg-[#33383f] dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => !dark && toggleTheme()}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition ${
                dark ? 'bg-[#33383f] text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function AccountSection({ profile }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    try {
      setSaving(true)
      setSaved(false)
      setError('')

      const response = await fetch(`${AUTH_URL}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password.')
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (requestError) {
      setError(requestError.message || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card icon={UserRound} title="Account" description="Your account login details and role.">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoTile
            icon={Mail}
            title="Login Email"
            value={profile.email}
            description="Used to sign in to the HR workspace. Update it from the Profile section."
          />
          <InfoTile
            icon={ShieldCheck}
            title="Role"
            value="HR Manager"
            description="Full access to employees, attendance, leave, payroll and reports."
          />
        </div>
      </Card>

      <Card
        icon={Lock}
        title="Change Password"
        description="Choose a strong password you don't use anywhere else."
      >
        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Password changed successfully.</Alert>}

        <div className="mt-3 grid gap-4 pt-1 md:grid-cols-3">
          <Field label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Enter current password" />
          <Field label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" hint="Use 8+ characters with a mix of letters and numbers." />
          <Field label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat new password" />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-[#262b31]">
          <p className="max-w-sm text-xs text-slate-400">
            For your security, other signed-in sessions will be logged out after changing your password.
          </p>
          <PrimaryButton icon={KeyRound} onClick={handleChangePassword} disabled={saving}>
            {saving ? 'Updating...' : saved ? 'Updated' : 'Update Password'}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  )
}

function HRSettings() {
  const [settings, setSettings] = useState(cloneSettings(EMPTY_SETTINGS))
  const [profile, setProfile] = useState({
    name: 'Sarah Jenkins',
    email: 'hr@yanol.com',
    role: 'HR_MANAGER',
    createdAt: null,
  })
  const [activeSection, setActiveSection] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const stored = getUser()
    if (stored) {
      setProfile((current) => ({
        ...current,
        name: stored.name || current.name,
        email: stored.email || current.email,
        role: stored.role || current.role,
      }))
    }

    async function loadAll() {
      try {
        setLoading(true)
        setError('')

        const [settingsResponse, meResponse] = await Promise.all([
          fetch(`${API_URL}/settings`, { headers: authHeaders() }),
          fetch(`${AUTH_URL}/me`, { headers: authHeaders() }),
        ])

        const settingsData = await settingsResponse.json()
        if (!settingsResponse.ok) {
          throw new Error(settingsData.message || 'Failed to load HR settings.')
        }

        const meData = await meResponse.json().catch(() => null)
        if (!meResponse.ok) {
          throw new Error(meData?.message || 'Failed to load profile.')
        }

        if (active) {
          setSettings(settingsData)
          if (meData?.user) {
            setProfile((current) => ({ ...current, ...meData.user }))
          }
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Failed to load settings.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAll()

    return () => {
      active = false
    }
  }, [])

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))
    setSaved(false)
  }

  const updatePayroll = (key, value) => {
    setSettings((current) => ({
      ...current,
      payrollConfiguration: {
        ...current.payrollConfiguration,
        [key]: value,
      },
    }))
    setSaved(false)
  }

  const updateCompany = (key, value) => {
    setSettings((current) => ({
      ...current,
      companyInformation: {
        ...current.companyInformation,
        [key]: value,
      },
    }))
    setSaved(false)
  }

  const updateTaxBrackets = (value) => {
    setSettings((current) => ({
      ...current,
      taxBrackets: value,
    }))
    setSaved(false)
  }

  const updateLeave = (key, value) => {
    setSettings((current) => ({
      ...current,
      leaveEntitlements: {
        ...current.leaveEntitlements,
        [key]: Number(value) || 0,
      },
    }))
    setSaved(false)
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      setSaved(false)
      setError('')

      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (!response.ok) {
        const details = Array.isArray(data.errors)
          ? ` ${data.errors.join(' ')}`
          : ''
        throw new Error((data.message || 'Failed to save HR settings.') + details)
      }

      setSettings(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (requestError) {
      setError(requestError.message || 'Failed to save HR settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileUpdate = (updatedUser) => {
    setProfile((current) => ({ ...current, ...updatedUser }))
    const stored = getUser()
    if (stored) {
      const next = {
        ...stored,
        name: updatedUser.name || stored.name,
        email: updatedUser.email || stored.email,
      }
      try {
        localStorage.setItem('user', JSON.stringify(next))
      } catch {
        /* ignore */
      }
    }
  }

  const isSettingsSection = activeSection !== 'profile' && activeSection !== 'account'

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-8 text-sm text-gray-500 shadow-2xs dark:border-[#262b31] dark:bg-[#15181d] dark:text-gray-400">
          Loading settings...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] flex items-center justify-center shadow-xs">
            <Settings size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
              Settings
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Manage your profile, account and HR configuration.
            </p>
          </div>
        </div>

        
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-6">
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0" aria-label="HR Settings sections">
            {NAV_GROUPS.map((group) => {
              const groupActive = group.items.some((item) => item.id === activeSection)
              return (
                <div
                  key={group.label}
                  className={`contents lg:block transition-colors p-1 ${
                    groupActive ? 'lg:bg-gray-100 dark:lg:bg-[#171a20]' : ''
                  }`}
                >
                  <p className="hidden lg:block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 pt-3 pb-1">
                    {group.label}
                  </p>
                  {group.items.map(({ id, label, icon: Icon, description }) => {
                    const isActive = activeSection === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveSection(id)}
                        onMouseEnter={() => setActiveSection(id)}
                        className={`group flex items-center gap-3 border-l-[3px] px-3 py-2 text-left whitespace-nowrap transition-colors min-w-[160px] lg:min-w-0 ${
                          isActive
                            ? 'border-gray-950 bg-white text-gray-950 shadow-2xs dark:border-white dark:bg-[#22262c] dark:text-white'
                            : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#1c2026] dark:hover:text-gray-100'
                        }`}
                        title={label}
                      >
                        <Icon size={16} className="shrink-0 text-gray-500 dark:text-gray-400" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-medium">{label}</span>
                          <span className="hidden lg:block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                            {description}
                          </span>
                        </span>
                        <ChevronRight
                          size={13}
                          className={`hidden lg:block shrink-0 text-gray-300 dark:text-gray-600 transition-transform ${
                            isActive ? 'translate-x-0.5 text-gray-500 dark:text-gray-400' : ''
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-6 w-full">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {isSettingsSection && saved && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Check className="h-4 w-4" />
            Settings saved to the HR database successfully.
          </div>
        )}

        {activeSection === 'profile' && (
          <ProfileSection profile={profile} onUpdate={handleProfileUpdate} />
        )}

        {activeSection === 'account' && <AccountSection profile={profile} />}

        {activeSection === 'company' && (
          <Card
            icon={Building2}
            title="Company Information"
            description="Details used throughout the HR system."
            footer={
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Changes take effect after saving.</p>
                <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
                </PrimaryButton>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Company Name"
                value={settings.companyInformation?.companyName}
                onChange={(value) => updateCompany('companyName', value)}
                placeholder="Yanol Tech"
              />
              <Field
                label="Company Email"
                type="email"
                value={settings.companyInformation?.email}
                onChange={(value) => updateCompany('email', value)}
                placeholder="hr@yanoltech.com"
              />
              <Field
                label="Company Phone"
                value={settings.companyInformation?.phone}
                onChange={(value) => updateCompany('phone', value)}
                placeholder="+251 ..."
              />
              <Field
                label="Company Address"
                value={settings.companyInformation?.address}
                onChange={(value) => updateCompany('address', value)}
                placeholder="Add company address"
              />
              <Field
                label="Currency"
                value={settings.companyInformation?.currency}
                onChange={(value) => updateCompany('currency', value)}
                placeholder="ETB"
              />
              <Field
                label="Currency Symbol"
                value={settings.companyInformation?.currencySymbol}
                onChange={(value) => updateCompany('currencySymbol', value)}
                placeholder="Br"
              />
              <Field
                label="TIN"
                value={settings.companyInformation?.tin}
                onChange={(value) => updateCompany('tin', value)}
                placeholder="Taxpayer identification number"
              />
              <Field
                label="Registration Number"
                value={settings.companyInformation?.registrationNumber}
                onChange={(value) => updateCompany('registrationNumber', value)}
                placeholder="Company registration number"
              />
              <div className="md:col-span-2">
                <Field
                  label="Company Logo"
                  value={settings.companyInformation?.logo}
                  onChange={(value) => updateCompany('logo', value)}
                  placeholder="Logo reference or URL"
                />
              </div>
            </div>
          </Card>
        )}

        {activeSection === 'payroll' && (
          <Card
            icon={CircleDollarSign}
            title="Payroll Configuration"
            description="Statutory and payroll parameters."
            footer={
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Changes take effect after saving.</p>
                <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
                </PrimaryButton>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Overtime Rate Multiplier"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={settings.payrollConfiguration?.overtimeRateMultiplier}
                onChange={(value) => updatePayroll('overtimeRateMultiplier', value)}
              />
              <Field
                label="Regular Overtime Multiplier"
                type="number"
                min="0"
                max="10"
                step="0.05"
                value={settings.payrollConfiguration?.regularOvertimeMultiplier}
                onChange={(value) => updatePayroll('regularOvertimeMultiplier', value)}
              />
              <Field
                label="Night / Rest Day Multiplier"
                type="number"
                min="0"
                max="10"
                step="0.05"
                value={settings.payrollConfiguration?.nightOvertimeMultiplier}
                onChange={(value) => updatePayroll('nightOvertimeMultiplier', value)}
              />
              <Field
                label="Public Holiday Multiplier"
                type="number"
                min="0"
                max="10"
                step="0.05"
                value={settings.payrollConfiguration?.holidayOvertimeMultiplier}
                onChange={(value) => updatePayroll('holidayOvertimeMultiplier', value)}
              />
              <Field
                label="Standard Monthly Working Hours"
                type="number"
                min="1"
                max="744"
                step="1"
                value={settings.payrollConfiguration?.standardMonthlyWorkingHours}
                onChange={(value) => updatePayroll('standardMonthlyWorkingHours', value)}
              />
              <Field
                label="Taxable % of Allowances"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.payrollConfiguration?.taxablePercentOfAllowances}
                onChange={(value) => updatePayroll('taxablePercentOfAllowances', value)}
              />
              <Field
                label="Employee Pension Rate"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.payrollConfiguration?.employeePensionRate}
                onChange={(value) => updatePayroll('employeePensionRate', value)}
              />
              <Field
                label="Employer Pension Rate"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.payrollConfiguration?.employerPensionRate}
                onChange={(value) => updatePayroll('employerPensionRate', value)}
              />
            </div>

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-[#262b31] dark:bg-[#1b1e24]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Workbook Defaults
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Regular OT: 1.25× · Night/rest day: 1.5× · Holiday: 2× ·
                Standard monthly working hours: 208 · Taxable allowances: 100% ·
                Employee pension: 7% · Employer pension: 11%.
              </p>
            </div>
          </Card>
        )}

        {activeSection === 'tax' && (
          <Card
            icon={Percent}
            title="Income Tax Rates"
            description="Monthly Ethiopian income tax brackets. Leave 'Income up to' blank for the top bracket."
            footer={
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Changes take effect after saving.</p>
                <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
                </PrimaryButton>
              </div>
            }
          >
            <TaxBracketsEditor brackets={settings.taxBrackets || []} onChange={updateTaxBrackets} />

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-[#262b31] dark:bg-[#1b1e24]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                How tax is calculated
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Taxable income is the amount above the tax-free threshold. For each bracket the statutory
                fixed deduction is applied; the top bracket has no upper limit. Defaults follow Ethiopian
                Income Tax Proclamation No. 1395/2025.
              </p>
            </div>
          </Card>
        )}

        {activeSection === 'lists' && (
          <Card
            icon={ListChecks}
            title="Configurable HR Lists"
            description="Maintain the selectable values used throughout the system."
            footer={
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Changes take effect after saving.</p>
                <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
                </PrimaryButton>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {LIST_CONFIG.map(({ key, label }) => (
                <ListEditor
                  key={key}
                  title={label}
                  items={settings[key] || []}
                  onChange={(value) => updateSetting(key, value)}
                />
              ))}
            </div>
          </Card>
        )}

        {activeSection === 'codes' && (
          <Card
            icon={Clock3}
            title="Attendance Codes"
            description="Attendance codes and their labels."
            footer={
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Changes take effect after saving.</p>
                <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
                </PrimaryButton>
              </div>
            }
          >
            <AttendanceCodeEditor
              codes={settings.attendanceCodes || {}}
              onChange={(value) => updateSetting('attendanceCodes', value)}
            />
          </Card>
        )}

        {activeSection === 'leave' && (
          <Card
            icon={FileText}
            title="Leave Configuration"
            description="Leave types and approval statuses."
            footer={
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Leave types are managed from the HR Lists section.</p>
                <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
                </PrimaryButton>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Annual Leave Entitlement (days per year)
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Annual Leave Days"
                    type="number"
                    min="0"
                    step="1"
                    value={settings.leaveEntitlements?.annualLeaveDays}
                    onChange={(value) => updateLeave('annualLeaveDays', value)}
                    hint="Base entitlement for employees in their first year."
                  />
                  <Field
                    label="Extra Day per 2 Years of Service"
                    type="number"
                    min="0"
                    step="1"
                    value={settings.leaveEntitlements?.extraDayPerTwoYears}
                    onChange={(value) => updateLeave('extraDayPerTwoYears', value)}
                    hint="Additional day granted for every two full years of service."
                  />
                  <Field
                    label="Sick Leave Days"
                    type="number"
                    min="0"
                    step="1"
                    value={settings.leaveEntitlements?.sickLeaveDays}
                    onChange={(value) => updateLeave('sickLeaveDays', value)}
                  />
                  <Field
                    label="Maternity Leave Days"
                    type="number"
                    min="0"
                    step="1"
                    value={settings.leaveEntitlements?.maternityLeaveDays}
                    onChange={(value) => updateLeave('maternityLeaveDays', value)}
                  />
                  <Field
                    label="Paternity Leave Days"
                    type="number"
                    min="0"
                    step="1"
                    value={settings.leaveEntitlements?.paternityLeaveDays}
                    onChange={(value) => updateLeave('paternityLeaveDays', value)}
                  />
                </div>
              </div>

              <InfoTile
                icon={FileText}
                title="Leave Types"
                value={`${settings.leaveTypes?.length || 0} types configured`}
                description="Annual, sick, maternity, paternity, unpaid, and other leave types can be maintained from the HR Lists section."
              />
              <InfoTile
                icon={Check}
                title="Approval Status"
                value={`${settings.approvalStatuses?.length || 0} statuses configured`}
                description="Pending, approved, and rejected values are database-backed and editable from the HR Lists section."
              />
            </div>
          </Card>
        )}

        {activeSection === 'access' && (
          <Card icon={ShieldCheck} title="HR Access & Security" description="Current role structure for the HR management area.">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-[#22262d] dark:text-slate-300">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">HR Manager</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Full HR management workspace access</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                'Employee Management',
                'Attendance Management',
                'Leave Management',
                'Payroll Management',
                'Payment Slips',
                'HR Reports',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 dark:border-[#262b31] dark:bg-[#1b1e24]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isSettingsSection && (
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-gray-200/90 bg-white px-6 py-4 shadow-2xs dark:border-[#262b31] dark:bg-[#15181d]">
            <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
            </PrimaryButton>
          </div>
        )}
          </main>
        </div>
      </div>
  )
}

export default HRSettings