import { useEffect, useRef, useState, useCallback } from 'react'
import { MessagingContext } from './messagingStore'
import { getUser } from '../../lib/auth'
import { connectSocket, disconnectSocket } from '../../lib/socket'
import {
  fetchContactsApi,
  fetchThreadApi,
  sendMessageApi,
  sendAttachmentApi,
  markReadApi,
  clearChatApi,
  deleteChatApi,
  startConversationApi,
} from '../../lib/messagesApi'

const AVATAR_COLORS = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
]

const isSameOrNewer = (existing, incoming) =>
  new Date(existing?.createdAt || 0) >= new Date(incoming.createdAt || 0)

export function MessagingProvider({ children }) {
  const [currentUser] = useState(() => getUser())
  const [demoMode] = useState(() => {
    const token = getUser()?.token
    return !token || token.startsWith('session-')
  })
  const [contacts, setContacts] = useState([])
  const [threads, setThreads] = useState({})
  const [notifications, setNotifications] = useState([])

  const contactsRef = useRef(contacts)
  contactsRef.current = contacts

  const upsertMessage = useCallback((contactId, message, replaceId) => {
    setThreads((prev) => {
      const current = prev[contactId] || []
      if (replaceId) {
        return { ...prev, [contactId]: current.map((m) => (m.id === replaceId ? message : m)) }
      }
      const existingIndex = current.findIndex((m) => m.id === message.id)
      if (existingIndex === -1) {
        return { ...prev, [contactId]: [...current, message] }
      }
      // Replace duplicate preserved only if the incoming copy is newer/complete
      if (!message.pending && isSameOrNewer(current[existingIndex], message)) {
        const next = [...current]
        next[existingIndex] = message
        return { ...prev, [contactId]: next }
      }
      return prev
    })
  }, [])

  const handleIncoming = useCallback(
    ({ contactId, message }) => {
      upsertMessage(contactId, message)
      if (message.from === 'them') {
        const contact = contactsRef.current.find((c) => c.id === contactId)
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  unread: (c.unread || 0) + 1,
                  lastMessage: {
                    text: message.text || (message.attachment ? `📎 ${message.attachment.name}` : ''),
                    from: 'them',
                    time: message.time,
                  },
                }
              : c
          )
        )
        setNotifications((prev) => [
          {
            id: `n-${message.id}-${Date.now()}`,
            title: `New message from ${contact?.name || 'team'}`,
            message: message.text || (message.attachment ? `Shared a file: ${message.attachment.name}` : ''),
            time: 'Now',
            unread: true,
            type: 'message',
            contactId,
          },
          ...prev,
        ].slice(0, 20))
      }
    },
    [upsertMessage]
  )

  const handlePresence = useCallback(({ userId, online }) => {
    setContacts((prev) => prev.map((c) => (c.id === userId ? { ...c, online } : c)))
  }, [])

  useEffect(() => {
    if (demoMode) return
    const user = getUser()
    if (!user?.token) return

    let cancelled = false

    ;(async () => {
      try {
        const { contacts: raw } = await fetchContactsApi()
        if (cancelled) return
        const colored = raw.map((c, i) => ({ ...c, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }))
        setContacts(colored)

        const settled = await Promise.allSettled(colored.map((c) => fetchThreadApi(c.id)))
        if (cancelled) return
        const initialThreads = {}
        colored.forEach((c, i) => {
          initialThreads[c.id] = settled[i].status === 'fulfilled' ? settled[i].value.messages : []
        })
        setThreads(initialThreads)
      } catch {
        if (cancelled) return
      }

      const socket = connectSocket()
      if (!socket) return
      socket.on('message:new', handleIncoming)
      socket.on('presence', handlePresence)
    })()

    return () => {
      cancelled = true
      disconnectSocket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode])

  const sendMessage = useCallback(
    async (contactId, text) => {
      const trimmed = String(text || '').trim()
      if (!trimmed) return
      const tempId = `pending-${Date.now()}`
      upsertMessage(contactId, {
        id: tempId,
        text: trimmed,
        from: 'me',
        senderId: currentUser?.id,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        read: false,
        attachment: null,
        pending: true,
      })
      try {
        const { message } = await sendMessageApi(contactId, trimmed)
        upsertMessage(contactId, message, tempId)
      } catch {
        upsertMessage(
          contactId,
          { id: tempId, text: trimmed, from: 'me', time: 'Failed', read: false, attachment: null, pending: true, failed: true },
          tempId
        )
      }
    },
    [currentUser, upsertMessage]
  )

  const sendAttachment = useCallback(
    async (contactId, file) => {
      const tempId = `pending-${Date.now()}`
      upsertMessage(contactId, {
        id: tempId,
        text: '',
        from: 'me',
        senderId: currentUser?.id,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        read: false,
        attachment: { url: null, name: file.name, type: file.type, uploading: true },
        pending: true,
      })
      const { message } = await sendAttachmentApi(contactId, file)
      upsertMessage(contactId, message, tempId)
    },
    [currentUser, upsertMessage]
  )

  const markContactRead = useCallback(
    async (contactId) => {
      setThreads((prev) => ({
        ...prev,
        [contactId]: (prev[contactId] || []).map((m) => (m.from === 'them' ? { ...m, read: true } : m)),
      }))
      setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, unread: 0 } : c)))
      try {
        await markReadApi(contactId)
      } catch {
        /* ignore */
      }
    },
    []
  )

  const markAllRead = useCallback(() => {
    contactsRef.current.forEach((c) => {
      if ((c.unread || 0) > 0) markContactRead(c.id)
    })
  }, [markContactRead])

  const markAllNotificationsReadAndRemove = useCallback(() => {
    setNotifications([])
    markAllRead()
  }, [markAllRead])

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const startConversation = useCallback(async (person) => {
    const payload = person.kind === 'employee' ? { employeeId: person.id } : { userId: person.userId || person.id }
    const { user } = await startConversationApi(payload)
    setContacts((prev) =>
      prev.some((c) => c.id === user.id)
        ? prev
        : [
            {
              ...user,
              color: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
              roleLabel: user.subtitle,
              unread: 0,
              lastMessage: null,
            },
            ...prev,
          ]
    )
    return user
  }, [])

  const clearChat = useCallback(async (contactId) => {
    setThreads((prev) => ({ ...prev, [contactId]: [] }))
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unread: 0, lastMessage: null } : c))
    )
    try {
      await clearChatApi(contactId)
    } catch {
      /* ignore */
    }
  }, [])

  const deleteChat = useCallback(async (contactId) => {
    setThreads((prev) => {
      const next = { ...prev }
      delete next[contactId]
      return next
    })
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unread: 0, lastMessage: null } : c))
    )
    try {
      await deleteChatApi(contactId)
    } catch {
      /* ignore */
    }
  }, [])

  const totalUnread = Object.values(threads).reduce(
    (sum, msgs) => sum + msgs.filter((m) => m.from === 'them' && !m.read).length,
    0
  )

  const unreadByContact = (contactId) =>
    (threads[contactId] || []).filter((m) => m.from === 'them' && !m.read).length

  const unreadNotifications = notifications.filter((n) => n.unread).length

  const name = currentUser?.name || 'User'
  const value = {
    currentUser: {
      id: currentUser?.id ?? currentUser?.email ?? 'me',
      name,
      employeeId: currentUser?.id ?? currentUser?.email ?? 'me',
      initials: name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join(''),
    },
    demoMode,
    contacts,
    threads,
    notifications,
    totalUnread,
    unreadByContact,
    unreadNotifications,
    sendMessage,
    sendAttachment,
    startConversation,
    markContactRead,
    markAllRead,
    markAllNotificationsReadAndRemove,
    dismissNotification,
    clearChat,
    deleteChat,
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}