// Status badge styling helper shared by the DailyLogTable views.
export function getStatusBadge(status) {
  switch (status) {
    case 'Present':
      return 'text-emerald-700 dark:text-emerald-300'
    case 'Absent':
      return 'text-rose-700 dark:text-rose-300'
    case 'On Leave':
      return 'text-blue-700 dark:text-blue-300'
    case 'Sick Leave':
      return 'text-teal-700 dark:text-teal-300'
    case 'Late':
      return 'text-amber-700 dark:text-amber-300'
    default:
      return 'text-slate-700 dark:text-slate-300'
  }
}
