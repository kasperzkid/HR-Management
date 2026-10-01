import React from 'react'
export default function PageHeader({ eyebrow, title, description, action, className = '' }) {
  return <header className={['flex flex-col justify-between gap-5 lg:flex-row lg:items-center', className].join(' ')}><div className="min-w-0">{eyebrow && <p className="text-sm font-semibold tracking-tight text-cyan-600">{eyebrow}</p>}<h1 className="mt-1 text-4xl font-bold leading-tight tracking-[-0.03em] text-slate-950">{title}</h1>{description && <p className="mt-2 text-base text-slate-500">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</header>
}
