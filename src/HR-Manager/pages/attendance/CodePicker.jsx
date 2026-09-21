import { useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  ATTENDANCE_CODES,
  CODE_CLASSES,
  CODE_LABELS,
} from './attendanceHelpers'

export default function CodePicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState(null)

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return

    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = 176 // w-44
      let left = rect.left + rect.width / 2 - menuWidth / 2
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8))
      // Open upward: the menu bottom sits 8px above the button top, and
      // grows upward from there (flush to the top when taller than space).
      const bottom = window.innerHeight - rect.top + 8
      setMenuStyle({ left, bottom })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-9 min-w-12 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${
          value
            ? CODE_CLASSES[value] || 'border-slate-200 bg-white text-slate-600'
            : 'border-dashed border-slate-300 bg-white text-slate-400 hover:border-slate-400'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        title={value ? CODE_LABELS[value] : 'Select attendance code'}
      >
        {value || '—'}
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            aria-label="Close attendance code menu"
            className="fixed inset-0 z-[90] cursor-default"
            onClick={() => setOpen(false)}
          />

          {menuStyle &&
            createPortal(
              <div
                className="fixed z-[110] w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                style={{ left: menuStyle.left, bottom: menuStyle.bottom }}
              >
                <div className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Attendance Code
                </div>

                {ATTENDANCE_CODES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      onChange(item.code)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    <span
                      className={`flex h-7 w-9 items-center justify-center rounded-md border font-bold ${CODE_CLASSES[item.code]}`}
                    >
                      {item.code}
                    </span>

                    <span className="text-slate-600">{item.label}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
                >
                  <X size={14} />
                  Clear
                </button>
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  )
}