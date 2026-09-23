import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  ListChecks,
  MapPin,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'

import { PageTitle } from '../../components/ui'

const API_URL = 'http://localhost:4000/api/hr-manager'

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
    standardMonthlyWorkingHours: 208,
    taxablePercentOfAllowances: 1,
    employeePensionRate: 0.07,
    employerPensionRate: 0.11,
  },

  attendanceConfiguration: {
    requiredCheckInTime: '08:30',
    officeLatitude: 8.999654748138806,
    officeLongitude: 38.820610900000005,
    allowedRadiusMeters: 100,
  },

  companyInformation: {
    companyName: 'Yanol Tech',
    address: '',
    phone: '',
    email: '',
    logo: '',
  },
}

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

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-4 border-b border-slate-100 p-5">
        <div className="rounded-xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  min,
  max,
  step,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  )
}

function ListEditor({ title, items, onChange }) {
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    const value = newItem.trim()

    if (!value || items.includes(value)) {
      return
    }

    onChange([...items, value])
    setNewItem('')
  }

  const removeItem = (item) => {
    onChange(
      items.filter((current) => current !== item),
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {items.length}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={newItem}
          onChange={(event) =>
            setNewItem(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              addItem()
            }
          }}
          placeholder={`Add ${title
            .toLowerCase()
            .replace(/s$/, '')}`}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <span className="text-sm text-slate-700">
              {item}
            </span>

            <button
              type="button"
              onClick={() => removeItem(item)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
              aria-label={`Remove ${item}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {!items.length && (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">
            No values configured.
          </p>
        )}
      </div>
    </div>
  )
}

function AttendanceCodeEditor({ codes, onChange }) {
  const entries = useMemo(
    () => Object.entries(codes || {}),
    [codes],
  )

  const updateCode = (oldCode, field, value) => {
    const next = { ...codes }
    const current = next[oldCode] || ''

    const updated =
      field === 'code'
        ? value.toUpperCase().trim()
        : value

    if (field === 'code') {
      if (
        !updated ||
        (updated !== oldCode && next[updated])
      ) {
        return
      }

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

    onChange({
      ...codes,
      [code]: 'New Attendance Status',
    })
  }

  return (
    <div className="space-y-3">
      {entries.map(([code, label]) => (
        <div
          key={code}
          className="grid gap-2 sm:grid-cols-[110px_1fr_auto]"
        >
          <input
            value={code}
            onChange={(event) =>
              updateCode(
                code,
                'code',
                event.target.value,
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold uppercase outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />

          <input
            value={label}
            onChange={(event) =>
              updateCode(
                code,
                'label',
                event.target.value,
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />

          <button
            type="button"
            onClick={() => removeCode(code)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 hover:border-red-200 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCode}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
        Add Attendance Code
      </button>
    </div>
  )
}

function HRSettings() {
  const [settings, setSettings] = useState(
    cloneSettings(EMPTY_SETTINGS),
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${API_URL}/settings`,
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message ||
              'Failed to load HR settings.',
          )
        }

        if (active) {
          setSettings({
            ...cloneSettings(EMPTY_SETTINGS),
            ...data,
            payrollConfiguration: {
              ...EMPTY_SETTINGS.payrollConfiguration,
              ...(data.payrollConfiguration || {}),
            },
            attendanceConfiguration: {
              ...EMPTY_SETTINGS.attendanceConfiguration,
              ...(data.attendanceConfiguration || {}),
            },
            companyInformation: {
              ...EMPTY_SETTINGS.companyInformation,
              ...(data.companyInformation || {}),
            },
          })
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.message ||
              'Failed to load HR settings.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSettings()

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

  const updateAttendanceConfiguration = (
    key,
    value,
  ) => {
    setSettings((current) => ({
      ...current,
      attendanceConfiguration: {
        ...current.attendanceConfiguration,
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

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaved(false)
      setError('')

      const response = await fetch(
        `${API_URL}/settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        const details = Array.isArray(data.errors)
          ? ` ${data.errors.join(' ')}`
          : ''

        throw new Error(
          (data.message ||
            'Failed to save HR settings.') +
            details,
        )
      }

      setSettings({
        ...cloneSettings(EMPTY_SETTINGS),
        ...data,
        payrollConfiguration: {
          ...EMPTY_SETTINGS.payrollConfiguration,
          ...(data.payrollConfiguration || {}),
        },
        attendanceConfiguration: {
          ...EMPTY_SETTINGS.attendanceConfiguration,
          ...(data.attendanceConfiguration || {}),
        },
        companyInformation: {
          ...EMPTY_SETTINGS.companyInformation,
          ...(data.companyInformation || {}),
        },
      })

      setSaved(true)

      window.setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (requestError) {
      setError(
        requestError.message ||
          'Failed to save HR settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-[#F3F4F6] p-6 lg:p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading HR settings from the database...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Shared Page Title */}
        <PageTitle
          eyebrow="HR Settings"
          title="Manage HR Settings"
          description="Database-backed configuration from the Ethiopia HR Payroll System workbook."
          action={
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
            </button>
          }
          className="mb-8"
        />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Saved */}
        {saved && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <Check className="h-5 w-5" />
            Settings saved to the HR database successfully.
          </div>
        )}

        {/* Company Information */}
        <SettingsCard
          icon={Building2}
          title="Company Information"
          description="Company information defined by the workbook Settings sheet."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Company Name"
              value={
                settings.companyInformation?.companyName
              }
              onChange={(value) =>
                updateCompany(
                  'companyName',
                  value,
                )
              }
            />

            <Field
              label="Company Email"
              type="email"
              value={
                settings.companyInformation?.email
              }
              onChange={(value) =>
                updateCompany('email', value)
              }
              placeholder="hr@yanoltech.com"
            />

            <Field
              label="Company Phone"
              value={
                settings.companyInformation?.phone
              }
              onChange={(value) =>
                updateCompany('phone', value)
              }
              placeholder="+251 ..."
            />

            <Field
              label="Company Address"
              value={
                settings.companyInformation?.address
              }
              onChange={(value) =>
                updateCompany(
                  'address',
                  value,
                )
              }
              placeholder="Add company address"
            />

            <div className="md:col-span-2">
              <Field
                label="Company Logo"
                value={
                  settings.companyInformation?.logo
                }
                onChange={(value) =>
                  updateCompany('logo', value)
                }
                placeholder="Logo reference or URL"
              />
            </div>
          </div>
        </SettingsCard>

        {/* Payroll */}
        <SettingsCard
          icon={CircleDollarSign}
          title="Payroll Configuration"
          description="Statutory and payroll parameters from the workbook."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Overtime Rate Multiplier"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={
                settings.payrollConfiguration
                  ?.overtimeRateMultiplier
              }
              onChange={(value) =>
                updatePayroll(
                  'overtimeRateMultiplier',
                  value,
                )
              }
            />

            <Field
              label="Standard Monthly Working Hours"
              type="number"
              min="1"
              max="744"
              step="1"
              value={
                settings.payrollConfiguration
                  ?.standardMonthlyWorkingHours
              }
              onChange={(value) =>
                updatePayroll(
                  'standardMonthlyWorkingHours',
                  value,
                )
              }
            />

            <Field
              label="Taxable % of Allowances"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={
                settings.payrollConfiguration
                  ?.taxablePercentOfAllowances
              }
              onChange={(value) =>
                updatePayroll(
                  'taxablePercentOfAllowances',
                  value,
                )
              }
            />

            <Field
              label="Employee Pension Rate"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={
                settings.payrollConfiguration
                  ?.employeePensionRate
              }
              onChange={(value) =>
                updatePayroll(
                  'employeePensionRate',
                  value,
                )
              }
            />

            <Field
              label="Employer Pension Rate"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={
                settings.payrollConfiguration
                  ?.employerPensionRate
              }
              onChange={(value) =>
                updatePayroll(
                  'employerPensionRate',
                  value,
                )
              }
            />
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Workbook Defaults
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Overtime multiplier: 1.5× · Standard monthly
              working hours: 208 · Taxable allowances: 100% ·
              Employee pension: 7% · Employer pension: 11%.
            </p>
          </div>
        </SettingsCard>

        {/* Attendance & Location */}
        <SettingsCard
          icon={MapPin}
          title="Attendance & Office Location"
          description="Configure automatic employee check-in/check-out and the YanolTech office geofence."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Required Check-In Time"
              type="time"
              value={
                settings.attendanceConfiguration
                  ?.requiredCheckInTime || '08:30'
              }
              onChange={(value) =>
                updateAttendanceConfiguration(
                  'requiredCheckInTime',
                  value,
                )
              }
            />

            <Field
              label="Allowed Radius (Meters)"
              type="number"
              min="1"
              max="10000"
              step="1"
              value={
                settings.attendanceConfiguration
                  ?.allowedRadiusMeters ?? 100
              }
              onChange={(value) =>
                updateAttendanceConfiguration(
                  'allowedRadiusMeters',
                  value,
                )
              }
            />

            <Field
              label="Office Latitude"
              type="number"
              step="any"
              value={
                settings.attendanceConfiguration
                  ?.officeLatitude ?? ''
              }
              onChange={(value) =>
                updateAttendanceConfiguration(
                  'officeLatitude',
                  value,
                )
              }
            />

            <Field
              label="Office Longitude"
              type="number"
              step="any"
              value={
                settings.attendanceConfiguration
                  ?.officeLongitude ?? ''
              }
              onChange={(value) =>
                updateAttendanceConfiguration(
                  'officeLongitude',
                  value,
                )
              }
            />
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-2">
                <MapPin className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  YanolTech Office Geofence
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Employees must be within the configured
                  radius of this location to Check In or
                  Check Out.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Latitude
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                  {
                    settings.attendanceConfiguration
                      ?.officeLatitude
                  }
                </p>
              </div>

              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Longitude
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                  {
                    settings.attendanceConfiguration
                      ?.officeLongitude
                  }
                </p>
              </div>

              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Radius
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {
                    settings.attendanceConfiguration
                      ?.allowedRadiusMeters
                  }{' '}
                  meters
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Attendance Rule
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Check In and Check Out will be rejected when
              the employee's device is outside this office
              radius. Late check-ins are automatically sent
              to HR for review.
            </p>
          </div>
        </SettingsCard>

        {/* HR Lists */}
        <SettingsCard
          icon={ListChecks}
          title="Configurable HR Lists"
          description="Maintain the selectable HR values used throughout the system."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {LIST_CONFIG.map(({ key, label }) => (
              <ListEditor
                key={key}
                title={label}
                items={settings[key] || []}
                onChange={(value) =>
                  updateSetting(key, value)
                }
              />
            ))}
          </div>
        </SettingsCard>

        {/* Attendance Codes */}
        <SettingsCard
          icon={Clock3}
          title="Attendance Codes"
          description="Attendance codes and labels defined in the workbook."
        >
          <AttendanceCodeEditor
            codes={settings.attendanceCodes || {}}
            onChange={(value) =>
              updateSetting(
                'attendanceCodes',
                value,
              )
            }
          />
        </SettingsCard>

        {/* Leave */}
        <SettingsCard
          icon={FileText}
          title="Leave Configuration"
          description="Leave types and approval statuses are managed from the configurable HR lists."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Leave Types
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Annual, sick, maternity, paternity,
                compassionate, unpaid, and other leave types
                can be maintained above.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Approval Status
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Pending, approved, and rejected values are
                database-backed and editable.
              </p>
            </div>
          </div>
        </SettingsCard>

        {/* Security */}
        <SettingsCard
          icon={ShieldCheck}
          title="HR Access & Security"
          description="Current role structure for the HR management area."
        >
          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <UserRound className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  HR Manager
                </p>

                <p className="text-xs text-slate-500">
                  HR management workspace
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  className="rounded-lg bg-slate-50 p-3"
                >
                  <p className="text-xs text-slate-400">
                    {item}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Enabled
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Bottom Save */}
        <div className="flex justify-end pb-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving
              ? 'Saving...'
              : saved
                ? 'Settings Saved'
                : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HRSettings