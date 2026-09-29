import { useOutletContext } from 'react-router-dom'

import { getUser } from './auth'

/**
 * Access helpers for the HR dashboard.
 *
 * The permission keys here are the ones the server enforces. They are repeated
 * rather than fetched so the UI can render without a round-trip, and so a
 * component knows what to ask for by name. The list is not authoritative in any
 * way: the server re-checks every request, so a stale or tampered list can only
 * change what is drawn, never what is allowed.
 *
 * The two readers below are deliberately forgiving. A component can be rendered
 * outside the HR layout (a modal, a test) and still ask `can(...)` without
 * crashing; it simply falls back to what the signed-in account carried at
 * login.
 */

export const PERMISSIONS = {
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_ADD: 'employees.add',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_RESUME: 'employees.resume',
  EMPLOYEES_RESET_PASSWORD: 'employees.reset_password',

  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_MANAGE: 'attendance.manage',

  LEAVE_VIEW: 'leave.view',
  LEAVE_CREATE: 'leave.create',
  LEAVE_DECIDE: 'leave.decide',
  LEAVE_DELETE: 'leave.delete',

  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_EDIT: 'payroll.edit',
  PAYROLL_DELETE: 'payroll.delete',

  PAYMENT_SLIPS_VIEW: 'payment_slips.view',
  PAYMENT_SLIPS_CREATE: 'payment_slips.create',
  PAYMENT_SLIPS_EDIT: 'payment_slips.edit',
  PAYMENT_SLIPS_DELETE: 'payment_slips.delete',

  ANNOUNCEMENTS_VIEW: 'announcements.view',
  ANNOUNCEMENTS_CREATE: 'announcements.create',
  ANNOUNCEMENTS_EDIT: 'announcements.edit',
  ANNOUNCEMENTS_DELETE: 'announcements.delete',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_PERMISSIONS: 'users.permissions',
}

/** The permissions a stored account carries, or an empty list. */
export function permissionsOf(user = getUser()) {
  return Array.isArray(user?.permissions) ? user.permissions : []
}

export function can(permission, user = getUser()) {
  return permissionsOf(user).includes(permission)
}

export function canAny(permissions, user = getUser()) {
  const held = permissionsOf(user)
  return permissions.some((permission) => held.includes(permission))
}

/**
 * The live view inside the HR dashboard.
 *
 * HRLayout re-reads the account on load and after a change, and passes the
 * result down through the outlet context. That is what makes a permission the
 * HR Admin just changed appear without a sign-out, and what makes a
 * deactivated account stop being able to do anything on its next page load.
 *
 * Falls back to the login snapshot so the very first paint is already correct
 * rather than briefly showing every button.
 */
export function useAccess() {
  const context = useOutletContext()
  const permissions = Array.isArray(context?.permissions)
    ? context.permissions
    : permissionsOf()

  return {
    permissions,
    can: (permission) => permissions.includes(permission),
    canAny: (list) => list.some((permission) => permissions.includes(permission)),
  }
}

/**
 * Renders children only when the signed-in account holds the permission.
 *
 * This is a convenience so a page does not have to thread `can` through to
 * every button. It is never the protection: the matching route and controller
 * check the same permission, which is why hiding the button and refusing the
 * request cannot drift apart.
 */
export function Can({ permission, anyOf, children, fallback = null }) {
  const { can, canAny } = useAccess()

  const allowed = anyOf ? canAny(anyOf) : can(permission)

  return allowed ? children : fallback
}

export function RequirePermission({ permission, anyOf, children, deniedFallback = null }) {
  const { can, canAny } = useAccess()

  const allowed = anyOf ? canAny(anyOf) : can(permission)

  if (allowed) return children
  if (deniedFallback) return deniedFallback

  return null
}
