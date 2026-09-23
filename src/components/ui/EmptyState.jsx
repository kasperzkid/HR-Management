import React from 'react'

export default function EmptyState({
  icon: Icon,
  title = 'Nothing found',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={[
        'flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-white px-6 text-center',
        className,
      ].join(' ')}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon size={24} />
        </div>
      )}

      <h3 className="mt-4 text-sm font-bold text-slate-800">
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-md text-xs text-slate-400">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
