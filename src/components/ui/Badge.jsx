import React from 'react'
const statusStyles = { Active:'bg-emerald-50 text-emerald-700 ring-emerald-200', 'On Leave':'bg-amber-50 text-amber-700 ring-amber-200', Resigned:'bg-slate-100 text-slate-600 ring-slate-200', Pending:'text-amber-700', Approved:'text-emerald-700', Rejected:'bg-rose-50 text-rose-700 ring-rose-200' }
export default function Badge({ children, status, className='' }) {
  const value = status || children
  const style = statusStyles[value] || 'bg-slate-100 text-slate-600 ring-slate-200'
  const plainStatus = value === 'Pending' || value === 'Approved'
  return <span className={[plainStatus ? 'text-xs font-semibold' : 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', style, className].join(' ')}>{children}</span>
}
