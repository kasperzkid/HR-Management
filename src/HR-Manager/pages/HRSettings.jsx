import { useState } from 'react'
import {
  Bell,
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  Save,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

const initialSettings = {
  companyName: 'Yanol Tech',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  currency: 'ETB',
  payrollFrequency: 'Monthly',
  workWeek: 'Monday - Friday',
  standardWorkingHours: '8',
  lateGracePeriod: '15',
  annualLeaveDays: '16',
  sickLeaveDays: '10',
  pensionEmployeeRate: '7',
  pensionEmployerRate: '11',
  taxEnabled: true,
  emailNotifications: true,
  leaveNotifications: true,
  payrollNotifications: true,
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
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-slate-900' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

function HRSettings() {
  const [settings, setSettings] = useState(initialSettings)
  const [saved, setSaved] = useState(false)

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))

    setSaved(false)
  }

  const handleSave = () => {
    // Phase 1:
    // Settings are kept in frontend state.
    // Database persistence will be added in Phase 2.
    setSaved(true)

    window.setTimeout(() => {
      setSaved(false)
    }, 3000)
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-3">
              <Settings className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                HR Settings
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Configure company, payroll, attendance, leave, and
                notification settings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saved ? 'Saved' : 'Save Settings'}
          </button>
        </div>

        {/* Save notification */}
        {saved && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <Check className="h-5 w-5" />
            Settings updated successfully for this session.
          </div>
        )}

        {/* Company Information */}
        <SettingsCard
          icon={Building2}
          title="Company Information"
          description="Basic information used throughout the HR system."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Company Name"
              value={settings.companyName}
              onChange={(value) =>
                updateSetting('companyName', value)
              }
            />

            <Field
              label="Company Email"
              type="email"
              value={settings.companyEmail}
              onChange={(value) =>
                updateSetting('companyEmail', value)
              }
              placeholder="hr@yanoltech.com"
            />

            <Field
              label="Company Phone"
              value={settings.companyPhone}
              onChange={(value) =>
                updateSetting('companyPhone', value)
              }
              placeholder="+251 ..."
            />

            <Field
              label="Company Address"
              value={settings.companyAddress}
              onChange={(value) =>
                updateSetting('companyAddress', value)
              }
              placeholder="Add company address"
            />
          </div>
        </SettingsCard>

        {/* Payroll */}
        <SettingsCard
          icon={CircleDollarSign}
          title="Payroll Settings"
          description="Configure the basic payroll parameters used by HR."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Currency"
              value={settings.currency}
              onChange={(value) =>
                updateSetting('currency', value)
              }
              options={['ETB', 'USD', 'EUR']}
            />

            <SelectField
              label="Payroll Frequency"
              value={settings.payrollFrequency}
              onChange={(value) =>
                updateSetting('payrollFrequency', value)
              }
              options={['Monthly', 'Biweekly', 'Weekly']}
            />

            <Field
              label="Employee Pension Rate (%)"
              type="number"
              value={settings.pensionEmployeeRate}
              onChange={(value) =>
                updateSetting('pensionEmployeeRate', value)
              }
            />

            <Field
              label="Employer Pension Rate (%)"
              type="number"
              value={settings.pensionEmployerRate}
              onChange={(value) =>
                updateSetting('pensionEmployerRate', value)
              }
            />
          </div>

          <div className="mt-5">
            <Toggle
              label="Income Tax Calculation"
              description="Enable income tax as part of payroll deductions."
              checked={settings.taxEnabled}
              onChange={(value) =>
                updateSetting('taxEnabled', value)
              }
            />
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phase 3 Notice
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Statutory PAYE calculations and official Ethiopian
              payroll rules will be implemented in the payroll
              business-logic phase. These fields are currently
              configuration values only.
            </p>
          </div>
        </SettingsCard>

        {/* Attendance */}
        <SettingsCard
          icon={Clock3}
          title="Attendance Settings"
          description="Define the standard working schedule and attendance rules."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Work Week"
              value={settings.workWeek}
              onChange={(value) =>
                updateSetting('workWeek', value)
              }
              options={[
                'Monday - Friday',
                'Monday - Saturday',
                'Sunday - Thursday',
              ]}
            />

            <Field
              label="Standard Hours / Day"
              type="number"
              value={settings.standardWorkingHours}
              onChange={(value) =>
                updateSetting(
                  'standardWorkingHours',
                  value,
                )
              }
            />

            <Field
              label="Late Grace Period (Minutes)"
              type="number"
              value={settings.lateGracePeriod}
              onChange={(value) =>
                updateSetting('lateGracePeriod', value)
              }
            />
          </div>
        </SettingsCard>

        {/* Leave */}
        <SettingsCard
          icon={FileText}
          title="Leave Settings"
          description="Configure default leave allowances."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Annual Leave Days"
              type="number"
              value={settings.annualLeaveDays}
              onChange={(value) =>
                updateSetting(
                  'annualLeaveDays',
                  value,
                )
              }
            />

            <Field
              label="Sick Leave Days"
              type="number"
              value={settings.sickLeaveDays}
              onChange={(value) =>
                updateSetting(
                  'sickLeaveDays',
                  value,
                )
              }
            />
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Leave Policy
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              These values are defaults for the HR interface.
              Leave balances and company-specific policies will
              become database-driven during the backend phase.
            </p>
          </div>
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard
          icon={Bell}
          title="Notifications"
          description="Choose which HR events should generate notifications."
        >
          <div className="space-y-3">
            <Toggle
              label="Email Notifications"
              description="Allow the HR system to send employee-related email notifications."
              checked={settings.emailNotifications}
              onChange={(value) =>
                updateSetting(
                  'emailNotifications',
                  value,
                )
              }
            />

            <Toggle
              label="Leave Notifications"
              description="Notify HR when leave requests are submitted or updated."
              checked={settings.leaveNotifications}
              onChange={(value) =>
                updateSetting(
                  'leaveNotifications',
                  value,
                )
              }
            />

            <Toggle
              label="Payroll Notifications"
              description="Notify relevant users when payroll processing is completed."
              checked={settings.payrollNotifications}
              onChange={(value) =>
                updateSetting(
                  'payrollNotifications',
                  value,
                )
              }
            />
          </div>
        </SettingsCard>

        {/* Access / Security */}
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
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  Employee Management
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Enabled
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  Payroll Management
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Enabled
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  HR Reports
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Enabled
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  Database Permissions
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Phase 2
                </p>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Bottom save */}
        <div className="flex justify-end pb-4">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saved ? 'Settings Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HRSettings