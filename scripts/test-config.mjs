import { PrismaClient } from '@prisma/client'
import { getAttendanceConfigurationFromDb } from '../server/controllers/hr-settings.controller.js'

const config = await getAttendanceConfigurationFromDb()
console.log('CONFIG FROM DB:', config)
process.exit(0)
