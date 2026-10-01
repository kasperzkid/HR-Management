import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const settings = await prisma.setting.findMany()
console.log('SETTINGS IN DB:', JSON.stringify(settings, null, 2))
await prisma.$disconnect()
