import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mail, Send, Search, Inbox as InboxIcon, Paperclip, CheckCheck, MoreVertical, Trash2, Eraser } from 'lucide-react'
import { CONTACTS, CURRENT_USER } from '../data/messagesData'
import { useMessaging } from '../context/messagingStore'

function Inbox() {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const { threads, totalUnread, unreadByContact, sendMessage, markContactRead, clearChat, deleteChat } = useMessaging()
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [hiddenContacts, setHiddenContacts] = useState(new Set())
  const bottomRef = useRef(null)

  const availableContacts = CONTACTS.filter((c) => !hiddenContacts.has(c.id))
  const activeContact = availableContacts.find((c) => c.id === (contactId || availableContacts[0]?.id)) || availableContacts[0]
  const messages = (activeContact && threads[activeContact.id]) || []

  useEffect(() => {
    if (activeContact) markContactRead(activeContact.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContact?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!activeContact) {
    return (
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-16 text-center">
          <p className="text-sm font-semibold text-gray-900">No conversations</p>
          <p className="text-xs text-gray-500 mt-1">All chats have been deleted.</p>
        </div>
      </div>
    )
  }

  const filteredContacts = availableContacts.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeContact) return
    sendMessage(activeContact.id, draft)
    setDraft('')
  }

  const handleClear = () => {
    clearChat(activeContact.id)
    setShowMenu(false)
  }

  const handleDelete = () => {
    deleteChat(activeContact.id)
    setHiddenContacts((prev) => new Set(prev).add(activeContact.id))
    setShowMenu(false)
    const remaining = availableContacts.filter((c) => c.id !== activeContact.id)
    if (remaining.length > 0) navigate(`/employer/inbox/${remaining[0].id}`, { replace: true })
  }

  const formatDate = () =>
    new Date().toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
          <InboxIcon size={18} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Inbox</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalUnread > 0
              ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''} · chat with Support & HR Managers`
              : 'All caught up · chat with Support & HR Managers'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Live · {formatDate()}</span>
        </div>
      </div>

      {/* Messaging workspace */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-230px)]">
        {/* Contact list */}
        <aside className="lg:w-80 shrink-0 flex flex-col bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {filteredContacts.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-10">No conversations found.</p>
            )}
            {filteredContacts.map((contact) => {
              const unread = unreadByContact(contact.id)
              const thread = threads[contact.id] || []
              const last = thread[thread.length - 1]
              const isActive = activeContact.id === contact.id
              return (
                <button
                  key={contact.id}
                  onClick={() => navigate(`/employer/inbox/${contact.id}`, { replace: true })}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2 ${
                    isActive
                      ? 'bg-gray-50 border-emerald-500'
                      : 'border-transparent hover:bg-gray-50'
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
                      <span className="text-sm font-bold text-gray-900 truncate">{contact.name}</span>
                      {last && <span className="text-[10px] text-gray-400 shrink-0">{last.time}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-gray-500 truncate">
                        {last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'No messages yet'}
                      </span>
                      {unread > 0 ? (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-gray-200" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* current user footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-bold">
                  {CURRENT_USER.initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-300 ring-2 ring-gray-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate">{CURRENT_USER.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{CURRENT_USER.employeeId}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Chat thread */}
        <section className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden min-w-0">
          {/* Thread header */}
          <header className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-full ${activeContact.color} text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0`}>
                {activeContact.initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                  {activeContact.name}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeContact.online ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </h2>
                <p className="text-[11px] text-gray-500 truncate">{activeContact.role} · Yanol Technology</p>
              </div>
            </div>

            {/* Three-dot menu */}
            <div className="relative flex items-center pl-1">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Chat options"
              >
                <MoreVertical size={17} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-11 w-48 bg-white rounded-xl shadow-xl border border-gray-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={handleClear}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
            <div className="flex justify-center mb-4">
              <span className="text-[10px] font-medium text-gray-400">Today</span>
            </div>
            {messages.map((msg) => {
              const mine = msg.from === 'me'
              const initials = mine ? CURRENT_USER.initials : activeContact.initials
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${mine ? 'justify-end flex-row-reverse' : 'justify-start'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full ${
                      mine
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : activeContact.color
                    } text-white text-[10px] font-bold flex items-center justify-center shrink-0`}
                  >
                    {initials}
                  </div>
                  <div
                    className={`max-w-[65%] px-4 py-2.5 text-sm shadow-xs ${
                      mine
                        ? 'bg-white text-gray-800 rounded-2xl rounded-br-md border border-gray-200'
                        : 'bg-gray-50 text-gray-800 rounded-2xl rounded-bl-md border border-gray-200'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-[10px] mt-1 text-gray-400 flex items-center gap-1 justify-end">
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
            className="p-4 border-t border-gray-100 bg-white flex items-center gap-2"
          >
            <button
              type="button"
              className="h-[46px] w-[46px] shrink-0 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 flex items-center justify-center transition-colors"
              title="Attach file"
            >
              <Paperclip size={17} />
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
              className="flex-1 resize-none px-4 py-3 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 min-h-[46px]"
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
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-2">
        <Mail size={12} />
        Signed in as {CURRENT_USER.name} ({CURRENT_USER.employeeId}) — replies are simulated.
      </p>
    </div>
  )
}

export default Inbox