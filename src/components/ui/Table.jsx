import React from 'react'

const cn = (...classes) => classes.filter(Boolean).join(' ')

function Table({
  children,
  className = '',
  containerClassName = '',
  ...props
}) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
        containerClassName,
      )}
    >
      <div className="w-full overflow-auto">
        <table
          className={cn(
            'w-full caption-bottom text-sm',
            className,
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  )
}

Table.Caption = function TableCaption({ children, className = '' }) {
  return (
    <caption
      className={cn(
        'mt-4 px-4 text-sm text-slate-500',
        className,
      )}
    >
      {children}
    </caption>
  )
}

Table.Header = function TableHeader({ children, className = '' }) {
  return (
    <thead
      className={cn(
        '[&_tr]:border-b [&_tr]:border-slate-200',
        className,
      )}
    >
      {children}
    </thead>
  )
}

Table.Body = function TableBody({ children, className = '' }) {
  return (
    <tbody
      className={cn(
        '[&_tr:last-child]:border-0',
        className,
      )}
    >
      {children}
    </tbody>
  )
}

Table.Footer = function TableFooter({ children, className = '' }) {
  return (
    <tfoot
      className={cn(
        'border-t border-slate-200 bg-slate-50/70 font-medium',
        className,
      )}
    >
      {children}
    </tfoot>
  )
}

Table.Row = function TableRow({ children, className = '', ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-slate-100 transition-colors hover:bg-slate-50/70 data-[state=selected]:bg-slate-50',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

Table.Head = function TableHead({ children, className = '', ...props }) {
  return (
    <th
      className={cn(
        'h-11 whitespace-nowrap bg-slate-50/80 px-4 text-left align-middle text-xs font-semibold text-slate-500 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

Table.Cell = function TableCell({ children, className = '', ...props }) {
  return (
    <td
      className={cn(
        'p-4 align-middle text-sm text-slate-700 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

export default Table
