// Restore a single boolean flag on an account. Used after a proof run that
// legitimately changed it. Never prints password material.
import { PrismaClient } from '@prisma/client'
import { isBcryptHash } from '../server/utils/security.js'

const prisma = new PrismaClient()

const [email, rawFlag] = process.argv.slice(2)
const mustChangePassword = rawFlag === 'true'

if (!email) {
  console.error('usage: node prisma/set-must-change.mjs <email> <true|false>')
  process.exit(1)
}

const user = await prisma.user.update({
  where: { email: email.trim().toLowerCase() },
  data: { mustChangePassword },
})

console.log(
  `${user.email}: mustChangePassword=${user.mustChangePassword}, passwordHashed=${isBcryptHash(user.password)}, role=${user.role}`,
)

await prisma.$disconnect()
