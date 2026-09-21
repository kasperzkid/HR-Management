import prisma from '../db.js'

// Attendance.status can be stored either as a grid code ("P", "A", "AL", …)
// or as the full label ("Present", "Absent", "Annual Leave", …). Normalise
// to the grid code so summaries count both consistently.
function normalizeAttendanceCode(status) {
  if (!status) return null

  const value = String(status).trim()

  if (/^(P|A|SL|AL|ML|OL|PH|WK|HD|null)$/.test(value)) {
    return value
  }

  const lower = value.toLowerCase()

  if (lower.includes('present')) return 'P'
  if (lower.includes('absent')) return 'A'
  if (lower.includes('sick')) return 'SL'
  if (lower.includes('annual')) return 'AL'
  if (lower.includes('matern')) return 'ML'
  if (lower.includes('other')) return 'OL'
  if (lower.includes('public holiday')) return 'PH'
  if (lower.includes('weekend')) return 'WK'
  if (lower.includes('half')) return 'HD'
  if (lower.includes('emergency')) return 'P'

  return null
}

// ============================================================
// HR REPORTS
// Based on the Dashboard/reporting logic in the
// Ethiopia_HR_Payroll_System workbook.
//
// The workbook does not contain a separate "HR Reports" sheet.
// Its Dashboard sheet is the report specification, so this API
// exposes the same database-backed metrics and validation checks.
// ============================================================

function getCurrentMonth() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthRange(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '')

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthNumber = Number(match[2])

  if (monthNumber < 1 || monthNumber > 12) {
    return null
  }

  const lastDay = new Date(
    Date.UTC(year, monthNumber, 0),
  ).getUTCDate()

  return {
    start: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
    end: `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

function toNumber(value) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

function roundMoney(value) {
  return Number(toNumber(value).toFixed(2))
}

function calculateAnnualLeaveEntitlement(
  joinDate,
  asOfDate = new Date(),
) {
  if (!joinDate) {
    return 0
  }

  const joined = new Date(`${joinDate}T00:00:00`)

  if (Number.isNaN(joined.getTime())) {
    return 0
  }

  const asOf = new Date(asOfDate)

  if (
    Number.isNaN(asOf.getTime()) ||
    joined > asOf
  ) {
    return 0
  }

  let years =
    asOf.getFullYear() -
    joined.getFullYear()

  let months =
    years * 12 +
    (asOf.getMonth() - joined.getMonth())

  if (asOf.getDate() < joined.getDate()) {
    months -= 1
  }

  if (months < 0) {
    return 0
  }

  // Workbook formula:
  // first year = 16 days prorated by completed months;
  // after year one = 16 + floor((completed years - 1) / 2).
  if (months < 12) {
    return Number(
      (16 * (months / 12)).toFixed(1),
    )
  }

  years = Math.floor(months / 12)

  return (
    16 +
    Math.floor((years - 1) / 2)
  )
}

function incrementMap(
  map,
  key,
  amount = 1,
) {
  const normalizedKey =
    key || 'Unassigned'

  map.set(
    normalizedKey,
    (map.get(normalizedKey) || 0) +
      amount,
  )
}

function countDuplicateValues(
  items,
  valueSelector,
) {
  const counts = new Map()

  for (const item of items) {
    const value = String(
      valueSelector(item) || '',
    ).trim()

    if (!value) {
      continue
    }

    counts.set(
      value,
      (counts.get(value) || 0) + 1,
    )
  }

  let duplicates = 0

  for (const count of counts.values()) {
    if (count > 1) {
      duplicates += count
    }
  }

  return duplicates
}

function rangesOverlap(
  leftStart,
  leftEnd,
  rightStart,
  rightEnd,
) {
  return (
    leftStart <= rightEnd &&
    rightStart <= leftEnd
  )
}

// ============================================================
// GET HR REPORTS
// ============================================================

export async function getHRReports(
  req,
  res,
) {
  try {
    const payrollMonth =
      req.query.payrollMonth ||
      getCurrentMonth()

    const attendanceMonth =
      req.query.attendanceMonth ||
      payrollMonth

    const range =
      getMonthRange(attendanceMonth)

    if (!range) {
      return res.status(400).json({
        message:
          'Month must use YYYY-MM format.',
      })
    }

    const today = new Date()

    const todayKey =
      today.toISOString().slice(0, 10)

    // ========================================================
    // IMPORTANT:
    // Attendance.date is a STRING in Prisma.
    //
    // Therefore range.start and range.end are
    // YYYY-MM-DD strings, NOT JavaScript Date objects.
    // ========================================================

    const [
      employees,
      attendance,
      payroll,
      leaveRequests,
    ] = await Promise.all([
      // ------------------------------------------------------
      // EMPLOYEES
      // ------------------------------------------------------
      prisma.employee.findMany({
        orderBy: {
          name: 'asc',
        },
      }),

      // ------------------------------------------------------
      // ATTENDANCE
      //
      // Attendance.date is String.
      // ------------------------------------------------------
      prisma.attendance.findMany({
        where: {
          date: {
            gte: range.start,
            lte: range.end,
          },
        },
        orderBy: [
          {
            date: 'asc',
          },
          {
            employeeName: 'asc',
          },
        ],
      }),

      // ------------------------------------------------------
      // PAYROLL
      // ------------------------------------------------------
      prisma.payrollRecord.findMany({
        where: {
          payrollMonth,
        },
        orderBy: {
          employeeName: 'asc',
        },
      }),

      // ------------------------------------------------------
      // LEAVE
      // ------------------------------------------------------
      prisma.leaveRequest.findMany({
        orderBy: [
          {
            startDate: 'asc',
          },
          {
            employeeName: 'asc',
          },
        ],
      }),
    ])

    // ========================================================
    // ACTIVE EMPLOYEES
    // ========================================================

    const activeEmployees =
      employees.filter(
        (employee) =>
          employee.employmentStatus ===
          'Active',
      )

    const activeEmployeeIds =
      new Set(
        activeEmployees.map(
          (employee) =>
            String(employee.id),
        ),
      )

    const activeEmployeeBusinessIds =
      new Set(
        activeEmployees.map(
          (employee) =>
            String(employee.employeeId),
        ),
      )

    // ========================================================
    // EMPLOYEE LOOKUP
    // Supports both Prisma database ID and
    // business Employee ID.
    // ========================================================

    const employeeByAnyId = new Map()

    for (const employee of employees) {
      employeeByAnyId.set(
        String(employee.id),
        employee,
      )

      employeeByAnyId.set(
        String(employee.employeeId),
        employee,
      )
    }

    // ========================================================
    // ACTIVE PAYROLL
    // ========================================================

    const activePayroll =
      payroll.filter((record) => {
        const employee =
          employeeByAnyId.get(
            String(record.employeeId),
          )

        return employee
          ? employee.employmentStatus ===
              'Active'
          : activeEmployeeIds.has(
                String(
                  record.employeeId,
                ),
              ) ||
              activeEmployeeBusinessIds.has(
                String(
                  record.employeeId,
                ),
              )
      })

    // ========================================================
    // DASHBOARD KEY METRICS
    // ========================================================

    const totalMonthlyGrossPayroll =
      activePayroll.reduce(
        (sum, record) =>
          sum +
          toNumber(
            record.grossSalary,
          ),
        0,
      )

    const totalIncomeTax =
      activePayroll.reduce(
        (sum, record) =>
          sum +
          toNumber(
            record.incomeTax,
          ),
        0,
      )

    const totalEmployeePension =
      activePayroll.reduce(
        (sum, record) =>
          sum +
          toNumber(
            record.pensionDeduction,
          ),
        0,
      )

    const totalNetPayroll =
      activePayroll.reduce(
        (sum, record) =>
          sum +
          toNumber(
            record.netSalary,
          ),
        0,
      )

    // ========================================================
    // TOTAL OVERTIME HOURS
    // Comes from Attendance.
    // ========================================================

    const totalOvertimeHours =
      attendance.reduce(
        (sum, record) =>
          sum +
          toNumber(
            record.overtime,
          ),
        0,
      )

    // ========================================================
    // ABSENT TODAY
    // ========================================================

    const absentToday =
      attendance.filter(
        (record) =>
          record.date === todayKey &&
          normalizeAttendanceCode(
            record.status,
          ) === 'A',
      ).length

    // ========================================================
    // HEADCOUNT BY DEPARTMENT
    // Active employees only.
    // ========================================================

    const departmentCounts =
      new Map()

    for (const employee of activeEmployees) {
      incrementMap(
        departmentCounts,
        employee.department,
      )
    }

    const headcountByDepartment =
      Array.from(
        departmentCounts.entries(),
      )
        .map(
          ([department, count]) => ({
            department,
            count,
          }),
        )
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.department.localeCompare(
              b.department,
            ),
        )

    // ========================================================
    // ANNUAL LEAVE UTILIZATION
    // Workbook calculates entitlement from Join Date
    // and approved Annual Leave.
    // ========================================================

    const approvedAnnualLeaveByEmployee =
      new Map()

    for (const request of leaveRequests) {
      if (
        request.approvalStatus !==
          'Approved' ||
        request.leaveType !==
          'Annual Leave'
      ) {
        continue
      }

      incrementMap(
        approvedAnnualLeaveByEmployee,
        String(request.employeeId),
        toNumber(request.days),
      )
    }

    let entitlementTotal = 0
    let takenTotal = 0

    for (const employee of activeEmployees) {
      const entitlement =
        calculateAnnualLeaveEntitlement(
          employee.joinDate,
        )

      const taken =
        approvedAnnualLeaveByEmployee.get(
          String(employee.id),
        ) ||
        approvedAnnualLeaveByEmployee.get(
          String(employee.employeeId),
        ) ||
        0

      entitlementTotal +=
        entitlement

      takenTotal += taken
    }

    const avgAnnualLeaveUtilization =
      entitlementTotal > 0
        ? roundMoney(
            (takenTotal /
              entitlementTotal) *
              100,
          )
        : null

    // ========================================================
    // DATA VALIDATION / ALERTS
    // ========================================================

    const duplicateEmployeeIds =
      countDuplicateValues(
        employees,
        (employee) =>
          employee.employeeId,
      )

    const duplicateTins =
      countDuplicateValues(
        employees,
        (employee) =>
          employee.tin,
      )

    const activeMissingBasicSalary =
      activeEmployees.filter(
        (employee) =>
          employee.basicSalary ===
            null ||
          employee.basicSalary ===
            undefined ||
          employee.basicSalary ===
            '',
      ).length

    const activeMissingBankAccount =
      activeEmployees.filter(
        (employee) =>
          !String(
            employee.bankAccount || '',
          ).trim(),
      ).length

    const activeMissingTin =
      activeEmployees.filter(
        (employee) =>
          !String(
            employee.tin || '',
          ).trim(),
      ).length

    const negativeSalaryValues =
      employees.filter(
        (employee) =>
          Number(
            employee.basicSalary,
          ) < 0,
      ).length

    const invalidLeaveDateRanges =
      leaveRequests.filter(
        (request) =>
          request.startDate &&
          request.endDate &&
          request.endDate <
            request.startDate,
      ).length

    // ========================================================
    // APPROVED LEAVE OVERLAP CHECK
    // ========================================================

    const approvedLeave =
      leaveRequests.filter(
        (request) =>
          request.approvalStatus ===
          'Approved',
      )

    const approvedLeaveByEmployee =
      new Map()

    for (const request of approvedLeave) {
      const employeeKey =
        String(request.employeeId)

      const existing =
        approvedLeaveByEmployee.get(
          employeeKey,
        ) || []

      existing.push(request)

      approvedLeaveByEmployee.set(
        employeeKey,
        existing,
      )
    }

    let overlappingApprovedLeave = 0

    for (const requests of approvedLeaveByEmployee.values()) {
      for (
        let index = 0;
        index < requests.length;
        index += 1
      ) {
        for (
          let otherIndex =
            index + 1;
          otherIndex <
          requests.length;
          otherIndex += 1
        ) {
          const left =
            requests[index]

          const right =
            requests[otherIndex]

          if (
            left.startDate &&
            left.endDate &&
            right.startDate &&
            right.endDate &&
            rangesOverlap(
              left.startDate,
              left.endDate,
              right.startDate,
              right.endDate,
            )
          ) {
            overlappingApprovedLeave += 1
          }
        }
      }
    }

    // ========================================================
    // INACTIVE EMPLOYEES IN PAYROLL
    // ========================================================

    const inactiveEmployeesInPayroll =
      payroll.filter((record) => {
        const employee =
          employeeByAnyId.get(
            String(record.employeeId),
          )

        return (
          employee &&
          employee.employmentStatus !==
            'Active'
        )
      }).length

    // ========================================================
    // EMPLOYEES WITHOUT ATTENDANCE
    // ========================================================

    const attendanceEmployeeIds =
      new Set(
        attendance.map(
          (record) =>
            String(record.employeeId),
        ),
      )

    const employeesWithoutAttendance =
      activeEmployees.filter(
        (employee) =>
          !attendanceEmployeeIds.has(
            String(employee.id),
          ) &&
          !attendanceEmployeeIds.has(
            String(
              employee.employeeId,
            ),
          ),
      ).length

    // ========================================================
    // ALERT OBJECT
    // ========================================================

    const alerts = {
      duplicateEmployeeIds,
      duplicateTins,
      activeEmployeesMissingBasicSalary:
        activeMissingBasicSalary,
      activeEmployeesMissingBankAccount:
        activeMissingBankAccount,
      activeEmployeesMissingTin:
        activeMissingTin,
      negativeSalaryValues,
      invalidLeaveDateRanges,
      overlappingApprovedLeave,
      inactiveEmployeesInPayroll,
      employeesWithoutAttendance,
    }

    const alertTotal =
      Object.values(alerts).reduce(
        (sum, value) =>
          sum +
          Number(value || 0),
        0,
      )

    // ========================================================
    // ATTENDANCE SUMMARY BY EMPLOYEE
    // ========================================================

    const attendanceByEmployee =
      new Map()

    for (const record of attendance) {
      const key =
        String(record.employeeId)

      const summary =
        attendanceByEmployee.get(
          key,
        ) || {
          present: 0,
          absent: 0,
          leave: 0,
          overtimeHours: 0,
          lateMinutes: 0,
        }

      const code = normalizeAttendanceCode(record.status)

      if (
        code === 'P' ||
        code === 'HD'
      ) {
        summary.present += 1
      }

      if (
        code === 'A'
      ) {
        summary.absent += 1
      }

      if (
        [
          'SL',
          'AL',
          'ML',
          'OL',
        ].includes(
          code,
        )
      ) {
        summary.leave += 1
      }

      summary.overtimeHours +=
        toNumber(
          record.overtime,
        )

      summary.lateMinutes +=
        toNumber(
          record.late,
        )

      attendanceByEmployee.set(
        key,
        summary,
      )
    }

    // ========================================================
    // PAYROLL SUMMARY BY EMPLOYEE
    // ========================================================

    const payrollByEmployee =
      new Map(
        activePayroll.map(
          (record) => [
            String(
              record.employeeId,
            ),
            record,
          ],
        ),
      )

    // ========================================================
    // EMPLOYEE REPORT ROWS
    // ========================================================

    const employeeRows =
      activeEmployees.map(
        (employee) => {
          const attendanceSummary =
            attendanceByEmployee.get(
              String(employee.id),
            ) ||
            attendanceByEmployee.get(
              String(
                employee.employeeId,
              ),
            ) || {
              present: 0,
              absent: 0,
              leave: 0,
              overtimeHours: 0,
              lateMinutes: 0,
            }

          const payrollRecord =
            payrollByEmployee.get(
              String(employee.id),
            ) ||
            payrollByEmployee.get(
              String(
                employee.employeeId,
              ),
            ) ||
            null

          return {
            // Full employee record (contact, banking, identity, allowances,
            // dates, …) so report screens can render a detailed directory.
            ...employee,

            employeeId:
              employee.employeeId,

            name: employee.name,

            department:
              employee.department,

            employmentType:
              employee.employmentType,

            employmentStatus:
              employee.employmentStatus,

            basicSalary:
              roundMoney(
                employee.basicSalary,
              ),

            attendance:
              attendanceSummary,

            payroll: payrollRecord
              ? {
                  payrollMonth:
                    payrollRecord.payrollMonth,

                  grossSalary:
                    roundMoney(
                      payrollRecord.grossSalary,
                    ),

                  overtimePay:
                    roundMoney(
                      payrollRecord.overtimePay,
                    ),

                  overtimeHours:
                    roundMoney(
                      attendanceSummary.overtimeHours,
                    ),

                  incomeTax:
                    roundMoney(
                      payrollRecord.incomeTax,
                    ),

                  pensionDeduction:
                    roundMoney(
                      payrollRecord.pensionDeduction,
                    ),

                  totalDeductions:
                    roundMoney(
                      payrollRecord.totalDeductions,
                    ),

                  netSalary:
                    roundMoney(
                      payrollRecord.netSalary,
                    ),

                  employerPension:
                    roundMoney(
                      payrollRecord.employerPension,
                    ),

                  employerCost:
                    roundMoney(
                      payrollRecord.employerCost,
                    ),
                }
              : null,
          }
        },
      )

    // ========================================================
    // RESPONSE
    // ========================================================

    res.json({
      period: {
        payrollMonth,
        attendanceMonth,
        attendanceStartDate:
          range.start,
        attendanceEndDate:
          range.end,
      },

      metrics: {
        totalEmployees:
          employees.length,

        activeEmployees:
          activeEmployees.length,

        employeesOnLeave:
          employees.filter(
            (employee) =>
              employee.employmentStatus ===
              'On Leave',
          ).length,

        absentToday,

        totalMonthlyGrossPayroll:
          roundMoney(
            totalMonthlyGrossPayroll,
          ),

        totalIncomeTax:
          roundMoney(
            totalIncomeTax,
          ),

        totalEmployeePension:
          roundMoney(
            totalEmployeePension,
          ),

        totalNetPayroll:
          roundMoney(
            totalNetPayroll,
          ),

        totalOvertimeHours:
          roundMoney(
            totalOvertimeHours,
          ),

        avgAnnualLeaveUtilization,
      },

      departmentHeadcount:
        headcountByDepartment,

      alerts,

      alertTotal,

      employees: employeeRows,
    })
  } catch (error) {
    console.error(
      'Get HR reports error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to generate HR reports',
    })
  }
}