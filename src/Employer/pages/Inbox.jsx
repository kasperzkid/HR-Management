import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mail, Send, Search, Inbox as InboxIcon, Paperclip, CheckCheck, MoreVertical, Trash2, Eraser, FileText, X, Plus, UserPlus, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useMessaging } from '../context/messagingStore'
import { fetchUsersApi } from '../../lib/messagesApi'

const MODAL_COLORS = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500']

function NewConversationModal({ open, onClose, onSelect }) {
  const { startConversation } = useMessaging()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { users } = await fetchUsersApi()
      setPeople(users)
    } catch {
      setError("Couldn't load your team. Make sure the server is running.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setQuery('')
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const q = query.trim().toLowerCase()
  const filtered = q
    ? people.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.subtitle || '').toLowerCase().includes(q)
      )
    : people
  const team = filtered.filter((p) => p.kind === 'user')
  const employees = filtered.filter((p) => p.kind === 'employee')

  const handlePick = async (person) => {
    if (starting) return
    setStarting(person.email)
    try {
      const user = await startConversation(person)
      onSelect(user)
    } catch {
      setError("Couldn't start this conversation. Please try again.")
    } finally {
      setStarting(null)
    }
  }

  const Row = ({ person }) => (
    <button
      onClick={() => handlePick(person)}
      className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors border-l-2 border-transparent hover:border-emerald-500 disabled:opacity-60 disabled:pointer-events-none"
      disabled={!!starting}
    >
      <div className="relative shrink-0">
        {person.avatar && !person.online ? (
          <img
            src={person.avatar}
            alt={person.name}
            className="w-11 h-11 rounded-full object-cover shadow-xs"
          />
        ) : (
          <div
            className={`w-11 h-11 rounded-full ${MODAL_COLORS[Math.abs(String(person.email).length + people.indexOf(person)) % MODAL_COLORS.length]} text-white font-bold text-sm flex items-center justify-center shadow-xs`}
          >
            {person.initials}
          </div>
        )}
        {person.online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#15181d]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{person.name}</p>
          {person.kind === 'employee' && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-full px-1.5 py-0.5">
              Employee
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {person.subtitle || 'Team member'} · {person.email}
        </p>
      </div>
      {starting === person.email ? (
        <Loader2 size={15} className="shrink-0 animate-spin text-emerald-500" />
      ) : (
        <span className="shrink-0 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400">
          <Plus size={14} />
        </span>
      )}
    </button>
  )

  const SectionHeader = ({ label, count }) => (
    <div className="px-5 pt-3 pb-1 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#15181d]/90 backdrop-blur-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">{count}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-[2px]" onClick={() => !starting && onClose()} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xl dark:shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#262b31]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center shadow-xs">
              <UserPlus size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">New conversation</h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Message a teammate or any employee</p>
            </div>
          </div>
          <button
            onClick={() => !starting && onClose()}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, roles, departments…"
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-[#15181d] border border-gray-200 dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
            />
          </div>
        </div>

        <div className="max-h-[56vh] overflow-y-auto pb-2">
          {loading && (
            <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-500">
              <Loader2 size={20} className="animate-spin mb-2" />
              <p className="text-xs">Loading your team…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <AlertCircle size={20} className="text-amber-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
              <button
                onClick={load}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 h-8 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 transition-colors"
              >
                <RefreshCw size={13} />
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-500">
              <Search size={20} className="mb-2" />
              <p className="text-xs">No people match “{query}”.</p>
              <p className="text-[11px] mt-0.5">Try a name, work email, role or department.</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              {q ? (
                <>
                  <SectionHeader label={`Results · ${filtered.length}`} count="" />
                  {filtered.map((person) => (
                    <Row key={`${person.kind}-${person.id}`} person={person} />
                  ))}
                </>
              ) : (
                <>
                  {team.length > 0 && (
                    <>
                      <SectionHeader label="People" count={team.length} />
                      {team.map((person) => (
                        <Row key={`${person.kind}-${person.id}`} person={person} />
                      ))}
                    </>
                  )}
                  {employees.length > 0 && (
                    <>
                      <SectionHeader label="Employees" count={employees.length} />
                      {employees.map((person) => (
                        <Row key={`${person.kind}-${person.id}`} person={person} />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#262b31] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {team.some((p) => p.kind === 'user' && p.online) ? 'Some people are online now.' : 'Employees are added to messaging when you first message them.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Inbox({ basePath = '/employer/inbox', canStartChat = false }) {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const { contacts, threads, currentUser, demoMode, totalUnread, unreadByContact, sendMessage, sendAttachment, markContactRead, clearChat, deleteChat } =
    useMessaging()
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [hiddenContacts, setHiddenContacts] = useState(new Set())
  const [uploading, setUploading] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  const availableContacts = contacts.filter((c) => !hiddenContacts.has(c.id))
  const activeContact = availableContacts.find((c) => c.id === (contactId || availableContacts[0]?.id)) || availableContacts[0]
  const messages = activeContact ? threads[activeContact.id] || [] : []

  useEffect(() => {
    if (activeContact) markContactRead(activeContact.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContact?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSelectContact = (person) => {
    if (hiddenContacts.has(person.id)) {
      setHiddenContacts((prev) => {
        const next = new Set(prev)
        next.delete(person.id)
        return next
      })
    }
    setNewChatOpen(false)
    navigate(`${basePath}/${person.id}`, { replace: true })
  }

  if (!activeContact) {
    return (
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
        <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs dark:shadow-black/40 p-16 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No conversations</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {canStartChat ? 'Start a new conversation to message your team.' : 'All chats have been deleted.'}
          </p>
          {canStartChat && (
            <button
              onClick={() => setNewChatOpen(true)}
              className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-xs"
            >
              <Plus size={16} />
              New conversation
            </button>
          )}
        </div>
        {canStartChat && (
          <NewConversationModal
            key={newChatOpen ? 'open' : 'closed'}
            open={newChatOpen}
            onClose={() => setNewChatOpen(false)}
            onSelect={handleSelectContact}
          />
        )}
      </div>
    )
  }

  const filteredContacts = availableContacts.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleClear = () => {
    clearChat(activeContact.id)
    setShowMenu(false)
  }

  const handleDelete = () => {
    deleteChat(activeContact.id)
    setHiddenContacts((prev) => new Set(prev).add(activeContact.id))
    setShowMenu(false)
    const remaining = availableContacts.filter((c) => c.id !== activeContact.id)
    if (remaining.length > 0) navigate(`${basePath}/${remaining[0].id}`, { replace: true })
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeContact) return
    sendMessage(activeContact.id, draft)
    setDraft('')
  }

  const handleFile = async (file) => {
    if (!file || !activeContact) return
    setUploading(true)
    try {
      await sendAttachment(activeContact.id, file)
    } catch {
      /* upload failed */
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
          <InboxIcon size={18} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">Inbox</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {totalUnread > 0
              ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''} · real-time chat with your team`
              : 'All caught up · real-time chat with your team'}
          </p>
        </div>
        {canStartChat && (
          <button
            onClick={() => setNewChatOpen(true)}
            className="ml-2 shrink-0 h-10 px-4 flex items-center gap-2 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-sm font-semibold shadow-xs hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus size={16} />
            New conversation
          </button>
        )}
      </div>

      {demoMode && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-semibold">Offline demo mode</p>
            <p className="mt-0.5">
              You're signed in with the offline demo account, so messaging is unavailable. Start the API server (<code className="font-mono">node index.js</code> in{' '}
              <code className="font-mono">server/</code>) and log back in with a real account (e.g. <code className="font-mono">employer@yanol.com</code> /{' '}
              <code className="font-mono">employer123</code>) to chat in real time.
            </p>
          </div>
        </div>
      )}

      {/* Messaging workspace */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-230px)]">
        {/* Contact list */}
        <aside className="lg:w-80 shrink-0 flex flex-col bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs dark:shadow-black/40 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-[#262b31]">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-[#15181d] border border-gray-200 dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {filteredContacts.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-10">No conversations found.</p>
            )}
            {filteredContacts.map((contact) => {
              const unread = unreadByContact(contact.id)
              const thread = threads[contact.id] || []
              const last = thread[thread.length - 1]
              const isActive = activeContact.id === contact.id
              return (
                <button
                  key={contact.id}
                  onClick={() => navigate(`${basePath}/${contact.id}`, { replace: true })}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2 ${
                    isActive
                      ? 'bg-gray-50 dark:bg-[#1c2026] border-emerald-500'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full ${contact.color} text-white font-bold text-sm flex items-center justify-center shadow-xs`}
                    >
                      {contact.initials}
                    </div>
                    {contact.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{contact.name}</span>
                      {last && <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{last.time}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'No messages yet'}
                      </span>
                      {unread > 0 ? (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* current user footer */}
          <div className="p-4 border-t border-gray-100 dark:border-[#262b31] bg-gray-50/40 dark:bg-[#1c2026]">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-300 dark:bg-[#3a4149] text-gray-700 dark:text-gray-200 flex items-center justify-center text-xs font-bold">
                  {currentUser.initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-[#3a4149] ring-2 ring-gray-200 dark:ring-gray-800" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{currentUser.employeeId}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Chat thread */}
        <section className="flex-1 flex flex-col bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs dark:shadow-black/40 overflow-hidden min-w-0">
          {/* Thread header */}
          <header className="px-5 py-3.5 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-full ${activeContact.color} text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0`}>
                {activeContact.initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                  {activeContact.name}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeContact.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{activeContact.role} · Yanol Technology</p>
              </div>
            </div>

            {/* Three-dot menu */}
            <div className="relative flex items-center pl-1">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
                title="Chat options"
              >
                <MoreVertical size={17} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-11 w-48 bg-white dark:bg-[#15181d] rounded-xl shadow-xl dark:shadow-black/40 border border-gray-200/90 dark:border-[#262b31] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={handleClear}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors"
                  >
                    <Eraser size={15} className="text-gray-400" />
                    Clear chat
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                    Delete chat
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-12">
                <div className={`w-14 h-14 rounded-full ${activeContact.color} text-white font-bold text-lg flex items-center justify-center shadow-xs mb-3`}>
                  {activeContact.initials}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Chat with {activeContact.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[260px]">
                  This is the start of your conversation. Say hello and message {activeContact.name.split(' ')[0]} directly.
                </p>
              </div>
            )}
            <div className="flex justify-center mb-4">
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Today</span>
            </div>
            {messages.map((msg) => {
              const mine = msg.from === 'me'
              const initials = mine ? currentUser.initials : activeContact.initials
              const att = msg.attachment
              const isImage = att && att.type && att.type.startsWith('image/')
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${mine ? 'justify-end flex-row-reverse' : 'justify-start'}`}
                >
                  <div
                    className={`w-8 h-8 min-w-8 rounded-full ${
                      mine
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : activeContact.color
                    } text-white text-[11px] font-bold tracking-wide leading-none flex items-center justify-center shrink-0`}
                  >
                    {initials}
                  </div>
                  <div
                    className={`max-w-[65%] px-4 py-2.5 text-sm shadow-xs ${
                      mine
                        ? 'bg-white dark:bg-[#15181d] text-gray-800 dark:text-gray-100 rounded-2xl rounded-br-md border border-gray-200 dark:border-[#262b31]'
                        : 'bg-gray-50 dark:bg-[#1c2026] text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-md border border-gray-200 dark:border-[#262b31]'
                    }`}
                  >
                    {att && (
                      <div className="mb-1.5">
                        {att.uploading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <X size={14} className="animate-spin" />
                            <span className="truncate max-w-[40vw]">{att.name}</span>
                            <FileText size={14} className="shrink-0" />
                          </div>
                        ) : isImage ? (
                          <a href={att.url} target="_blank" rel="noreferrer">
                            <img
                              src={att.url}
                              alt={att.name}
                              className="rounded-lg border border-gray-200 dark:border-[#33383f] max-h-52 w-auto object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-[#2a3139] rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-[#33383f] hover:bg-gray-200 dark:hover:bg-[#3a4149] transition-colors"
                          >
                            <FileText size={14} className="text-gray-500 shrink-0" />
                            <span className="truncate max-w-[40vw]">{att.name}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                    <p className="text-[10px] mt-1 text-gray-400 dark:text-gray-500 flex items-center gap-1 justify-end">
                      {msg.time}
                      {mine && <CheckCheck size={12} />}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-gray-100 dark:border-[#262b31] bg-white dark:bg-[#15181d] flex items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
              onChange={(e) => handleFile(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-[46px] w-[46px] shrink-0 rounded-xl bg-gray-50 dark:bg-[#1c2026] border border-gray-200 dark:border-[#33383f] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-[#2a3139] flex items-center justify-center transition-colors disabled:opacity-50"
              title={uploading ? 'Uploading…' : 'Attach file'}
            >
              {uploading ? <X size={17} className="animate-spin" /> : <Paperclip size={17} />}
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              placeholder={`Message ${activeContact.name.split(' ')[0]}…`}
              rows={1}
              className="flex-1 resize-none px-4 py-3 text-sm rounded-xl bg-gray-50 dark:bg-[#1c2026] border border-gray-200 dark:border-[#33383f] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 min-h-[46px]"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="shrink-0 h-[46px] px-4 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={15} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </section>
      </div>

      {/* Signed in as */}
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 pt-2">
        <Mail size={12} />
        Signed in as {currentUser.name} ({currentUser.employeeId}) — messages sync in real time.
      </p>

      <NewConversationModal
        key={newChatOpen ? 'open' : 'closed'}
        open={canStartChat && newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSelect={handleSelectContact}
      />
    </div>
  )
}

export default Inbox