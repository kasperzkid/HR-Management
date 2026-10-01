/**
 * HR user and role administration.
 *
 * Each route is guarded by the specific permission it needs (see
 * server/routes/hr-users.routes.js), so a custom role can be given "create HR
 * users" without also being able to change what anyone is allowed to do. By
 * default only HR Admin holds any of the administration permissions, which is
 * what "only HR Admin can manage users, roles and permissions" means in
 * practice.
 *
 * The checks in this file are the ones that are about *which* change is being
 * made rather than whether the caller may make changes at all:
 *
 *   - nobody may change their own role, permissions or active state
 *   - nobody may act on an account that outranks them
 *   - nobody may hand out a permission they do not hold themselves
 *   - the last HR Admin may not be demoted, deactivated or deleted
 *
 * Those four rules are what make "HR staff cannot give themselves permissions"
 * and "HR staff cannot promote themselves to HR Admin" true even for an account
 * that legitimately holds a users.* permission.
 */

import crypto from 'node:crypto'
import prisma from '../db.js'
import { hashPassword, isValidEmail, normalizeEmail } from '../utils/security.js'
import { PERMISSION_GROUPS, PERMISSION_KEYS } from '../rbac/permissions.js'
import { ADMIN_ROLE_KEY } from '../rbac/roles.js'
import { describePermissions, effectivePermissions } from '../rbac/rbac.service.js'

/**
 * A generated password must not be ambiguous to retype, and must be strong
 * enough that a shared one is not a liability.
 */
function generateTemporaryPassword() {
  return crypto.randomBytes(12).toString('base64url')
}

function fail(res, error, message) {
  console.error(message, error)
  return res.status(500).json({ message })
}

/** One shape for an HR account, everywhere. Never includes a password. */
function toHrUserPayload(account, permissionInfo) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    isActive: account.isActive !== false,
    mustChangePassword: Boolean(account.mustChangePassword),
    createdAt: account.createdAt,
    hrRole: permissionInfo.role,
    permissions: permissionInfo.permissions,
    overrides: permissionInfo.overrides,
  }
}

/** The caller (already loaded by the guard) plus their effective permissions. */
async function actorContext(req) {
  const permissions = await effectivePermissions(req.account)
  return { account: req.account, permissions }
}

/** Permission keys a role would grant. */
async function permissionKeysForRole(roleId) {
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { key: true } } },
  })
  return rows.map((row) => row.permission.key)
}

/** How many *other* active accounts currently hold the administration permission. */
async function otherActiveAdminCount(excludingUserId) {
  const admins = await prisma.user.findMany({
    where: {
      isActive: true,
      NOT: { id: excludingUserId },
      hrRole: { permissions: { some: { permission: { key: 'users.permissions' } } } },
    },
    select: { id: true },
  })
  return admins.length
}

const lastAdminResponse = (action) => ({
  status: 409,
  code: 'LAST_ADMIN',
  message: `This is the only active HR Admin account, so it cannot be ${action}. Create or promote another HR Admin first.`,
})

/**
 * The rules protecting a target account from the caller.
 *
 * `selfAllowed` is true only for changes that are not about access - renaming
 * yourself is fine, changing what you are allowed to do is not.
 *
 * Returns an error object to send, or null when the change may proceed.
 */
async function guardTarget(req, target, { selfAllowed = false, destructive = false } = {}) {
  const { account: actor, permissions: actorPermissions } = await actorContext(req)

  if (target.id === actor.id && !selfAllowed) {
    return {
      status: 403,
      code: 'SELF_MODIFICATION',
      message:
        'You cannot change your own role, permissions or active state. Ask another HR Admin to do it for you.',
    }
  }

  const targetInfo = await describePermissions(target)
  const targetIsAdmin = targetInfo.permissions.includes('users.permissions')

  // Only somebody who is themselves an admin may act on an admin. This is what
  // stops a delegated account (users.edit but not users.permissions) from
  // deactivating or rewriting the person who governs them.
  if (targetIsAdmin && !actorPermissions.has('users.permissions')) {
    return {
      status: 403,
      code: 'TARGET_OUTRANKS_ACTOR',
      message: 'Only an HR Admin can change another HR Admin account.',
    }
  }

  // The last active admin is the only account that can put everything back, so
  // it is never the one that gets removed, deactivated or demoted.
  if (targetIsAdmin && target.isActive !== false) {
    if ((await otherActiveAdminCount(target.id)) === 0) {
      return lastAdminResponse(destructive ? 'deleted' : 'changed')
    }
  }

  return null
}

function sendGuard(res, guard) {
  return res.status(guard.status).json({ message: guard.message, code: guard.code })
}

// ─────────────────────────────────────────────────────────────────────────
// Catalogue
// ─────────────────────────────────────────────────────────────────────────

/** The permission catalogue and the roles, for the permission screen. */
export async function getRbacCatalogue(req, res) {
  try {
    const { permissions } = await actorContext(req)

    const roles = await prisma.role.findMany({
      orderBy: [{ isProtected: 'desc' }, { key: 'asc' }],
      include: { permissions: { select: { permission: { select: { key: true } } } } },
    })

    const rows = await prisma.permission.findMany({
      select: { key: true, name: true, description: true, group: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    })

    // The UI is told which permissions this caller may hand out so it never
    // offers a checkbox the server would refuse. The check still runs on every
    // write - this only stops the screen from lying about what is possible.
    return res.json({
      groups: PERMISSION_GROUPS,
      permissions: rows,
      roles: roles.map((role) => ({
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isProtected: role.isProtected,
        permissions: role.permissions.map((row) => row.permission.key).sort(),
      })),
      grantable: [...permissions].filter((key) => PERMISSION_KEYS.includes(key)).sort(),
    })
  } catch (error) {
    return fail(res, error, 'Failed to load the permission catalogue')
  }
}

/** The roles, with whether this caller could actually assign each one. */
/**
 * Create a new role.
 *
 * The key is derived from the name rather than accepted from the caller, so it
 * is always a safe identifier and always matches the name on screen. The
 * permission list is checked against the same rule as everywhere else: an
 * admin cannot build a role that hands out more than they hold, otherwise the
 * first role they create could grant itself `users.permissions` and hand the
 * next admin an escalation path.
 *
 * A new role is never protected, so it can always be edited afterwards.
 */
export async function createRole(req, res) {
  try {
    const name = String(req.body?.name || '').trim()
    const description = String(req.body?.description || '').trim()

    if (!name) {
      return res.status(400).json({ message: 'Give the role a name.' })
    }

    if (name.length > 80) {
      return res.status(400).json({ message: 'Role names must be 80 characters or fewer.' })
    }

    if (description.length > 400) {
      return res
        .status(400)
        .json({ message: 'Role descriptions must be 400 characters or fewer.' })
    }

    const requested = req.body?.permissions
    if (requested != null && !Array.isArray(requested)) {
      return res.status(400).json({ message: 'Send "permissions" as an array of permission keys.' })
    }

    const catalogue = await prisma.permission.findMany({ select: { id: true, key: true } })
    const idByKey = new Map(catalogue.map((row) => [row.key, row.id]))

    const keys = [...new Set((requested || []).map((key) => String(key)))]

    const unknown = keys.filter((key) => !idByKey.has(key))
    if (unknown.length) {
      return res.status(400).json({ message: `Unknown permission(s): ${unknown.join(', ')}` })
    }

    const { permissions: actorPermissions } = await actorContext(req)
    const beyondActor = keys.filter((key) => !actorPermissions.has(key))

    if (beyondActor.length) {
      return res.status(403).json({
        code: 'PERMISSION_EXCEEDS_ACTOR',
        message:
          'You cannot grant a permission you do not hold yourself. Beyond yours: ' +
          beyondActor.join(', '),
        permissions: beyondActor,
      })
    }

    // Derived from the name, and unique against every existing key. The
    // collision check is what turns a duplicate name into a clear message
    // rather than a Prisma constraint error.
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)

    if (!base) {
      return res.status(400).json({
        message: 'Give the role a name made of letters or numbers.',
      })
    }

    let key = base
    for (let suffix = 2; await prisma.role.findUnique({ where: { key } }); suffix += 1) {
      key = `${base}_${suffix}`
    }

    const role = await prisma.role.create({
      data: {
        key,
        name,
        description,
        isSystem: false,
        isProtected: false,
        ...(keys.length
          ? {
              permissions: {
                create: keys.map((permissionKey) => ({
                  permission: { connect: { key: permissionKey } },
                })),
              },
            }
          : {}),
      },
      select: { key: true, name: true, description: true, isSystem: true, isProtected: true },
    })

    return res.status(201).json({
      role: { ...role, permissions: keys.sort() },
      message: `Created the ${name} role with ${keys.length} permission(s).`,
    })
  } catch (error) {
    return fail(res, error, 'Failed to create the role')
  }
}


/**
 * Delete a custom or non-protected role.
 */
export async function deleteRole(req, res) {
  try {
    const key = String(req.params.key || '').trim()

    if (!key) {
      return res.status(400).json({ message: 'Role key is required.' })
    }

    const role = await prisma.role.findUnique({
      where: { key },
      include: {
        _count: {
          select: { users: true },
        },
      },
    })

    if (!role) {
      return res.status(404).json({ message: 'Role not found.' })
    }

    if (role.isProtected || role.key === ADMIN_ROLE_KEY) {
      return res.status(403).json({
        code: 'PROTECTED_ROLE',
        message: 'The system administrator role cannot be deleted.',
      })
    }

    if (role._count.users > 0) {
      return res.status(400).json({
        code: 'ROLE_IN_USE',
        message: `Cannot delete the "${role.name}" role because it is currently assigned to ${role._count.users} user(s). Reassign them first.`,
      })
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.role.delete({ where: { id: role.id } }),
    ])

    return res.json({
      message: `Role "${role.name}" was successfully deleted.`,
      key,
    })
  } catch (error) {
    return fail(res, error, 'Failed to delete the role')
  }
}

export async function listAssignableRoles(req, res) {
  try {
    const { permissions } = await actorContext(req)

    const roles = await prisma.role.findMany({
      orderBy: [{ isProtected: 'desc' }, { name: 'asc' }],
      include: { permissions: { select: { permission: { select: { key: true } } } } },
    })

    return res.json(
      roles.map((role) => {
        const keys = role.permissions.map((row) => row.permission.key)
        const beyondActor = keys.filter((key) => !permissions.has(key))

        return {
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          isProtected: role.isProtected,
          permissionCount: keys.length,
          permissions: keys.sort(),
          assignable: beyondActor.length === 0,
          beyondActor,
        }
      }),
    )
  } catch (error) {
    return fail(res, error, 'Failed to load roles')
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HR users
// ─────────────────────────────────────────────────────────────────────────

export async function listHrUsers(_req, res) {
  try {
    const accounts = await prisma.user.findMany({
      where: { NOT: { hrRoleId: null } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    })

    const payload = await Promise.all(
      accounts.map(async (account) =>
        toHrUserPayload(account, await describePermissions(account)),
      ),
    )

    return res.json(payload)
  } catch (error) {
    return fail(res, error, 'Failed to load HR users')
  }
}

export async function getHrUser(req, res) {
  try {
    const account = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })

    if (!account || account.hrRoleId == null) {
      return res.status(404).json({ message: 'HR user not found' })
    }

    return res.json(toHrUserPayload(account, await describePermissions(account)))
  } catch (error) {
    return fail(res, error, 'Failed to load the HR user')
  }
}

/**
 * Create an HR staff account.
 *
 * The caller must hold every permission the chosen role grants, so an account
 * with users.create but not users.permissions cannot mint an HR Admin.
 */
export async function createHrUser(req, res) {
  try {
    const data = req.body || {}
    const name = String(data.name || '').trim()
    const email = normalizeEmail(data.email)
    const roleKey = String(data.roleKey || '').trim()

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' })
    }

    if (!roleKey) {
      return res.status(400).json({ message: 'Choose a role for this account.' })
    }

    const role = await prisma.role.findUnique({ where: { key: roleKey } })
    if (!role) {
      return res.status(400).json({ message: 'That role does not exist.' })
    }

    const { permissions: actorPermissions } = await actorContext(req)
    const roleKeys = await permissionKeysForRole(role.id)
    const beyondActor = roleKeys.filter((key) => !actorPermissions.has(key))

    if (beyondActor.length) {
      return res.status(403).json({
        code: 'ROLE_EXCEEDS_ACTOR',
        message:
          'You cannot create an account with more access than you have yourself. These permissions are beyond yours: ' +
          beyondActor.join(', '),
        permissions: beyondActor,
      })
    }

    const [taken, employeeClash] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.employee.findFirst({ where: { email }, select: { id: true } }),
    ])

    if (taken) {
      return res.status(409).json({ message: 'That email address is already used by another account.' })
    }
    if (employeeClash) {
      return res.status(409).json({
        message: 'That email address is already used by an employee record.',
      })
    }

    // HR staff all carry a legacy HR role string so the older parts of the app
    // (messaging, feedback, announcements) still see them as HR. The legacy
    // string deliberately does not encode the fine-grained role - that is what
    // hrRoleId is for, and it is what keeps this change from touching any of
    // that older code.
    const requestedLegacy = String(data.legacyRole || 'HR_ADMIN').toUpperCase()
    const legacyRole = ['HR_ADMIN', 'HR_MANAGER'].includes(requestedLegacy)
      ? requestedLegacy
      : 'HR_ADMIN'

    const temporaryPassword = generateTemporaryPassword()

    const account = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(temporaryPassword),
        mustChangePassword: true,
        role: legacyRole,
        hrRoleId: role.id,
        isActive: true,
      },
    })

    const info = await describePermissions(account)

    // The password goes back to the HR Admin to hand over, exactly as the
    // employee-creation flow does. Nothing is emailed.
    return res.status(201).json({
      user: toHrUserPayload(account, info),
      temporaryPassword,
      message: `${name} can now sign in with ${email}.`,
    })
  } catch (error) {
    return fail(res, error, 'Failed to create the HR user')
  }
}

/**
 * Edit an HR staff account: name, role and active state.
 *
 * Renaming yourself is allowed. Changing your own role or active state is not -
 * that is the self-escalation rule.
 */
export async function updateHrUser(req, res) {
  try {
    const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })

    if (!target || target.hrRoleId == null) {
      return res.status(404).json({ message: 'HR user not found' })
    }

    const data = req.body || {}
    const touchesAccess = data.roleKey !== undefined || data.isActive !== undefined

    const guard = await guardTarget(req, target, { selfAllowed: !touchesAccess })
    if (guard) return sendGuard(res, guard)

    const update = {}

    if (data.name !== undefined) {
      const name = String(data.name || '').trim()
      if (!name) return res.status(400).json({ message: 'Name cannot be empty.' })
      if (name.length > 120) {
        return res.status(400).json({ message: 'Name must be 120 characters or fewer.' })
      }
      update.name = name
    }

    if (data.isActive !== undefined) {
      update.isActive = Boolean(data.isActive)
    }

    if (data.roleKey !== undefined) {
      const roleKey = String(data.roleKey || '').trim()
      const role = await prisma.role.findUnique({ where: { key: roleKey } })

      if (!role) return res.status(400).json({ message: 'That role does not exist.' })

      const { permissions: actorPermissions } = await actorContext(req)
      const roleKeys = await permissionKeysForRole(role.id)
      const beyondActor = roleKeys.filter((key) => !actorPermissions.has(key))

      if (beyondActor.length) {
        return res.status(403).json({
          code: 'ROLE_EXCEEDS_ACTOR',
          message:
            'You cannot assign a role with more access than you have yourself. Beyond yours: ' +
            beyondActor.join(', '),
          permissions: beyondActor,
        })
      }

      // Moving the last admin off the administration role is the same hazard as
      // deleting them, and is refused for the same reason.
      const targetInfo = await describePermissions(target)
      const targetIsAdmin = targetInfo.permissions.includes('users.permissions')
      const roleIsAdmin = roleKeys.includes('users.permissions')

      if (targetIsAdmin && !roleIsAdmin && (await otherActiveAdminCount(target.id)) === 0) {
        return sendGuard(res, lastAdminResponse('demoted'))
      }

      update.hrRoleId = role.id
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'Nothing to update.' })
    }

    const account = await prisma.user.update({ where: { id: target.id }, data: update })

    return res.json({
      user: toHrUserPayload(account, await describePermissions(account)),
      message: `${account.name} updated.`,
    })
  } catch (error) {
    return fail(res, error, 'Failed to update the HR user')
  }
}

/**
 * Set the individual permission overrides for an account.
 *
 * The body carries the desired final state as `{ key: 'ALLOW' | 'DENY' }`; a
 * key that is absent falls back to whatever the role grants. It is an absolute
 * set rather than a delta so the screen is idempotent and pressing Save twice
 * cannot accumulate grants.
 *
 * DENY is always permitted, because taking access away is never an escalation
 * and refusing it would let a lesser admin protect somebody above them.
 */
export async function setHrUserPermissions(req, res) {
  try {
    const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })

    if (!target || target.hrRoleId == null) {
      return res.status(404).json({ message: 'HR user not found' })
    }

    const guard = await guardTarget(req, target)
    if (guard) return sendGuard(res, guard)

    const raw = req.body?.overrides
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      return res.status(400).json({
        message: 'Send "overrides" as an object of permission key to ALLOW or DENY.',
      })
    }

    const { permissions: actorPermissions } = await actorContext(req)
    const catalogue = await prisma.permission.findMany({ select: { id: true, key: true } })
    const idByKey = new Map(catalogue.map((row) => [row.key, row.id]))

    const entries = []

    for (const [key, effect] of Object.entries(raw)) {
      if (!idByKey.has(key)) {
        return res.status(400).json({ message: `Unknown permission: ${key}` })
      }

      if (effect !== 'ALLOW' && effect !== 'DENY') {
        return res.status(400).json({
          message: `Permission ${key} must be ALLOW or DENY, not ${JSON.stringify(effect)}.`,
        })
      }

      if (effect === 'ALLOW' && !actorPermissions.has(key)) {
        return res.status(403).json({
          code: 'PERMISSION_EXCEEDS_ACTOR',
          message: `You cannot grant "${key}" because you do not hold it yourself.`,
          permission: key,
        })
      }

      entries.push({ userId: target.id, permissionId: idByKey.get(key), effect })
    }

    // Replaced wholesale so the stored state always equals what the screen
    // showed, which is what makes removing a permission actually remove it.
    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId: target.id } }),
      ...(entries.length ? [prisma.userPermission.createMany({ data: entries })] : []),
    ])

    const account = await prisma.user.findUnique({ where: { id: target.id } })

    return res.json({
      user: toHrUserPayload(account, await describePermissions(account)),
      message: `${account.name}'s permissions were updated.`,
    })
  } catch (error) {
    return fail(res, error, 'Failed to update permissions')
  }
}

/**
 * Change what a role grants.
 *
 * Editing a role changes it for everyone holding it, so the escalation rule
 * applies to the whole list. The protected HR Admin role is refused outright:
 * it is the role whose entire purpose is to govern the others, so making it
 * editable is the one change that could lock every administrator out.
 */
export async function updateRolePermissions(req, res) {
  try {
    const role = await prisma.role.findUnique({ where: { key: String(req.params.key) } })

    if (!role) return res.status(404).json({ message: 'Role not found' })

    if (role.isProtected || role.key === ADMIN_ROLE_KEY) {
      return res.status(403).json({
        code: 'ROLE_PROTECTED',
        message:
          'The HR Admin role always has every permission and cannot be edited. Create a custom role instead.',
      })
    }

    const keys = req.body?.permissions
    if (!Array.isArray(keys)) {
      return res.status(400).json({ message: 'Send "permissions" as an array of permission keys.' })
    }

    const catalogue = await prisma.permission.findMany({ select: { id: true, key: true } })
    const idByKey = new Map(catalogue.map((row) => [row.key, row.id]))

    const unknown = keys.filter((key) => !idByKey.has(key))
    if (unknown.length) {
      return res.status(400).json({ message: `Unknown permission(s): ${unknown.join(', ')}` })
    }

    const { permissions: actorPermissions } = await actorContext(req)
    const beyondActor = keys.filter((key) => !actorPermissions.has(key))

    if (beyondActor.length) {
      return res.status(403).json({
        code: 'PERMISSION_EXCEEDS_ACTOR',
        message:
          'You cannot grant a permission you do not hold yourself. Beyond yours: ' +
          beyondActor.join(', '),
        permissions: beyondActor,
      })
    }

    const unique = [...new Set(keys)]

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      ...(unique.length
        ? [
            prisma.rolePermission.createMany({
              data: unique.map((key) => ({ roleId: role.id, permissionId: idByKey.get(key) })),
            }),
          ]
        : []),
    ])

    return res.json({
      role: { key: role.key, name: role.name, permissions: unique.sort() },
      message: `${role.name} now grants ${unique.length} permission(s).`,
    })
  } catch (error) {
    return fail(res, error, 'Failed to update the role')
  }
}

/** Reset an HR user's password and hand the new one back to the admin. */
export async function resetHrUserPassword(req, res) {
  try {
    const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })

    if (!target || target.hrRoleId == null) {
      return res.status(404).json({ message: 'HR user not found' })
    }

    const guard = await guardTarget(req, target)
    if (guard) return sendGuard(res, guard)

    const temporaryPassword = generateTemporaryPassword()

    await prisma.user.update({
      where: { id: target.id },
      data: {
        password: await hashPassword(temporaryPassword),
        mustChangePassword: true,
      },
    })

    // Any reset link already in flight is invalidated by the new password.
    await prisma.passwordResetToken.updateMany({
      where: { userId: target.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    return res.json({
      email: target.email,
      temporaryPassword,
      message: 'Temporary password reset successfully.',
    })
  } catch (error) {
    return fail(res, error, 'Failed to reset the HR user password')
  }
}

/**
 * Remove an HR staff account.
 *
 * The row is deleted outright, but only after the guards have established that
 * it is not the caller, not an outranking admin and not the last HR Admin.
 */
export async function deleteHrUser(req, res) {
  try {
    const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })

    if (!target || target.hrRoleId == null) {
      return res.status(404).json({ message: 'HR user not found' })
    }

    const guard = await guardTarget(req, target, { destructive: true })
    if (guard) return sendGuard(res, guard)

    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId: target.id } }),
      prisma.user.delete({ where: { id: target.id } }),
    ])

    return res.json({ success: true, message: `${target.name}'s access has been removed.` })
  } catch (error) {
    return fail(res, error, 'Failed to delete the HR user')
  }
}
