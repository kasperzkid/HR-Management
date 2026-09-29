/**
 * The permission catalogue.
 *
 * This is the single source of truth for what exists. The seed writes it into
 * the database, the API serves it to the UI, and the UI groups it by `group`.
 * Adding a permission here and re-running the seed is the whole job - the
 * guards, the checkboxes and the 403s all read from the database.
 *
 * The keys are the contract. `View/Add/Edit/Delete Employees` becomes four
 * separate permissions rather than one "manage employees" flag, because the
 * common case in HR is somebody who can read the directory and edit a record
 * but must never be able to remove one.
 */

export const PERMISSION_GROUPS = [
  { key: 'employees', label: 'Employee Directory' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'payment_slips', label: 'Payment Slips' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'HR Settings' },
  { key: 'administration', label: 'User & Role Administration' },
]

/**
 * Every permission, in the order the UI shows them.
 *
 * `risk` is only a label the UI uses to sort destructive things to the end of a
 * group. It is not an authorisation decision - the guards below are.
 */
export const PERMISSIONS = [
  // ── Employee Directory ──────────────────────────────────────────────
  {
    key: 'employees.view',
    name: 'View employees',
    description: 'Open the employee directory and read employee records.',
    group: 'employees',
    risk: 'read',
  },
  {
    key: 'employees.add',
    name: 'Add employees',
    description: 'Create a new employee record and their login account.',
    group: 'employees',
    risk: 'write',
  },
  {
    key: 'employees.edit',
    name: 'Edit employees',
    description: 'Change details on an existing employee record.',
    group: 'employees',
    risk: 'write',
  },
  {
    key: 'employees.delete',
    name: 'Delete employees',
    description:
      'Permanently remove an employee and everything attached to them: attendance, leave, payroll and their login. This is the hardest permission in the system to hand out by accident.',
    group: 'employees',
    risk: 'destructive',
  },
  {
    key: 'employees.resume',
    name: 'View employee resumes',
    description: 'Download the CV and identity documents attached to a record.',
    group: 'employees',
    risk: 'sensitive',
  },
  {
    key: 'employees.reset_password',
    name: 'Reset employee passwords',
    description:
      "Issue a new temporary password for an employee's login and read the password back.",
    group: 'employees',
    risk: 'sensitive',
  },

  // ── Attendance ──────────────────────────────────────────────────────
  {
    key: 'attendance.view',
    name: 'View attendance',
    description: 'Read attendance records and the monthly summary.',
    group: 'attendance',
    risk: 'read',
  },
  {
    key: 'attendance.manage',
    name: 'Manage attendance',
    description:
      'Create, edit and delete attendance records, and accept late arrivals.',
    group: 'attendance',
    risk: 'write',
  },

  // ── Leave ───────────────────────────────────────────────────────────
  {
    key: 'leave.view',
    name: 'View leave requests',
    description: 'Read leave requests from everyone.',
    group: 'leave',
    risk: 'read',
  },
  {
    key: 'leave.create',
    name: 'Create leave requests',
    description: 'Raise a new leave request.',
    group: 'leave',
    risk: 'write',
  },
  {
    key: 'leave.decide',
    name: 'Approve or reject leave',
    description:
      'Approve or reject a request, including setting the decision reason.',
    group: 'leave',
    risk: 'write',
  },
  {
    key: 'leave.delete',
    name: 'Delete leave requests',
    description: 'Remove a leave request entirely.',
    group: 'leave',
    risk: 'destructive',
  },

  // ── Payroll ─────────────────────────────────────────────────────────
  {
    key: 'payroll.view',
    name: 'View payroll',
    description: 'Read payroll records, including salaries.',
    group: 'payroll',
    risk: 'sensitive',
  },
  {
    key: 'payroll.create',
    name: 'Create payroll',
    description: 'Generate a payroll record for a month.',
    group: 'payroll',
    risk: 'write',
  },
  {
    key: 'payroll.edit',
    name: 'Edit payroll',
    description: 'Change an existing payroll record.',
    group: 'payroll',
    risk: 'write',
  },
  {
    key: 'payroll.delete',
    name: 'Delete payroll',
    description: 'Remove a payroll record.',
    group: 'payroll',
    risk: 'destructive',
  },

  // ── Payment Slips ───────────────────────────────────────────────────
  {
    key: 'payment_slips.view',
    name: 'View payment slips',
    description: 'Read generated payment slips.',
    group: 'payment_slips',
    risk: 'sensitive',
  },
  {
    key: 'payment_slips.create',
    name: 'Create payment slips',
    description: 'Generate payment slips for employees.',
    group: 'payment_slips',
    risk: 'write',
  },
  {
    key: 'payment_slips.edit',
    name: 'Edit payment slips',
    description: 'Change a payment slip after it has been generated.',
    group: 'payment_slips',
    risk: 'write',
  },
  {
    key: 'payment_slips.delete',
    name: 'Delete payment slips',
    description: 'Remove a payment slip.',
    group: 'payment_slips',
    risk: 'destructive',
  },

  // ── Announcements ───────────────────────────────────────────────────
  {
    key: 'announcements.view',
    name: 'View announcements',
    description: 'Read company announcements, including drafts.',
    group: 'announcements',
    risk: 'read',
  },
  {
    key: 'announcements.create',
    name: 'Create announcements',
    description: 'Publish a company-wide or individual announcement.',
    group: 'announcements',
    risk: 'write',
  },
  {
    key: 'announcements.edit',
    name: 'Edit announcements',
    description: 'Change an announcement after publishing.',
    group: 'announcements',
    risk: 'write',
  },
  {
    key: 'announcements.delete',
    name: 'Delete announcements',
    description: 'Remove an announcement.',
    group: 'announcements',
    risk: 'destructive',
  },

  // ── Reports ─────────────────────────────────────────────────────────
  {
    key: 'reports.view',
    name: 'View reports',
    description: 'Read the HR reports and analytics pages.',
    group: 'reports',
    risk: 'read',
  },
  {
    key: 'reports.export',
    name: 'Export reports',
    description: 'Download report data as a file.',
    group: 'reports',
    risk: 'sensitive',
  },

  // ── HR Settings ─────────────────────────────────────────────────────
  {
    key: 'settings.view',
    name: 'View HR settings',
    description: 'Read attendance rules, departments, job titles and related settings.',
    group: 'settings',
    risk: 'read',
  },
  {
    key: 'settings.edit',
    name: 'Edit HR settings',
    description: 'Change any HR setting, including attendance rules and the shared lists.',
    group: 'settings',
    risk: 'write',
  },

  // ── User & Role Administration ──────────────────────────────────────
  {
    key: 'users.view',
    name: 'View HR users',
    description: 'See the list of HR staff accounts and their permissions.',
    group: 'administration',
    risk: 'read',
  },
  {
    key: 'users.create',
    name: 'Create HR users',
    description: 'Create a new HR staff login and receive its temporary password.',
    group: 'administration',
    risk: 'sensitive',
  },
  {
    key: 'users.edit',
    name: 'Edit HR users',
    description: "Change a staff member's name, role or active state.",
    group: 'administration',
    risk: 'sensitive',
  },
  {
    key: 'users.delete',
    name: 'Delete HR users',
    description: 'Permanently remove an HR staff account.',
    group: 'administration',
    risk: 'destructive',
  },
  {
    key: 'users.permissions',
    name: 'Manage permissions',
    description:
      'Grant or take away individual permissions, and change what a role grants. Required for everything else in this group to be meaningful.',
    group: 'administration',
    risk: 'sensitive',
  },
]

/** The permission that governs the administration group. */
export const MANAGE_PERMISSIONS = 'users.permissions'

export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key)

/** Keys grouped by their group, in catalogue order. Used by the seeder. */
export function permissionKeysByGroup() {
  return PERMISSION_GROUPS.map((group) => ({
    ...group,
    keys: PERMISSIONS.filter((permission) => permission.group === group.key).map(
      (permission) => permission.key,
    ),
  }))
}
