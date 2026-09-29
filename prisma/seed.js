import '../server/env.js'
import { PrismaClient } from '@prisma/client'
import { INITIAL_EMPLOYEES } from '../src/Employer/data/employeeData.js'
import { ATTENDANCE } from '../src/Employer/data/attendanceData.js'
import { SETTINGS } from '../src/Employer/data/settingsData.js'
import { hashPassword } from '../server/utils/security.js'

const prisma = new PrismaClient()

// Seeding must never invent a login address for the HR Admin.
//
// Re-seeding is a normal thing to do, and it must not resurrect a hard-coded
// email behind the admin's back. So the seed looks for the HR account that
// already exists and updates that one in place. The address it is currently
// using - whatever the admin last set in Account Settings - is the address
// that keeps working, and the seed follows it automatically.
//
// SEED_HR_ADMIN_EMAIL is only needed the very first time, to say which address
// to create. It is not where the address lives permanently, and it is not how
// the admin signs in.
const SEED_HR_ADMIN_EMAIL = (
  process.env.SEED_HR_ADMIN_EMAIL || ''
)
  .trim()
  .toLowerCase()

const SEED_HR_ADMIN_PASSWORD =
  process.env.SEED_HR_ADMIN_PASSWORD || 'hr123'

const SEED_EMPLOYER_PASSWORD =
  process.env.SEED_EMPLOYER_PASSWORD || 'employer123'

const HR_ROLES = ['HR_MANAGER', 'HR', 'ADMIN', 'HR_ADMIN']

async function resolveHrAdminEmail() {
  const existing = await prisma.user.findFirst({
    where: { role: { in: HR_ROLES } },
    orderBy: { id: 'asc' },
  })

  if (existing) return existing.email

  if (SEED_HR_ADMIN_EMAIL) return SEED_HR_ADMIN_EMAIL

  throw new Error(
    'No HR Admin account exists yet. Set SEED_HR_ADMIN_EMAIL in .env to the address the HR Admin should sign in with, then run the seed again.',
  )
}

async function main() {
  // Seed Users
  await prisma.user.upsert({
    where: { email: 'employer@yanol.com' },
    update: {},
    create: {
      name: 'Employer',
      email: 'employer@yanol.com',
      password: await hashPassword(SEED_EMPLOYER_PASSWORD),
      role: 'EMPLOYER',
    },
  })

  // The HR Admin signs in with a real mailbox rather than the old
  // hr@yanol.com placeholder, so "Forgot password" can genuinely reach them.
  // The old placeholder account is intentionally not re-seeded: re-seeding must
  // not resurrect a second HR Admin.
  //
  // Upsert against the address already in use, and update only the role, so
  // re-seeding never resets the admin's email or password.
  const hrAdminEmail = await resolveHrAdminEmail()

  await prisma.user.upsert({
    where: { email: hrAdminEmail },
    update: { role: 'HR_MANAGER' },
    create: {
      name: 'HR Manager',
      email: hrAdminEmail,
      password: await hashPassword(SEED_HR_ADMIN_PASSWORD),
      role: 'HR_MANAGER',
    },
  })

  console.log(
    `Seeded users successfully. HR Admin account: ${hrAdminEmail}`,
  )

  // Seed Employees
  for (const emp of INITIAL_EMPLOYEES) {
    await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        gender: emp.gender,
        dateOfBirth: emp.dateOfBirth,
        joinDate: emp.joinDate,
        jobTitle: emp.jobTitle,
        department: emp.department,
        employmentType: emp.employmentType,
        basicSalary: emp.basicSalary,
        transportAllowance: emp.transportAllowance,
        housingAllowance: emp.housingAllowance,
        mealAllowance: emp.mealAllowance,
        otherAllowance: emp.otherAllowance,
        otherDeductions: emp.otherDeductions,
        loanDeductions: emp.loanDeductions,
        bankName: emp.bankName,
        bankAccount: emp.bankAccount,
        tin: emp.tin,
        pensionId: emp.pensionId,
        phone: emp.phone,
        email: emp.email,
        address: emp.address,
        emergencyContact: emp.emergencyContact,
        employmentStatus: emp.employmentStatus,
        exitDate: emp.exitDate || null,
        notes: emp.notes || '',
        status: emp.status,
        avatar: emp.avatar,
        location: emp.location,
        salary: emp.salary,
        manager: emp.manager,
        roleType: emp.roleType,
        initials: emp.initials,
      },
    })
  }
  console.log(`Seeded ${INITIAL_EMPLOYEES.length} employees successfully.`)

  // Seed Attendance
  for (const att of ATTENDANCE) {
    await prisma.attendance.upsert({
      where: { id: att.id },
      update: {},
      create: {
        id: att.id,
        employeeId: att.employeeId,
        employeeName: att.employeeName,
        department: att.department,
        date: att.date,
        status: att.status,
        checkIn: att.checkIn || null,
        checkOut: att.checkOut || null,
        late: att.late || 0,
        earlyDeparture: att.earlyDeparture || 0,
        regular: att.regular || 0,
        overtime: att.overtime || 0,
      },
    })
  }
  console.log(`Seeded ${ATTENDANCE.length} attendance records successfully.`)

  // Seed Settings
  await prisma.setting.upsert({
    where: { key: 'app_settings' },
    update: { value: JSON.stringify(SETTINGS) },
    create: {
      key: 'app_settings',
      value: JSON.stringify(SETTINGS),
    },
  })
  console.log('Seeded settings successfully.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
