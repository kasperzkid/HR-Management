/**
 * Building an employee login address from their name.
 *
 * This is presentational only. It fills the email field in the add-employee
 * form as the name is typed, so the HR Admin is not transcribing an address by
 * hand. Whatever ends up in the field is what gets saved - the server takes it
 * as given, never regenerates it, and never emails it.
 *
 * The rule is first + last word, because that is what an address like
 * "almaz.kebede@yanoltech.com" reads as. Middle names are dropped.
 */

/** The company domain used for employee logins. */
export const EMPLOYEE_EMAIL_DOMAIN = 'yanoltech.com'

/**
 * The local part for a full name, or '' when the name has nothing usable in it.
 *
 * Amharic and other non-Latin names strip down to nothing under this rule,
 * which is why the caller has to handle the empty case rather than assuming a
 * value comes back.
 */
export function emailLocalPart(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return ''

  const first = words[0]
  const last = words.length > 1 ? words[words.length - 1] : ''

  return `${first}${last ? `.${last}` : ''}`
    .normalize('NFKD') // split accented letters, so "Bekéle" -> "Bekele"
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '') // anything an address cannot carry
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

/**
 * The address to show for a name, or '' when there is nothing to build one
 * from.
 *
 * A name with no Latin characters falls back to the employee ID rather than
 * producing a bare "@yanoltech.com", which is not a usable address. This is
 * only about the text shown in the form; if the ID is not filled in either the
 * field is left empty and the normal required-field validation applies.
 */
export function previewEmployeeEmail(name, employeeId) {
  const text = String(name || '').trim()

  // Nothing typed yet. There is nothing to suggest, and returning '' keeps the
  // field genuinely empty so the required-field check still means something. The
  // employee ID fallback below is for a name that cannot be spelled in an
  // address, not for an absent one.
  if (!text) return ''

  const local = emailLocalPart(text)
  if (local) return `${local}@${EMPLOYEE_EMAIL_DOMAIN}`

  // The name is there but has no Latin characters, so the employee ID is the
  // only thing left to build an address from.
  const id = String(employeeId || '').replace(/\D/g, '')
  return id ? `emp.${id}@${EMPLOYEE_EMAIL_DOMAIN}` : ''
}

/**
 * Whether an address in the form is one this helper produced.
 *
 * Used to decide whether the field still follows the name. An address the HR
 * Admin typed themselves does not match, so their choice is left alone - which
 * is what stops the field overwriting an address they deliberately entered.
 */
export function looksGeneratedEmployeeEmail(email) {
  const value = String(email || '').trim()
  return !value || new RegExp(`^[a-z0-9.]+@${EMPLOYEE_EMAIL_DOMAIN}$`, 'i').test(value)
}

/**
 * Apply the name-derived address to an already-updated form object.
 *
 * `form` must already carry the keystroke being handled - read the names out of
 * it, not out of the previous state, or the address is built from the previous
 * value. `nameText` is whatever that form calls the full name; the two add forms
 * differ, one having a single name field and the other first/last separately.
 *
 * Returns the same object when there is nothing to do, so a caller can hand
 * this whatever it already built and take the result.
 */
export function withEmailFromName(form, nameText) {
  // The HR Admin has typed their own address. Leave it alone.
  if (!looksGeneratedEmployeeEmail(form.email)) return form

  const generated = previewEmployeeEmail(nameText, form.employeeId)

  // Nothing to build from yet. Leaving the field empty is deliberate: the
  // required-field check then says so, rather than the form offering a blank
  // address that looks filled in.
  if (!generated) return form

  return { ...form, email: generated }
}
