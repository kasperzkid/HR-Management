// ─────────────────────────────────────────────────────────────
// Add Employee modal — shared constants & small helpers.
// ─────────────────────────────────────────────────────────────

export const ETHIOPIAN_BANKS = [
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

export function generateNextId(existingEmployees = []) {
  const nums = existingEmployees
    .map((e) => {
      const m = e.employeeId?.match(/EMP-(\d+)/i)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => !isNaN(n) && n > 0)
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `EMP-${String(max + 1).padStart(3, '0')}`
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
