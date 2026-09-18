import { INITIAL_EMPLOYEES } from '../data/employeeData'

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export function getCurrentEmployee() {
  const user = getCurrentUser()
  if (!user) return INITIAL_EMPLOYEES[0]

  if (user.employeeId) {
    const found = INITIAL_EMPLOYEES.find((e) => e.employeeId === user.employeeId)
    if (found) return found
  }
  if (user.email) {
    const found = INITIAL_EMPLOYEES.find(
      (e) => e.email && e.email.toLowerCase() === user.email.toLowerCase()
    )
    if (found) return found
  }
  if (user.name) {
    const found = INITIAL_EMPLOYEES.find(
      (e) => e.name && e.name.toLowerCase() === user.name.toLowerCase()
    )
    if (found) return found
  }
  return INITIAL_EMPLOYEES[0]
}

export function resolveEmployee(employees = []) {
  const user = getCurrentUser()
  if (!user) return employees[0] || null

  if (user.employeeId) {
    const found = employees.find((e) => e.employeeId === user.employeeId)
    if (found) return found
  }
  if (user.email) {
    const found = employees.find(
      (e) => e.email && e.email.toLowerCase() === user.email.toLowerCase()
    )
    if (found) return found
  }
  if (user.name) {
    const found = employees.find(
      (e) => e.name && e.name.toLowerCase() === user.name.toLowerCase()
    )
    if (found) return found
  }
  return employees[0] || null
}
