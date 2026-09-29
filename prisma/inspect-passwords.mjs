// Read-only audit of how every User.password value is currently stored.
// Prints NO password material - only the storage class.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BCRYPT = /^\$2[aby]\$\d{2}\$/

const users = await prisma.user.findMany({
  orderBy: { id: 'asc' },
  include: { employee: { select: { employeeId: true, name: true } } },
})

const rows = users.map((u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  mustChangePassword: u.mustChangePassword,
  employeeId: u.employee?.employeeId ?? null,
  storage:
    typeof u.password !== 'string' || u.password.length === 0
      ? 'EMPTY'
      : BCRYPT.test(u.password)
        ? 'bcrypt'
        : 'PLAINTEXT',
  length: typeof u.password === 'string' ? u.password.length : 0,
}))

console.table(rows)

const summary = rows.reduce((acc, r) => {
  acc[r.storage] = (acc[r.storage] || 0) + 1
  return acc
}, {})

console.log('Summary:', summary)
console.log('Total users:', rows.length)

const activeTokens = await prisma.passwordResetToken.count()
console.log('PasswordResetToken rows:', activeTokens)

await prisma.$disconnect()
