// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// Creates the HR Manager conversation + notification message for
// emergency check-outs (same message store the in-app inbox uses).
// ------------------------------------------------------------------

import prisma from '../db.js'
import { io } from '../socket.js'

async function findHrManagerUserId() {
  const hr = await prisma.user.findFirst({
    where: { role: 'HR_MANAGER' },
    orderBy: { id: 'asc' },
  })
  return hr ? hr.id : null
}

export async function notifyHrOfEmergencyCheckOut({
  senderUserId,
  employeeName,
  employeeCode,
  date,
  time,
  reason,
}) {
  const hrId = await findHrManagerUserId()
  if (!hrId || hrId === senderUserId) return false

  // Conversation rows are stored ordered (userAId, userBId) — same
  // normalisation as the messaging controller so the unique constraint holds.
  const [userAId, userBId] =
    senderUserId < hrId ? [senderUserId, hrId] : [hrId, senderUserId]

  let conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  })
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userAId, userBId },
    })
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: senderUserId,
      text:
        `🚨 EMERGENCY CHECK-OUT\n` +
        `${employeeName} (${employeeCode}) checked out at ${time} (UTC+3) on ${date}.\n` +
        `Reason: ${reason}`,
    },
  })

  // Live-update HR's inbox if they're online (same event the inbox listens to)
  io.to(`user:${hrId}`).emit('message:new', {
    contactId: senderUserId,
    message: {
      id: message.id,
      text: message.text,
      from: 'them',
      senderId: senderUserId,
      time: new Date(message.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: message.createdAt,
      read: false,
      attachment: null,
    },
  })

  return true
}
