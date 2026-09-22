import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Save,
} from 'lucide-react'
import LuxuryDataTable from '../components/LuxuryDataTable'
import CodePicker from './attendance/CodePicker'
import {
  ATTENDANCE_CODES,
  CODE_CLASSES,
  MONTHS,
  buildRowsFromDatabase,
  calculateSummary,
  calculateWeeklyBreakdown,
  getDateKey,
  getDayInfo,
  getDaysInMonth,
  getInitials,
  getCurrentMonth,
  getCurrentYear,
  selectClass,
} from './attendance/attendanceHelpers'
import { fetchMonthData, saveMonthAttendance } from './attendance/attendanceApi'

export default function Attendance() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [viewMode, setViewMode] = useState('daily') // daily, weekly, monthly

  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All Departments')

  const [employees, setEmployees] = useState([])
  const [databaseRecords, setDatabaseRecords] = useState([])
  const [leaves, setLeaves] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const daysInMonth = getDaysInMonth(year, month)
  const monthStart = getDateKey(year, month, 1)
  const monthEnd = getDateKey(year, month, daysInMonth)

  /*
   * Load employees and attendance
   * whenever month/year changes.
   */
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        setLoading(true)
        setApiError('')
        setSuccessMessage('')

        const { employees: employeeData, attendance: attendanceData, leaves: leavesData } =
          await fetchMonthData(monthStart, monthEnd)

        if (cancelled) return

        setEmployees(employeeData)
        setDatabaseRecords(attendanceData)
        setLeaves(leavesData)
      } catch (error) {
        console.error('Attendance load error:', error)

        if (!cancelled) {
          setApiError(error.message || 'Unable to load attendance from the database')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [monthStart, monthEnd])

  const departments = useMemo(() => {
    return [
      'All Departments',
      ...Array.from(
        new Set(employees.map((employee) => employee.department).filter(Boolean)),
      ),
    ]
  }, [employees])

  const rows = useMemo(
    () => buildRowsFromDatabase(employees, databaseRecords, year, month, leaves),
    [employees, databaseRecords, year, month, leaves],
  )

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.employeeId.toLowerCase().includes(query)

      const matchesDepartment = department === 'All Departments' || row.department === department

      return matchesSearch && matchesDepartment
    })
  }, [rows, search, department])

  const summaries = useMemo(
    () =>
      filteredRows.map((row) => calculateSummary(row.employee, row.attendance, year, month)),
    [filteredRows, year, month],
  )

  const totals = useMemo(() => {
    return summaries.reduce(
      (result, summary) => ({
        employees: result.employees + 1,
        present: result.present + summary.present,
        absent: result.absent + summary.absent,
        leave: result.leave + summary.leave,
        overtime: result.overtime + summary.overtime,
        lateMinutes: result.lateMinutes + summary.lateMinutes,
      }),
      {
        employees: 0,
        present: 0,
        absent: 0,
        leave: 0,
        overtime: 0,
        lateMinutes: 0,
      },
    )
  }, [summaries])

  const resetFilters = () => {
    setSearch('')
    setDepartment('All Departments')
  }

  function renderAttendanceGridCard(row, index) {
    const summary = row
    return (
      <div
        key={index}
        className="rounded-2xl border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] p-4 shadow-2xs hover:shadow-sm transition-shadow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1c2026] text-sm font-bold text-slate-700 dark:text-gray-200">
              {getInitials(summary.name)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-gray-100">{summary.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                {summary.employeeId} · {summary.department}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 block">
              Present
            </span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {summary.present}
            </span>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400 block">
              Absent
            </span>
            <span className="text-lg font-bold text-red-700 dark:text-red-300">
              {summary.absent}
            </span>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 block">
              Leave
            </span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {summary.leave}
            </span>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 block">
              Overtime
            </span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {summary.overtime.toFixed(1)}h
            </span>
          </div>
        </div>

        {summary.attendanceRate !== undefined && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 dark:bg-[#1c2026] px-3 py-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide">
              Attendance Rate
            </span>
            <span
              className={`text-sm font-bold px-2 py-0.5 rounded ${
                summary.attendanceRate >= 90
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : summary.attendanceRate >= 70
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
            >
              {summary.attendanceRate}%
            </span>
          </div>
        )}
      </div>
    )
  }

  const tableRows = useMemo(
    () =>
      filteredRows.map((row) => ({
        ...row,
        ...calculateSummary(row.employee, row.attendance, year, month),
      })),
    [filteredRows, year, month],
  )

  const weeklyData = useMemo(
    () =>
      filteredRows.map((row) => {
        const summary = calculateSummary(row.employee, row.attendance, year, month)
        const weeklySummary = {}
        const weeks = calculateWeeklyBreakdown(row.attendance, year, month)
        weeks.forEach((w) => {
          const weekKey = `week-${w.label.replace(/\D/g, '')}`
          weeklySummary[weekKey] = { ...w, rate: w.rate }
        })
        return {
          ...row,
          ...summary,
          weeklySummary,
        }
      }),
    [filteredRows, year, month],
  )

  const monthlyData = useMemo(
    () =>
      filteredRows.map((row) => {
        const summary = calculateSummary(row.employee, row.attendance, year, month)
        return {
          ...row,
          ...summary,
          attendanceRate: summary.attendanceRate,
        }
      }),
    [filteredRows, year, month],
  )

  /*
   * Update an attendance code locally.
   *
   * The database is only changed when
   * Save Attendance is pressed.
   */
  function updateAttendanceCode(employeeKey, dateKey, code) {
    setDatabaseRecords((currentRecords) => {
      const rowsForUpdate = buildRowsFromDatabase(employees, currentRecords, year, month)

      const row = rowsForUpdate.find((item) => item.employeeKey === employeeKey)

      if (!row) {
        return currentRecords
      }

      const existing = row.attendance[dateKey]

      /*
       * Clearing an existing record:
       * keep it in local state with an empty
       * status so saveAttendance can delete it.
       */
      if (!code) {
        if (!existing?.id) {
          return currentRecords.filter(
            (record) => !(record.employeeId === employeeKey && record.date === dateKey),
          )
        }

        return currentRecords.map((record) =>
          record.id === existing.id ? { ...record, status: '' } : record,
        )
      }

      /*
       * Update existing local record.
       */
      if (existing?.id) {
        return currentRecords.map((record) =>
          record.id === existing.id ? { ...record, status: code } : record,
        )
      }

      /*
       * Create a temporary local record.
       * id remains null until the backend
       * creates the real database ID.
       */
      return [
        ...currentRecords,
        {
          id: null,
          employeeId: row.employeeKey,
          employeeName: row.name,
          department: row.department,
          date: dateKey,
          status: code,
          checkIn: null,
          checkOut: null,
          late: 0,
          earlyDeparture: 0,
          regular: code === 'P' || code === 'HD' ? 8 : 0,
          overtime: 0,
        },
      ]
    })
  }

  /*
   * Save the entire visible month.
   */
  async function saveAttendance() {
    try {
      setSaving(true)
      setApiError('')
      setSuccessMessage('')

      const refreshed = await saveMonthAttendance({
        employees,
        databaseRecords,
        year,
        month,
        monthStart,
        monthEnd,
      })

      setDatabaseRecords(refreshed)

      setSuccessMessage('Attendance saved successfully.')

      window.setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error('Save attendance error:', error)
      setApiError(error.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  function previousMonth() {
    setSuccessMessage('')
    setApiError('')

    if (month === 0) {
      setMonth(11)
      setYear((current) => current - 1)
      return
    }

    setMonth((current) => current - 1)
  }

  function nextMonth() {
    setSuccessMessage('')
    setApiError('')

    if (month === 11) {
      setMonth(0)
      setYear((current) => current + 1)
      return
    }

    setMonth((current) => current + 1)
  }

  const dailyColumns = (() => {
    const dayColumns = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const info = getDayInfo(year, month, day)
      const dateKey = getDateKey(year, month, day)

      return {
        key: `day-${day}`,
        header: `${day} ${info.dayName}`,
        align: 'center',
        className: info.isWeekend ? 'bg-slate-100' : '',
        exportValue: (row) => row.attendance[dateKey]?.code || '',
        render: (row) => {
          const cell = row.attendance[dateKey] || {}
          return (
            <div className="flex flex-col items-center gap-1">
              <CodePicker
                value={cell.code || ''}
                disabled={info.isWeekend}
                onChange={(code) => updateAttendanceCode(row.employeeKey, dateKey, code)}
              />
              {cell.checkIn && cell.checkOut && (
                <span className="font-mono text-[9px] leading-none tabular-nums whitespace-nowrap text-slate-400">
                  {cell.checkIn}–{cell.checkOut}
                </span>
              )}
            </div>
          )
        },
      }
    })

    return [
      {
        key: 'employeeId',
        header: 'Employee ID',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-bold text-slate-700">{row.employeeId}</span>
        ),
      },
      {
        key: 'name',
        header: 'Employee Name',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {getInitials(row.name)}
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-slate-800">
              {row.name}
            </span>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        sortable: true,
        render: (row) => (
          <span className="whitespace-nowrap text-xs text-slate-500">{row.department}</span>
        ),
      },
      ...dayColumns,
      {
        key: 'workingDays',
        header: 'Working',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-slate-700">{row.workingDays}</span>
        ),
      },
      {
        key: 'present',
        header: 'Present',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-emerald-700">{row.present}</span>
        ),
      },
      {
        key: 'absent',
        header: 'Absent',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-red-700">{row.absent}</span>
        ),
      },
      {
        key: 'leave',
        header: 'Leave',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-amber-700">{row.leave}</span>
        ),
      },
      {
        key: 'overtime',
        header: 'OT',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-blue-700">{row.overtime.toFixed(1)}</span>
        ),
      },
      {
        key: 'lateMinutes',
        header: 'Late',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-slate-700">{row.lateMinutes}</span>
        ),
      },
    ]
  })()

  const weeklyColumns = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-bold text-slate-700">{row.employeeId}</span>
      ),
    },
    {
      key: 'name',
      header: 'Employee Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
            {getInitials(row.name)}
          </div>
          <span className="whitespace-nowrap text-sm font-semibold text-slate-800">
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-slate-500">{row.department}</span>
      ),
    },
    ...[1, 2, 3, 4, 5].map((weekNum) => ({
      key: `week-${weekNum}`,
      header: `W${weekNum}`,
      align: 'center',
      sortable: true,
      render: (row) => {
        const w = row.weeklySummary?.[`week-${weekNum}`]
        if (!w || w.workingDays === 0) return <span className="text-xs text-slate-300">—</span>
        return (
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              w.rate >= 90
                ? 'bg-emerald-50 text-emerald-700'
                : w.rate >= 70
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {w.rate}%
          </span>
        )
      },
    })),
    {
      key: 'avgRate',
      header: 'Avg Rate',
      align: 'center',
      sortable: true,
      render: (row) => {
        const weeks = Object.values(row.weeklySummary || {}).filter((w) => w.workingDays > 0)
        const avg = weeks.length
          ? Math.round(weeks.reduce((s, w) => s + w.rate, 0) / weeks.length)
          : 0
        return (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              avg >= 90
                ? 'bg-emerald-100 text-emerald-800'
                : avg >= 70
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {avg}%
          </span>
        )
      },
    },
    {
      key: 'totalPresent',
      header: 'Present',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-emerald-700">{row.present}</span>
      ),
    },
    {
      key: 'totalAbsent',
      header: 'Absent',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-red-700">{row.absent}</span>
      ),
    },
    {
      key: 'totalLeave',
      header: 'Leave',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-amber-700">{row.leave}</span>
      ),
    },
  ]

  const monthlyColumns = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-bold text-slate-700">{row.employeeId}</span>
      ),
    },
    {
      key: 'name',
      header: 'Employee Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
            {getInitials(row.name)}
          </div>
          <span className="whitespace-nowrap text-sm font-semibold text-slate-800">
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-slate-500">{row.department}</span>
      ),
    },
    {
      key: 'workingDays',
      header: 'Work Days',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700">{row.workingDays}</span>
      ),
    },
    {
      key: 'present',
      header: 'Present',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-emerald-700">{row.present}</span>
      ),
    },
    {
      key: 'absent',
      header: 'Absent',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-red-700">{row.absent}</span>
      ),
    },
    {
      key: 'leave',
      header: 'Leave',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-amber-700">{row.leave}</span>
      ),
    },
    {
      key: 'attendanceRate',
      header: 'Att. Rate',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            row.attendanceRate >= 90
              ? 'bg-emerald-100 text-emerald-800'
              : row.attendanceRate >= 70
              ? 'bg-amber-100 text-amber-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.attendanceRate}%
        </span>
      ),
    },
    {
      key: 'overtime',
      header: 'OT',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-blue-700">{row.overtime.toFixed(1)}</span>
      ),
    },
    {
      key: 'lateMinutes',
      header: 'Late',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700">{row.lateMinutes}</span>
      ),
    },
  ]

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <CalendarDays size={16} />
              HR Management
              <span>/</span>
              Attendance
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Attendance Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage daily attendance using the company attendance codes.
            </p>
          </div>

          <button
            type="button"
            onClick={saveAttendance}
            disabled={saving || loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>

        {/* Messages */}
        {apiError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {apiError}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <Check size={17} />
            {successMessage}
          </div>
        )}

        {/* KPI cards */}
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-400">
              Employees
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-gray-100">{totals.employees}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/60 dark:bg-[#14181e]">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Present
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-gray-100">{totals.present}</p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-red-900/60 dark:bg-[#14181e]">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Absent</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-gray-100">{totals.absent}</p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm dark:border-amber-900/60 dark:bg-[#14181e]">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Leave</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-gray-100">{totals.leave}</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/60 dark:bg-[#14181e]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Overtime
              </p>
              <Clock3 size={16} className="text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-gray-100">{totals.overtime.toFixed(1)}h</p>
          </div>
        </div>

        {/* Attendance Codes */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262b31] dark:bg-[#14181e]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-gray-100">Attendance Codes</h3>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ATTENDANCE_CODES.map((item) => (
              <div
                key={item.code}
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#1c2026] dark:border dark:border-[#262b31]"
              >
                <span
                  className={`flex h-7 w-10 items-center justify-center rounded-md border text-xs font-bold ${CODE_CLASSES[item.code]}`}
                >
                  {item.code}
                </span>

                <span className="text-xs text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance grid (Luxury) */}
        <LuxuryDataTable
          title="Attendance"
          subtitle={
            viewMode === 'daily'
              ? `${MONTHS[month]} ${year} · ${daysInMonth} days · Daily Grid`
              : viewMode === 'weekly'
              ? `${MONTHS[month]} ${year} · Weekly Summary with Attendance Rate`
              : `${MONTHS[month]} ${year} · Monthly Summary`
          }
          countBadge={filteredRows.length}
          allowViewModeToggle
          defaultViewMode="list"
          renderGridCard={renderAttendanceGridCard}
          columns={viewMode === 'daily' ? dailyColumns : viewMode === 'weekly' ? weeklyColumns : monthlyColumns}
          data={viewMode === 'daily' ? tableRows : viewMode === 'weekly' ? weeklyData : monthlyData}
          loading={loading}
          searchable
          searchKeys={['name', 'employeeId']}
          searchTerm={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search employee ID or name..."
          exportable
          exportFilename="HR_Attendance"
          paginated
          defaultPageSize={10}
          emptyMessage="No employees found. Add employees in Employee Management or change the search and department filters."
          onResetFilters={resetFilters}
          scrollable
          minWidth="2400px"
          filterControls={
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-medium whitespace-nowrap text-slate-500">View:</span>
              <div className="flex items-center bg-slate-100 dark:bg-[#1c2026] p-0.5 rounded-xl border border-slate-200 dark:border-[#262b31]">
                <button
                  type="button"
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'daily'
                      ? 'bg-white dark:bg-[#252a32] text-slate-900 dark:text-gray-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'weekly'
                      ? 'bg-white dark:bg-[#252a32] text-slate-900 dark:text-gray-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'monthly'
                      ? 'bg-white dark:bg-[#252a32] text-slate-900 dark:text-gray-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Monthly
                </button>
              </div>

              <span className="text-xs font-medium whitespace-nowrap text-slate-500">Month</span>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className={selectClass}
              >
                {MONTHS.map((monthName, index) => (
                  <option key={monthName} value={index}>
                    {monthName}
                  </option>
                ))}
              </select>

              <span className="text-xs font-medium whitespace-nowrap text-slate-500">Year</span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className={selectClass}
              >
                {Array.from({ length: 11 }, (_, index) => getCurrentYear() - 5 + index).map(
                  (yearValue) => (
                    <option key={yearValue} value={yearValue}>
                      {yearValue}
                    </option>
                  ),
                )}
              </select>

              <span className="text-xs font-medium whitespace-nowrap text-slate-500">
                Department:
              </span>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className={selectClass}
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          }
          headerActions={
            <>
              <button
                type="button"
                onClick={previousMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] dark:hover:text-gray-200 cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-50 dark:hover:bg-[#252a32] dark:hover:text-gray-200 cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </>
          }
        />
      </div>
    </div>
  )
}
