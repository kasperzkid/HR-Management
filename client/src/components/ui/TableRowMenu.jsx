import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

export default function TableRowMenu({
  open,
  onOpenChange,
  children,
  triggerLabel = 'Row actions',
}) {
  const triggerRef = useRef(null)
  const [coords, setCoords] = useState(null)

  useEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }

    function updateCoords() {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 160 // maximum height needed for menu items
      const openUp = spaceBelow < menuHeight && rect.top > menuHeight

      setCoords({
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        right: window.innerWidth - rect.right,
      })
    }

    updateCoords()

    function handleScroll() {
      onOpenChange(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') onOpenChange(false)
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateCoords)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateCoords)
    }
  }, [open, onOpenChange])

  return (
    <div className="relative flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
          open
            ? 'border-[#0092B8] bg-[#0092B8]/10 text-[#0092B8]'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
        aria-label={triggerLabel}
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] cursor-default"
            onClick={() => onOpenChange(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              right: `${coords.right}px`,
              minWidth: '148px',
              width: 'max-content',
              zIndex: 9999,
            }}
            className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl transition-all duration-150 animate-in fade-in zoom-in-95"
          >
            {children}
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
