import { useEffect, useMemo, useState } from 'react'

import {
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  MoreHorizontal,
  Users,
  TrendingUp,
} from 'lucide-react'

import { INITIAL_EMPLOYEES } from '../../Employer/data/employeeData'

import {
  Badge,
  Button,
  Card,
  DonutChart,
  PageTitle,
} from '../../components/ui'

// Uses the Vite proxy:
// /api -> http://localhost:4000
const API_URL = '/api/hr-manager'

function HRDashboard() {
  const employees = Array.isArray(INITIAL_EMPLOYEES)
    ? INITIAL_EMPLOYEES
    : []

  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [attendanceLoading, setAttendanceLoading] =
    useState(true)

  /*
   * =========================================================
   * ANIMATED KPI VALUES
   * =========================================================
   */

  const [animatedStats, setAnimatedStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeaveEmployees: 0,
    departments: 0,
  })

  /*
   * =========================================================
   * EMPLOYEE STATISTICS
   * =========================================================
   */

  const totalEmployees = employees.length

  const activeEmployees = employees.filter(
    (employee) =>
      employee.employmentStatus === 'Active' ||
      employee.status === 'Active'
  ).length

  const onLeaveEmployees = employees.filter(
    (employee) =>
      employee.employmentStatus === 'On Leave' ||
      employee.status === 'On Leave'
  ).length

  const departments = new Set(
    employees
      .map((employee) => employee.department)
      .filter(Boolean)
  ).size

  /*
   * =========================================================
   * ANIMATE KPI NUMBERS
   * =========================================================
   *
   * The four dashboard statistics smoothly count from 0
   * to their real values.
   */

  useEffect(() => {
    const targetValues = {
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      departments,
    }

    const duration = 1400
    const startTime = performance.now()

    let animationFrame

    const animateNumbers = (currentTime) => {
      const elapsed = currentTime - startTime

      const progress = Math.min(
        elapsed / duration,
        1
      )

      // Smooth ease-out animation
      const easedProgress =
        1 - Math.pow(1 - progress, 3)

      setAnimatedStats({
        totalEmployees: Math.round(
          targetValues.totalEmployees *
            easedProgress
        ),

        activeEmployees: Math.round(
          targetValues.activeEmployees *
            easedProgress
        ),

        onLeaveEmployees: Math.round(
          targetValues.onLeaveEmployees *
            easedProgress
        ),

        departments: Math.round(
          targetValues.departments *
            easedProgress
        ),
      })

      if (progress < 1) {
        animationFrame =
          requestAnimationFrame(
            animateNumbers
          )
      }
    }

    animationFrame =
      requestAnimationFrame(
        animateNumbers
      )

    return () => {
      cancelAnimationFrame(
        animationFrame
      )
    }
  }, [
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    departments,
  ])

  /*
   * =========================================================
   * LOAD ATTENDANCE FROM BACKEND API
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false

    const loadAttendance = async () => {
      try {
        setAttendanceLoading(true)

        const today = new Date()

        today.setHours(0, 0, 0, 0)

        const startDate = new Date(today)

        startDate.setDate(
          today.getDate() - 6
        )

        const formatDate = (date) => {
          const year = date.getFullYear()

          const month = String(
            date.getMonth() + 1
          ).padStart(2, '0')

          const day = String(
            date.getDate()
          ).padStart(2, '0')

          return `${year}-${month}-${day}`
        }

        const startDateString =
          formatDate(startDate)

        const endDateString =
          formatDate(today)

        const response = await fetch(
          `${API_URL}/attendance?startDate=${startDateString}&endDate=${endDateString}`
        )

        if (!response.ok) {
          throw new Error(
            `Failed to load attendance statistics: ${response.status}`
          )
        }

        const result =
          await response.json()

        let records = []

        if (Array.isArray(result)) {
          records = result
        } else if (
          Array.isArray(result?.data)
        ) {
          records = result.data
        } else if (
          Array.isArray(
            result?.attendance
          )
        ) {
          records = result.attendance
        } else if (
          Array.isArray(
            result?.records
          )
        ) {
          records = result.records
        }

        if (!cancelled) {
          setAttendanceRecords(records)
        }
      } catch (error) {
        console.error(
          'Failed to load attendance statistics:',
          error
        )

        if (!cancelled) {
          setAttendanceRecords([])
        }
      } finally {
        if (!cancelled) {
          setAttendanceLoading(false)
        }
      }
    }

    loadAttendance()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * =========================================================
   * ATTENDANCE CHART DATA
   * =========================================================
   */

  const attendanceChartData = useMemo(() => {
    const today = new Date()

    today.setHours(0, 0, 0, 0)

    const days = Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(today)

        date.setDate(
          today.getDate() -
            (6 - index)
        )

        return date
      }
    )

    return days.map((date) => {
      const year = date.getFullYear()

      const month = String(
        date.getMonth() + 1
      ).padStart(2, '0')

      const dayNumber = String(
        date.getDate()
      ).padStart(2, '0')

      const dateString =
        `${year}-${month}-${dayNumber}`

      const dayRecords =
        attendanceRecords.filter(
          (record) => {
            const recordDate =
              String(
                record.date || ''
              ).slice(0, 10)

            return (
              recordDate === dateString
            )
          }
        )

      let present = 0
      let absent = 0
      let leave = 0

      dayRecords.forEach(
        (record) => {
          const status = String(
            record.status ||
              record.attendanceStatus ||
              record.attendance_status ||
              ''
          )
            .trim()
            .toUpperCase()

          if (
            status === 'PRESENT' ||
            status === 'LATE' ||
            status === 'PENDING_REVIEW' ||
            status === 'CHECKED_IN' ||
            status === 'CHECKED IN' ||
            status === 'COMPLETED'
          ) {
            present += 1
          } else if (
            status === 'ABSENT'
          ) {
            absent += 1
          } else if (
            status === 'LEAVE' ||
            status === 'ON LEAVE' ||
            status === 'ON_LEAVE'
          ) {
            leave += 1
          }
        }
      )

      return {
        date: dateString,

        day: date.toLocaleDateString(
          'en-US',
          {
            weekday: 'short',
          }
        ),

        dateLabel:
          date.toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
            }
          ),

        present,
        absent,
        leave,

        total:
          present +
          absent +
          leave,
      }
    })
  }, [attendanceRecords])

  /*
   * =========================================================
   * ATTENDANCE CHART SCALE
   * =========================================================
   */

  const attendanceChartMax = useMemo(() => {
    const maximum = Math.max(
      ...attendanceChartData.map(
        (day) => day.total
      ),
      0
    )

    if (maximum <= 5) {
      return 5
    }

    if (maximum <= 10) {
      return 10
    }

    if (maximum <= 20) {
      return 20
    }

    if (maximum <= 50) {
      return 50
    }

    return Math.ceil(
      maximum / 10
    ) * 10
  }, [attendanceChartData])

  /*
   * =========================================================
   * DEPARTMENT STATISTICS
   * =========================================================
   */

  const departmentCounts =
    employees.reduce(
      (acc, employee) => {
        const department =
          employee.department ||
          'Other'

        acc[department] =
          (acc[department] || 0) +
          1

        return acc
      },
      {}
    )

  const departmentStats =
    Object.entries(
      departmentCounts
    )
      .sort(
        ([, a], [, b]) => b - a
      )
      .map(
        ([name, count]) => ({
          name,
          count,
          percentage:
            totalEmployees > 0
              ? Math.round(
                  (count /
                    totalEmployees) *
                    100
                )
              : 0,
        })
      )

  const departmentColors = [
    '#16C1CF',
    '#6845E8',
    '#F97316',
    '#22C55E',
    '#EAB308',
    '#EC4899',
  ]


  /*
   * =========================================================
   * WORKFORCE PERFORMANCE
   * =========================================================
   */

  const activePercentage =
    totalEmployees > 0
      ? Math.round(
          (activeEmployees /
            totalEmployees) *
            100
        )
      : 0

  const leavePercentage =
    totalEmployees > 0
      ? Math.round(
          (onLeaveEmployees /
            totalEmployees) *
            100
        )
      : 0

  /*
   * =========================================================
   * KPI DATA
   * =========================================================
   */

  const stats = [
    {
      title: 'Total Employees',
      value:
        animatedStats.totalEmployees,
      description:
        'Employees in the company',
      icon: Users,
    },

    {
      title: 'Active Employees',
      value:
        animatedStats.activeEmployees,
      description:
        'Currently active',
      icon: CalendarCheck,
    },

    {
      title: 'On Leave',
      value:
        animatedStats.onLeaveEmployees,
      description:
        'Currently on leave',
      icon: Clock3,
    },

    {
      title: 'Departments',
      value:
        animatedStats.departments,
      description:
        'Active departments',
      icon: Users,
    },
  ]

  /*
   * =========================================================
   * HELPERS
   * =========================================================
   */

  const getEmployeeStatus =
    (employee) =>
      employee.employmentStatus ||
      employee.status ||
      'Unknown'

  const getStatusClasses =
    (status) => {
      const normalized =
        String(status).toLowerCase()

      if (
        normalized ===
          'active' ||
        normalized ===
          'present'
      ) {
        return {
          wrapper:
            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',

          dot: 'bg-emerald-500',
        }
      }

      if (
        normalized ===
          'on leave' ||
        normalized === 'leave'
      ) {
        return {
          wrapper:
            'bg-red-50 text-red-600 ring-1 ring-red-100',

          dot: 'bg-red-500',
        }
      }

      if (
        normalized ===
          'absent' ||
        normalized ===
          'inactive'
      ) {
        return {
          wrapper:
            'bg-orange-50 text-orange-600 ring-1 ring-orange-100',

          dot: 'bg-orange-500',
        }
      }

      return {
        wrapper:
          'bg-slate-100 text-slate-600 ring-1 ring-slate-200',

        dot: 'bg-slate-400',
      }
    }

  const avatarColors = [
    'bg-cyan-100 text-cyan-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-orange-100 text-orange-700',
    'bg-blue-100 text-blue-700',
  ]

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="min-h-full bg-[#F7F8FA] p-4 sm:p-6 lg:p-8">
      {/* =====================================================
          SHARED PAGE HEADER
      ===================================================== */}

      <PageTitle
        eyebrow="Welcome to your HR workspace"
        title="HR Dashboard"
        description="Overview of your company's workforce and HR activities."
        action={
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={ArrowUpRight}
            className="group relative overflow-hidden rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_30px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-950 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_25px_rgba(34,211,238,0.25),0_12px_35px_rgba(15,23,42,0.45)]"
          >
            View Reports
          </Button>
        }
        className="animate-page-title mb-8"
      />
      {/* =====================================================
          KPI CARDS
          Animated Total / Active / Leave / Departments
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(
          (stat, statIndex) => {
            const Icon = stat.icon

            const avatarEmployees =
              employees.slice(0, 4)

            const avatarColors = [
              'bg-sky-100 text-sky-700',
              'bg-rose-100 text-rose-700',
              'bg-emerald-100 text-emerald-700',
              'bg-violet-100 text-violet-700',
            ]

            const iconStyles = [
              'bg-violet-50 text-violet-600',
              'bg-emerald-50 text-emerald-600',
              'bg-orange-50 text-orange-500',
              'bg-violet-50 text-violet-600',
            ]

            return (
              <Card
                key={stat.title}
                variant="default"
                className="animate-dashboard-stat group overflow-hidden rounded-[18px] border border-slate-200/70 bg-[#F3F4F6] p-4 shadow-[0_3px_14px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#D5E3EE] hover:bg-[#E8F1F9] hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)]"
                style={{
                  animationDelay: `${
                    statIndex * 120
                  }ms`,
                }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-800">
                    {stat.title}
                  </p>

                  {/* Animated Icon */}
                  <div
                    className={`animate-dashboard-stat-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-colors duration-300 group-hover:bg-[#D7E8F4] group-hover:text-slate-700 ${
                      iconStyles[
                        statIndex
                      ]
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.8}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-[13px] bg-[#E8F1F9] px-3.5 py-3 transition-colors duration-300 group-hover:bg-[#E8F1F9]">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-400">
                        People
                      </p>

                      {/* Animated Number */}
                      <p className="animate-dashboard-stat-value mt-0.5 text-[26px] font-bold leading-none tracking-tight text-slate-950">
                        {stat.value}
                      </p>
                    </div>

                    {avatarEmployees.length >
                      0 && (
                      <div className="flex items-center pb-0.5 pl-2">
                        {avatarEmployees.map(
                          (
                            employee,
                            index
                          ) => {
                            const initials =
                              employee?.initials ||
                              employee?.name
                                ?.split(
                                  ' '
                                )
                                .map(
                                  (
                                    part
                                  ) =>
                                    part[0]
                                )
                                .join('')
                                .slice(
                                  0,
                                  2
                                )
                                .toUpperCase() ||
                              'EM'

                            return (
                              <div
                                key={
                                  employee?.id ||
                                  employee?.employeeId ||
                                  index
                                }
                                className={`relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[8px] font-bold ${
                                  index > 0
                                    ? '-ml-2'
                                    : ''
                                } ${
                                  avatarColors[
                                    index %
                                      avatarColors.length
                                  ]
                                }`}
                                title={
                                  employee?.name ||
                                  'Employee'
                                }
                              >
                                {employee?.photo ||
                                employee?.profileImage ||
                                employee?.avatar ? (
                                  <img
                                    src={
                                      employee.photo ||
                                      employee.profileImage ||
                                      employee.avatar
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  initials
                                )}
                              </div>
                            )
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          }
        )}
      </div>

      {/* =====================================================
          ATTENDANCE + QUICK ACTIONS
      ===================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* ===================================================
            ATTENDANCE STATISTIC
        =================================================== */}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.03)] xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Attendance Statistic
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Daily attendance for the last 7 days.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-violet-600" />

                  <span className="text-[11px] font-medium text-slate-400">
                    Present
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-violet-300" />

                  <span className="text-[11px] font-medium text-slate-400">
                    Absent
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-200" />

                  <span className="text-[11px] font-medium text-slate-400">
                    Leave
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <MoreHorizontal
                size={18}
              />
            </button>
          </div>

          {/* Attendance Chart */}

          <div className="mt-7">
            {attendanceLoading ? (
              <div className="flex h-[300px] items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />

                  Loading attendance...
                </div>
              </div>
            ) : (
              <div className="relative h-[300px]">
                {/* Y Axis */}

                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-12">
                  {[5, 4, 3, 2, 1, 0].map(
                    (level) => {
                      const value =
                        Math.round(
                          (attendanceChartMax /
                            5) *
                            level
                        )

                      return (
                        <div
                          key={level}
                          className="flex items-center gap-2"
                        >
                          <span className="w-7 text-right text-[9px] font-medium text-slate-300">
                            {value}
                          </span>

                          <div className="h-px flex-1 border-t border-dashed border-slate-100" />
                        </div>
                      )
                    }
                  )}
                </div>

                {/* Bars */}

                <div className="absolute inset-0 flex items-end pl-9 pr-2 pb-12">
                  <div className="flex h-full w-full items-end justify-around gap-3">
                    {attendanceChartData.map(
                      (day) => {
                        const total =
                          day.total

                        const totalHeight =
                          attendanceChartMax >
                          0
                            ? Math.min(
                                (total /
                                  attendanceChartMax) *
                                  100,
                                100
                              )
                            : 0

                        const presentHeight =
                          total > 0
                            ? (day.present /
                                total) *
                              100
                            : 0

                        const absentHeight =
                          total > 0
                            ? (day.absent /
                                total) *
                              100
                            : 0

                        const leaveHeight =
                          total > 0
                            ? (day.leave /
                                total) *
                              100
                            : 0

                        return (
                          <div
                            key={
                              day.date
                            }
                            className="group relative flex h-full flex-1 flex-col items-center justify-end"
                          >
                            {/* Tooltip */}

                            <div className="pointer-events-none absolute bottom-[calc(100%-10px)] left-1/2 z-30 hidden w-36 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl group-hover:block">
                              <p className="text-xs font-bold text-slate-900">
                                {
                                  day.dateLabel
                                }
                              </p>

                              <div className="mt-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                                    Present
                                  </span>

                                  <span className="text-[10px] font-bold text-slate-800">
                                    {
                                      day.present
                                    }
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                                    Absent
                                  </span>

                                  <span className="text-[10px] font-bold text-slate-800">
                                    {
                                      day.absent
                                    }
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                                    Leave
                                  </span>

                                  <span className="text-[10px] font-bold text-slate-800">
                                    {
                                      day.leave
                                    }
                                  </span>
                                </div>

                                <div className="mt-2 border-t border-slate-100 pt-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      Total
                                    </span>

                                    <span className="text-[10px] font-bold text-slate-950">
                                      {
                                        day.total
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bar */}

                            <div
                              className="relative flex w-full max-w-[48px] flex-col justify-end overflow-hidden rounded-t-[9px] bg-slate-50 transition-all duration-300 group-hover:bg-slate-100"
                              style={{
                                height:
                                  totalHeight >
                                  0
                                    ? `${totalHeight}%`
                                    : '3px',
                              }}
                            >
                              {leaveHeight >
                                0 && (
                                <div
                                  className="w-full bg-slate-200 transition-all duration-300 group-hover:bg-slate-300"
                                  style={{
                                    height: `${leaveHeight}%`,
                                  }}
                                />
                              )}

                              {absentHeight >
                                0 && (
                                <div
                                  className="w-full bg-violet-200 transition-all duration-300 group-hover:bg-violet-300"
                                  style={{
                                    height: `${absentHeight}%`,
                                  }}
                                />
                              )}

                              {presentHeight >
                                0 && (
                                <div
                                  className="w-full rounded-t-[9px] bg-violet-600 transition-all duration-300 group-hover:bg-violet-700"
                                  style={{
                                    height: `${presentHeight}%`,
                                  }}
                                />
                              )}
                            </div>

                            {/* Day Label */}

                            <span className="mt-3 text-[10px] font-semibold text-slate-400">
                              {day.day}
                            </span>

                            <span className="mt-0.5 text-[9px] text-slate-300">
                              {
                                day.dateLabel
                              }
                            </span>
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <h2 className="text-lg font-bold text-slate-950">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Common HR tasks.
          </p>

          <div className="mt-5 space-y-3">
            <a
              href="/hr-manager/employees"
              className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition-all hover:border-cyan-200 hover:bg-cyan-50/40"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Manage Employees
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View and manage employee records
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-600"
              />
            </a>

            <a
              href="/hr-manager/attendance"
              className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition-all hover:border-cyan-200 hover:bg-cyan-50/40"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Attendance
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Review attendance records
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-600"
              />
            </a>

            <a
              href="/hr-manager/leave"
              className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition-all hover:border-cyan-200 hover:bg-cyan-50/40"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Leave Requests
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Review employee leave
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-600"
              />
            </a>
          </div>
        </section>
      </div>

      {/* =====================================================
          EMPLOYEE STATISTICS + RECENT EMPLOYEES
      ===================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ===================================================
            EMPLOYEE STATISTICS
        =================================================== */}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Employee Statistics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Workforce distribution by department.
              </p>
            </div>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <MoreHorizontal
                size={18}
              />
            </button>
          </div>

          {/* Department distribution chart */}

          <div className="mt-7 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <DonutChart
              data={departmentStats}
              valueKey="count"
              nameKey="name"
              colors={departmentColors}
              size={208}
              strokeWidth={18}
              centerValue={totalEmployees}
              centerLabel="Employees"
            />
          </div>

          {/* Department Legend */}

          <div className="mt-7 space-y-3">
            {departmentStats.length ===
            0 ? (
              <p className="text-center text-sm text-slate-400">
                No department data available.
              </p>
            ) : (
              departmentStats
                .slice(0, 5)
                .map(
                  (
                    department,
                    index
                  ) => (
                    <div
                      key={
                        department.name
                      }
                      className="flex items-center justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              departmentColors[
                                index %
                                  departmentColors.length
                              ],
                          }}
                        />

                        <span className="truncate text-xs font-medium text-slate-600">
                          {
                            department.name
                          }
                        </span>
                      </div>

                      <span className="ml-3 text-xs font-bold text-slate-800">
                        {
                          department.percentage
                        }
                        %
                      </span>
                    </div>
                  )
                )
            )}
          </div>

          {/* Workforce Performance */}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <span className="absolute inset-0 animate-performance-icon rounded-lg bg-emerald-400/20" />

                  <TrendingUp
                    size={15}
                    className="relative z-10 animate-performance-icon-symbol"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Workforce Performance
                  </p>

                  <p className="text-[11px] text-slate-400">
                    Based on current employee status
                  </p>
                </div>
              </div>

              <span className="animate-performance-percentage text-sm font-bold text-emerald-600">
                {activePercentage}%
              </span>
            </div>

            <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="relative h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-out"
                style={{
                  width: `${activePercentage}%`,
                }}
              >
                <span className="absolute inset-y-0 right-0 w-16 animate-performance-shine bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {activeEmployees}{' '}
                active employees
              </span>

              <span>
                {leavePercentage}% on leave
              </span>
            </div>
          </div>
        </section>

        {/* ===================================================
            RECENT EMPLOYEES
        =================================================== */}

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Recent Employees
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Employees currently available in the shared data.
              </p>
            </div>

            <a
              href="/hr-manager/employees"
              className="hidden items-center gap-1 text-sm font-semibold text-cyan-600 transition hover:text-cyan-700 sm:flex"
            >
              View all

              <ArrowUpRight
                size={15}
              />
            </a>
          </div>

          {employees.length ===
          0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users size={20} />
              </div>

              <p className="mt-3 text-sm font-medium text-slate-700">
                No employee records available
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Employee records will appear here once available.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Employee
                    </th>

                    <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Department
                    </th>

                    <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Position
                    </th>

                    <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="w-10 px-4 py-3.5" />
                  </tr>
                </thead>

                <tbody>
                  {employees
                    .slice(0, 5)
                    .map(
                      (
                        employee,
                        index
                      ) => {
                        const status =
                          getEmployeeStatus(
                            employee
                          )

                        const statusClasses =
                          getStatusClasses(
                            status
                          )

                        const initials =
                          employee.initials ||
                          employee.name
                            ?.split(
                              ' '
                            )
                            .map(
                              (
                                part
                              ) =>
                                part[0]
                            )
                            .join('')
                            .slice(
                              0,
                              2
                            )
                            .toUpperCase() ||
                          'EM'

                        return (
                          <tr
                            key={
                              employee.id ||
                              employee.employeeId ||
                              index
                            }
                            className="group border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/70"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    avatarColors[
                                      index %
                                        avatarColors.length
                                    ]
                                  }`}
                                >
                                  {
                                    initials
                                  }
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {employee.name ||
                                      'Unnamed Employee'}
                                  </p>

                                  <p className="mt-0.5 truncate text-xs text-slate-400">
                                    {employee.employeeId ||
                                      employee.id ||
                                      'Employee ID unavailable'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span className="text-sm font-medium text-slate-600">
                                {employee.department ||
                                  '-'}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <span className="text-sm text-slate-500">
                                {employee.jobTitle ||
                                  '-'}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                status={status}
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold"
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${statusClasses.dot}`}
                                />
                                {status}
                              </Badge>
                            </td>

                            <td className="px-4 py-4">
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-white hover:text-slate-600 group-hover:opacity-100"
                                aria-label={`More options for ${
                                  employee.name ||
                                  'employee'
                                }`}
                              >
                                <MoreHorizontal
                                  size={17}
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      }
                    )}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-6 py-4 sm:hidden">
            <a
              href="/hr-manager/employees"
              className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600"
            >
              View all employees

              <ArrowUpRight
                size={15}
              />
            </a>
          </div>
        </section>
      </div>
      <style>{`
        @keyframes dashboardHeaderIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes dashboardButtonIn {
          0% { opacity: 0; transform: translateY(-8px) scale(0.98); }
          60% { opacity: 1; transform: translateY(2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes dashboardStatIn {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes dashboardIconIn {
          0% { opacity: 0; transform: scale(0.72) rotate(-8deg); }
          70% { opacity: 1; transform: scale(1.08) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }

        @keyframes dashboardValueIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes dashboardPanelIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes dashboardBarGrow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }

        .animate-dashboard-stat:hover {
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.09);
        }

        @keyframes reportGlow {
          0%, 100% { opacity: 0.35; transform: scale(0.96); }
          50% { opacity: 0.75; transform: scale(1.04); }
        }

        @keyframes reportBorder {
          from { transform: translateX(-70%); }
          to { transform: translateX(70%); }
        }

        @keyframes performanceIcon {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.12); opacity: 1; }
        }

        @keyframes performanceIconSymbol {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }

        @keyframes performancePercentage {
          0% { opacity: 0.45; transform: translateX(4px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes performanceShine {
          from { transform: translateX(-120%); }
          to { transform: translateX(220%); }
        }

        .animate-dashboard-header {
          animation: dashboardHeaderIn 420ms cubic-bezier(.22, 1, .36, 1) both;
        }

        .animate-dashboard-stat {
          opacity: 0;
          animation: dashboardStatIn 460ms cubic-bezier(.22, 1, .36, 1) both;
        }

        .animate-dashboard-stat-icon {
          animation: dashboardIconIn 520ms cubic-bezier(.22, 1, .36, 1) 220ms both;
        }

        .animate-dashboard-stat-value {
          animation: dashboardValueIn 420ms ease-out 260ms both;
        }

        .animate-dashboard-content {
          animation: dashboardPanelIn 500ms cubic-bezier(.22, 1, .36, 1) 420ms both;
        }

        .animate-dashboard-panel {
          animation: dashboardPanelIn 520ms cubic-bezier(.22, 1, .36, 1) 520ms both;
        }

        .animate-dashboard-bar {
          animation: dashboardBarGrow 700ms cubic-bezier(.22, 1, .36, 1) both;
          transform-origin: bottom;
        }

        .animate-report-glow {
          animation: reportGlow 2.8s ease-in-out infinite;
        }

        .animate-report-border {
          animation: reportBorder 3.2s linear infinite;
        }

        .animate-performance-icon {
          animation: performanceIcon 2.2s ease-in-out infinite;
        }

        .animate-performance-icon-symbol {
          animation: performanceIconSymbol 1.8s ease-in-out infinite;
        }

        .animate-performance-percentage {
          animation: performancePercentage 600ms ease-out 700ms both;
        }

        .animate-performance-shine {
          animation: performanceShine 2.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-dashboard-header,
          .animate-dashboard-stat,
          .animate-dashboard-stat-icon,
          .animate-dashboard-stat-value,
          .animate-dashboard-content,
          .animate-dashboard-panel,
          .animate-dashboard-bar,
          .animate-report-glow,
          .animate-report-border,
          .animate-performance-icon,
          .animate-performance-icon-symbol,
          .animate-performance-percentage,
          .animate-performance-shine {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default HRDashboard