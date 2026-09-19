import { useState } from 'react'
import { X, UserPlus, User, Briefcase, DollarSign, CreditCard, UploadCloud, FileText, ChevronRight, ChevronLeft } from 'lucide-react'
import { useEmployeeForm } from './add-employee-modal/useEmployeeForm'
import {
  PersonalSection,
  JobSection,
  CompensationSection,
  BankingSection,
  DocumentsSection,
} from './add-employee-modal/formSections'

const STEPS = [
  { key: 'personal', icon: User, label: 'Personal & ID' },
  { key: 'job', icon: Briefcase, label: 'Job & Employment' },
  { key: 'compensation', icon: DollarSign, label: 'Compensation' },
  { key: 'banking', icon: CreditCard, label: 'Banking & Tax' },
  { key: 'documents', icon: UploadCloud, label: 'Documents' },
  { key: 'notes', icon: FileText, label: 'Notes & Review' },
]

function sectionMissingFields(key, form) {
  if (key === 'personal') {
    const m = []
    if (!form.name?.trim()) m.push('Full Name')
    return m
  }
  if (key === 'job') {
    const m = []
    if (!form.jobTitle?.trim()) m.push('Job Title')
    if (!form.department?.trim()) m.push('Department')
    return m
  }
  return []
}

export default function AddEmployeeModal({
  isOpen, onClose, onSave, existingEmployees = [], editingEmployee = null, onEdit = null,
}) {
  const form = useEmployeeForm({ isOpen, onClose, onSave, existingEmployees, editingEmployee, onEdit })
  const [active, setActive] = useState(0)
  const [err, setErr] = useState('')

  const {
    formData, errors, shouldShowExitDate, basicSalaryNum, grossMonthly,
    isDuplicateId, isDuplicateTin, hasTin, hasBankAccount, hasIdentity,
    handleChange, handleFileChange, removeFile,
    addCertificateEntry, updateCertificateEntry, removeCertificate, handleSubmit,
  } = form

  if (!isOpen) return null

  const step = STEPS[active]

  const go = (i) => {
    if (i === active) return
    if (i > active) {
      const miss = sectionMissingFields(STEPS[active].key, formData)
      if (miss.length) { setErr(`Complete first: ${miss.join(', ')}`); return }
    }
    setErr(''); setActive(i)
  }

  const next = () => {
    const miss = sectionMissingFields(step.key, formData)
    if (miss.length) { setErr(`Complete first: ${miss.join(', ')}`); return }
    setErr(''); setActive((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => { setErr(''); setActive((s) => Math.max(s - 1, 0)) }
  const isLast = active === STEPS.length - 1

  const STEP_FIELDS = {
    personal: ['employeeId', 'name', 'gender', 'dateOfBirth', 'phone', 'email', 'address', 'emergencyContact', 'identityIdNumber'],
    job: ['jobTitle', 'department', 'employmentType', 'joinDate', 'exitDate'],
    compensation: ['basicSalary', 'transportAllowance', 'housingAllowance', 'mealAllowance', 'otherAllowance'],
    banking: ['bankName', 'bankAccount', 'tin', 'pensionId'],
  }

  const handleFormSubmit = (e) => {
    const ok = form.handleSubmit(e)
    if (ok) return
    const firstBad = STEPS.findIndex((s) => STEP_FIELDS[s.key]?.some((f) => errors[f]))
    if (firstBad !== -1 && firstBad !== active) {
      setErr(`Please fix the highlighted fields in "${STEPS[firstBad].label}"`)
      setActive(firstBad)
    } else {
      setErr('Please fix the highlighted fields before saving')
    }
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-[#262b31] w-full max-w-6xl overflow-hidden flex flex-col my-auto max-h-[96vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#262b31] bg-gradient-to-r from-gray-50 dark:from-[#1c2026] via-white dark:via-[#15181d] to-gray-50 dark:to-[#1c2026] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center shadow-xs shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 id="add-employee-title" className="text-base font-black text-gray-950 dark:text-gray-100">
                {editingEmployee ? 'Edit Employee Registration' : 'New Employee Registration'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {editingEmployee ? 'Update employee record with statutory compliance' : 'Onboard employee record with Ethiopian tax compliance & data checks'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#1c2026] rounded-lg transition-colors cursor-pointer" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* ─── TOP TABS ─── */}
        <div className="border-b border-gray-200 dark:border-[#262b31] bg-gray-50/60 dark:bg-[#0d1015] px-3 pt-2 overflow-x-auto shrink-0">
          <nav className="flex items-end gap-0.5 min-w-max" aria-label="Employee form sections">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active_ = i === active
              const done = i < active
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go(i)}
                  className={`group relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border border-b-0 transition-all cursor-pointer whitespace-nowrap ${
                    active_
                      ? 'bg-white dark:bg-[#15181d] border-gray-200 dark:border-[#33383f] text-gray-950 dark:text-gray-100 shadow-sm -mb-px z-10'
                      : done
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/10 border-transparent text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                      : 'bg-transparent border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-[#1c2026]'
                  }`}
                >
                  <Icon size={14} className={active_ ? 'text-blue-600 dark:text-blue-400' : done ? 'text-emerald-500' : ''} />
                  <span>{s.label}</span>
                  {done && (
                    <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ─── CONTENT ─── */}
        <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Scrollable section body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 text-xs min-w-0">

          {step.key === 'personal' && (
            <PersonalSection formData={formData} errors={errors} isDuplicateId={isDuplicateId} hasIdentity={hasIdentity} handleChange={handleChange} handleFileChange={handleFileChange} removeFile={removeFile} />
          )}
          {step.key === 'job' && (
            <JobSection formData={formData} errors={errors} shouldShowExitDate={shouldShowExitDate} handleChange={handleChange} />
          )}
          {step.key === 'compensation' && (
            <CompensationSection formData={formData} errors={errors} grossMonthly={grossMonthly} basicSalaryNum={basicSalaryNum} handleChange={handleChange} />
          )}
          {step.key === 'banking' && (
            <BankingSection formData={formData} isDuplicateTin={isDuplicateTin} hasTin={hasTin} hasBankAccount={hasBankAccount} handleChange={handleChange} />
          )}
          {step.key === 'documents' && (
            <DocumentsSection formData={formData} handleFileChange={handleFileChange} removeFile={removeFile} addCertificateEntry={addCertificateEntry} updateCertificateEntry={updateCertificateEntry} removeCertificate={removeCertificate} />
          )}
          {step.key === 'notes' && (
            <div className="space-y-4">
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
                rows={6}
                placeholder="Internal HR onboarding notes, probation clauses, equipment assigned, or special conditions..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:placeholder:text-gray-500"
              />
            </div>
          )}

          {/* Step error */}
          {err && (
            <p className="mt-4 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg px-3 py-2">{err}</p>
          )}
          </div>

          {/* Step nav (pinned) */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 dark:border-[#262b31] bg-gray-50/70 dark:bg-[#0d1015] flex items-center justify-between gap-3">
            <button type="button" onClick={back} disabled={active === 0}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#15181d] hover:bg-gray-100 dark:hover:bg-[#1c2026] border border-gray-300 dark:border-[#33383f] rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <ChevronLeft size={14} /> Back
            </button>
            {!isLast ? (
              <button type="button" onClick={next}
                className="px-5 py-2 text-xs font-bold text-white bg-gray-950 hover:bg-black dark:hover:bg-gray-600 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5">
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2">
                <UserPlus size={15} />
                <span>{editingEmployee ? 'Save Changes' : 'Add Employee'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}