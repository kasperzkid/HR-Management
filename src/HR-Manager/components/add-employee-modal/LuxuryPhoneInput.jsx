import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Phone } from 'lucide-react'

// Country codes with max national digits + display grouping
export const PHONE_COUNTRIES = [
  { code: '+251', name: 'Ethiopia', flag: '🇪🇹', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+256', name: 'Uganda', flag: '🇺🇬', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+252', name: 'Somalia', flag: '🇸🇴', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+253', name: 'Djibouti', flag: '🇩🇯', maxDigits: 8, sizes: [3, 3, 2] },
  { code: '+211', name: 'S. Sudan', flag: '🇸🇸', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', maxDigits: 10, sizes: [3, 3, 4] },
  { code: '+212', name: 'Morocco', flag: '🇲🇦', maxDigits: 9, sizes: [3, 3, 3] },
  { code: '+1', name: 'US / Canada', flag: '🇺🇸', maxDigits: 10, sizes: [3, 3, 4] },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', maxDigits: 10, sizes: [3, 3, 4] },
  { code: '+971', name: 'UAE', flag: '🇦🇪', maxDigits: 9, sizes: [3, 3, 3] },
]

const DEFAULT_CODE = '+251'

function findCountry(code) {
  return PHONE_COUNTRIES.find((c) => c.code === code) || PHONE_COUNTRIES[0]
}

function groupDigits(digits, sizes) {
  const parts = []
  let idx = 0
  for (const s of sizes) {
    if (idx >= digits.length) break
    parts.push(digits.slice(idx, idx + s))
    idx += s
  }
  if (idx < digits.length) parts.push(digits.slice(idx))
  return parts.join(' ')
}

// Split a stored value ("+251 968 076 693" or "0911234567") into code + raw digits
function parseValue(value) {
  if (!value) return { code: DEFAULT_CODE, digits: '' }
  const trimmed = String(value).trim()
  const known = PHONE_COUNTRIES.map((c) => c.code).sort((a, b) => b.length - a.length)
  const matched = known.find((c) => trimmed.startsWith(c))
  if (matched) {
    return { code: matched, digits: trimmed.slice(matched.length).replace(/\D/g, '') }
  }
  // Local Ethiopian form ("09...") — strip leading 0
  if (trimmed.startsWith('0')) return { code: '+251', digits: trimmed.slice(1).replace(/\D/g, '') }
  return { code: DEFAULT_CODE, digits: trimmed.replace(/\D/g, '') }
}

export default function LuxuryPhoneInput({ value, onChange, placeholder = '968 076 693', error = null }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(() => parseValue(value).code)
  const [digitText, setDigitText] = useState(() => groupDigits(parseValue(value).digits, findCountry(parseValue(value).code).sizes))
  const rootRef = useRef(null)
  const country = findCountry(code)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const emit = (nextCode, nextDigits) => {
    const raw = nextDigits.replace(/\D/g, '').slice(0, findCountry(nextCode).maxDigits)
    const spaced = groupDigits(raw, findCountry(nextCode).sizes)
    onChange(`${nextCode} ${spaced}`.trim())
  }

  const handleDigitChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, country.maxDigits)
    setDigitText(groupDigits(raw, country.sizes))
    emit(code, raw)
  }

  const handleCodeChange = (nextCode) => {
    const digits = digitText.replace(/\D/g, '').slice(0, findCountry(nextCode).maxDigits)
    setCode(nextCode)
    setDigitText(groupDigits(digits, findCountry(nextCode).sizes))
    emit(nextCode, digits)
    setOpen(false)
  }

  const remaining = Math.max(0, country.maxDigits - digitText.replace(/\D/g, '').length)

  return (
    <div className="relative" ref={rootRef}>
      <div className={`flex rounded-lg border bg-white dark:bg-[#15181d] overflow-hidden transition-colors ${
        error
          ? 'border-rose-400 focus-within:ring-1 focus-within:ring-rose-500'
          : 'border-gray-300 dark:border-[#33383f] focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300 dark:focus-within:ring-gray-600'
      }`}>
        {/* Country code dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-full px-3.5 flex items-center gap-2 text-sm font-mono font-bold text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-[#33383f] bg-gray-50 dark:bg-[#1c2026] hover:bg-gray-100 dark:hover:bg-[#252a32] transition-colors cursor-pointer"
            title="Change country code"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span>{country.code}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute z-50 top-full left-0 mt-1.5 w-52 rounded-xl border border-slate-200 dark:border-[#262b31] shadow-xl bg-white dark:bg-[#15181d] overflow-hidden max-h-64 overflow-y-auto">
              <div className="sticky top-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-[#15181d] border-b border-slate-100 dark:border-[#262b31]">
                Select country code
              </div>
              {PHONE_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCodeChange(c.code)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm leading-none">{c.flag}</span>
                    <span>{c.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-500 dark:text-gray-400">{c.code}</span>
                    {c.code === code && <Check size={13} className="text-emerald-600" />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Number input — auto-spaced + realtime limit */}
        <div className="relative flex-1">
          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="tel"
            inputMode="numeric"
            placeholder={placeholder}
            value={digitText}
            onChange={handleDigitChange}
            className="w-full pl-9 pr-9 py-2.5 text-sm font-mono font-bold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold pointer-events-none ${
              remaining === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'
            }`}
            title="Digits remaining"
          >
            {remaining}
          </span>
        </div>
      </div>
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  )
}