import React from 'react'
const variants = { default: 'border border-slate-200/80 bg-white shadow-sm', soft: 'border border-slate-200/60 bg-slate-50/80', blueGray: 'border border-slate-200/60 bg-slate-100/80', flat: 'bg-transparent' }
export default function Card({ children, variant = 'default', className = '', ...props }) {
  return <div className={['rounded-2xl', variants[variant] || variants.default, className].join(' ')} {...props}>{children}</div>
}
