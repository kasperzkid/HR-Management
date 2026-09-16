import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { INITIAL_EMPLOYEES } from '../src/Employer/data/employeeData.js'
import { ATTENDANCE } from '../src/Employer/data/attendanceData.js'
import { SETTINGS } from '../src/Employer/data/settingsData.js'

const prisma = new PrismaClient()

const SALT_ROUNDS = 10

const USERS = [
  { name: 'Employer', email: 'employer@yanol.com', password: 'employer123', role: 'EMPLOYER' },
  { name: 'HR Manager', email: 'hr@yanol.com', password: 'hr123', role: 'HR_MANAGER' },
  { name: 'Employee', email: 'employee@yanol.com', password: 'employee123', role: 'EMPLOYEE' },
]

async function main() {
  await prisma.session.deleteMany()

  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashed },
      create: { name: u.name, email: u.email, password: hashed, role: u.role },
    })
  }
  console.log(`Seeded ${USERS.length} users (passwords hashed with bcrypt).`)

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

  await prisma.setting.upsert({
    where: { key: 'app_settings' },
    update: { value: JSON.stringify(SETTINGS) },
    create: { key: 'app_settings', value: JSON.stringify(SETTINGS) },
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
