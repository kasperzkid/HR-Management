import React from 'react'

export default function LoadingState({
  label = 'Loading...',
  className = '',
}) {
  return (
    <div
      className={[
        'flex min-h-[240px] items-center justify-center rounded-2xl bg-white',
        className,
      ].join(' ')}
    >
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#4755AE]" />
        <p className="mt-4 text-sm font-medium text-slate-500">
          {label}
        </p>
      </div>
    </div>
  )
}
