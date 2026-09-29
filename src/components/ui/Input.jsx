import React from 'react'

export default function Input({
  label,
  error,
  required = false,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name

  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </span>
      )}

      <input
        id={inputId}
        className={[
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900',
          'outline-none transition placeholder:text-slate-400',
          error
            ? 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
            : 'border-slate-200 focus:border-[#4755AE] focus:ring-2 focus:ring-[#4755AE]/10',
          className,
        ].join(' ')}
        {...props}
      />

      {error && (
        <span className="mt-1 block text-xs font-medium text-rose-600">
          {error}
        </span>
      )}
    </label>
  )
}
