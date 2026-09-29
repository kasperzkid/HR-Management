/**
 * The one place that decides what an account is allowed to do.
 *
 * Two rules, and the second is the important one:
 *
 *   1. Effective = (role grants + ALLOW overrides) - DENY overrides.
 *   2. A caller can only hand out a permission they hold themselves.
 *
 * Rule 2 is what stops a Payroll Staff member who has been given
 * `users.view` from promoting themselves. There is no separate "is this an
 * admin" bypass anywhere in the permission check - HR Admin is simply a role
 * whose grant set is every permission, so it satisfies rule 2 for all of them
 * while everyone else is bounded by their own list.
 *
 * Permissions are read from the database on every request rather than baked
 * into the JWT. That costs one query, and it buys the property that removing
 * somebody's access takes effect on their very next request instead of up to
 * eight hours later, when their token would have expired.
 */

import prisma from '../db.js'
import { PERMISSION_KEYS } from './permissions.js'
import { ADMIN_ROLE_KEY, grantablePermissionKeys } from './roles.js'

/** A user shape with no RBAC link at all can never hold a permission. */
function isHrAccount(user) {
  return Boolean(user?.hrRoleId)
}

/**
 * The permissions a user effectively holds, as a Set of keys.
 *
 * Returns an empty set for anything that is not an HR account, so a missing
 * `hrRoleId` denies everything rather than falling through to "allow".
 */
export async function effectivePermissions(user) {
  if (!isHrAccount(user)) return new Set()

  const rows = await prisma.userPermission.findMany({
    where: { userId: user.id },
    select: { effect: true, permission: { select: { key: true } } },
  })

  const roleRows = await prisma.rolePermission.findMany({
    where: { roleId: user.hrRoleId },
    select: { permission: { select: { key: true } } },
  })

  const granted = new Set(roleRows.map((row) => row.permission.key))

  for (const row of rows) {
    if (row.effect === 'DENY') {
      granted.delete(row.permission.key)
    } else {
      granted.add(row.permission.key)
    }
  }

  return granted
}

/**
 * Whether a user holds a permission, and why not when they do not.
 *
 * The reason is returned so the 403 body can name the missing permission,
 * which is what makes a denial debuggable instead of mysterious.
 */
export async function hasPermission(user, permissionKey) {
  if (!isHrAccount(user)) {
    return { allowed: false, reason: 'not_an_hr_account' }
  }

  if (user.isActive === false) {
    return { allowed: false, reason: 'account_deactivated' }
  }

  const permissions = await effectivePermissions(user)
  return permissions.has(permissionKey)
    ? { allowed: true, reason: null }
    : { allowed: false, reason: 'missing_permission' }
}

/** Any of the given permissions is enough. Used for read-or-write pairs. */
export async function hasAnyPermission(user, permissionKeys) {
  if (!isHrAccount(user)) return false
  if (user.isActive === false) return false

  const permissions = await effectivePermissions(user)
  return permissionKeys.some((key) => permissions.has(key))
}

export async function isAdmin(user) {
  const { allowed } = await hasPermission(user, 'users.permissions')
  return allowed
}

/**
 * The payload the UI needs to render checkboxes and hide buttons.
 *
 * `role` and `overrides` are included so the permission screen can show what a
 * person inherits versus what was changed for them individually, and highlight
 * the two where they disagree.
 */
export async function describePermissions(user) {
  const permissions = await effectivePermissions(user)
  const overrides = await prisma.userPermission.findMany({
    where: { userId: user.id },
    select: { effect: true, permission: { select: { key: true } } },
    orderBy: { permission: { key: 'asc' } },
  })

  const role = user.hrRoleId
    ? await prisma.role.findUnique({
        where: { id: user.hrRoleId },
        select: { key: true, name: true, description: true },
      })
    : null

  return {
    role,
    permissions: [...permissions].sort(),
    overrides: overrides.map((row) => ({
      key: row.permission.key,
      effect: row.effect,
    })),
  }
}

/**
 * Which permission keys the caller is even allowed to hand out.
 *
 * Intersected with what the target would end up with, so the UI cannot be
 * talked into offering a checkbox the server would refuse.
 */
export function grantableKeys(actorPermissionKeys) {
  return grantablePermissionKeys(actorPermissionKeys)
}

export { PERMISSION_KEYS, ADMIN_ROLE_KEY }
