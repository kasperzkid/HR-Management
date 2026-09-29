import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { PageTitle, SummaryCard, Table } from '../../components/ui'
import TableDataTools from '../components/TableDataTools'
import { useAccess } from '../../lib/rbac'

const API_URL = 'http://localhost:4000/api/hr-manager'

const MONTHS = [
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

const STATUS_STYLES = {
  PRESENT: {
    label: 'P',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  CHECKED_IN: {
    label: 'Checked In',
    className:
      'border-blue-200 bg-blue-50 text-blue-700',
  },

  PENDING_CHECKOUT: {
    label: 'Pending Checkout',
    className:
      'border-blue-200 bg-blue-50 text-blue-700',
  },

  PENDING_REVIEW: {
    label: 'Pending Review',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  LATE: {
    label: 'Late',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  ABSENT: {
    label: 'A',
    className:
      'border-red-200 bg-red-50 text-red-700',
  },

  A: {
    label: 'A',
    className:
      'border-red-200 bg-red-50 text-red-700',
  },

  SL: {
    label: 'Sick Leave',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  AL: {
    label: 'AL',
    className:
      'border-blue-200 bg-blue-50 text-blue-700',
  },

  ML: {
    label: 'Maternity Leave',
    className:
      'border-purple-200 bg-purple-50 text-purple-700',
  },

  OL: {
    label: 'Other Leave',
    className:
      'border-orange-200 bg-orange-50 text-orange-700',
  },

  PH: {
    label: 'Public Holiday',
    className:
      'border-slate-200 bg-slate-100 text-slate-600',
  },

  WK: {
    label: 'Weekend',
    className:
      'border-slate-200 bg-slate-100 text-slate-500',
  },
}

function formatLateHours(minutes) {
  const value = Math.max(0, Number(minutes) || 0) / 60
  return `${value.toFixed(2)} ${value === 1 ? 'hour' : 'hours'}`
}

function getCurrentMonth() {
  return new Date().getMonth()
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function getDateKey(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, '0')
  const date = String(day).padStart(2, '0')

  return `${year}-${month}-${date}`
}

function getDayInfo(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day)

  return {
    date,
    dayName: date.toLocaleDateString('en-US', {
      weekday: 'short',
    }),
    isWeekend:
      date.getDay() === 0 ||
      date.getDay() === 6,
  }
}

function getEmployeeName(employee) {
  if (!employee) {
    return 'Unknown Employee'
  }

  if (employee.name) {
    return employee.name
  }

  return [
    employee.firstName,
    employee.lastName,
  ]
    .filter(Boolean)
    .join(' ') || 'Unknown Employee'
}

function getEmployeeId(employee, index = 0) {
  return (
    employee?.employeeId ||
    employee?.id ||
    `EMP-${String(index + 1).padStart(3, '0')}`
  )
}

function getInitials(name) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase(),
      )
      .join('') || '?'
  )
}

function getStatusStyle(status) {
  return (
    STATUS_STYLES[status] || {
      label: status || 'No Record',
      className:
        'border-slate-200 bg-slate-50 text-slate-500',
    }
  )
}

function formatTime(value) {
  if (!value) {
    return '—'
  }

  if (
    typeof value === 'string' &&
    /^\d{1,2}:\d{2}/.test(value)
  ) {
    const [hourText, minuteText] =
      value.split(':')

    let hour = Number(hourText)

    const minute = String(
      minuteText || '00',
    ).slice(0, 2)

    const suffix =
      hour >= 12 ? 'PM' : 'AM'

    hour = hour % 12 || 12

    return `${hour}:${minute} ${suffix}`
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString(
    'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    },
  )
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(
    `${value}T00:00:00`,
  )

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  )
}

function getLocationStatus(record) {
  return (
    record?.checkInLocationStatus ||
    record?.checkOutLocationStatus ||
    ''
  )
}

function isLocationVerified(record) {
  const status =
    getLocationStatus(record)

  return (
    status === 'VERIFIED' ||
    status === 'INSIDE' ||
    status === 'VALID' ||
    Boolean(
      record?.checkInLatitude !==
        null &&
        record?.checkInLatitude !==
          undefined &&
        record?.checkInLongitude !==
          null &&
        record?.checkInLongitude !==
          undefined,
    )
  )
}

function getRecordForDate(
  records,
  employee,
  dateKey,
) {
  const employeeKeys = [
    employee?.id,
    employee?.employeeId,
  ].filter(Boolean)

  return (
    records.find(
      (record) =>
        record.date === dateKey &&
        employeeKeys.includes(
          record.employeeId,
        ),
    ) || null
  )
}

function buildEmployeeRows(
  employees,
  records,
  year,
  month,
) {
  return employees.map(
    (employee, index) => {
      const attendance = {}

      const days =
        getDaysInMonth(
          year,
          month,
        )

      for (
        let day = 1;
        day <= days;
        day += 1
      ) {
        const dateKey =
          getDateKey(
            year,
            month,
            day,
          )

        const record =
          getRecordForDate(
            records,
            employee,
            dateKey,
          )

        attendance[dateKey] =
          record
      }

      return {
        employeeKey:
          employee.id ||
          employee.employeeId ||
          index,

        employeeId:
          getEmployeeId(
            employee,
            index,
          ),

        name:
          getEmployeeName(
            employee,
          ),

        department:
          employee.department ||
          'Unassigned',

        employee,

        attendance,
      }
    },
  )
}

function calculateSummary(
  row,
  year,
  month,
) {
  const days =
    getDaysInMonth(
      year,
      month,
    )

  let present = 0
  let absent = 0
  let leave = 0
  let pendingReview = 0
  let checkedIn = 0
  let overtime = 0
  let lateMinutes = 0

  for (
    let day = 1;
    day <= days;
    day += 1
  ) {
    const dateKey =
      getDateKey(
        year,
        month,
        day,
      )

    const record =
      row.attendance[
        dateKey
      ]

    if (!record) {
      continue
    }

    const status =
      record.status || ''

    if (status === 'PRESENT') {
      present += 1
    }

    if (
      status === 'ABSENT' ||
      status === 'A'
    ) {
      absent += 1
    }

    if (
      [
        'SL',
        'AL',
        'ML',
        'OL',
      ].includes(status)
    ) {
      leave += 1
    }

    if (
      status ===
        'PENDING_REVIEW' ||
      status === 'LATE'
    ) {
      pendingReview += 1
    }

    if (
      status === 'CHECKED_IN' ||
      status ===
        'PENDING_CHECKOUT'
    ) {
      checkedIn += 1
    }

    overtime += Number(
      record.overtime || 0,
    )

    lateMinutes += Number(
      record.late || 0,
    )
  }

  return {
    present,
    absent,
    leave,
    pendingReview,
    checkedIn,
    overtime,
    lateMinutes,
  }
}

function StatusBadge({ status }) {
  const style =
    getStatusStyle(status)

  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide ${String(style.className || '').replace(/\bbg-[^\s]+|\bborder(?:-[^\s]+)?/g, '')}`}
    >
      {style.label}
    </span>
  )
}

function LocationBadge({ record }) {
  if (!record) {
    return (
      <span className="text-xs text-slate-400">
        —
      </span>
    )
  }

  const verified =
    isLocationVerified(record)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
        verified
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <MapPin size={11} />

      {verified
        ? 'Verified'
        : 'Not Verified'}
    </span>
  )
}

function AttendanceReviewCard({
  record,
  employees,
  onAccept,
  acceptingId,
}) {
  const employee =
    employees.find(
      (item) =>
        item.id ===
          record.employeeId ||
        item.employeeId ===
          record.employeeId,
    )

  const employeeName =
    record.employeeName ||
    getEmployeeName(employee)

  const employeeBusinessId =
    employee?.employeeId ||
    record.employeeId ||
    '—'

  const accepting =
    acceptingId === record.id

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
            {getInitials(
              employeeName,
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">
                {employeeName}
              </h3>

              <span className="text-xs text-slate-400">
                {employeeBusinessId}
              </span>

              <StatusBadge
                status={
                  record.status
                }
              />
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {record.department ||
                employee?.department ||
                'Unassigned'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={accepting}
          onClick={() =>
            onAccept(record)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {accepting ? (
            <Loader2
              size={15}
              className="animate-spin"
            />
          ) : (
            <CheckCircle2 size={15} />
          )}

          {accepting
            ? 'Accepting...'
            : 'Accept Late'}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Date
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatDate(
              record.date,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Required Check In
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatTime(
              record.requiredCheckInTime,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Actual Check In
          </p>

          <p className="mt-1 text-sm font-semibold text-amber-700">
            {formatTime(
              record.checkIn,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Late Hours
          </p>

          <p className="mt-1 text-sm font-semibold text-red-600">
            {formatLateHours(record.late)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Check Out
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatTime(
              record.checkOut,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Location
          </p>

          <div className="mt-1">
            <LocationBadge
              record={record}
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Review Status
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {record.reviewStatus ||
              'Pending'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Approval
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {record.reviewedBy
              ? `Accepted by ${record.reviewedBy}`
              : 'Awaiting HR review'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Attendance() {
  const { can } = useAccess()
  const canManage = can('attendance.manage')

  const [month, setMonth] =
    useState(getCurrentMonth())

  const [year, setYear] =
    useState(getCurrentYear())

  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [dailyView, setDailyView] = useState(true)

  const [search, setSearch] =
    useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchHintIndex, setSearchHintIndex] = useState(0)
  const searchHints = ['Search employee name…', 'Search employee ID…', 'Search by department…']

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSearchHintIndex((index) => (index + 1) % searchHints.length)
    }, 2600)
    return () => window.clearInterval(interval)
  }, [])

  const [department, setDepartment] =
    useState('All Departments')

  const [manualDepartment, setManualDepartment] =
    useState('')

  const [attendanceStatusFilter, setAttendanceStatusFilter] =
    useState('')

  const [employees, setEmployees] =
    useState([])

  const [databaseRecords, setDatabaseRecords] =
    useState([])

  const [loading, setLoading] =
    useState(true)


  const [apiError, setApiError] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const [acceptingId, setAcceptingId] =
    useState(null)

  const daysInMonth =
    getDaysInMonth(
      year,
      month,
    )

  // Keep the attendance calendar starting from the 23rd, then continue
  // through the end of the month and wrap around to the 1st.
  const attendanceDays = [
    ...Array.from(
      { length: daysInMonth },
      (_, index) => ((22 + index) % daysInMonth) + 1,
    ),
  ]

  const selectedAttendanceDay = Math.min(selectedDay, daysInMonth)
  const selectedAttendanceDate = getDateKey(year, month, selectedAttendanceDay)
  const displayedDays = dailyView ? [selectedAttendanceDay] : attendanceDays

  function shiftAttendanceDay(offset) {
    const date = new Date(year, month, selectedAttendanceDay + offset)
    setYear(date.getFullYear())
    setMonth(date.getMonth())
    setSelectedDay(date.getDate())
  }

  function setAttendanceDate(value) {
    if (!value) return
    const [nextYear, nextMonth, nextDay] = value.split('-').map(Number)
    setYear(nextYear)
    setMonth(nextMonth - 1)
    setSelectedDay(nextDay)
    setDailyView(true)
  }

  const monthStart =
    getDateKey(
      year,
      month,
      1,
    )

  const monthEnd =
    getDateKey(
      year,
      month,
      daysInMonth,
    )

  const loadData = useCallback(
    async (
      showLoader = true,
    ) => {
      try {
        if (showLoader) {
          setLoading(true)
        }

        setApiError('')

        const [
          employeesResponse,
          attendanceResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/employees`,
          ),

          fetch(
            `${API_URL}/attendance?startDate=${monthStart}&endDate=${monthEnd}`,
          ),
        ])

        if (
          !employeesResponse.ok
        ) {
          throw new Error(
            'Unable to load employees from the database.',
          )
        }

        if (
          !attendanceResponse.ok
        ) {
          const errorData =
            await attendanceResponse
              .json()
              .catch(
                () => ({}),
              )

          throw new Error(
            errorData.message ||
              'Unable to load attendance from the database.',
          )
        }

        const employeeData =
          await employeesResponse.json()

        const attendanceData =
          await attendanceResponse.json()

        setEmployees(
          Array.isArray(
            employeeData,
          )
            ? employeeData
            : [],
        )

        setDatabaseRecords(
          Array.isArray(
            attendanceData,
          )
            ? attendanceData
            : [],
        )
      } catch (error) {
        console.error(
          'Attendance load error:',
          error,
        )

        setApiError(
          error.message ||
            'Unable to load attendance from the database.',
        )
      } finally {
        setLoading(false)
      }
    },
    [
      monthStart,
      monthEnd,
    ],
  )

  useEffect(() => {
    loadData(true)
  }, [loadData])

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        loadData(false)
      }, 30000)

    return () =>
      window.clearInterval(
        interval,
      )
  }, [loadData])

  const departments =
    useMemo(() => {
      return [
        'All Departments',
        ...Array.from(
          new Set(
            employees
              .map(
                (employee) =>
                  employee.department,
              )
              .filter(Boolean),
          ),
        ),
      ]
    }, [employees])

  const todayKey =
    new Date()
      .toISOString()
      .slice(0, 10)

  const rows = useMemo(
    () =>
      buildEmployeeRows(
        employees,
        databaseRecords,
        year,
        month,
      ),
    [
      employees,
      databaseRecords,
      year,
      month,
    ],
  )

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return rows.filter(
        (row) => {
          const matchesSearch =
            !query ||
            row.name
              .toLowerCase()
              .includes(query) ||
            row.employeeId
              .toLowerCase()
              .includes(query)

          const departmentFilter =
            department === '__manual__'
              ? manualDepartment.trim().toLowerCase()
              : department

          const matchesDepartment =
            department === 'All Departments' ||
            (department === '__manual__'
              ? Boolean(departmentFilter) &&
                row.department.toLowerCase().includes(departmentFilter)
              : row.department === department)

          return (
            matchesSearch &&
            matchesDepartment
          )
        },
      )
    }, [
      rows,
      search,
      department,
      manualDepartment,
    ])

  const statusFilteredRows =
    useMemo(() => {
      if (!attendanceStatusFilter) {
        return filteredRows
      }

      return filteredRows.filter((row) => {
        const record = getRecordForDate(
          databaseRecords,
          row.employee,
          selectedAttendanceDate,
        )

        const status = record?.status || ''

        if (attendanceStatusFilter === 'present') {
          return status === 'PRESENT'
        }

        if (attendanceStatusFilter === 'checked-in') {
          return (
            status === 'CHECKED_IN' ||
            status === 'PENDING_CHECKOUT'
          )
        }

        if (attendanceStatusFilter === 'pending-review') {
          return (
            status === 'PENDING_REVIEW' ||
            status === 'LATE'
          )
        }

        if (attendanceStatusFilter === 'absent') {
          return (
            status === 'ABSENT' ||
            status === 'A'
          )
        }

        return true
      })
    }, [
      filteredRows,
      databaseRecords,
      selectedAttendanceDate,
      attendanceStatusFilter,
    ])

  const summaries =
    useMemo(
      () =>
        filteredRows.map(
          (row) =>
            calculateSummary(
              row,
              year,
              month,
            ),
        ),
      [
        filteredRows,
        year,
        month,
      ],
    )

  const totals = useMemo(() => {
    return summaries.reduce(
      (result, summary) => ({
        employees:
          result.employees + 1,

        present:
          result.present +
          summary.present,

        absent:
          result.absent +
          summary.absent,

        leave:
          result.leave +
          summary.leave,

        pendingReview:
          result.pendingReview +
          summary.pendingReview,

        checkedIn:
          result.checkedIn +
          summary.checkedIn,

        overtime:
          result.overtime +
          summary.overtime,

        lateMinutes:
          result.lateMinutes +
          summary.lateMinutes,
      }),
      {
        employees: 0,
        present: 0,
        absent: 0,
        leave: 0,
        pendingReview: 0,
        checkedIn: 0,
        overtime: 0,
        lateMinutes: 0,
      },
    )
  }, [summaries])

  /*
   * Dashboard-style employee totals.
   * These use the complete employee list,
   * not the current search/department filter.
   */
  const totalEmployees =
    employees.length

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.employmentStatus ===
          'Active' ||
        employee.status === 'Active',
    ).length

  const pendingReviews =
    useMemo(() => {
      return databaseRecords
        .filter(
          (record) =>
            record.status ===
              'PENDING_REVIEW' ||
            record.status ===
              'LATE',
        )
        .sort((a, b) =>
          String(
            b.date || '',
          ).localeCompare(
            String(
              a.date || '',
            ),
          ),
        )
    }, [databaseRecords])

  const todayRecords =
    useMemo(() => {
      return databaseRecords.filter(
        (record) =>
          record.date ===
          todayKey,
      )
    }, [
      databaseRecords,
      todayKey,
    ])

  const todayPresent =
    todayRecords.filter(
      (record) =>
        record.status ===
        'PRESENT',
    ).length

  const todayCheckedIn =
    todayRecords.filter(
      (record) =>
        record.status ===
          'CHECKED_IN' ||
        record.status ===
          'PENDING_CHECKOUT',
    ).length

  const todayPending =
    todayRecords.filter(
      (record) =>
        record.status ===
          'PENDING_REVIEW' ||
        record.status === 'LATE',
    ).length

  const todayAbsent =
    todayRecords.filter(
      (record) =>
        record.status ===
          'ABSENT' ||
        record.status === 'A',
    ).length

  async function acceptLateAttendance(
    record,
  ) {
    try {
      setAcceptingId(record.id)
      setApiError('')
      setSuccessMessage('')

      const userRaw =
        localStorage.getItem(
          'user',
        )

      let reviewedBy =
        'HR Administrator'

      if (userRaw) {
        try {
          const user =
            JSON.parse(
              userRaw,
            )

          reviewedBy =
            user.name ||
            user.email ||
            reviewedBy
        } catch {
          // Keep fallback reviewer name.
        }
      }

      const response =
        await fetch(
          `${API_URL}/attendance/${record.id}/accept-late`,
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              reviewedBy,
              reviewRemarks:
                'Late attendance accepted by HR.',
            }),
          },
        )

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to accept late attendance.',
        )
      }

      setSuccessMessage(
        'Late attendance accepted successfully. The original check-in and check-out times were preserved.',
      )

      await loadData(false)

      window.setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
    } catch (error) {
      console.error(
        'Accept late attendance error:',
        error,
      )

      setApiError(
        error.message ||
          'Failed to accept late attendance.',
      )
    } finally {
      setAcceptingId(null)
    }
  }

  function previousMonth() {
    setApiError('')
    setSuccessMessage('')

    if (month === 0) {
      setMonth(11)
      setYear(
        (current) =>
          current - 1,
      )
      return
    }

    setMonth(
      (current) =>
        current - 1,
    )
  }

  function nextMonth() {
    setApiError('')
    setSuccessMessage('')

    if (month === 11) {
      setMonth(0)
      setYear(
        (current) =>
          current + 1,
      )
      return
    }

    setMonth(
      (current) =>
        current + 1,
    )
  }

  async function importAttendance(records) {
    let imported = 0
    for (const record of records) {
      const employeeId = String(record.employeeId || '').trim()
      if (!employeeId || !record.date || !record.status) continue
      const response = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, employeeId, date: String(record.date).slice(0, 10) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(`${employeeId} ${record.date}: ${result.message || 'Import failed.'}`)
      imported += 1
    }
    await loadData(false)
    return `Imported ${imported} attendance record(s). Existing records are left unchanged.`
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1800px] p-4 sm:p-6">

        {/* Shared Page Title */}
        <PageTitle
          eyebrow="Attendance Management"
          title="Track Your Team's Attendance"
          description="Attendance is automatically recorded from employee check-in and check-out activity. HR reviews exceptions only."
          className="mb-8"
        />

        {/* Messages */}
        {apiError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p>
                {apiError}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setApiError('')
              }
              className="ml-auto"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p>
              {successMessage}
            </p>
          </div>
        )}

        {/* Today's automatic attendance */}
        <div className="mb-5 bg-transparent p-0">
          {/* Dashboard employee statistics + today's attendance */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { title: 'Total Employees', description: 'Employees in the company', value: totalEmployees, icon: Users, iconVariant: 'blue' },
              { title: 'Active Employees', description: 'Currently active', value: activeEmployees, icon: UserCheck, iconVariant: 'green' },
              { title: 'Total Present', description: 'Completed attendance today', value: todayPresent, icon: UserCheck, iconVariant: 'green', filterKey: 'present' },
              { title: 'Checked In', description: 'Currently checked in', value: todayCheckedIn, icon: Clock3, iconVariant: 'blue', filterKey: 'checked-in' },
              { title: 'Pending Review', description: 'Requires HR review', value: todayPending, icon: AlertCircle, iconVariant: 'amber', filterKey: 'pending-review' },
              { title: 'Absent', description: 'No attendance recorded', value: todayAbsent, icon: UserX, iconVariant: 'red', filterKey: 'absent' },
            ].map((stat, statIndex) => (
              <SummaryCard
                key={stat.title}
                title={stat.title}
                description={stat.description}
                value={stat.value}
                icon={stat.icon}
                iconVariant={stat.iconVariant}
                animationDelay={statIndex * 100}
                onClick={stat.filterKey ? () => setAttendanceStatusFilter((current) => current === stat.filterKey ? '' : stat.filterKey) : undefined}
              />
            ))}
          </div>
        </div>

        {/* Late review queue */}
        <div className="mb-5 rounded-2xl p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {pendingReviews.length > 0 && (
                  <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {pendingReviews.length}
                  </span>
                )}
              </div>

            </div>
          </div>

          {pendingReviews.length === 0 || !canManage ? null : (
            <div className="space-y-3">
              {pendingReviews.map(
                (record) => (
                  <AttendanceReviewCard
                    key={record.id}
                    record={record}
                    employees={
                      employees
                    }
                    onAccept={
                      acceptLateAttendance
                    }
                    acceptingId={
                      acceptingId
                    }
                  />
                ),
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            {!search && !searchFocused && (
              <span key={searchHintIndex} aria-hidden="true" className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-bottom-1 duration-500 text-sm text-slate-400">
                {searchHints[searchHintIndex]}
              </span>
            )}
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              aria-label="Search employees by name, ID, or department"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder=""
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value)
                if (event.target.value !== '__manual__') {
                  setManualDepartment('')
                }
              }}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
            >
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="__manual__">Enter Department Manually</option>
            </select>

            {department === '__manual__' && (
              <input
                value={manualDepartment}
                onChange={(event) => setManualDepartment(event.target.value)}
                placeholder="Enter department..."
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
              />
            )}
          </div>
        </div>

        {/* Attendance records */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-5">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-[#0092B8] sm:text-3xl">
                Attendance Records
              </h2>

              <p className="mt-1.5 text-sm font-semibold text-[#0092B8] sm:text-base">
                {dailyView ? selectedAttendanceDate : `${MONTHS[month]} ${year} · ${daysInMonth} days`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <select
                aria-label="Attendance month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="h-9 min-w-32 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
              >
                {MONTHS.map((monthName, index) => <option key={monthName} value={index}>{monthName}</option>)}
              </select>
              <select
                aria-label="Attendance year"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-9 min-w-20 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
              >
                {Array.from({ length: 11 }, (_, index) => getCurrentYear() - 5 + index).map((yearValue) => <option key={yearValue} value={yearValue}>{yearValue}</option>)}
              </select>
              <button type="button" onClick={previousMonth} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Previous month" aria-label="Previous month"><ChevronLeft size={16} /></button>
              <button type="button" onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Next month" aria-label="Next month"><ChevronRight size={16} /></button>
              <button type="button" onClick={() => setDailyView((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                {dailyView ? 'Month view' : 'Day view'}
              </button>
              {dailyView && <>
                <button type="button" onClick={() => shiftAttendanceDay(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Previous day</button>
                <input type="date" value={selectedAttendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs" aria-label="Filter attendance by date" />
                <button type="button" onClick={() => shiftAttendanceDay(1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Next day</button>
                <button type="button" onClick={() => setAttendanceDate(getDateKey(getCurrentYear(), getCurrentMonth(), new Date().getDate()))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Today</button>
              </>}
              <TableDataTools filename={`attendance-${selectedAttendanceDate}`} rows={databaseRecords} onImport={importAttendance} />
            </div>

          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Loading attendance...
              </div>
            </div>
          ) : statusFilteredRows.length ===
            0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <CalendarDays
                size={36}
                className="text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                No employees found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Add employees in Employee
                Management or change the
                current search and department
                filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1800px] border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-20 min-w-28 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Employee ID
                    </th>

                    <th className="sticky left-28 z-20 min-w-52 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Employee Name
                    </th>

                    <th className="sticky left-[20.5rem] z-20 min-w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Department
                    </th>

                    {displayedDays.map(
                      (day) => {

                        const info =
                          getDayInfo(
                            year,
                            month,
                            day,
                          )

                        return (
                          <th
                            key={day}
                            className={`min-w-[58px] border-b border-r border-slate-200 px-1 py-2 text-center ${
                              info.isWeekend
                                ? 'bg-slate-100'
                                : 'bg-slate-50'
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-700">
                              {day}
                            </div>

                            <div className="text-[9px] font-medium uppercase text-slate-400">
                              {
                                info.dayName
                              }
                            </div>
                          </th>
                        )
                      },
                    )}

                    <th className="min-w-24 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Present
                    </th>

                    <th className="min-w-24 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Pending
                    </th>

                    <th className="min-w-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Absent
                    </th>

                    <th className="min-w-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      OT
                    </th>

                    <th className="min-w-24 border-b border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Late
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {statusFilteredRows.map(
                    (row) => {
                      const summary =
                        calculateSummary(
                          row,
                          year,
                          month,
                        )

                      return (
                        <tr
                          key={
                            row.employeeKey
                          }
                          className="hover:bg-slate-50/70"
                        >
                          <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-3">
                            <span className="text-xs font-bold text-slate-700">
                              {
                                row.employeeId
                              }
                            </span>
                          </td>

                          <td className="sticky left-28 z-10 border-b border-r border-slate-200 bg-white px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {getInitials(
                                  row.name,
                                )}
                              </div>

                              <span className="whitespace-nowrap text-sm font-semibold text-slate-800">
                                {
                                  row.name
                                }
                              </span>
                            </div>
                          </td>

                          <td className="sticky left-[20.5rem] z-10 border-b border-r border-slate-200 bg-white px-3 py-3">
                            <span className="whitespace-nowrap text-xs text-slate-500">
                              {
                                row.department
                              }
                            </span>
                          </td>

                          {displayedDays.map(
                            (day) => {

                              const dateKey =
                                getDateKey(
                                  year,
                                  month,
                                  day,
                                )

                              const info =
                                getDayInfo(
                                  year,
                                  month,
                                  day,
                                )

                              const record =
                                row
                                  .attendance[
                                  dateKey
                                ]

                              return (
                                <td
                                  key={
                                    dateKey
                                  }
                                  className={`border-b border-r border-slate-200 px-1 py-2 text-center ${
                                    info.isWeekend
                                      ? 'bg-slate-50'
                                      : ''
                                  }`}
                                >
                                  {record ? (
                                    <div className="flex min-w-[58px] flex-col items-center gap-1">
                                      <StatusBadge
                                        status={
                                          record.status
                                        }
                                      />

                                      {record.checkIn && (
                                        <span className="text-[9px] font-medium text-slate-500">
                                          In{' '}
                                          {formatTime(
                                            record.checkIn,
                                          )}
                                        </span>
                                      )}

                                      {record.checkOut && (
                                        <span className="text-[9px] font-medium text-slate-500">
                                          Out{' '}
                                          {formatTime(
                                            record.checkOut,
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-300">
                                      —
                                    </span>
                                  )}
                                </td>
                              )
                            },
                          )}

                          <td className="border-b border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold text-emerald-700">
                            {
                              summary.present
                            }
                          </td>

                          <td className="border-b border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold text-amber-700">
                            {
                              summary.pendingReview
                            }
                          </td>

                          <td className="border-b border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold text-red-700">
                            {
                              summary.absent
                            }
                          </td>

                          <td className="border-b border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold text-blue-700">
                            {summary.overtime.toFixed(
                              1,
                            )}
                          </td>

                          <td className="border-b border-slate-200 px-2 py-3 text-center text-xs font-semibold text-slate-700">
                            {
                              formatLateHours(summary.lateMinutes)
                            }
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>

        {/* Today's detailed records */}
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-center font-bold text-[#0092B8]">
              Today's Check In / Check Out
            </h2>
          </div>

          {todayRecords.length ===
          0 ? (
            <div className="px-5 py-10 text-center">
              <Clock3
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No attendance activity
                recorded today.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Employee
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Department
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Check In
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Check Out
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Location
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Late
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {todayRecords.map(
                    (record) => {
                      const employee =
                        employees.find(
                          (item) =>
                            item.id ===
                              record.employeeId ||
                            item.employeeId ===
                              record.employeeId,
                        )

                      const name =
                        record.employeeName ||
                        getEmployeeName(
                          employee,
                        )

                      return (
                        <tr
                          key={
                            record.id
                          }
                          className="border-b border-slate-100 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {getInitials(
                                  name,
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {name}
                                </p>

                                <p className="text-[11px] text-slate-400">
                                  {employee?.employeeId ||
                                    record.employeeId}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-500">
                            {record.department ||
                              employee?.department ||
                              'Unassigned'}
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold text-slate-800">
                              {formatTime(
                                record.checkIn,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold text-slate-800">
                              {formatTime(
                                record.checkOut,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                record.status
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <LocationBadge
                              record={
                                record
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`text-xs font-semibold ${
                                Number(
                                  record.late ||
                                    0,
                                ) > 0
                                  ? 'text-amber-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {formatLateHours(record.late)}
                            </span>
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Attendance
