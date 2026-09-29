import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import prisma from '../db.js'

const router = Router()
router.use(requireAuth)

function formatMessageForClient(msg, currentUserId) {
  const isMe = msg.senderId === currentUserId
  return {
    id: msg.id,
    text: msg.text,
    from: isMe ? 'me' : 'them',
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    time: new Date(msg.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    read: msg.read,
    isComplain: Boolean(msg.isComplain),
    attachment: msg.attachmentUrl
      ? {
          url: msg.attachmentUrl,
          name: msg.attachmentName || 'attachment',
          type: msg.attachmentType || 'application/octet-stream',
          size: msg.attachmentSize || 0,
        }
      : null,
  }
}

// -------------------------------------------------------------
// GET /contacts — List conversation partners
// -------------------------------------------------------------
router.get('/contacts', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, role: true, name: true },
    })

    const isCurrentHR =
      currentUser?.role === 'HR_MANAGER' || currentUser?.role === 'ADMIN'

    // Fetch all other users
    const users = await prisma.user.findMany({
      where: { id: { not: currentUserId } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        employee: {
          select: {
            name: true,
            jobTitle: true,
            department: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // For each user, get the last message and unread count
    const contacts = await Promise.all(
      users.map(async (user) => {
        const lastMsg = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: user.id },
              { senderId: user.id, receiverId: currentUserId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        })

        const unreadCount = await prisma.message.count({
          where: {
            senderId: user.id,
            receiverId: currentUserId,
            read: false,
          },
        })

        const isHR =
          user.role === 'HR_MANAGER' || user.role === 'ADMIN'

        return {
          id: String(user.id),
          name: user.name || (isHR ? 'HR Manager' : 'Employee'),
          email: user.email,
          role: user.role,
          roleLabel: isHR ? 'HR Manager' : user.employee?.jobTitle || 'Employee',
          department: user.employee?.department || (isHR ? 'Human Resources' : 'General'),
          isHR,
          unread: unreadCount,
          lastMessage: lastMsg
            ? {
                text: lastMsg.text,
                from: lastMsg.senderId === currentUserId ? 'me' : 'them',
                time: new Date(lastMsg.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                isComplain: Boolean(lastMsg.isComplain),
              }
            : null,
          online: false,
        }
      })
    )

    // Sort contacts:
    // If employee: HR Admin is always on top.
    // Next: contacts with messages (most recent first).
    // Last: others.
    contacts.sort((a, b) => {
      if (!isCurrentHR) {
        if (a.isHR && !b.isHR) return -1
        if (!a.isHR && b.isHR) return 1
      }
      if (a.unread !== b.unread) return b.unread - a.unread
      const aTime = a.lastMessage ? 1 : 0
      const bTime = b.lastMessage ? 1 : 0
      return bTime - aTime
    })

    return res.json({ contacts })
  } catch (error) {
    console.error('Get message contacts error:', error)
    return res.status(500).json({ message: 'Failed to load message contacts' })
  }
})

// -------------------------------------------------------------
// GET /users — Directory of all users to start chats
// -------------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const users = await prisma.user.findMany({
      where: { id: { not: currentUserId } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        employee: {
          select: {
            jobTitle: true,
            department: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return res.json({
      users: users.map((u) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        role: u.role,
        subtitle:
          u.role === 'HR_MANAGER'
            ? 'HR Manager · Human Resources'
            : `${u.employee?.jobTitle || 'Employee'} · ${u.employee?.department || 'General'}`,
        initials: (u.name || 'U')
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0].toUpperCase())
          .join(''),
      })),
    })
  } catch (error) {
    console.error('Get message users error:', error)
    return res.status(500).json({ message: 'Failed to load message users' })
  }
})

// -------------------------------------------------------------
// GET /:contactId — Load thread with specific user
// -------------------------------------------------------------
router.get('/:contactId', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const targetId = Number(req.params.contactId)

    if (!targetId || Number.isNaN(targetId)) {
      return res.status(400).json({ message: 'Invalid contact ID' })
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetId },
          { senderId: targetId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    })

    // Automatically mark incoming messages as read
    await prisma.message.updateMany({
      where: {
        senderId: targetId,
        receiverId: currentUserId,
        read: false,
      },
      data: { read: true },
    })

    return res.json({
      messages: messages.map((m) => formatMessageForClient(m, currentUserId)),
    })
  } catch (error) {
    console.error('Get message thread error:', error)
    return res.status(500).json({ message: 'Failed to load thread' })
  }
})

// -------------------------------------------------------------
// POST /:contactId — Send a message (text or complaint)
// -------------------------------------------------------------
router.post('/:contactId', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const targetId = Number(req.params.contactId)
    const { text, isComplain } = req.body || {}

    if (!targetId || Number.isNaN(targetId)) {
      return res.status(400).json({ message: 'Invalid contact ID' })
    }

    const trimmed = String(text || '').trim()
    if (!trimmed) {
      return res.status(400).json({ message: 'Message text cannot be empty' })
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, role: true },
    })
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' })
    }

    const sender = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, name: true, role: true },
    })

    const record = await prisma.message.create({
      data: {
        senderId: currentUserId,
        receiverId: targetId,
        text: trimmed,
        isComplain: Boolean(isComplain),
        read: false,
      },
    })

    const clientMsg = formatMessageForClient(record, currentUserId)
    const recipientClientMsg = formatMessageForClient(record, targetId)

    // Real-time Socket.IO emission
    const io = req.app.get('io')
    if (io) {
      io.to(`user:${targetId}`).emit('message:new', {
        contactId: String(currentUserId),
        senderName: sender?.name || 'User',
        message: recipientClientMsg,
      })
      io.to(`user:${currentUserId}`).emit('message:new', {
        contactId: String(targetId),
        senderName: sender?.name || 'User',
        message: clientMsg,
      })
    }

    return res.status(201).json({ message: clientMsg })
  } catch (error) {
    console.error('Send message error:', error)
    return res.status(500).json({ message: 'Failed to send message' })
  }
})

// -------------------------------------------------------------
// POST /:contactId/read — Mark messages as read
// -------------------------------------------------------------
router.post('/:contactId/read', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const targetId = Number(req.params.contactId)

    await prisma.message.updateMany({
      where: {
        senderId: targetId,
        receiverId: currentUserId,
        read: false,
      },
      data: { read: true },
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    return res.status(500).json({ message: 'Failed to mark read' })
  }
})

// -------------------------------------------------------------
// PUT /:contactId/messages/:messageId — Edit message
// -------------------------------------------------------------
router.put('/:contactId/messages/:messageId', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const targetId = Number(req.params.contactId)
    const { messageId } = req.params
    const { text } = req.body || {}

    const trimmed = String(text || '').trim()
    if (!trimmed) {
      return res.status(400).json({ message: 'Text is required' })
    }

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!existing || existing.senderId !== currentUserId) {
      return res.status(403).json({ message: 'Cannot edit this message' })
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { text: trimmed },
    })

    const clientMsg = formatMessageForClient(updated, currentUserId)
    const recipientClientMsg = formatMessageForClient(updated, targetId)

    const io = req.app.get('io')
    if (io) {
      io.to(`user:${targetId}`).emit('message:updated', {
        contactId: String(currentUserId),
        message: recipientClientMsg,
      })
    }

    return res.json({ message: clientMsg })
  } catch (error) {
    console.error('Update message error:', error)
    return res.status(500).json({ message: 'Failed to update message' })
  }
})

// -------------------------------------------------------------
// DELETE /:contactId/messages/:messageId — Delete single message
// -------------------------------------------------------------
router.delete('/:contactId/messages/:messageId', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const targetId = Number(req.params.contactId)
    const { messageId } = req.params

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!existing || existing.senderId !== currentUserId) {
      return res.status(403).json({ message: 'Cannot delete this message' })
    }

    await prisma.message.delete({
      where: { id: messageId },
    })

    const io = req.app.get('io')
    if (io) {
      io.to(`user:${targetId}`).emit('message:deleted', {
        contactId: String(currentUserId),
        messageId,
      })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return res.status(500).json({ message: 'Failed to delete message' })
  }
})

// -------------------------------------------------------------
// DELETE /:contactId/messages/bulk — Bulk delete messages
// -------------------------------------------------------------
router.delete('/:contactId/messages/bulk', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const targetId = Number(req.params.contactId)
    const { ids } = req.body || {}

    if (Array.isArray(ids) && ids.length) {
      await prisma.message.deleteMany({
        where: {
          id: { in: ids },
          senderId: currentUserId,
        },
      })

      const io = req.app.get('io')
      if (io) {
        ids.forEach((messageId) => {
          io.to(`user:${targetId}`).emit('message:deleted', {
            contactId: String(currentUserId),
            messageId,
          })
        })
      }
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return res.status(500).json({ message: 'Failed to bulk delete messages' })
  }
})

// -------------------------------------------------------------
// DELETE /:contactId — Delete conversation thread
// -------------------------------------------------------------
router.delete('/:contactId', async (req, res) => {
  try {
    const currentUserId = Number(req.user.userId)
    const targetId = Number(req.params.contactId)

    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetId },
          { senderId: targetId, receiverId: currentUserId },
        ],
      },
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Delete chat error:', error)
    return res.status(500).json({ message: 'Failed to clear chat' })
  }
})

export default router
