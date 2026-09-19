import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SETTINGS } from '../src/Employer/data/settingsData.js'

// Sample/demo data was removed from the app — the seed now only creates
// auth users and default settings. Employees, attendance and leave records
// are created through the app (HR-Manager Employees page, punch clock, etc.).

const prisma = new PrismaClient()

const SALT_ROUNDS = 10

const USERS = [
  { name: 'Alex Johnson', email: 'employer@yanol.com', password: 'employer123', role: 'EMPLOYER' },
  { name: 'Sarah Jenkins', email: 'hr@yanol.com', password: 'hr123', role: 'HR_MANAGER' },
  { name: 'Employee', email: 'employee@yanol.com', password: 'employee123', role: 'EMPLOYEE' },
]

// Initial direct messages so the inbox isn't empty on first login.
// Structured by the pair of emails involved; times & order preserved.
const SEED_THREADS = [
  {
    pair: ['employer@yanol.com', 'hr@yanol.com'],
    dayOffset: 0,
    messages: [
      { from: 'them', text: 'Good morning, the September payroll figures are finalised — gross ETB 308,442.31 across 6 bank batches.', minutesAgo: 42 },
      { from: 'me', text: 'Perfect. I’ll sign off before the cut-off this afternoon.', minutesAgo: 38 },
      { from: 'them', text: 'Also, Kassahun Desta has a pending annual leave request that needs your approval.', minutesAgo: 25 },
    ],
  },
  {
    pair: ['employer@yanol.com', 'employee@yanol.com'],
    dayOffset: 0,
    messages: [
      { from: 'them', text: 'Hi, could you confirm the attendance export for this week? I want to lock my timesheet.', minutesAgo: 120 },
      { from: 'me', text: 'Sure — it’s ready on the attendance tab, all 14 days marked present.', minutesAgo: 75 },
    ],
  },
  {
    pair: ['hr@yanol.com', 'employee@yanol.com'],
    dayOffset: 1,
    messages: [
      { from: 'me', text: 'Your annual leave balance shows 10 days — all synced from the leave sheet.', minutesAgo: 60 * 24 },
      { from: 'them', text: 'Thanks! I’m planning my remaining leave in September.', minutesAgo: 60 * 24 - 5 },
    ],
  },
]

async function main() {
  await prisma.session.deleteMany()
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()

  const usersById = {}

  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS)
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashed },
      create: { name: u.name, email: u.email, password: hashed, role: u.role },
    })
    usersById[u.email] = user
  }
  console.log(`Seeded ${USERS.length} users (passwords hashed with bcrypt).`)

  for (const thread of SEED_THREADS) {
    const [aEmail, bEmail] = thread.pair
    const a = usersById[aEmail]
    const b = usersById[bEmail]
    if (!a || !b) continue

    const [lo, hi] = a.id < b.id ? [a.id, b.id] : [b.id, a.id]
    const conversation = await prisma.conversation.create({
      data: { userAId: lo, userBId: hi },
    })

    // Sender must be one of the two participants
    const [meId, themId] = [a.id, b.id]

    for (const m of thread.messages) {
      const senderId = m.from === 'me' ? meId : themId
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          text: m.text,
          // Outgoing messages were read by the recipient; incoming are unread.
          read: m.from === 'me',
          createdAt: new Date(Date.now() - m.minutesAgo * 60 * 1000),
        },
      })
    }
  }
  console.log(`Seeded ${SEED_THREADS.length} conversations.`)

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
