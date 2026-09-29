import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightParts(text, query) {
  if (!query.trim()) return [{ text, match: false }]
  const regex = new RegExp(escapeRegExp(query), 'gi')
  const parts = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), match: false })
    }
    parts.push({ text: match[0], match: true })
    lastIndex = match.index + match[0].length
    if (match.index === regex.lastIndex) {
      regex.lastIndex++
    }
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), match: false })
  }
  return parts
}

function Highlighted({ text, query }) {
  const parts = highlightParts(text, query)
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark
            key={i}
            className="rounded bg-yellow-200/70 px-0.5 font-semibold text-slate-900"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  )
}

function getSearchSections(entries, query) {
  const q = query.toLowerCase()
  return entries
    .map((entry) => {
      const sectionMatch = entry.section.toLowerCase().includes(q)
      const items = entry.items.filter(
        (item) => !q || sectionMatch || item.label.toLowerCase().includes(q)
      )
      return { ...entry, items }
    })
    .filter((entry) => entry.items.length > 0)
}

export default function GlobalSearchModal({ open, onClose, onNavigate, entries = [] }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const sections = getSearchSections(entries, query)
  const flatItems = sections.flatMap((s) => s.items)
  const activeIndex = flatItems.length
    ? Math.min(selectedIndex, flatItems.length - 1)
    : 0
  const activePath = flatItems.length ? flatItems[activeIndex].path : null

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (flatItems.length > 0) {
          navigate(activePath, { replace: true })
          onNavigate?.()
          onClose()
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [open, flatItems, activeIndex, activePath, navigate, onClose, onNavigate])

  const handleNavigate = (path) => {
    navigate(path, { replace: true })
    onNavigate?.()
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, reports..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-[15px] placeholder:text-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {sections.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              No results found
            </p>
          ) : (
            <div className="py-1">
              {sections.map((section) => (
                <div key={section.id}>
                  <div
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 ${
                      section.items.length > 0 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <section.icon size={14} />
                    <Highlighted text={section.section} query={query} />
                  </div>
                  {section.items.map((item) => {
                    const isActive = item.path === activePath
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleNavigate(item.path)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? 'bg-slate-100 font-semibold text-slate-950'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <span className="w-3.5" />
                        <Highlighted text={item.label} query={query} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`flex items-center justify-between border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 ${
            flatItems.length === 0 ? 'hidden' : ''
          }`}
        >
          <span>
            {flatItems.length} page{flatItems.length === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-sans">
              Enter
            </kbd>
            <span>to open</span>
          </span>
        </div>
      </div>
    </div>
  )
}
