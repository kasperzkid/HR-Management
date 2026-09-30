/**
 * The built-in roles, as permission key lists.
 *
 * Roles are defaults, not walls. The HR Admin can change what any role grants
 * and can add or take away a single permission on one person, so these lists
 * are only the starting position. What is fixed is the rule that a person can
 * never hand out a permission they do not themselves hold - otherwise the
 * first Payroll Staff to be promoted could promote themselves to HR Admin.
 *
 * The role that decides who may manage access is therefore the one whose grant
 * is never editable at runtime.
 */

import { PERMISSION_KEYS } from './permissions.js'

const all = () => [...PERMISSION_KEYS]

const employee = (key) => key.startsWith('employees.')
const attendance = (key) => key.startsWith('attendance.')
const leave = (key) => key.startsWith('leave.')
const payroll = (key) => key.startsWith('payroll.')
const slips = (key) => key.startsWith('payment_slips.')
const admin = (key) => key.startsWith('users.')

/** Keys in the administration group, minus the one that unlocks the rest. */
const administration = all().filter(admin)

export const BUILT_IN_ROLES = [
  {
    key: 'hr_admin',
    name: 'HR Admin',
    description:
      'Full access to every part of the system, including creating HR staff and controlling who can do what. This is the only role that can manage users, roles and permissions.',
    isSystem: true,
    isProtected: true,
    permissions: all(),
  },
  {
    key: 'hr_manager',
    name: 'HR Manager',
    description:
      'Broad access across the whole HR system. Can run the day-to-day work of every module, but cannot create staff or change anyone’s access.',
    isSystem: true,
    isProtected: false,
    permissions: all().filter((key) => key !== 'users.permissions' && !admin(key)),
  },
  {
    key: 'hr_staff',
    name: 'HR Staff',
    description:
      'General HR operations: the employee directory, attendance and leave. No payroll, no deletions, no user administration.',
    isSystem: true,
    isProtected: false,
    permissions: all().filter(
      (key) =>
        (employee(key) && !key.endsWith('delete')) ||
        (attendance(key) && key === 'attendance.view') ||
        (leave(key) && key !== 'leave.delete') ||
        key === 'reports.view',
    ),
  },
  {
    key: 'payroll_staff',
    name: 'Payroll Staff',
    description:
      'Runs payroll and payment slips. Sees only the employee details those two need, and cannot change the employee directory.',
    isSystem: true,
    isProtected: false,
    permissions: all().filter(
      (key) =>
        payroll(key) || slips(key) || key === 'employees.view' || key === 'reports.view',
    ),
  },
  {
    key: 'attendance_staff',
    name: 'Attendance Staff',
    description:
      'Owns attendance: reads and corrects records, and accepts late arrivals.',
    isSystem: true,
    isProtected: false,
    permissions: all().filter(
      (key) => attendance(key) || key === 'employees.view' || key === 'leave.view',
    ),
  },
  {
    key: 'recruitment_staff',
    name: 'Recruitment Staff',
    description:
      'Owns the employee directory: adds new people, edits records and manages their logins. Cannot delete a record or touch payroll.',
    isSystem: true,
    isProtected: false,
    permissions: all().filter(
      (key) => employee(key) && key !== 'employees.delete',
    ),
  },
  {
    key: 'custom_staff',
    name: 'Custom Staff',
    description:
      'A blank slate. Nothing is granted by default - the HR Admin picks each permission by hand, which is what makes this role useful for one-off or unusual responsibilities.',
    isSystem: true,
    isProtected: false,
    // Deliberately empty. A role called "Custom" that arrived with permissions
    // would be a trap: it would look configured when nothing had been chosen.
    permissions: [],
  },
]

/** The role key that can manage users, roles and permissions. */
export const ADMIN_ROLE_KEY = 'hr_admin'

export const BUILT_IN_ROLE_KEYS = BUILT_IN_ROLES.map((role) => role.key)

/**
 * The last gate. A user can only grant a permission they hold themselves.
 *
 * HR Admin holds everything, so it can grant anything. Everyone else is
 * limited to their own set - which is what makes a role's own permission list
 * editable by an admin but not self-escalatable by the people it governs.
 */
export function grantablePermissionKeys(actorPermissionKeys) {
  const held = new Set(actorPermissionKeys)
  return PERMISSION_KEYS.filter((key) => held.has(key))
}

/** Exported for the seeder and tests. */
export { administration, all as everyPermissionKey }
