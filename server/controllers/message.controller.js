import prisma from '../db.js'
import { io, isUserOnline } from '../socket.js'

const ROLE_LABELS = {
  EMPLOYER: 'Employer',
  HR_MANAGER: 'HR Manager',
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function serializeMessage(msg, viewerId) {
  return {
    id: msg.id,
    text: msg.text,
    from: msg.senderId === viewerId ? 'me' : 'them',
    senderId: msg.senderId,
    time: new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    createdAt: msg.createdAt,
    read: msg.read,
    attachment: msg.attachmentUrl
      ? { url: msg.attachmentUrl, name: msg.attachmentName, type: msg.attachmentType }
      : null,
  }
}

async function findOrCreateConversation(userAId, userBId) {
  const [lo, hi] = userAId < userBId ? [userAId, userBId] : [userBId, userAId]
  let conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId: lo, userBId: hi } },
  })
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userAId: lo, userBId: hi },
    })
  }
  return conversation
}

function emitNewMessage(ioInstance, senderId, contactId, message) {
  // Only notify the recipient in real time. The sender applies the authoritative
  // copy from the POST response, so echoing here would race and duplicate messages.
  ioInstance
    .to(`user:${contactId}`)
    .emit('message:new', { contactId: senderId, message: serializeMessage(message, contactId) })
}

export async function getContacts(req, res) {
  const meId = req.user.id

  const contacts = await prisma.user.findMany({
    where: { id: { not: meId } },
    select: { id: true, name: true, email: true, role: true },
  })

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }] },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, text: true, senderId: true, createdAt: true, read: true },
      },
    },
  })

  const meta = {}
  conversations.forEach((conv) => {
    const otherId = conv.userAId === meId ? conv.userBId : conv.userAId
    const messages = conv.messages
    const last = messages[messages.length - 1] || null
    const unread = messages.filter((m) => m.senderId !== meId && !m.read).length
    meta[otherId] = { last, unread }
  })

  let result = contacts
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role,
      roleLabel: ROLE_LABELS[c.role] || c.role,
      initials: initials(c.name),
      online: isUserOnline(c.id),
      unread: meta[c.id]?.unread || 0,
      lastMessage: meta[c.id]?.last
        ? {
            id: meta[c.id].last.id,
            text: meta[c.id].last.text,
            from: meta[c.id].last.senderId === meId ? 'me' : 'them',
            time: new Date(meta[c.id].last.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }
        : null,
    }))

  // For Employee / Employer: ONLY return contacts with whom there is an active conversation with HR
  if (req.user.role !== 'HR_MANAGER') {
    result = result.filter((c) => c.lastMessage !== null)
  }

  result.sort((a, b) => {
    if (a.lastMessage && b.lastMessage) return b.lastMessage.time.localeCompare(a.lastMessage.time)
    return a.lastMessage ? -1 : 1
  })

  res.json({ contacts: result })
}

export async function getUsers(req, res) {
  const meId = req.user.id

  const [users, employees] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
    prisma.employee.findMany({
      select: { id: true, name: true, email: true, jobTitle: true, department: true, avatar: true, initials: true },
    }),
  ])

  const userEmails = new Set(users.map((u) => u.email.toLowerCase()))

  const people = [
    ...users
      .filter((u) => u.id !== meId)
      .map((u) => ({
        id: u.id,
        kind: 'user',
        name: u.name,
        email: u.email,
        subtitle: ROLE_LABELS[u.role] || u.role,
        initials: initials(u.name),
        avatar: null,
        online: isUserOnline(u.id),
      })),
    ...employees
      .filter((e) => !userEmails.has(e.email.toLowerCase()))
      .map((e) => ({
        id: e.id,
        kind: 'employee',
        name: e.name,
        email: e.email,
        subtitle: e.department ? `${e.department} · ${e.jobTitle || ''}`.replace(/ · $/, '') : 'Employee',
        initials: e.initials || initials(e.name),
        avatar: e.avatar || null,
        online: false,
      })),
  ]

  res.json({ users: people })
}

export async function startConversation(req, res) {
  const meId = req.user.id
  const { userId } = req.body || {}

  let user
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: Number(userId) } })
    if (!user) return res.status(404).json({ message: 'User not found' })
  } else {
    return res.status(400).json({ message: 'Provide a userId' })
  }

  await findOrCreateConversation(meId, user.id)

  res.status(200).json({
    user: {
      id: user.id,
      kind: 'user',
      name: user.name,
      email: user.email,
      subtitle: ROLE_LABELS[user.role] || user.role,
      initials: initials(user.name),
      avatar: null,
      online: isUserOnline(user.id),
    },
  })
}

export async function getThread(req, res) {
  const meId = req.user.id
  const contactId = Number(req.params.contactId)

  const conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { userAId: meId, userBId: contactId },
        { userAId: contactId, userBId: meId },
      ],
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  res.json({ messages: (conversation?.messages || []).map((m) => serializeMessage(m, meId)) })
}

export async function sendMessage(req, res) {
  const meId = req.user.id
  const contactId = Number(req.params.contactId)
  const text = String(req.body?.text || '').trim()

  if (!Number.isInteger(contactId)) return res.status(400).json({ message: 'Invalid contact' })
  if (!text) return res.status(400).json({ message: 'Message text is required' })

  const conversation = await findOrCreateConversation(meId, contactId)
  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: meId, text },
  })

  emitNewMessage(io, meId, contactId, message)
  res.status(201).json({ message: serializeMessage(message, meId) })
}

export async function uploadAttachment(req, res) {
  const meId = req.user.id
  const contactId = Number(req.params.contactId)

  if (!Number.isInteger(contactId)) return res.status(400).json({ message: 'Invalid contact' })
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

  const conversation = await findOrCreateConversation(meId, contactId)
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: meId,
      text: req.body?.caption || '',
      attachmentUrl: `/uploads/${req.file.filename}`,
      attachmentName: req.file.originalname,
      attachmentType: req.file.mimetype,
    },
  })

  emitNewMessage(io, meId, contactId, message)
  res.status(201).json({ message: serializeMessage(message, meId) })
}

export async function markRead(req, res) {
  const meId = req.user.id
  const contactId = Number(req.params.contactId)

  const conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { userAId: meId, userBId: contactId },
        { userAId: contactId, userBId: meId },
      ],
    },
  })

  if (conversation) {
    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderId: contactId, read: false },
      data: { read: true },
    })
  }

  res.json({ ok: true })
}

export async function clearChat(req, res) {
  const meId = req.user.id
  const contactId = Number(req.params.contactId)

  const conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { userAId: meId, userBId: contactId },
        { userAId: contactId, userBId: meId },
      ],
    },
  })

  if (conversation) {
    await prisma.message.deleteMany({ where: { conversationId: conversation.id } })
  }

  res.json({ ok: true })
}

export async function deleteChat(req, res) {
  const meId = req.user.id
  const contactId = Number(req.params.contactId)

  const conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { userAId: meId, userBId: contactId },
        { userAId: contactId, userBId: meId },
      ],
    },
  })

  if (conversation) {
    await prisma.conversation.delete({ where: { id: conversation.id } })
  }

  res.json({ ok: true })
}