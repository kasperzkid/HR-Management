import { MapPinOff, X } from 'lucide-react'
import { createPortal } from 'react-dom'

// Popup shown when a punch (check-in / check-out / emergency check-out)
// is blocked because the employee is not inside the office radius.

export default function GeoBlockModal({ message = '', onClose }) {
  if (!message) return null
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900/60 dark:bg-[#15181d]">
        <div className="flex items-start justify-between bg-rose-50/70 px-5 py-4 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
              <MapPinOff size={19} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                Can&apos;t punch — you&apos;re outside the office
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Location required for check-in &amp; check-out
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 dark:hover:bg-[#1c2026] dark:hover:text-gray-200 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-xs leading-5 text-gray-600 dark:text-gray-300">
            {message}
          </p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-medium text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
            Check-in, check-out and emergency check-out are only allowed while
            you are inside the office grounds (50m radius). Move closer to the
            office and try again.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-950 py-2.5 text-xs font-bold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}