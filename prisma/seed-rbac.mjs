/**
 * Seed the permission catalogue and the built-in roles.
 *
 *   npm run db:seed-rbac
 *
 * Safe to run repeatedly, and safe to run on a database that is already in
 * use. It only ever adds or updates catalogue rows - it never deletes a user,
 * a role assignment or an individual permission override.
 *
 * What it does:
 *   1. Upserts every permission from server/rbac/permissions.js.
 *   2. Upserts every built-in role and its default grant.
 *   3. Assigns an HR role to any existing HR account that does not have one
 *      yet, so the single account that ran this system before RBAC existed
 *      becomes the HR Admin rather than being locked out of the feature.
 *
 * Step 3 is the only step that touches existing accounts and it is deliberately
 * narrow: it looks at accounts with no HR role whose `role` is one of the
 * legacy HR strings, and nothing else. An EMPLOYEE account is never touched.
 */

import { PrismaClient } from '@prisma/client'
import { PERMISSIONS } from '../server/rbac/permissions.js'
import { BUILT_IN_ROLES, ADMIN_ROLE_KEY } from '../server/rbac/roles.js'

const prisma = new PrismaClient()

// The role strings that have always meant "this account is HR staff" in this
// codebase. Messaging, feedback, announcements and the login normaliser all
// still compare against this list, which is exactly why it is untouched.
const LEGACY_HR_ROLES = ['HR_MANAGER', 'HR_ADMIN', 'ADMIN', 'HR']

function note(message) {
  console.log(`  ${message}`)
}

async function seedPermissions() {
  let created = 0
  let updated = 0

  for (const [index, permission] of PERMISSIONS.entries()) {
    const data = {
      name: permission.name,
      description: permission.description || '',
      group: permission.group,
      sortOrder: index,
    }

    const existing = await prisma.permission.findUnique({
      where: { key: permission.key },
      select: { id: true },
    })

    if (existing) {
      await prisma.permission.update({ where: { id: existing.id }, data })
      updated += 1
    } else {
      await prisma.permission.create({ data: { key: permission.key, ...data } })
      created += 1
    }
  }

  note(`permissions: ${created} created, ${updated} updated`)

  // A permission removed from the catalogue is retired rather than deleted,
  // because deleting it would cascade away the role grants and personal
  // overrides that reference it. It is reported so the gap is visible.
  const stale = await prisma.permission.findMany({
    where: { key: { notIn: PERMISSIONS.map((p) => p.key) } },
    select: { key: true },
  })

  if (stale.length) {
    note(
      `note: ${stale.length} permission(s) exist in the database but not in the catalogue, so they are no longer offered:`,
    )
    for (const row of stale) note(`  - ${row.key}`)
  }
}

async function seedRoles() {
  for (const role of BUILT_IN_ROLES) {
    const record = await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isProtected: role.isProtected,
      },
      create: {
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isProtected: role.isProtected,
      },
    })

    const permissions = await prisma.permission.findMany({
      where: { key: { in: role.permissions } },
      select: { id: true },
    })

    // Replace the grant wholesale so the file stays the source of truth for
    // built-in roles. Roles the admin creates are not touched here, and a
    // protected role's grant is never rewritten at runtime either.
    await prisma.rolePermission.deleteMany({ where: { roleId: record.id } })
    if (permissions.length) {
      await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: record.id,
          permissionId: permission.id,
        })),
      })
    }

    note(`role ${role.key} ("${role.name}"): ${permissions.length} permission(s)`)
  }
}

async function assignExistingHrAccounts() {
  const unassigned = await prisma.user.findMany({
    where: { hrRoleId: null, role: { in: LEGACY_HR_ROLES } },
    select: { id: true, email: true, role: true },
    orderBy: { id: 'asc' },
  })

  if (!unassigned.length) {
    note('existing HR accounts: none needing a role')
    return
  }

  // The address named in HR_ADMIN_EMAIL wins if set, so a deployment can say
  // which account is the admin instead of relying on row order. Otherwise the
  // oldest HR account is the admin, which is the one that has always been
  // using this system.
  const preferred = (process.env.HR_ADMIN_EMAIL || '').trim().toLowerCase()

  const adminAccount =
    unassigned.find((user) => user.email.toLowerCase() === preferred) ||
    unassigned[0]

  const adminRole = await prisma.role.findUnique({
    where: { key: ADMIN_ROLE_KEY },
    select: { id: true },
  })

  await prisma.user.update({
    where: { id: adminAccount.id },
    data: { hrRoleId: adminRole.id },
  })

  note(`existing HR account ${adminAccount.email} -> HR Admin`)

  const others = unassigned.filter((user) => user.id !== adminAccount.id)

  if (others.length) {
    // Any remaining HR account gets the broad-but-not-administrative role, so
    // a pre-existing second HR login keeps working at the level it had rather
    // than silently gaining the ability to manage users.
    const managerRole = await prisma.role.findUnique({
      where: { key: 'hr_manager' },
      select: { id: true },
    })

    for (const user of others) {
      await prisma.user.update({
        where: { id: user.id },
        data: { hrRoleId: managerRole.id },
      })
      note(`existing HR account ${user.email} -> HR Manager`)
    }
  }
}

async function main() {
  console.log('\nSeeding role-based access control')
  console.log('='.repeat(64))

  await seedPermissions()
  console.log('')
  await seedRoles()
  console.log('')
  await assignExistingHrAccounts()

  const [permissionCount, roleCount, assigned] = await Promise.all([
    prisma.permission.count(),
    prisma.role.count(),
    prisma.user.count({ where: { NOT: { hrRoleId: null } } }),
  ])

  console.log('')
  console.log('='.repeat(64))
  note(`database now holds ${permissionCount} permission(s), ${roleCount} role(s)`)
  note(`${assigned} account(s) hold an HR role`)
  console.log('='.repeat(64))
  console.log('')
}

main()
  .catch((error) => {
    console.error('\nSeeding RBAC failed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
