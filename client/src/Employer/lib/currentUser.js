import { fetchEmployees } from './employerApi'

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

// Safe placeholder so pages never crash while loading or when no
// employee record matches the logged-in user.
export function placeholderEmployee(user = null) {
  return {
    employeeId: user?.employeeId || '—',
    name: user?.name || 'Current User',
    email: user?.email || '',
    department: '',
    jobTitle: '',
    joinDate: '',
    basicSalary: 0,
    employmentType: 'Permanent',
    employmentStatus: 'Active',
    transportAllowance: 0,
    housingAllowance: 0,
    mealAllowance: 0,
    otherAllowance: 0,
    otherDeductions: 0,
    loanDeductions: 0,
    tin: '',
    bankName: '',
    bankAccount: '',
    pensionId: '',
  }
}

export function matchEmployee(employees, user) {
  if (!Array.isArray(employees) || employees.length === 0) return null
  if (!user) return null

  if (user.employeeId) {
    const byId = employees.find((e) => e.employeeId === user.employeeId)
    if (byId) return byId
  }
  if (user.email) {
    const byEmail = employees.find(
      (e) => e.email && e.email.toLowerCase() === user.email.toLowerCase()
    )
    if (byEmail) return byEmail
  }
  if (user.name) {
    const byName = employees.find(
      (e) => e.name && e.name.toLowerCase() === user.name.toLowerCase()
    )
    if (byName) return byName
  }
  return null
}

// Synchronous resolver used by pages once employees are loaded
export function resolveEmployee(employees, user = getCurrentUser()) {
  return matchEmployee(employees, user) || placeholderEmployee(user)
}

// Async helper for standalone usage (effect-based pages)
export async function getCurrentEmployeeAsync() {
  const user = getCurrentUser()
  try {
    const employees = await fetchEmployees()
    return matchEmployee(employees, user) || placeholderEmployee(user)
  } catch {
    return placeholderEmployee(user)
  }
}
