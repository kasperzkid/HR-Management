import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, employeeId: true } })
const employees = await prisma.employee.findMany({ select: { id: true, employeeId: true, email: true, name: true } })
console.log('USERS:', users)
console.log('EMPLOYEES:', employees)
await prisma.$disconnect()
