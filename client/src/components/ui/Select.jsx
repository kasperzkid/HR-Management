import React from 'react'
import { ChevronDown } from 'lucide-react'

export default function Select({
  label,
  options = [],
  error,
  required = false,
  className = '',
  ...props
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </span>
      )}

      <div className="relative">
        <select
          className={[
            'w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10',
            'text-sm text-slate-900 outline-none transition',
            error
              ? 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
              : 'border-slate-200 focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10',
            className,
          ].join(' ')}
          {...props}
        >
          {options.map((option) => {
            const item =
              typeof option === 'string'
                ? { value: option, label: option }
                : option

            return (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            )
          })}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {error && (
        <span className="mt-1 block text-xs font-medium text-rose-600">
          {error}
        </span>
      )}
    </label>
  )
}
