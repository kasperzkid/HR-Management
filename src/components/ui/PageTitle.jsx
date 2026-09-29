function PageTitle({
  eyebrow,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <header
      className={`animate-page-title flex flex-col justify-between gap-5 bg-transparent sm:flex-row sm:items-end ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-sm font-semibold tracking-[0.02em] text-cyan-600">
            {eyebrow}
          </p>
        )}

        <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[34px]">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0 animate-page-title-action">
          {action}
        </div>
      )}
    </header>
  )
}

export default PageTitle