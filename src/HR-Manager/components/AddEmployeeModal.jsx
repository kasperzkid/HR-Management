import { useRef, useState } from 'react'
import { X, UserPlus, FileText } from 'lucide-react'
import { useEmployeeForm } from './add-employee-modal/useEmployeeForm'
import {
  PersonalSection,
  JobSection,
  CompensationSection,
  BankingSection,
  DocumentsSection,
} from './add-employee-modal/formSections'

// Which fields belong to which section. Used for one job only: when a save is
// refused, this works out which section to scroll to, so a mistake three screens
// up is brought into view instead of just being reported in a corner.
const SECTION_FIELDS = {
  personal: ['employeeId', 'name', 'gender', 'dateOfBirth', 'phone', 'email', 'address', 'emergencyContact', 'identityIdNumber'],
  job: ['jobTitle', 'department', 'employmentType', 'joinDate', 'exitDate'],
  compensation: ['basicSalary', 'transportAllowance', 'housingAllowance', 'mealAllowance', 'otherAllowance'],
  banking: ['bankName', 'bankAccount', 'tin', 'pensionId'],
}

const SECTION_ORDER = ['personal', 'job', 'compensation', 'banking']

/**
 * Employee registration, as one page.
 *
 * Every section is on screen at once and you scroll through it. This replaced a
 * stepper that hid five of the six sections behind a Next button, which made it
 * hard to see what the form was actually going to ask for and forced a click
 * through each step to reach a figure further down.
 *
 * What replaced the stepper, and why nothing was lost:
 *   - The Next button's job was to stop you reaching a section with a missing
 *     required field. The same fields are enforced on save instead, and the
 *     form reports every problem at once rather than one per click.
 *   - The tab strip's job was to show progress. The sections are already
 *     numbered 1-6, so the numbering carries that.
 *   - Back becomes Cancel, which the X in the header never replaced cleanly.
 */
export default function AddEmployeeModal({
  isOpen, onClose, onSave, existingEmployees = [], editingEmployee = null, onEdit = null,
}) {
  const form = useEmployeeForm({ isOpen, onClose, onSave, existingEmployees, editingEmployee, onEdit })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const {
    formData, errors, shouldShowExitDate, basicSalaryNum, grossMonthly,
    isDuplicateId, isDuplicateTin, hasTin, hasBankAccount, hasIdentity,
    handleChange, handleFileChange, removeFile,
    addCertificateEntry, updateCertificateEntry, removeCertificate, handleSubmit,
  } = form

  // One node per section, so a refused save can scroll to the first problem.
  const sectionRefs = useRef({})

  const registerSection = (key) => (node) => {
    sectionRefs.current[key] = node
  }

  if (!isOpen) return null

  const handleFormSubmit = async (e) => {
    // Guarded because a single always-visible button is easy to double-click
    // while the upload and save are in flight, and two clicks used to mean two
    // employee records.
    if (saving) return

    setErr('')
    setSaving(true)

    try {
      const ok = await handleSubmit(e)
      if (ok) return

      // handleSubmit has populated `errors` with everything that is wrong.
      // Scroll to the first section that owns one, so the message and the
      // highlighted field are on screen together.
      const firstBad = SECTION_ORDER.find((key) =>
        SECTION_FIELDS[key]?.some((field) => errors[field]),
      )

      if (firstBad && sectionRefs.current[firstBad]) {
        sectionRefs.current[firstBad].scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    } catch (error) {
      setErr(error.message || 'Unable to save employee')
    } finally {
      setSaving(false)
    }
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

        {/* ─── CONTENT: every section, one scroll ─── */}
        <form
          onSubmit={handleFormSubmit}
          // The browser's own bubbles are switched off deliberately. They would
          // stop the submit before the real validation runs, so a field would
          // be flagged in the browser but carry none of this form's styled
          // messages, and the section scroll-to-error below would never happen.
          noValidate
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6 text-xs min-w-0">

            <div ref={registerSection('personal')}>
              <PersonalSection formData={formData} errors={errors} isDuplicateId={isDuplicateId} hasIdentity={hasIdentity} handleChange={handleChange} handleFileChange={handleFileChange} removeFile={removeFile} />
            </div>

            <div ref={registerSection('job')} className="mt-8">
              <JobSection formData={formData} errors={errors} shouldShowExitDate={shouldShowExitDate} handleChange={handleChange} />
            </div>

            <div ref={registerSection('compensation')} className="mt-8">
              <CompensationSection formData={formData} errors={errors} grossMonthly={grossMonthly} basicSalaryNum={basicSalaryNum} handleChange={handleChange} />
            </div>

            <div ref={registerSection('banking')} className="mt-8">
              <BankingSection formData={formData} isDuplicateTin={isDuplicateTin} hasTin={hasTin} hasBankAccount={hasBankAccount} handleChange={handleChange} />
            </div>

            <div className="mt-8">
              <DocumentsSection formData={formData} handleFileChange={handleFileChange} removeFile={removeFile} addCertificateEntry={addCertificateEntry} updateCertificateEntry={updateCertificateEntry} removeCertificate={removeCertificate} />
            </div>

            <div className="mt-8 space-y-4">
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

            {/* Save-time error */}
            {err && (
              <p className="mt-5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg px-3 py-2">{err}</p>
            )}
          </div>

          {/* Actions (pinned) */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 dark:border-[#262b31] bg-gray-50/70 dark:bg-[#0d1015] flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#15181d] hover:bg-gray-100 dark:hover:bg-[#1c2026] border border-gray-300 dark:border-[#33383f] rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              Cancel
            </button>

            <button type="submit" disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2">
              <UserPlus size={15} />
              <span>
                {saving
                  ? 'Saving...'
                  : editingEmployee
                    ? 'Save Changes'
                    : 'Add Employee'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
