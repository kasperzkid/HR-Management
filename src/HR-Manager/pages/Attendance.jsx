import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '../../lib/hrApi'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import LuxuryDataTable from '../components/LuxuryDataTable'

const API_URL = '/api/hr-manager'

const selectClass =
  'h-9 pl-2.5 pr-7 text-xs border border-slate-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-slate-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium'

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

const ATTENDANCE_CODES = [
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

const CODE_LABELS = Object.fromEntries(
  ATTENDANCE_CODES.map((item) => [item.code, item.label]),
)

const CODE_CLASSES = {
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
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
  }
}

function getEmployeeName(employee) {
  if (employee.name) {
    return employee.name
  }

  return [
    employee.firstName,
    employee.lastName,
  ]
    .filter(Boolean)
    .join(' ')
}

function getEmployeeId(employee, index) {
  return (
    employee.employeeId ||
    employee.id ||
    `EMP-${String(index + 1).padStart(3, '0')}`
  )
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function calculateSummary(
  employee,
  attendanceMap,
  year,
  monthIndex,
) {
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
  }
}

function getDefaultCode(year, monthIndex, day) {
  const { isWeekend } = getDayInfo(
    year,
    monthIndex,
    day,
  )

  if (isWeekend) {
    return 'WK'
  }

  return ''
}

function createEmployeeRow(
  employee,
  index,
  year,
  monthIndex,
) {
  const daysInMonth = getDaysInMonth(
    year,
    monthIndex,
  )

  const attendance = {}

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = getDateKey(
      year,
      monthIndex,
      day,
    )

    attendance[key] = {
      code: getDefaultCode(
        year,
        monthIndex,
        day,
      ),
      overtime: 0,
      late: 0,
      id: null,
    }
  }

  return {
    employeeKey:
      employee.id ||
      employee.employeeId ||
      index,

    employeeId: getEmployeeId(
      employee,
      index,
    ),

    name: getEmployeeName(employee),

    department:
      employee.department ||
      'Unassigned',

    employee,

    attendance,
  }
}

function buildRowsFromDatabase(
  employees,
  databaseRecords,
  year,
  monthIndex,
) {
  const rows = employees.map(
    (employee, index) =>
      createEmployeeRow(
        employee,
        index,
        year,
        monthIndex,
      ),
  )

  const employeeMap = new Map(
    rows.map((row) => [
      row.employeeKey,
      row,
    ]),
  )

  const employeeIdMap = new Map(
    rows.map((row) => [
      row.employeeId,
      row,
    ]),
  )

  for (const record of databaseRecords) {
    if (!record.date) {
      continue
    }

    const date = new Date(
      `${record.date}T00:00:00`,
    )

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== monthIndex
    ) {
      continue
    }

    /*
     * Support both:
     * - Employee database id
     * - Employee business ID
     */
    const row =
      employeeMap.get(record.employeeId) ||
      employeeIdMap.get(record.employeeId)

    if (!row) {
      continue
    }

    row.attendance[record.date] = {
      code: record.status || '',
      overtime: Number(
        record.overtime || 0,
      ),
      late: Number(record.late || 0),
      id: record.id || null,
    }
  }

  return rows
}

function CodePicker({
  value,
  onChange,
  disabled,
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        className={`flex h-9 min-w-12 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${
          value
            ? CODE_CLASSES[value] ||
              'border-slate-200 bg-white text-slate-600'
            : 'border-dashed border-slate-300 bg-white text-slate-400 hover:border-slate-400'
        } ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : ''
        }`}
        title={
          value
            ? CODE_LABELS[value]
            : 'Select attendance code'
        }
      >
        {value || '—'}
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            aria-label="Close attendance code menu"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() =>
              setOpen(false)
            }
          />

          <div className="absolute left-1/2 top-11 z-30 w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Attendance Code
            </div>

            {ATTENDANCE_CODES.map(
              (item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    onChange(item.code)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-50"
                >
                  <span
                    className={`flex h-7 w-9 items-center justify-center rounded-md border font-bold ${
                      CODE_CLASSES[
                        item.code
                      ]
                    }`}
                  >
                    {item.code}
                  </span>

                  <span className="text-slate-600">
                    {item.label}
                  </span>
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
            >
              <X size={14} />
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Attendance() {
  const [month, setMonth] =
    useState(getCurrentMonth())

  const [year, setYear] =
    useState(getCurrentYear())

  const [search, setSearch] =
    useState('')

  const [department, setDepartment] =
    useState('All Departments')

  const [employees, setEmployees] =
    useState([])

  const [databaseRecords, setDatabaseRecords] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [apiError, setApiError] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const daysInMonth =
    getDaysInMonth(
      year,
      month,
    )

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

  /*
   * Load employees and attendance
   * whenever month/year changes.
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setApiError('')
        setSuccessMessage('')

        const [
          employeesResponse,
          attendanceResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/employees`,
            {
              headers: authHeaders(),
            },
          ),

          fetch(
            `${API_URL}/attendance?startDate=${monthStart}&endDate=${monthEnd}`,
            {
              headers: authHeaders(),
            },
          ),
        ])

        if (!employeesResponse.ok) {
          throw new Error(
            'Unable to load employees from the database',
          )
        }

        if (!attendanceResponse.ok) {
          throw new Error(
            'Unable to load attendance from the database',
          )
        }

        const employeeData =
          await employeesResponse.json()

        const attendanceData =
          await attendanceResponse.json()

        setEmployees(
          Array.isArray(employeeData)
            ? employeeData
            : [],
        )

        setDatabaseRecords(
          Array.isArray(attendanceData)
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
            'Unable to load attendance from the database',
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [monthStart, monthEnd])

  const departments = useMemo(() => {
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

  const rows = useMemo(
    () =>
      buildRowsFromDatabase(
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

  const filteredRows = useMemo(() => {
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

        const matchesDepartment =
          department ===
            'All Departments' ||
          row.department ===
            department

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
  ])

  const summaries = useMemo(
    () =>
      filteredRows.map(
        (row) =>
          calculateSummary(
            row.employee,
            row.attendance,
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
        overtime: 0,
        lateMinutes: 0,
      },
    )
  }, [summaries])

  const resetFilters = () => {
    setSearch('')
    setDepartment('All Departments')
  }

  const tableRows = useMemo(
    () =>
      filteredRows.map((row) => ({
        ...row,
        ...calculateSummary(row.employee, row.attendance, year, month),
      })),
    [filteredRows, year, month],
  )

  const columns = (() => {
    const dayColumns = Array.from(
      { length: daysInMonth },
      (_, index) => {
        const day = index + 1
        const info = getDayInfo(year, month, day)
        const dateKey = getDateKey(year, month, day)

        return {
          key: `day-${day}`,
          header: `${day} ${info.dayName}`,
          align: 'center',
          className: info.isWeekend ? 'bg-slate-100' : '',
          exportValue: (row) => row.attendance[dateKey]?.code || '',
          render: (row) => (
            <CodePicker
              value={row.attendance[dateKey]?.code || ''}
              disabled={info.isWeekend}
              onChange={(code) =>
                updateAttendanceCode(row.employeeKey, dateKey, code)
              }
            />
          ),
        }
      },
    )

    return [
      {
        key: 'employeeId',
        header: 'Employee ID',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-bold text-slate-700">
            {row.employeeId}
          </span>
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
          <span className="whitespace-nowrap text-xs text-slate-500">
            {row.department}
          </span>
        ),
      },
      ...dayColumns,
      {
        key: 'workingDays',
        header: 'Working',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-slate-700">
            {row.workingDays}
          </span>
        ),
      },
      {
        key: 'present',
        header: 'Present',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-emerald-700">
            {row.present}
          </span>
        ),
      },
      {
        key: 'absent',
        header: 'Absent',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-red-700">
            {row.absent}
          </span>
        ),
      },
      {
        key: 'leave',
        header: 'Leave',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-amber-700">
            {row.leave}
          </span>
        ),
      },
      {
        key: 'overtime',
        header: 'OT',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-blue-700">
            {row.overtime.toFixed(1)}
          </span>
        ),
      },
      {
        key: 'lateMinutes',
        header: 'Late',
        align: 'center',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-semibold text-slate-700">
            {row.lateMinutes}
          </span>
        ),
      },
    ]
  })()

  /*
   * Update an attendance code locally.
   *
   * The database is only changed when
   * Save Attendance is pressed.
   */
  function updateAttendanceCode(
    employeeKey,
    dateKey,
    code,
  ) {
    setDatabaseRecords(
      (currentRecords) => {
        const rowsForUpdate =
          buildRowsFromDatabase(
            employees,
            currentRecords,
            year,
            month,
          )

        const row =
          rowsForUpdate.find(
            (item) =>
              item.employeeKey ===
              employeeKey,
          )

        if (!row) {
          return currentRecords
        }

        const existing =
          row.attendance[dateKey]

        /*
         * Clearing an existing record:
         * keep it in local state with an empty
         * status so saveAttendance can delete it.
         */
        if (!code) {
          if (!existing?.id) {
            return currentRecords.filter(
              (record) =>
                !(
                  record.employeeId ===
                    employeeKey &&
                  record.date ===
                    dateKey
                ),
            )
          }

          return currentRecords.map(
            (record) =>
              record.id ===
              existing.id
                ? {
                    ...record,
                    status: '',
                  }
                : record,
          )
        }

        /*
         * Update existing local record.
         */
        if (existing?.id) {
          return currentRecords.map(
            (record) =>
              record.id ===
              existing.id
                ? {
                    ...record,
                    status: code,
                  }
                : record,
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
            employeeId:
              row.employeeKey,
            employeeName: row.name,
            department:
              row.department,
            date: dateKey,
            status: code,
            checkIn: null,
            checkOut: null,
            late: 0,
            earlyDeparture: 0,
            regular:
              code === 'P' ||
              code === 'HD'
                ? 8
                : 0,
            overtime: 0,
          },
        ]
      },
    )
  }

  /*
   * Update overtime/late values locally.
   */
  function updateAttendanceExtra(
    employeeKey,
    dateKey,
    field,
    value,
  ) {
    const numericValue =
      Number(value) || 0

    setDatabaseRecords(
      (currentRecords) => {
        const existing =
          currentRecords.find(
            (record) =>
              record.employeeId ===
                employeeKey &&
              record.date ===
                dateKey,
          )

        if (existing) {
          return currentRecords.map(
            (record) =>
              record.employeeId ===
                employeeKey &&
              record.date ===
                dateKey
                ? {
                    ...record,
                    [field]:
                      numericValue,
                  }
                : record,
          )
        }

        const row =
          rows.find(
            (item) =>
              item.employeeKey ===
              employeeKey,
          )

        if (!row) {
          return currentRecords
        }

        return [
          ...currentRecords,
          {
            id: null,
            employeeId:
              row.employeeKey,
            employeeName:
              row.name,
            department:
              row.department,
            date: dateKey,
            status: '',
            late:
              field === 'late'
                ? numericValue
                : 0,
            overtime:
              field ===
              'overtime'
                ? numericValue
                : 0,
            checkIn: null,
            checkOut: null,
            earlyDeparture: 0,
            regular: 0,
          },
        ]
      },
    )
  }

  /*
   * Save the entire visible month.
   *
   * Existing records:
   *   PUT
   *
   * New records:
   *   POST
   *
   * Cleared records:
   *   DELETE
   */
  async function saveAttendance() {
    try {
      setSaving(true)
      setApiError('')
      setSuccessMessage('')

      /*
       * Get fresh rows from the current
       * databaseRecords state.
       */
      const currentRows =
        buildRowsFromDatabase(
          employees,
          databaseRecords,
          year,
          month,
        )

      for (const row of currentRows) {
        for (
          let day = 1;
          day <= daysInMonth;
          day += 1
        ) {
          const dateKey =
            getDateKey(
              year,
              month,
              day,
            )

          const record =
            row.attendance[dateKey]

          if (!record) {
            continue
          }

          /*
           * Never store automatic weekends.
           */
          if (
            record.code === 'WK'
          ) {
            continue
          }

          /*
           * If the user cleared an existing
           * record, delete it.
           */
          if (
            record.id &&
            !record.code &&
            Number(
              record.overtime || 0,
            ) === 0 &&
            Number(
              record.late || 0,
            ) === 0
          ) {
            const response =
              await fetch(
                `${API_URL}/attendance/${record.id}`,
                {
                  method: 'DELETE',
                  headers: authHeaders(),
                },
              )

            if (!response.ok) {
              const errorData =
                await response
                  .json()
                  .catch(
                    () => ({}),
                  )

              throw new Error(
                errorData.message ||
                  `Failed to delete attendance for ${row.name}`,
              )
            }

            continue
          }

          /*
           * Completely empty new cells
           * do not need a database record.
           */
          if (
            !record.id &&
            !record.code &&
            Number(
              record.overtime || 0,
            ) === 0 &&
            Number(
              record.late || 0,
            ) === 0
          ) {
            continue
          }

          const payload = {
            employeeId:
              row.employeeKey,

            employeeName:
              row.name,

            department:
              row.department,

            date: dateKey,

            /*
             * If overtime/late was entered without
             * a status, use Present as the default.
             */
            status:
              record.code || 'P',

            checkIn:
              record.checkIn ||
              null,

            checkOut:
              record.checkOut ||
              null,

            late:
              Number(
                record.late || 0,
              ),

            earlyDeparture:
              Number(
                record.earlyDeparture ||
                  0,
              ),

            regular:
              record.regular !==
              undefined
                ? Number(
                    record.regular,
                  ) || 0
                : record.code ===
                      'P' ||
                    record.code ===
                      'HD'
                  ? 8
                  : 0,

            overtime:
              Number(
                record.overtime || 0,
              ),
          }

          /*
           * Existing record -> UPDATE
           */
          if (record.id) {
            const response =
              await fetch(
                `${API_URL}/attendance/${record.id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type':
                      'application/json',
                    ...authHeaders(),
                  },
                  body: JSON.stringify(
                    payload,
                  ),
                },
              )

            if (!response.ok) {
              const errorData =
                await response
                  .json()
                  .catch(
                    () => ({}),
                  )

              throw new Error(
                errorData.message ||
                  `Failed to update attendance for ${row.name}`,
              )
            }

            continue
          }

          /*
           * New record -> CREATE
           */
          const response =
            await fetch(
              `${API_URL}/attendance`,
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                  ...authHeaders(),
                },
                body: JSON.stringify(
                  payload,
                ),
              },
            )

          if (!response.ok) {
            const errorData =
              await response
                .json()
                .catch(
                  () => ({}),
                )

            throw new Error(
              errorData.message ||
                `Failed to create attendance for ${row.name}`,
            )
          }
        }
      }

      /*
       * Reload the month from the database
       * after every successful save.
       */
      const refreshedResponse =
        await fetch(
          `${API_URL}/attendance?startDate=${monthStart}&endDate=${monthEnd}`,
          {
            headers: authHeaders(),
          },
        )

      if (!refreshedResponse.ok) {
        throw new Error(
          'Attendance was saved, but the updated records could not be reloaded',
        )
      }

      const refreshedData =
        await refreshedResponse.json()

      setDatabaseRecords(
        Array.isArray(
          refreshedData,
        )
          ? refreshedData
          : [],
      )

      setSuccessMessage(
        'Attendance saved successfully.',
      )

      window.setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error(
        'Save attendance error:',
        error,
      )

      setApiError(
        error.message ||
          'Failed to save attendance',
      )
    } finally {
      setSaving(false)
    }
  }

  function previousMonth() {
    setSuccessMessage('')
    setApiError('')

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
    setSuccessMessage('')
    setApiError('')

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
              Manage daily attendance using the
              company attendance codes.
            </p>
          </div>

          <button
            type="button"
            onClick={
              saveAttendance
            }
            disabled={
              saving || loading
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            {saving
              ? 'Saving...'
              : 'Save Attendance'}
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Employees
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.employees}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Present
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.present}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Absent
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.absent}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Leave
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.leave}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Overtime
              </p>

              <Clock3
                size={16}
                className="text-blue-500"
              />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.overtime.toFixed(
                1,
              )}
              h
            </p>
          </div>
        </div>

        {/* Attendance Codes */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">
            Attendance Codes
          </h3>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ATTENDANCE_CODES.map(
              (item) => (
                <div
                  key={
                    item.code
                  }
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span
                    className={`flex h-7 w-10 items-center justify-center rounded-md border text-xs font-bold ${
                      CODE_CLASSES[
                        item.code
                      ]
                    }`}
                  >
                    {
                      item.code
                    }
                  </span>

                  <span className="text-xs text-slate-600">
                    {
                      item.label
                    }
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Attendance grid (Luxury) */}
        <LuxuryDataTable
          title="Daily Attendance Grid"
          subtitle={`${MONTHS[month]} ${year} · ${daysInMonth} days`}
          countBadge={filteredRows.length}
          columns={columns}
          data={tableRows}
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
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-medium whitespace-nowrap text-slate-500">
                  Month
                </span>
                <select
                  value={month}
                  onChange={(event) =>
                    setMonth(Number(event.target.value))
                  }
                  className={selectClass}
                >
                  {MONTHS.map((monthName, index) => (
                    <option key={monthName} value={index}>
                      {monthName}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-medium whitespace-nowrap text-slate-500">
                  Year
                </span>
                <select
                  value={year}
                  onChange={(event) =>
                    setYear(Number(event.target.value))
                  }
                  className={selectClass}
                >
                  {Array.from(
                    { length: 11 },
                    (_, index) => getCurrentYear() - 5 + index,
                  ).map((yearValue) => (
                    <option key={yearValue} value={yearValue}>
                      {yearValue}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-medium whitespace-nowrap text-slate-500">
                  Department:
                </span>
                <select
                  value={department}
                  onChange={(event) =>
                    setDepartment(event.target.value)
                  }
                  className={selectClass}
                >
                  {departments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </>
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

export default Attendance