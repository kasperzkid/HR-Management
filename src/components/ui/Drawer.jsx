import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({
  open = true,
  title,
  description,
  children,
  onClose,
  side = 'right',
}) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const sideClass = side === 'left'
    ? 'left-0'
    : 'right-0'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[2px]">
      <aside
        className={[
          'absolute top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl',
          sideClass,
        ].join(' ')}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </aside>
    </div>
  )
}
