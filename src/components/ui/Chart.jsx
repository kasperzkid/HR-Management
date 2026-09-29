import React, { useMemo } from 'react'

const cn = (...classes) => classes.filter(Boolean).join(' ')

function DonutChart({
  data = [],
  valueKey = 'value',
  nameKey = 'name',
  colors = [],
  size = 208,
  strokeWidth = 18,
  centerValue,
  centerLabel = 'Employees',
  className = '',
}) {
  const safeData = Array.isArray(data) ? data : []

  const total = useMemo(
    () =>
      safeData.reduce(
        (sum, item) => sum + Number(item?.[valueKey] || 0),
        0,
      ),
    [safeData, valueKey],
  )

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let accumulated = 0

  return (
    <div
      className={cn(
        'relative mx-auto flex shrink-0 items-center justify-center',
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Employee distribution by department. Total ${centerValue ?? total} employees.`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 overflow-visible"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
        />

        {safeData.map((item, index) => {
          const value = Number(item?.[valueKey] || 0)
          const percentage = total > 0 ? value / total : 0
          const segmentLength = circumference * percentage
          const offset = circumference * accumulated

          accumulated += percentage

          return (
            <circle
              key={`${item?.[nameKey] ?? 'segment'}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={colors[index % Math.max(colors.length, 1)] || '#0f172a'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(segmentLength - 2, 0)} ${circumference}`}
              strokeDashoffset={-offset}
              className="transition-all duration-700 ease-out"
            />
          )
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-xs font-medium text-slate-400">Total</span>
        <span className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {centerValue ?? total}
        </span>
        <span className="mt-0.5 text-[10px] text-slate-400">
          {centerLabel}
        </span>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  description,
  children,
  className = '',
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-base font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

export { ChartCard, DonutChart }
export default DonutChart
