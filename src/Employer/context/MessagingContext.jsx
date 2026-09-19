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

function initialsFromName(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

const STORAGE_KEY = 'yanol_chat_shared_store_v1'

function getLocalSharedStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { threads: {}, hrContacts: [] }
}

function saveLocalSharedStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {}
}

export function MessagingProvider({ children, portalType = 'employer' }) {
  const isHR = portalType === 'hr'
  const [currentUser, setCurrentUser] = useState(() => {
    const authUser = getUser()
    if (isHR) {
      return {
        id: '2',
        name: authUser?.role === 'HR_MANAGER' ? authUser.name : 'Sarah Jenkins',
        email: 'hr@yanol.com',
        role: 'HR_MANAGER',
        roleLabel: 'HR Manager',
        employeeId: 'HR-001',
        initials: 'SJ',
      }
    }
    return {
      id: String(authUser?.id || '1'),
      name: authUser?.name || 'Alex Johnson',
      email: authUser?.email || 'employer@yanol.com',
      role: authUser?.role || 'EMPLOYER',
      roleLabel: 'Employer',
      employeeId: String(authUser?.id || 'EMP-001'),
      initials: initialsFromName(authUser?.name || 'Alex Johnson'),
    }
  })

  const [contacts, setContacts] = useState([])
  const [threads, setThreads] = useState({})
  const [notifications, setNotifications] = useState([])

  const contactsRef = useRef(contacts)
  contactsRef.current = contacts

  const threadsRef = useRef(threads)
  threadsRef.current = threads

  const channelRef = useRef(null)

  const upsertMessage = useCallback((contactId, message, replaceId) => {
    const key = String(contactId)
    setThreads((prev) => {
      const current = prev[key] || []
      let nextMessages
      if (replaceId) {
        nextMessages = current.map((m) => (m.id === replaceId ? message : m))
      } else {
        const existingIndex = current.findIndex((m) => m.id === message.id)
        if (existingIndex === -1) {
          nextMessages = [...current, message]
        } else if (!message.pending && isSameOrNewer(current[existingIndex], message)) {
          nextMessages = [...current]
          nextMessages[existingIndex] = message
        } else {
          return prev
        }
      }

      // Persist to local shared store
      const store = getLocalSharedStore()
      store.threads[key] = nextMessages
      saveLocalSharedStore(store)

      return { ...prev, [key]: nextMessages }
    })
  }, [])

  const reloadContactsAndThreads = useCallback(async () => {
    const authUser = getUser()
    const store = getLocalSharedStore()

    // Restore cached threads
    if (store.threads && Object.keys(store.threads).length > 0) {
      setThreads((prev) => ({ ...store.threads, ...prev }))
    }

    try {
      const { contacts: raw } = await fetchContactsApi()
      if (Array.isArray(raw)) {
        const colored = raw.map((c, i) => ({
          ...c,
          id: String(c.id),
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }))

        // For Employer: only show contacts with messages
        if (!isHR) {
          const filtered = colored.filter((c) => {
            const t = (store.threads && store.threads[c.id]) || []
            return c.lastMessage !== null || t.length > 0
          })
          setContacts(filtered)
        } else {
          setContacts(colored)
        }

        const settled = await Promise.allSettled(colored.map((c) => fetchThreadApi(c.id)))
        const initialThreads = { ...(store.threads || {}) }
        colored.forEach((c, i) => {
          if (settled[i].status === 'fulfilled' && Array.isArray(settled[i].value.messages)) {
            initialThreads[c.id] = settled[i].value.messages
          }
        })
        setThreads(initialThreads)
      }
    } catch {
      // Fallback in demo mode
      if (isHR) {
        const defaultContacts = [
          { id: '1', name: 'Alex Johnson', email: 'employer@yanol.com', role: 'EMPLOYER', roleLabel: 'Employer', initials: 'AJ', color: 'bg-sky-500', online: true, unread: 0, lastMessage: null },
        ]
        setContacts((prev) => (prev.length > 0 ? prev : defaultContacts))
      } else {
        // For employer, check if HR conversation has messages
        const hrThread = (store.threads && store.threads['2']) || []
        if (hrThread.length > 0) {
          const last = hrThread[hrThread.length - 1]
          setContacts([
            {
              id: '2',
              name: 'Sarah Jenkins',
              email: 'hr@yanol.com',
              role: 'HR_MANAGER',
              roleLabel: 'HR Manager',
              initials: 'SJ',
              color: 'bg-violet-500',
              online: true,
              unread: 0,
              lastMessage: {
                text: last.text,
                from: last.from,
                time: last.time,
              },
            },
          ])
        } else {
          setContacts([])
        }
      }
    }
  }, [isHR])

  const handleIncoming = useCallback(
    ({ contactId, message }) => {
      const cId = String(contactId)
      upsertMessage(cId, message)

      const existingContact = contactsRef.current.find((c) => String(c.id) === cId)
      if (existingContact) {
        setContacts((prev) => {
          const updated = prev.map((c) =>
            String(c.id) === cId
              ? {
                  ...c,
                  unread: message.from === 'them' ? (c.unread || 0) + 1 : c.unread,
                  lastMessage: {
                    text: message.text || (message.attachment ? `📎 ${message.attachment.name}` : ''),
                    from: message.from,
                    time: message.time,
                  },
                }
              : c
          )
          return [
            ...updated.filter((c) => String(c.id) === cId),
            ...updated.filter((c) => String(c.id) !== cId),
          ]
        })
      } else {
        // Automatically add the sender contact so the conversation appears immediately
        const newContact = {
          id: cId,
          name: isHR ? (message.senderName || 'Employer') : 'Sarah Jenkins (HR)',
          email: isHR ? 'employer@yanol.com' : 'hr@yanol.com',
          role: 'EMPLOYER',
          roleLabel: isHR ? 'Employer' : 'HR Manager',
          initials: isHR ? 'AJ' : 'SJ',
          color: 'bg-sky-500',
          online: true,
          unread: message.from === 'them' ? 1 : 0,
          lastMessage: {
            text: message.text || (message.attachment ? `📎 ${message.attachment.name}` : ''),
            from: message.from,
            time: message.time,
          },
        }
        setContacts((prev) => [newContact, ...prev])
      }

      if (message.from === 'them') {
        setNotifications((prev) => [
          {
            id: `n-${message.id}-${Date.now()}`,
            title: `New message from ${isHR ? 'Employer' : 'HR'}`,
            message: message.text || (message.attachment ? `Shared a file: ${message.attachment.name}` : ''),
            time: 'Now',
            unread: true,
            type: 'message',
            contactId: cId,
          },
          ...prev,
        ].slice(0, 20))
      }
    },
    [isHR, upsertMessage]
  )

  const handlePresence = useCallback(({ userId, online }) => {
    setContacts((prev) => prev.map((c) => (String(c.id) === String(userId) ? { ...c, online } : c)))
  }, [])

  useEffect(() => {
    reloadContactsAndThreads()

    const socket = connectSocket()
    if (socket) {
      socket.on('message:new', handleIncoming)
      socket.on('presence', handlePresence)
    }

    try {
      const channel = new BroadcastChannel('yanol_messaging_realtime')
      channelRef.current = channel

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {}
        if (type === 'NEW_MESSAGE' && payload) {
          const { senderPortal, targetContactId, message, senderName } = payload

          if (isHR && senderPortal === 'employer') {
            // HR receives message sent by Employee
            handleIncoming({
              contactId: targetContactId || '1',
              message: { ...message, from: 'them', senderName },
            })
          } else if (!isHR && senderPortal === 'hr') {
            // Employee receives message sent by HR
            handleIncoming({
              contactId: '2',
              message: { ...message, from: 'them', senderName: 'Sarah Jenkins (HR)' },
            })
          }
        } else if (type === 'CONVERSATION_STARTED') {
          reloadContactsAndThreads()
        }
      }
    } catch {}

    return () => {
      if (socket) {
        socket.off('message:new', handleIncoming)
        socket.off('presence', handlePresence)
      }
      disconnectSocket()
      if (channelRef.current) {
        channelRef.current.close()
        channelRef.current = null
      }
    }
  }, [handleIncoming, handlePresence, isHR, reloadContactsAndThreads])

  const sendMessage = useCallback(
    async (contactId, text) => {
      const cId = String(contactId)
      const trimmed = String(text || '').trim()
      if (!trimmed) return
      const tempId = `pending-${Date.now()}`
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const nowIso = new Date().toISOString()

      const optimisticMsg = {
        id: tempId,
        text: trimmed,
        from: 'me',
        senderId: isHR ? 2 : 1,
        time: nowTime,
        createdAt: nowIso,
        read: false,
        attachment: null,
        pending: true,
      }

      upsertMessage(cId, optimisticMsg)

      setContacts((prev) => {
        const updated = prev.map((c) =>
          String(c.id) === cId
            ? {
                ...c,
                lastMessage: {
                  text: trimmed,
                  from: 'me',
                  time: nowTime,
                },
              }
            : c
        )
        return [
          ...updated.filter((c) => String(c.id) === cId),
          ...updated.filter((c) => String(c.id) !== cId),
        ]
      })

      // Broadcast immediately across all browser tabs
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'NEW_MESSAGE',
          payload: {
            senderPortal: isHR ? 'hr' : 'employer',
            targetContactId: cId,
            senderName: currentUser.name,
            message: {
              id: tempId,
              text: trimmed,
              time: nowTime,
              createdAt: nowIso,
              read: false,
              attachment: null,
            },
          },
        })
      }

      try {
        const { message } = await sendMessageApi(cId, trimmed)
        upsertMessage(cId, message, tempId)
      } catch {
        upsertMessage(
          cId,
          { id: tempId, text: trimmed, from: 'me', time: nowTime, read: false, attachment: null, pending: false, failed: false },
          tempId
        )
      }
    },
    [currentUser.name, isHR, upsertMessage]
  )

  const sendAttachment = useCallback(
    async (contactId, file) => {
      const cId = String(contactId)
      const tempId = `pending-${Date.now()}`
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const nowIso = new Date().toISOString()

      upsertMessage(cId, {
        id: tempId,
        text: '',
        from: 'me',
        senderId: isHR ? 2 : 1,
        time: nowTime,
        createdAt: nowIso,
        read: false,
        attachment: { url: null, name: file.name, type: file.type, uploading: true },
        pending: true,
      })

      try {
        const { message } = await sendAttachmentApi(cId, file)
        upsertMessage(cId, message, tempId)
      } catch {
        /* upload failed */
      }
    },
    [isHR, upsertMessage]
  )

  const markContactRead = useCallback(
    async (contactId) => {
      const cId = String(contactId)
      setThreads((prev) => ({
        ...prev,
        [cId]: (prev[cId] || []).map((m) => (m.from === 'them' ? { ...m, read: true } : m)),
      }))
      setContacts((prev) => prev.map((c) => (String(c.id) === cId ? { ...c, unread: 0 } : c)))
      try {
        await markReadApi(cId)
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
    try {
      const { user } = await startConversationApi(payload)
      const newContact = {
        ...user,
        id: String(user.id),
        color: AVATAR_COLORS[contactsRef.current.length % AVATAR_COLORS.length],
        roleLabel: user.subtitle || user.role,
        unread: 0,
        lastMessage: null,
      }
      setContacts((prev) =>
        prev.some((c) => String(c.id) === String(user.id)) ? prev : [newContact, ...prev]
      )

      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'CONVERSATION_STARTED', payload: user })
      }
      return newContact
    } catch {
      const fallbackUser = {
        id: String(person.id),
        name: person.name,
        email: person.email,
        role: person.role || 'EMPLOYER',
        roleLabel: person.subtitle || 'Employer',
        initials: person.initials || initialsFromName(person.name),
        color: AVATAR_COLORS[contactsRef.current.length % AVATAR_COLORS.length],
        online: true,
        unread: 0,
        lastMessage: null,
      }
      setContacts((prev) =>
        prev.some((c) => String(c.id) === String(fallbackUser.id)) ? prev : [fallbackUser, ...prev]
      )
      return fallbackUser
    }
  }, [])

  const clearChat = useCallback(async (contactId) => {
    const cId = String(contactId)
    setThreads((prev) => ({ ...prev, [cId]: [] }))
    setContacts((prev) =>
      prev.map((c) => (String(c.id) === cId ? { ...c, unread: 0, lastMessage: null } : c))
    )
    // Clear from the local shared store so it doesn't resurface on reload
    const store = getLocalSharedStore()
    store.threads[cId] = []
    saveLocalSharedStore(store)
    try {
      await clearChatApi(cId)
    } catch {
      /* ignore */
    }
  }, [])

  const deleteChat = useCallback(async (contactId) => {
    const cId = String(contactId)
    setThreads((prev) => {
      const next = { ...prev }
      delete next[cId]
      return next
    })
    setContacts((prev) =>
      prev.map((c) => (String(c.id) === cId ? { ...c, unread: 0, lastMessage: null } : c))
    )
    // Remove from the local shared store so it doesn't resurface on reload
    const store = getLocalSharedStore()
    delete store.threads[cId]
    saveLocalSharedStore(store)
    try {
      await deleteChatApi(cId)
    } catch {
      /* ignore */
    }
  }, [])

  const totalUnread = Object.values(threads).reduce(
    (sum, msgs) => sum + msgs.filter((m) => m.from === 'them' && !m.read).length,
    0
  )

  const unreadByContact = (contactId) =>
    (threads[String(contactId)] || []).filter((m) => m.from === 'them' && !m.read).length

  const unreadNotifications = notifications.filter((n) => n.unread).length

  const value = {
    currentUser,
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
    reloadContactsAndThreads,
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}