// ─────────────────────────────────────────────────────────────
// Attendance page helpers — codes, date math, grid row building
// and monthly summary calculation. Extracted from pages/Attendance.jsx.
// ─────────────────────────────────────────────────────────────

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const ATTENDANCE_CODES = [
  { code: 'P', label: 'Present' },
  { code: 'A', label: 'Absent' },
  { code: 'SL', label: 'Sick Leave' },
  { code: 'AL', label: 'Annual Leave' },
  { code: 'ML', label: 'Maternity Leave' },
  { code: 'OL', label: 'Other Leave' },
  { code: 'PH', label: 'Public Holiday' },
  { code: 'WK', label: 'Weekend' },
  { code: 'HD', label: 'Half Day' },
]

export const CODE_LABELS = Object.fromEntries(
  ATTENDANCE_CODES.map((item) => [item.code, item.label]),
)

export const CODE_CLASSES = {
  P: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  A: 'bg-red-50 text-red-700 border-red-200',
  SL: 'bg-amber-50 text-amber-700 border-amber-200',
  AL: 'bg-blue-50 text-blue-700 border-blue-200',
  ML: 'bg-purple-50 text-purple-700 border-purple-200',
  OL: 'bg-orange-50 text-orange-700 border-orange-200',
  PH: 'bg-slate-100 text-slate-600 border-slate-200',
  WK: 'bg-slate-100 text-slate-500 border-slate-200',
  HD: 'bg-cyan-50 text-cyan-700 border-cyan-200',
}

export const selectClass =
  'h-9 pl-2.5 pr-7 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium'

export function getCurrentMonth() {
  return new Date().getMonth()
}

export function getCurrentYear() {
  return new Date().getFullYear()
}

export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function getDateKey(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, '0')
  const date = String(day).padStart(2, '0')

  return `${year}-${month}-${date}`
}

export function getDayInfo(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day)

  return {
    date,
    dayName: date.toLocaleDateString('en-US', {
      weekday: 'short',
    }),
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
  }
}

export function getEmployeeName(employee) {
  if (employee.name) {
    return employee.name
  }

  return [employee.firstName, employee.lastName].filter(Boolean).join(' ')
}

export function getEmployeeId(employee, index) {
  return (
    employee.employeeId ||
    employee.id ||
    `EMP-${String(index + 1).padStart(3, '0')}`
  )
}

export function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function calculateSummary(employee, attendanceMap, year, monthIndex) {
  const daysInMonth = getDaysInMonth(year, monthIndex)

  let workingDays = 0
  let present = 0
  let absent = 0
  let leave = 0
  let overtime = 0
  let lateMinutes = 0

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = getDateKey(year, monthIndex, day)
    const record = attendanceMap[key]

    const code = record?.code || ''

    /*
     * Working days are days that have a recorded
     * attendance status other than weekend/public holiday.
     */
    if (code && code !== 'WK' && code !== 'PH') {
      workingDays += 1
    }

    if (code === 'P') {
      present += 1
    }

    if (code === 'HD') {
      present += 0.5
    }

    if (code === 'A') {
      absent += 1
    }

    if (['SL', 'AL', 'ML', 'OL'].includes(code)) {
      leave += 1
    }

    overtime += Number(record?.overtime || 0)
    lateMinutes += Number(record?.late || 0)
  }

  return {
    employee,
    workingDays,
    present,
    absent,
    leave,
    overtime,
    lateMinutes,
    attendanceRate: workingDays > 0 ? Math.round((present / workingDays) * 100) : 0,
  }
}

/**
 * Calculate weekly breakdown for an employee in a given month.
 * Returns array of week objects: { weekLabel, present, absent, leave, workingDays, rate }
 */
export function calculateWeeklyBreakdown(attendanceMap, year, monthIndex) {
  const daysInMonth = getDaysInMonth(year, monthIndex)
  const weeks = []

  let currentWeek = {
    label: 'Week 1',
    present: 0,
    absent: 0,
    leave: 0,
    workingDays: 0,
    hdDays: 0,
  }

  let weekNumber = 1

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = getDateKey(year, monthIndex, day)
    const record = attendanceMap[key]
    const code = record?.code || ''
    const { isWeekend } = getDayInfo(year, monthIndex, day)

    // Start new week on Monday
    const date = new Date(year, monthIndex, day)
    if (date.getDay() === 1 && day !== 1) {
      weeks.push(currentWeek)
      weekNumber += 1
      currentWeek = {
        label: `Week ${weekNumber}`,
        present: 0,
        absent: 0,
        leave: 0,
        workingDays: 0,
        hdDays: 0,
      }
    }

    if (code && code !== 'WK' && code !== 'PH') {
      currentWeek.workingDays += 1
    }

    if (code === 'P') {
      currentWeek.present += 1
    }

    if (code === 'HD') {
      currentWeek.hdDays += 0.5
      currentWeek.present += 0.5
    }

    if (code === 'A') {
      currentWeek.absent += 1
    }

    if (['SL', 'AL', 'ML', 'OL'].includes(code)) {
      currentWeek.leave += 1
    }
  }

  weeks.push(currentWeek)

  return weeks.map((w) => ({
    ...w,
    rate:
      w.workingDays > 0
        ? Math.round(((w.present) / w.workingDays) * 100)
        : 0,
  }))
}

export function getDefaultCode(year, monthIndex, day) {
  const { isWeekend } = getDayInfo(year, monthIndex, day)

  if (isWeekend) {
    return 'WK'
  }

  return ''
}

export function createEmployeeRow(employee, index, year, monthIndex) {
  const daysInMonth = getDaysInMonth(year, monthIndex)

  const attendance = {}

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = getDateKey(year, monthIndex, day)

    attendance[key] = {
      code: getDefaultCode(year, monthIndex, day),
      overtime: 0,
      late: 0,
      id: null,
    }
  }

  return {
    employeeKey: employee.id || employee.employeeId || index,

    employeeId: getEmployeeId(employee, index),

    name: getEmployeeName(employee),

    department: employee.department || 'Unassigned',

    employee,

    attendance,
  }
}

export function buildRowsFromDatabase(employees, databaseRecords, year, monthIndex) {
  const rows = employees.map(
    (employee, index) => createEmployeeRow(employee, index, year, monthIndex),
  )

  const employeeMap = new Map(rows.map((row) => [row.employeeKey, row]))

  const employeeIdMap = new Map(rows.map((row) => [row.employeeId, row]))

  for (const record of databaseRecords) {
    if (!record.date) {
      continue
    }

    const date = new Date(`${record.date}T00:00:00`)

    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) {
      continue
    }

    /*
     * Support both:
     * - Employee database id
     * - Employee business ID
     */
    const row = employeeMap.get(record.employeeId) || employeeIdMap.get(record.employeeId)

    if (!row) {
      continue
    }

    row.attendance[record.date] = {
      code: record.status || '',
      overtime: Number(record.overtime || 0),
      late: Number(record.late || 0),
      id: record.id || null,
    }
  }

  return rows
}
