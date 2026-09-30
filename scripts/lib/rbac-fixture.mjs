/**
 * RBAC fixtures for the verification scripts.
 *
 * The verification scripts predate RBAC. They create their HR fixture with a
 * legacy `role` string and nothing else, which used to be the whole story. It
 * is not any more: the guards read the fine-grained grant from the database,
 * and an account with no `hrRoleId` holds nothing - that is the "NULL means
 * deny" rule, not an accident.
 *
 * Production does not have this problem because `prisma/seed-rbac.mjs` runs
 * once and backfills every existing legacy HR account as HR Admin. These
 * helpers do the same thing for a throwaway database: seed the catalogue and
 * the built-in roles, then hand an existing fixture the HR Admin role.
 */

import { PERMISSIONS } from '../../server/rbac/permissions.js'
import { BUILT_IN_ROLES } from '../../server/rbac/roles.js'

/**
 * Upserts the permission catalogue and the built-in roles, and returns helpers
 * for assigning a role to an account that already exists.
 */
export async function seedRbac(prisma) {
  const permissionIdByKey = new Map()

  for (const [index, permission] of PERMISSIONS.entries()) {
    const data = {
      name: permission.name,
      description: permission.description || '',
      group: permission.group,
      sortOrder: index,
    }

    const row = await prisma.permission.upsert({
      where: { key: permission.key },
      create: { key: permission.key, ...data },
      update: data,
      select: { id: true },
    })

    permissionIdByKey.set(permission.key, row.id)
  }

  const roleIdByKey = new Map()

  for (const role of BUILT_IN_ROLES) {
    const data = {
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isProtected: role.isProtected,
    }

    const row = await prisma.role.upsert({
      where: { key: role.key },
      create: { key: role.key, ...data },
      update: data,
      select: { id: true },
    })

    roleIdByKey.set(role.key, row.id)

    // Replace the grant with the built-in default, so a repeated run from a
    // half-finished previous run still lands on a known state.
    await prisma.rolePermission.deleteMany({ where: { roleId: row.id } })
    await prisma.rolePermission.createMany({
      data: role.permissions
        .map((key) => permissionIdByKey.get(key))
        .filter(Boolean)
        .map((permissionId) => ({ roleId: row.id, permissionId })),
    })
  }

  return {
    roleId: (key) => roleIdByKey.get(key),

    /** Give an existing account a built-in HR role. */
    async grantRole(userId, roleKey) {
      await prisma.user.update({
        where: { id: userId },
        data: { hrRoleId: roleIdByKey.get(roleKey) },
      })
    },
  }
}
