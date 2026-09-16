import { useState, useCallback } from 'react'
import { CONTACTS, INITIAL_THREADS, INITIAL_NOTIFICATIONS, getAutoReply } from '../data/messagesData'
import { MessagingContext } from './messagingStore'

export function MessagingProvider({ children }) {
  const [threads, setThreads] = useState(INITIAL_THREADS)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [replyIndex, setReplyIndex] = useState({})

  const nowTime = () => new Date().toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })

  const totalUnread = Object.values(threads).reduce(
    (sum, thread) => sum + thread.filter((m) => m.from === 'them').length,
    0
  )

  const unreadByContact = (contactId) =>
    (threads[contactId] || []).filter((m) => m.from === 'them').length

  const sendMessage = useCallback(
    (contactId, text) => {
      if (!text.trim()) return
      setThreads((prev) => ({
        ...prev,
        [contactId]: [
          ...(prev[contactId] || []),
          { id: `me-${Date.now()}`, from: 'me', text, time: nowTime() },
        ],
      }))

      // Simulated auto-reply from the contact
      const contact = CONTACTS.find((c) => c.id === contactId)
      const idx = replyIndex[contactId] || 0
      setReplyIndex((prev) => ({ ...prev, [contactId]: idx + 1 }))

      setTimeout(() => {
        const replyText = getAutoReply(contactId, idx)
        setThreads((prev) => ({
          ...prev,
          [contactId]: [
            ...(prev[contactId] || []),
            { id: `t-${Date.now()}`, from: 'them', text: replyText, time: nowTime() },
          ],
        }))

        // Turn the reply into a notification
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            title: `New message from ${contact?.name || 'team'}`,
            message: replyText.slice(0, 80),
            time: 'Now',
            unread: true,
            type: 'message',
            contactId,
          },
          ...prev,
        ])
      }, 900)
    },
    [replyIndex]
  )

  const markContactRead = useCallback((contactId) => {
    setThreads((prev) => ({
      ...prev,
      [contactId]: (prev[contactId] || []).map((m) =>
        m.from === 'them' ? { ...m, read: true } : m
      ),
    }))
  }, [])

  const markAllRead = useCallback(() => {
    const next = {}
    Object.keys(threads).forEach((cid) => {
      next[cid] = (threads[cid] || []).map((m) =>
        m.from === 'them' ? { ...m, read: true } : m
      )
    })
    setThreads(next)
  }, [threads])

  const markAllNotificationsReadAndRemove = useCallback(() => {
    // 1. Mark all thread messages as read
    const next = {}
    Object.keys(threads).forEach((cid) => {
      next[cid] = (threads[cid] || []).map((m) =>
        m.from === 'them' ? { ...m, read: true } : m
      )
    })
    setThreads(next)

    // 2. Remove all notifications
    setNotifications([])
  }, [threads, notifications])

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearChat = useCallback((contactId) => {
    setThreads((prev) => ({ ...prev, [contactId]: [] }))
  }, [])

  const deleteChat = useCallback((contactId) => {
    setThreads((prev) => {
      const next = { ...prev }
      delete next[contactId]
      return next
    })
  }, [])

  const unreadNotifications = notifications.filter((n) => n.unread).length

  const value = {
    threads,
    notifications,
    totalUnread,
    unreadByContact,
    unreadNotifications,
    sendMessage,
    markContactRead,
    markAllRead,
    dismissNotification,
    clearChat,
    deleteChat,
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}