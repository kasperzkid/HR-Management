import { Router } from 'express'
import {
  getContacts,
  getUsers,
  startConversation,
  getThread,
  sendMessage,
  updateMessage,
  deleteMessage,
  bulkDeleteMessages,
  uploadAttachment,
  markRead,
  clearChat,
  deleteChat,
} from '../controllers/message.controller.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/users', getUsers)
router.post('/start', startConversation)
router.get('/contacts', getContacts)
router.get('/:contactId', getThread)
router.post('/:contactId', sendMessage)
router.post('/:contactId/upload', upload.single('file'), uploadAttachment)
router.post('/:contactId/read', markRead)
router.put('/:contactId/messages/:messageId', updateMessage)
router.delete('/:contactId/messages/bulk', bulkDeleteMessages)
router.delete('/:contactId/messages/:messageId', deleteMessage)
router.delete('/:contactId/messages', clearChat)
router.delete('/:contactId', deleteChat)

export default router