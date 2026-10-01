import '../env.js'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../utils/security.js'
import { PERMISSIONS } from '../rbac/permissions.js'
import { BUILT_IN_ROLES, ADMIN_ROLE_KEY } from '../rbac/roles.js'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// PURE CLEAN SEEDER
//
// Seeds ONLY the primary Admin account (hradmin@yanol.com)
// with role HR_ADMIN and full RBAC permissions (hr_admin).
//
// All employees, HR staff, departments, job titles, attendance,
// and payroll are dynamically managed by the Admin via the UI.
// ─────────────────────────────────────────────────────────────

const ADMIN_NAME = process.env.ADMIN_NAME || 'HR Admin'
const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  process.env.HR_ADMIN_EMAIL ||
  process.env.SEED_HR_ADMIN_EMAIL ||
  'hradmin@yanol.com'
)
  .trim()
  .toLowerCase()

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_HR_ADMIN_PASSWORD ||
  'Admin@12345'

const ADMIN_ROLE = 'HR_ADMIN'

async function seedRbacCatalogue() {
  console.log('--- Initializing RBAC Permissions & Roles ---')

  // 1. Seed Permissions catalogue
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
    } else {
      await prisma.permission.create({ data: { key: permission.key, ...data } })
    }
  }

  // 2. Seed ONLY the primary HR_ADMIN role with full permissions
  // All other roles are created, customized, and deleted dynamically by the Admin.
  const adminRoleDef = BUILT_IN_ROLES.find((r) => r.key === ADMIN_ROLE_KEY) || {
    key: 'hr_admin',
    name: 'HR Admin',
    description: 'Full access to every part of the system, including creating HR staff and controlling who can do what.',
    isSystem: true,
    isProtected: true,
  }

  const record = await prisma.role.upsert({
    where: { key: adminRoleDef.key },
    update: {
      name: adminRoleDef.name,
      description: adminRoleDef.description,
      isSystem: true,
      isProtected: true,
    },
    create: {
      key: adminRoleDef.key,
      name: adminRoleDef.name,
      description: adminRoleDef.description,
      isSystem: true,
      isProtected: true,
    },
  })

  const allPermissions = await prisma.permission.findMany({ select: { id: true } })
  await prisma.rolePermission.deleteMany({ where: { roleId: record.id } })
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: record.id,
      permissionId: p.id,
    })),
  })

  // Remove any previously seeded unused non-admin roles so User & Role management starts clean
  await prisma.role.deleteMany({
    where: {
      key: { not: adminRoleDef.key },
      users: { none: {} },
    },
  }).catch(() => {})

  console.log('✓ RBAC catalogue ready (permissions and roles initialized).')
}

async function main() {
  console.log('--- Cleaning database for pure seed ---')

  // Purge any mock data to ensure a completely clean slate
  await prisma.message.deleteMany({}).catch(() => {})
  await prisma.attendance.deleteMany({}).catch(() => {})
  await prisma.leaveRequest.deleteMany({}).catch(() => {})
  await prisma.payrollRecord.deleteMany({}).catch(() => {})
  await prisma.announcement.deleteMany({}).catch(() => {})
  await prisma.passwordResetToken.deleteMany({}).catch(() => {})
  await prisma.userPermission.deleteMany({}).catch(() => {})

  // Delete all non-admin users and mock employees
  await prisma.user.deleteMany({
    where: {
      email: { not: ADMIN_EMAIL },
    },
  }).catch(() => {})

  await prisma.employee.deleteMany({}).catch(() => {})

  console.log('✓ Purged mock employees, attendance, and conversations.')

  // 1. Seed RBAC catalogue so Admin has the hr_admin role with full permissions
  await seedRbacCatalogue()

  const hrAdminRole = await prisma.role.findUnique({
    where: { key: ADMIN_ROLE_KEY },
    select: { id: true },
  })

  if (!hrAdminRole) {
    throw new Error('Failed to find hr_admin role after RBAC initialization.')
  }

  // 2. Seed the single Admin account linked to hr_admin role
  console.log('--- Seeding Primary Admin Account ---')
  const hashedPassword = await hashPassword(ADMIN_PASSWORD)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      role: ADMIN_ROLE,
      hrRoleId: hrAdminRole.id,
      password: hashedPassword,
      mustChangePassword: false,
      isActive: true,
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: ADMIN_ROLE,
      hrRoleId: hrAdminRole.id,
      mustChangePassword: false,
      isActive: true,
    },
  })

  // Ensure no lingering DENY permission overrides exist for the admin
  await prisma.userPermission.deleteMany({
    where: { userId: admin.id },
  }).catch(() => {})

  console.log(`✓ Admin account created/verified:`)
  console.log(`    Name:        ${admin.name}`)
  console.log(`    Email:       ${admin.email}`)
  console.log(`    Role:        ${admin.role}`)
  console.log(`    HR Role ID:  ${admin.hrRoleId} (${ADMIN_ROLE_KEY} - Full Access)`)
  console.log(`    Password:    ${ADMIN_PASSWORD}`)
  console.log('--- Pure Seed Complete ---')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
