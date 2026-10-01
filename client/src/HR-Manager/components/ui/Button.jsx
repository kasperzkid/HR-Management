import React from 'react'

const variants = {
  primary: 'bg-slate-950 text-white hover:bg-slate-800 shadow-sm hover:shadow-md',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
}

const sizes = { sm: 'px-3 py-2 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' }

export default function Button({ children, variant = 'primary', size = 'md', icon: Icon, iconPosition = 'left', loading = false, disabled = false, className = '', type = 'button', ...props }) {
  return (
    <button type={type} disabled={disabled || loading} className={['inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60', variants[variant] || variants.primary, sizes[size] || sizes.md, className].join(' ')} {...props}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : iconPosition === 'left' && Icon && <Icon className="h-4 w-4" />}
      <span>{loading ? 'Loading...' : children}</span>
      {!loading && iconPosition === 'right' && Icon && <Icon className="h-4 w-4" />}
    </button>
  )
}
