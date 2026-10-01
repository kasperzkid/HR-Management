// ─────────────────────────────────────────────────────────────
// COMPLAINTS — shared helpers for Employee → HR Admin complaints.
//
// A complaint is a normal inbox message flagged with `isComplain`
// (Message.isComplain in prisma/schema.prisma) so the HR Admin can
// tell it apart from routine chat in the thread.
//
// Because the Message model has no dedicated category column, the
// selected category is written into the message text with a stable
// prefix so both portals can render it back as a labelled block:
//
//   [Complaint · Payroll & Salary] My overtime pay is missing.
//
// ─────────────────────────────────────────────────────────────

export const COMPLAINT_CATEGORIES = [
  {
    value: 'Attendance & Time',
    hint: 'Late marks, missing punches, overtime hours',
  },
  {
    value: 'Payroll & Salary',
    hint: 'Pay, deductions, allowances, payslips',
  },
  {
    value: 'Leave & Time Off',
    hint: 'Leave balance, rejected or missing requests',
  },
  {
    value: 'Workplace Conduct',
    hint: 'Harassment, discrimination, behaviour concerns',
  },
  {
    value: 'Work Environment',
    hint: 'Safety, equipment, facilities, workload',
  },
  {
    value: 'Other',
    hint: 'Anything that does not fit the categories above',
  },
]

export const DEFAULT_COMPLAINT_CATEGORY = COMPLAINT_CATEGORIES[0].value

const COMPLAINT_REGEX = /^\s*\[Complaint(?:\s*·\s*(?<category>[^\]]*))?\]\s*(?<body>[\s\S]*)$/

/**
 * Build the message text stored on the server for a complaint.
 */
export function buildComplaintText(category, body) {
  const label = String(category || '').trim() || DEFAULT_COMPLAINT_CATEGORY
  const detail = String(body || '').trim()
  return `[Complaint · ${label}] ${detail}`.trim()
}

/**
 * Split a stored complaint message back into { category, body }.
 * Returns null when the text is not a complaint message.
 */
export function parseComplaintText(text) {
  const match = COMPLAINT_REGEX.exec(String(text || ''))
  if (!match || !match.groups) return null
  return {
    category: (match.groups.category || '').trim() || 'General',
    body: (match.groups.body || '').trim(),
  }
}

/**
 * Pick the HR Admin a complaint should be delivered to.
 * Falls back to the first contact so the employee is never blocked.
 */
export function findHrAdminContact(contacts = []) {
  return (
    contacts.find((c) => c.isHR) ||
    contacts.find((c) => c.role === 'HR_MANAGER' || c.role === 'ADMIN' || c.role === 'HR_ADMIN') ||
    contacts.find((c) => String(c.roleLabel || '').toLowerCase().includes('hr')) ||
    null
  )
}
