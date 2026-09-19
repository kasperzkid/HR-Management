import crypto from 'node:crypto'
import prisma from '../db.js'

// ============================================================
// DASHBOARD
// ============================================================

export async function getDashboard(req, res) {
  try {
    const [
      totalEmployees,
      activeEmployees,
      employeesOnLeave,
      departments,
    ] = await Promise.all([
      prisma.employee.count(),

      prisma.employee.count({
        where: {
          employmentStatus: 'Active',
        },
      }),

      prisma.employee.count({
        where: {
          employmentStatus: 'On Leave',
        },
      }),

      prisma.employee.findMany({
        select: {
          department: true,
        },
        distinct: ['department'],
      }),
    ])

    res.json({
      totalEmployees,
      activeEmployees,
      employeesOnLeave,
      departments: departments.length,
    })
  } catch (error) {
    console.error('Get dashboard error:', error)

    res.status(500).json({
      message: 'Failed to load HR dashboard',
    })
  }
}

// ============================================================
// EMPLOYEES
// ============================================================

export async function getEmployees(req, res) {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json(employees)
  } catch (error) {
    console.error('Get employees error:', error)

    res.status(500).json({
      message: 'Failed to load employees',
    })
  }
}

export async function getEmployee(req, res) {
  try {
    const { id } = req.params

    const employee = await prisma.employee.findUnique({
      where: {
        id,
      },
    })

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    res.json(employee)
  } catch (error) {
    console.error('Get employee error:', error)

    res.status(500).json({
      message: 'Failed to load employee',
    })
  }
}

export async function createEmployee(req, res) {
  try {
    const data = req.body

    if (!data.employeeId || !data.name) {
      return res.status(400).json({
        message: 'Employee ID and name are required',
      })
    }

    const existing = await prisma.employee.findUnique({
      where: {
        employeeId: data.employeeId,
      },
    })

    if (existing) {
      return res.status(409).json({
        message: 'Employee ID already exists',
      })
    }

    const employee = await prisma.employee.create({
      data: {
        id: data.id || crypto.randomUUID(),
        employeeId: data.employeeId,
        name: data.name,
        gender: data.gender || '',
        dateOfBirth: data.dateOfBirth || '',
        joinDate: data.joinDate || '',
        jobTitle: data.jobTitle || '',
        department: data.department || '',
        employmentType: data.employmentType || '',

        basicSalary:
          Number(data.basicSalary) || 0,

        transportAllowance:
          Number(data.transportAllowance) || 0,

        housingAllowance:
          Number(data.housingAllowance) || 0,

        mealAllowance:
          Number(data.mealAllowance) || 0,

        otherAllowance:
          Number(data.otherAllowance) || 0,

        otherDeductions:
          Number(data.otherDeductions) || 0,

        loanDeductions:
          Number(data.loanDeductions) || 0,

        bankName:
          data.bankName || '',

        bankAccount:
          data.bankAccount || '',

        tin:
          data.tin || '',

        pensionId:
          data.pensionId || '',

        phone:
          data.phone || '',

        email:
          data.email || '',

        address:
          data.address || '',

        emergencyContact:
          data.emergencyContact || '',

        employmentStatus:
          data.employmentStatus || '',

        exitDate:
          data.exitDate || null,

        notes:
          data.notes || '',

        status:
          data.status || '',

        avatar:
          data.avatar || '',

        location:
          data.location || '',

        salary:
          Number(data.salary) || 0,

        manager:
          data.manager || '',

        roleType:
          data.roleType || '',

        initials:
          data.initials || '',
      },
    })

    res.status(201).json(employee)
  } catch (error) {
    console.error('Create employee error:', error)

    res.status(500).json({
      message: 'Failed to create employee',
    })
  }
}

export async function updateEmployee(req, res) {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.employee.findUnique({
      where: {
        id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    if (
      data.employeeId &&
      data.employeeId !== existing.employeeId
    ) {
      const duplicate = await prisma.employee.findUnique({
        where: {
          employeeId: data.employeeId,
        },
      })

      if (duplicate) {
        return res.status(409).json({
          message: 'Employee ID already exists',
        })
      }
    }

    const employee = await prisma.employee.update({
      where: {
        id,
      },

      data: {
        employeeId:
          data.employeeId ??
          existing.employeeId,

        name:
          data.name ??
          existing.name,

        gender:
          data.gender ??
          existing.gender,

        dateOfBirth:
          data.dateOfBirth ??
          existing.dateOfBirth,

        joinDate:
          data.joinDate ??
          existing.joinDate,

        jobTitle:
          data.jobTitle ??
          existing.jobTitle,

        department:
          data.department ??
          existing.department,

        employmentType:
          data.employmentType ??
          existing.employmentType,

        basicSalary:
          data.basicSalary !== undefined
            ? Number(data.basicSalary) || 0
            : existing.basicSalary,

        transportAllowance:
          data.transportAllowance !== undefined
            ? Number(data.transportAllowance) || 0
            : existing.transportAllowance,

        housingAllowance:
          data.housingAllowance !== undefined
            ? Number(data.housingAllowance) || 0
            : existing.housingAllowance,

        mealAllowance:
          data.mealAllowance !== undefined
            ? Number(data.mealAllowance) || 0
            : existing.mealAllowance,

        otherAllowance:
          data.otherAllowance !== undefined
            ? Number(data.otherAllowance) || 0
            : existing.otherAllowance,

        otherDeductions:
          data.otherDeductions !== undefined
            ? Number(data.otherDeductions) || 0
            : existing.otherDeductions,

        loanDeductions:
          data.loanDeductions !== undefined
            ? Number(data.loanDeductions) || 0
            : existing.loanDeductions,

        bankName:
          data.bankName ??
          existing.bankName,

        bankAccount:
          data.bankAccount ??
          existing.bankAccount,

        tin:
          data.tin ??
          existing.tin,

        pensionId:
          data.pensionId ??
          existing.pensionId,

        phone:
          data.phone ??
          existing.phone,

        email:
          data.email ??
          existing.email,

        address:
          data.address ??
          existing.address,

        emergencyContact:
          data.emergencyContact ??
          existing.emergencyContact,

        employmentStatus:
          data.employmentStatus ??
          existing.employmentStatus,

        exitDate:
          data.exitDate !== undefined
            ? data.exitDate || null
            : existing.exitDate,

        notes:
          data.notes ??
          existing.notes,

        status:
          data.status ??
          existing.status,

        avatar:
          data.avatar ??
          existing.avatar,

        location:
          data.location ??
          existing.location,

        manager:
          data.manager ??
          existing.manager,

        roleType:
          data.roleType ??
          existing.roleType,

        initials:
          data.initials ??
          existing.initials,

        salary:
          data.salary !== undefined
            ? Number(data.salary) || 0
            : existing.salary,
      },
    })

    res.json(employee)
  } catch (error) {
    console.error('Update employee error:', error)

    res.status(500).json({
      message: 'Failed to update employee',
    })
  }
}

export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params

    const employee = await prisma.employee.findUnique({
      where: {
        id,
      },
    })

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    await prisma.employee.delete({
      where: {
        id,
      },
    })

    res.json({
      message: 'Employee deleted successfully',
    })
  } catch (error) {
    console.error('Delete employee error:', error)

    res.status(500).json({
      message: 'Failed to delete employee',
    })
  }
}

// ============================================================
// ATTENDANCE
// ============================================================

export async function getAttendance(req, res) {
  try {
    const {
      date,
      startDate,
      endDate,
    } = req.query

    let where = {}

    if (date) {
      where = {
        date,
      }
    }

    if (startDate || endDate) {
      const dateFilter = {}

      if (startDate) {
        dateFilter.gte = startDate
      }

      if (endDate) {
        dateFilter.lte = endDate
      }

      where = {
        date: dateFilter,
      }
    }

    const attendance =
      await prisma.attendance.findMany({
        where,

        orderBy: [
          {
            date: 'asc',
          },
          {
            employeeName: 'asc',
          },
        ],
      })

    res.json(attendance)
  } catch (error) {
    console.error('Get attendance error:', error)

    res.status(500).json({
      message: 'Failed to load attendance records',
    })
  }
}

export async function getAttendanceRecord(req, res) {
  try {
    const { id } = req.params

    const attendance =
      await prisma.attendance.findUnique({
        where: {
          id,
        },
      })

    if (!attendance) {
      return res.status(404).json({
        message: 'Attendance record not found',
      })
    }

    res.json(attendance)
  } catch (error) {
    console.error(
      'Get attendance record error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load attendance record',
    })
  }
}

export async function createAttendance(req, res) {
  try {
    const {
      employeeId,
      employeeName,
      department,
      date,
      status,
      checkIn,
      checkOut,
      late,
      earlyDeparture,
      regular,
      overtime,
    } = req.body

    if (
      !employeeId ||
      !date ||
      !status
    ) {
      return res.status(400).json({
        message:
          'Employee, date, and status are required',
      })
    }

    const existing =
      await prisma.attendance.findFirst({
        where: {
          employeeId,
          date,
        },
      })

    if (existing) {
      return res.status(409).json({
        message:
          'Attendance record already exists for this employee and date',
        record: existing,
      })
    }

    const attendance =
      await prisma.attendance.create({
        data: {
          id: crypto.randomUUID(),

          employeeId,

          employeeName:
            employeeName || '',

          department:
            department || '',

          date,

          status,

          checkIn:
            checkIn || null,

          checkOut:
            checkOut || null,

          late:
            Number(late) || 0,

          earlyDeparture:
            Number(earlyDeparture) || 0,

          regular:
            Number(regular) || 0,

          overtime:
            Number(overtime) || 0,
        },
      })

    res.status(201).json(attendance)
  } catch (error) {
    console.error(
      'Create attendance error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to create attendance record',
    })
  }
}

export async function updateAttendance(req, res) {
  try {
    const { id } = req.params

    const {
      employeeId,
      employeeName,
      department,
      date,
      status,
      checkIn,
      checkOut,
      late,
      earlyDeparture,
      regular,
      overtime,
    } = req.body

    if (
      !employeeId ||
      !date ||
      !status
    ) {
      return res.status(400).json({
        message:
          'Employee, date, and status are required',
      })
    }

    const existing =
      await prisma.attendance.findUnique({
        where: {
          id,
        },
      })

    if (!existing) {
      return res.status(404).json({
        message:
          'Attendance record not found',
      })
    }

    const duplicate =
      await prisma.attendance.findFirst({
        where: {
          employeeId,
          date,
          NOT: {
            id,
          },
        },
      })

    if (duplicate) {
      return res.status(409).json({
        message:
          'Another attendance record already exists for this employee and date',
      })
    }

    const attendance =
      await prisma.attendance.update({
        where: {
          id,
        },

        data: {
          employeeId,

          employeeName:
            employeeName || '',

          department:
            department || '',

          date,

          status,

          checkIn:
            checkIn || null,

          checkOut:
            checkOut || null,

          late:
            Number(late) || 0,

          earlyDeparture:
            Number(earlyDeparture) || 0,

          regular:
            Number(regular) || 0,

          overtime:
            Number(overtime) || 0,
        },
      })

    res.json(attendance)
  } catch (error) {
    console.error(
      'Update attendance error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to update attendance record',
    })
  }
}

export async function deleteAttendance(req, res) {
  try {
    const { id } = req.params

    const existing =
      await prisma.attendance.findUnique({
        where: {
          id,
        },
      })

    if (!existing) {
      return res.status(404).json({
        message:
          'Attendance record not found',
      })
    }

    await prisma.attendance.delete({
      where: {
        id,
      },
    })

    res.json({
      message:
        'Attendance record deleted successfully',
    })
  } catch (error) {
    console.error(
      'Delete attendance error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to delete attendance record',
    })
  }
}

// ============================================================
// PAYROLL
// ============================================================

const DEFAULT_PAYROLL_CONFIGURATION = {
  overtimeRateMultiplier: 1.5,
  standardMonthlyWorkingHours: 208,
  taxablePercentOfAllowances: 1,
  employeePensionRate: 0.07,
  employerPensionRate: 0.11,
}

const PAYE_BRACKETS = [
  {
    min: 0,
    max: 2000,
    rate: 0,
    subtraction: 0,
  },
  {
    min: 2000.01,
    max: 4000,
    rate: 0.15,
    subtraction: 300,
  },
  {
    min: 4000.01,
    max: 7000,
    rate: 0.2,
    subtraction: 500,
  },
  {
    min: 7000.01,
    max: 10000,
    rate: 0.25,
    subtraction: 850,
  },
  {
    min: 10000.01,
    max: 14000,
    rate: 0.3,
    subtraction: 1350,
  },
  {
    min: 14000.01,
    max: Infinity,
    rate: 0.35,
    subtraction: 2050,
  },
]

function parseStoredSetting(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function getPayrollConfiguration() {
  try {
    const settings =
      await prisma.setting.findMany({
        where: {
          key: 'payrollConfiguration',
        },
      })

    const setting = settings[0]

    if (!setting) {
      return {
        ...DEFAULT_PAYROLL_CONFIGURATION,
      }
    }

    const stored =
      parseStoredSetting(setting.value)

    if (
      !stored ||
      typeof stored !== 'object'
    ) {
      return {
        ...DEFAULT_PAYROLL_CONFIGURATION,
      }
    }

    const configuration = {
      ...DEFAULT_PAYROLL_CONFIGURATION,
      ...stored,
    }

    const overtimeRateMultiplier =
      Number(
        configuration.overtimeRateMultiplier,
      )

    const standardMonthlyWorkingHours =
      Number(
        configuration.standardMonthlyWorkingHours,
      )

    const taxablePercentOfAllowances =
      Number(
        configuration.taxablePercentOfAllowances,
      )

    const employeePensionRate =
      Number(
        configuration.employeePensionRate,
      )

    const employerPensionRate =
      Number(
        configuration.employerPensionRate,
      )

    return {
      overtimeRateMultiplier:
        Number.isFinite(
          overtimeRateMultiplier,
        ) &&
        overtimeRateMultiplier >= 0
          ? overtimeRateMultiplier
          : DEFAULT_PAYROLL_CONFIGURATION.overtimeRateMultiplier,

      standardMonthlyWorkingHours:
        Number.isFinite(
          standardMonthlyWorkingHours,
        ) &&
        standardMonthlyWorkingHours > 0
          ? standardMonthlyWorkingHours
          : DEFAULT_PAYROLL_CONFIGURATION.standardMonthlyWorkingHours,

      taxablePercentOfAllowances:
        Number.isFinite(
          taxablePercentOfAllowances,
        ) &&
        taxablePercentOfAllowances >= 0 &&
        taxablePercentOfAllowances <= 1
          ? taxablePercentOfAllowances
          : DEFAULT_PAYROLL_CONFIGURATION.taxablePercentOfAllowances,

      employeePensionRate:
        Number.isFinite(
          employeePensionRate,
        ) &&
        employeePensionRate >= 0 &&
        employeePensionRate <= 1
          ? employeePensionRate
          : DEFAULT_PAYROLL_CONFIGURATION.employeePensionRate,

      employerPensionRate:
        Number.isFinite(
          employerPensionRate,
        ) &&
        employerPensionRate >= 0 &&
        employerPensionRate <= 1
          ? employerPensionRate
          : DEFAULT_PAYROLL_CONFIGURATION.employerPensionRate,
    }
  } catch (error) {
    console.error(
      'Load payroll configuration error:',
      error,
    )

    return {
      ...DEFAULT_PAYROLL_CONFIGURATION,
    }
  }
}

function calculateIncomeTax(
  taxableIncome,
) {
  const income = Math.max(
    0,
    Number(taxableIncome) || 0,
  )

  const bracket =
    PAYE_BRACKETS.find(
      (item) =>
        income >= item.min &&
        income <= item.max,
    ) ||
    PAYE_BRACKETS[
      PAYE_BRACKETS.length - 1
    ]

  return Math.max(
    0,
    income * bracket.rate -
      bracket.subtraction,
  )
}

function isExcludedFromStatutoryDeductions(
  employmentType,
) {
  const type = String(
    employmentType || '',
  )
    .trim()
    .toLowerCase()

  return (
    type === 'contractual' ||
    type === 'contract' ||
    type === 'intern' ||
    type === 'internship'
  )
}

function calculateOvertimePay(
  basicSalary,
  overtimeHours,
  payrollConfiguration,
) {
  const salary =
    Number(basicSalary) || 0

  const hours =
    Number(overtimeHours) || 0

  const standardHours =
    Number(
      payrollConfiguration.standardMonthlyWorkingHours,
    )

  const multiplier =
    Number(
      payrollConfiguration.overtimeRateMultiplier,
    )

  if (
    salary <= 0 ||
    hours <= 0 ||
    standardHours <= 0 ||
    multiplier <= 0
  ) {
    return 0
  }

  return Number(
    (
      hours *
      (salary / standardHours) *
      multiplier
    ).toFixed(2),
  )
}

function calculatePayrollValues(
  employee,
  data = {},
  payrollConfiguration =
    DEFAULT_PAYROLL_CONFIGURATION,
) {
  const employmentType =
    employee.employmentType || ''

  const basicSalary =
    Number(
      data.basicSalary ??
        employee.basicSalary,
    ) || 0

  const transportAllowance =
    Number(
      data.transportAllowance ??
        employee.transportAllowance,
    ) || 0

  const housingAllowance =
    Number(
      data.housingAllowance ??
        employee.housingAllowance,
    ) || 0

  const mealAllowance =
    Number(
      data.mealAllowance ??
        employee.mealAllowance,
    ) || 0

  const otherAllowance =
    Number(
      data.otherAllowance ??
        employee.otherAllowance,
    ) || 0

  const overtimePay =
    Number(data.overtimePay) || 0

  const loanDeduction =
    Number(
      data.loanDeduction ??
        employee.loanDeductions,
    ) || 0

  const otherDeduction =
    Number(
      data.otherDeduction ??
        employee.otherDeductions,
    ) || 0

  const grossSalary =
    basicSalary +
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance +
    overtimePay

  const excluded =
    isExcludedFromStatutoryDeductions(
      employmentType,
    )

  const employeePensionRate =
    Number(
      payrollConfiguration.employeePensionRate,
    )

  const employerPensionRate =
    Number(
      payrollConfiguration.employerPensionRate,
    )

  const taxablePercentOfAllowances =
    Number(
      payrollConfiguration.taxablePercentOfAllowances,
    )

  const pensionDeduction = excluded
    ? 0
    : basicSalary *
      employeePensionRate

  const totalAllowances =
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance

  const taxableAllowances =
    totalAllowances *
    taxablePercentOfAllowances

  const taxableIncome = Math.max(
    0,
    basicSalary +
      taxableAllowances +
      overtimePay -
      pensionDeduction,
  )

  const incomeTax = excluded
    ? 0
    : calculateIncomeTax(
        taxableIncome,
      )

  const totalDeductions =
    pensionDeduction +
    incomeTax +
    loanDeduction +
    otherDeduction

  const netSalary =
    grossSalary -
    totalDeductions

  const employerPension = excluded
    ? 0
    : basicSalary *
      employerPensionRate

  const employerCost =
    grossSalary +
    employerPension

  return {
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    overtimePay,
    grossSalary,
    pensionDeduction,
    incomeTax,
    loanDeduction,
    otherDeduction,
    totalDeductions,
    netSalary,
    employerPension,
    employerCost,
  }
}

async function resolvePayrollEmployee(
  employeeId,
) {
  if (!employeeId) {
    return null
  }

  let employee =
    await prisma.employee.findUnique({
      where: {
        id: employeeId,
      },
    })

  if (!employee) {
    employee =
      await prisma.employee.findUnique({
        where: {
          employeeId,
        },
      })
  }

  return employee
}

export async function getPayroll(
  req,
  res,
) {
  try {
    const {
      payrollMonth,
      employeeId,
      department,
    } = req.query

    const where = {}

    if (payrollMonth) {
      where.payrollMonth =
        payrollMonth
    }

    if (employeeId) {
      const employee =
        await resolvePayrollEmployee(
          employeeId,
        )

      if (!employee) {
        return res.status(404).json({
          message:
            'Employee not found',
        })
      }

      where.employeeId =
        employee.id
    }

    if (department) {
      where.department =
        department
    }

    const payroll =
      await prisma.payrollRecord.findMany(
        {
          where,

          orderBy: [
            {
              payrollMonth: 'desc',
            },
            {
              employeeName: 'asc',
            },
          ],
        },
      )

    res.json(payroll)
  } catch (error) {
    console.error(
      'Get payroll error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load payroll records',
    })
  }
}

export async function getPayrollRecord(
  req,
  res,
) {
  try {
    const { id } = req.params

    const payroll =
      await prisma.payrollRecord.findUnique(
        {
          where: {
            id,
          },
        },
      )

    if (!payroll) {
      return res.status(404).json({
        message:
          'Payroll record not found',
      })
    }

    res.json(payroll)
  } catch (error) {
    console.error(
      'Get payroll record error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load payroll record',
    })
  }
}

export async function createPayroll(
  req,
  res,
) {
  try {
    const {
      employeeId,
      payrollMonth,
      overtimePay,
    } = req.body

    if (
      !employeeId ||
      !payrollMonth
    ) {
      return res.status(400).json({
        message:
          'Employee and payroll month are required',
      })
    }

    const employee =
      await resolvePayrollEmployee(
        employeeId,
      )

    if (!employee) {
      return res.status(404).json({
        message:
          'Employee not found',
      })
    }

    const existing =
      await prisma.payrollRecord.findUnique(
        {
          where: {
            employeeId_payrollMonth: {
              employeeId:
                employee.id,
              payrollMonth,
            },
          },
        },
      )

    if (existing) {
      return res.status(409).json({
        message:
          'Payroll already exists for this employee and month',
        record: existing,
      })
    }

    const payrollConfiguration =
      await getPayrollConfiguration()

    const values =
      calculatePayrollValues(
        employee,
        {
          ...req.body,
          overtimePay,
        },
        payrollConfiguration,
      )

    const payroll =
      await prisma.payrollRecord.create(
        {
          data: {
            id:
              req.body.id ||
              crypto.randomUUID(),

            employeeId:
              employee.id,

            employeeName:
              employee.name,

            department:
              employee.department,

            payrollMonth,

            basicSalary:
              values.basicSalary,

            transportAllowance:
              values.transportAllowance,

            housingAllowance:
              values.housingAllowance,

            mealAllowance:
              values.mealAllowance,

            otherAllowance:
              values.otherAllowance,

            overtimePay:
              values.overtimePay,

            grossSalary:
              values.grossSalary,

            pensionDeduction:
              values.pensionDeduction,

            incomeTax:
              values.incomeTax,

            loanDeduction:
              values.loanDeduction,

            otherDeduction:
              values.otherDeduction,

            totalDeductions:
              values.totalDeductions,

            netSalary:
              values.netSalary,

            employerPension:
              values.employerPension,

            employerCost:
              values.employerCost,
          },
        },
      )

    res.status(201).json(payroll)
  } catch (error) {
    console.error(
      'Create payroll error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to create payroll record',
    })
  }
}

export async function updatePayroll(
  req,
  res,
) {
  try {
    const { id } = req.params

    const existing =
      await prisma.payrollRecord.findUnique(
        {
          where: {
            id,
          },
        },
      )

    if (!existing) {
      return res.status(404).json({
        message:
          'Payroll record not found',
      })
    }

    const employee =
      await prisma.employee.findUnique(
        {
          where: {
            id: existing.employeeId,
          },
        },
      )

    if (!employee) {
      return res.status(404).json({
        message:
          'Employee not found',
      })
    }

    const payrollConfiguration =
      await getPayrollConfiguration()

    const values =
      calculatePayrollValues(
        employee,
        {
          ...req.body,

          basicSalary:
            req.body.basicSalary ??
            existing.basicSalary,

          transportAllowance:
            req.body.transportAllowance ??
            existing.transportAllowance,

          housingAllowance:
            req.body.housingAllowance ??
            existing.housingAllowance,

          mealAllowance:
            req.body.mealAllowance ??
            existing.mealAllowance,

          otherAllowance:
            req.body.otherAllowance ??
            existing.otherAllowance,

          overtimePay:
            req.body.overtimePay ??
            existing.overtimePay,

          loanDeduction:
            req.body.loanDeduction ??
            existing.loanDeduction,

          otherDeduction:
            req.body.otherDeduction ??
            existing.otherDeduction,
        },
        payrollConfiguration,
      )

    const payroll =
      await prisma.payrollRecord.update(
        {
          where: {
            id,
          },

          data: {
            payrollMonth:
              req.body.payrollMonth ??
              existing.payrollMonth,

            basicSalary:
              values.basicSalary,

            transportAllowance:
              values.transportAllowance,

            housingAllowance:
              values.housingAllowance,

            mealAllowance:
              values.mealAllowance,

            otherAllowance:
              values.otherAllowance,

            overtimePay:
              values.overtimePay,

            grossSalary:
              values.grossSalary,

            pensionDeduction:
              values.pensionDeduction,

            incomeTax:
              values.incomeTax,

            loanDeduction:
              values.loanDeduction,

            otherDeduction:
              values.otherDeduction,

            totalDeductions:
              values.totalDeductions,

            netSalary:
              values.netSalary,

            employerPension:
              values.employerPension,

            employerCost:
              values.employerCost,
          },
        },
      )

    res.json(payroll)
  } catch (error) {
    console.error(
      'Update payroll error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to update payroll record',
    })
  }
}

export async function deletePayroll(
  req,
  res,
) {
  try {
    const { id } = req.params

    const existing =
      await prisma.payrollRecord.findUnique(
        {
          where: {
            id,
          },
        },
      )

    if (!existing) {
      return res.status(404).json({
        message:
          'Payroll record not found',
      })
    }

    await prisma.payrollRecord.delete({
      where: {
        id,
      },
    })

    res.json({
      message:
        'Payroll record deleted successfully',
    })
  } catch (error) {
    console.error(
      'Delete payroll error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to delete payroll record',
    })
  }
}

// ============================================================
// LEAVE MANAGEMENT
// ============================================================

const LEAVE_APPROVAL_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
]

function normalizeLeaveStatus(
  status,
) {
  const value = String(
    status || 'Pending',
  ).trim()

  const match =
    LEAVE_APPROVAL_STATUSES.find(
      (item) =>
        item.toLowerCase() ===
        value.toLowerCase(),
    )

  return match || null
}

function parseDateOnly(value) {
  if (
    !value ||
    typeof value !== 'string'
  ) {
    return null
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    )

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function calculateLeaveDays(
  startDate,
  endDate,
) {
  const start =
    parseDateOnly(startDate)

  const end =
    parseDateOnly(endDate)

  if (
    !start ||
    !end ||
    end < start
  ) {
    return null
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000

  return (
    Math.floor(
      (end.getTime() -
        start.getTime()) /
        millisecondsPerDay,
    ) + 1
  )
}

function isAnnualLeaveType(
  leaveType,
) {
  const value = String(
    leaveType || '',
  )
    .trim()
    .toLowerCase()

  return (
    value === 'annual leave' ||
    value === 'annual' ||
    value.includes('annual leave')
  )
}

function getAttendanceLeaveCode(
  leaveType,
) {
  const value = String(
    leaveType || '',
  )
    .trim()
    .toLowerCase()

  if (value.includes('sick')) {
    return 'SL'
  }

  if (
    value.includes('maternity')
  ) {
    return 'ML'
  }

  if (value.includes('annual')) {
    return 'AL'
  }

  return 'OL'
}

function addDaysToDateKey(
  dateKey,
  days,
) {
  const date =
    parseDateOnly(dateKey)

  if (!date) {
    return null
  }

  date.setUTCDate(
    date.getUTCDate() + days,
  )

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0'),
    String(
      date.getUTCDate(),
    ).padStart(2, '0'),
  ].join('-')
}

function serializeLeaveRequest(
  request,
) {
  return {
    ...request,

    employeeId:
      request.employee?.employeeId ||
      request.employeeId,

    employeeName:
      request.employee?.name ||
      request.employeeName,

    department:
      request.employee?.department ||
      request.department,

    employee: undefined,
  }
}

async function resolveEmployee(
  employeeId,
  db = prisma,
) {
  if (!employeeId) {
    return null
  }

  let employee =
    await db.employee.findUnique({
      where: {
        id: employeeId,
      },
    })

  if (!employee) {
    employee =
      await db.employee.findUnique({
        where: {
          employeeId,
        },
      })
  }

  return employee
}

async function findOverlappingApprovedLeave(
  {
    employeeId,
    startDate,
    endDate,
    excludeId = null,
    db = prisma,
  },
) {
  const requests =
    await db.leaveRequest.findMany({
      where: {
        employeeId,

        approvalStatus:
          'Approved',

        ...(excludeId
          ? {
              NOT: {
                id: excludeId,
              },
            }
          : {}),

        startDate: {
          lte: endDate,
        },

        endDate: {
          gte: startDate,
        },
      },

      select: {
        id: true,
        requestId: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        days: true,
      },

      take: 1,
    })

  return requests[0] || null
}

async function getAnnualLeaveBalance(
  employee,
  db = prisma,
) {
  const entitlement =
    Number(
      employee.annualLeaveEntitled,
    ) || 0

  const taken =
    Number(
      employee.annualLeaveTaken,
    ) || 0

  return {
    entitlement,

    taken,

    available: Math.max(
      0,
      entitlement - taken,
    ),

    db,
  }
}

async function updateAnnualLeaveTaken(
  employeeId,
  delta,
  db = prisma,
) {
  if (!delta) {
    return null
  }

  const employee =
    await db.employee.findUnique({
      where: {
        id: employeeId,
      },
    })

  if (!employee) {
    return null
  }

  const current =
    Number(
      employee.annualLeaveTaken,
    ) || 0

  const next = Math.max(
    0,
    current +
      Number(delta || 0),
  )

  return db.employee.update({
    where: {
      id: employeeId,
    },

    data: {
      annualLeaveTaken: next,
    },
  })
}

// ============================================================
// HARDENED LEAVE → ATTENDANCE SYNC
// ============================================================
//
// Important:
// The current Attendance model does not contain a dedicated
// leaveRequestId/source field. Therefore synchronized rows are
// recognized conservatively by their leave status plus empty
// attendance fields.
//
// We NEVER overwrite an existing attendance row.
//
// When removing synchronized leave attendance, we only remove
// rows that still look like system-created leave rows:
//   - same employee
//   - same date
//   - matching leave code
//   - no check-in
//   - no check-out
//   - zero late
//   - zero early departure
//   - zero regular hours
//   - zero overtime
//
// This protects manually completed attendance records.
//
// ============================================================

function isLikelySynchronizedLeaveAttendance(
  attendance,
  expectedStatus,
) {
  if (!attendance) {
    return false
  }

  if (
    attendance.status !==
    expectedStatus
  ) {
    return false
  }

  const checkIn =
    attendance.checkIn

  const checkOut =
    attendance.checkOut

  const late =
    Number(attendance.late) || 0

  const earlyDeparture =
    Number(
      attendance.earlyDeparture,
    ) || 0

  const regular =
    Number(attendance.regular) || 0

  const overtime =
    Number(attendance.overtime) || 0

  return (
    !checkIn &&
    !checkOut &&
    late === 0 &&
    earlyDeparture === 0 &&
    regular === 0 &&
    overtime === 0
  )
}

async function getDateKeysForLeave(
  startDate,
  endDate,
) {
  const totalDays =
    calculateLeaveDays(
      startDate,
      endDate,
    )

  if (
    totalDays === null ||
    totalDays <= 0
  ) {
    return []
  }

  const dates = []

  for (
    let offset = 0;
    offset < totalDays;
    offset += 1
  ) {
    const date =
      addDaysToDateKey(
        startDate,
        offset,
      )

    if (date) {
      dates.push(date)
    }
  }

  return dates
}

async function removeSynchronizedLeaveAttendance(
  {
    employeeId,
    startDate,
    endDate,
    leaveType,
    db = prisma,
  },
) {
  if (
    !employeeId ||
    !startDate ||
    !endDate
  ) {
    return
  }

  const dates =
    await getDateKeysForLeave(
      startDate,
      endDate,
    )

  if (!dates.length) {
    return
  }

  const expectedStatus =
    getAttendanceLeaveCode(
      leaveType,
    )

  const records =
    await db.attendance.findMany({
      where: {
        employeeId,

        date: {
          in: dates,
        },

        status: expectedStatus,
      },
    })

  for (
    const attendance of records
  ) {
    if (
      isLikelySynchronizedLeaveAttendance(
        attendance,
        expectedStatus,
      )
    ) {
      await db.attendance.delete({
        where: {
          id: attendance.id,
        },
      })
    }
  }
}

async function createSynchronizedLeaveAttendance(
  {
    employee,
    startDate,
    endDate,
    leaveType,
    db = prisma,
  },
) {
  if (!employee) {
    return
  }

  const dates =
    await getDateKeysForLeave(
      startDate,
      endDate,
    )

  if (!dates.length) {
    return
  }

  const attendanceStatus =
    getAttendanceLeaveCode(
      leaveType,
    )

  for (
    const date of dates
  ) {
    const existingAttendance =
      await db.attendance.findFirst({
        where: {
          employeeId:
            employee.id,

          date,
        },
      })

    if (existingAttendance) {
      //
      // Never overwrite existing attendance.
      //
      // This is especially important when HR has already
      // manually entered attendance for this employee/date.
      //
      continue
    }

    await db.attendance.create({
      data: {
        id: crypto.randomUUID(),

        employeeId:
          employee.id,

        employeeName:
          employee.name || '',

        department:
          employee.department || '',

        date,

        status:
          attendanceStatus,

        checkIn: null,

        checkOut: null,

        late: 0,

        earlyDeparture: 0,

        regular: 0,

        overtime: 0,
      },
    })
  }
}

async function synchronizeLeaveAttendance(
  {
    previousLeave = null,
    nextLeave = null,
    previousEmployee = null,
    nextEmployee = null,
    db = prisma,
  },
) {
  //
  // STEP 1
  // Remove attendance belonging to the OLD approved state.
  //
  // This handles:
  //
  // Approved → Pending
  // Approved → Rejected
  // Approved date change
  // Approved leave-type change
  // Approved employee change
  // Approved deletion
  //
  if (
    previousLeave &&
    previousLeave.approvalStatus ===
      'Approved' &&
    previousEmployee
  ) {
    await removeSynchronizedLeaveAttendance(
      {
        employeeId:
          previousEmployee.id,

        startDate:
          previousLeave.startDate,

        endDate:
          previousLeave.endDate,

        leaveType:
          previousLeave.leaveType,

        db,
      },
    )
  }

  //
  // STEP 2
  // Create attendance for the NEW approved state.
  //
  // This handles:
  //
  // Pending → Approved
  // Rejected → Approved
  // New approved leave
  // Approved date change
  // Approved leave-type change
  // Approved employee change
  //
  if (
    nextLeave &&
    nextLeave.approvalStatus ===
      'Approved' &&
    nextEmployee
  ) {
    await createSynchronizedLeaveAttendance(
      {
        employee:
          nextEmployee,

        startDate:
          nextLeave.startDate,

        endDate:
          nextLeave.endDate,

        leaveType:
          nextLeave.leaveType,

        db,
      },
    )
  }
}

// ============================================================
// LEAVE REQUESTS
// ============================================================

export async function getLeaveRequests(
  req,
  res,
) {
  try {
    const {
      status,
      employeeId,
      startDate,
      endDate,
    } = req.query

    const where = {}

    if (status) {
      const normalizedStatus =
        normalizeLeaveStatus(
          status,
        )

      if (!normalizedStatus) {
        return res.status(400).json({
          message:
            'Invalid leave approval status. Use Pending, Approved, or Rejected.',
        })
      }

      where.approvalStatus =
        normalizedStatus
    }

    if (employeeId) {
      const employee =
        await resolveEmployee(
          employeeId,
        )

      if (!employee) {
        return res.json([])
      }

      where.employeeId =
        employee.id
    }

    if (
      startDate ||
      endDate
    ) {
      if (
        startDate &&
        !parseDateOnly(startDate)
      ) {
        return res.status(400).json({
          message:
            'Invalid startDate. Use YYYY-MM-DD.',
        })
      }

      if (
        endDate &&
        !parseDateOnly(endDate)
      ) {
        return res.status(400).json({
          message:
            'Invalid endDate. Use YYYY-MM-DD.',
        })
      }

      where.startDate = {
        ...(startDate
          ? {
              gte: startDate,
            }
          : {}),

        ...(endDate
          ? {
              lte: endDate,
            }
          : {}),
      }
    }

    const requests =
      await prisma.leaveRequest.findMany(
        {
          where,

          include: {
            employee: true,
          },

          orderBy: [
            {
              requestDate: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
        },
      )

    res.json(
      requests.map(
        serializeLeaveRequest,
      ),
    )
  } catch (error) {
    console.error(
      'Get leave requests error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load leave requests',
    })
  }
}

export async function getLeaveRequest(
  req,
  res,
) {
  try {
    const { id } = req.params

    const request =
      await prisma.leaveRequest.findUnique(
        {
          where: {
            id,
          },

          include: {
            employee: true,
          },
        },
      )

    if (!request) {
      return res.status(404).json({
        message:
          'Leave request not found',
      })
    }

    res.json(
      serializeLeaveRequest(
        request,
      ),
    )
  } catch (error) {
    console.error(
      'Get leave request error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load leave request',
    })
  }
}

export async function createLeaveRequest(
  req,
  res,
) {
  try {
    const {
      employeeId,
      leaveType,
      requestDate,
      startDate,
      endDate,
      approvalStatus,
      approvedBy,
      approvedDate,
      remarks,
    } = req.body

    if (
      !employeeId ||
      !leaveType ||
      !requestDate ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        message:
          'Employee, leave type, request date, start date, and end date are required',
      })
    }

    if (
      !parseDateOnly(
        requestDate,
      )
    ) {
      return res.status(400).json({
        message:
          'Invalid request date. Use YYYY-MM-DD.',
      })
    }

    const calculatedDays =
      calculateLeaveDays(
        startDate,
        endDate,
      )

    if (
      calculatedDays === null
    ) {
      return res.status(400).json({
        message:
          'Invalid leave dates. Use YYYY-MM-DD and ensure end date is not before start date.',
      })
    }

    if (
      calculatedDays <= 0
    ) {
      return res.status(400).json({
        message:
          'Leave duration must be greater than zero.',
      })
    }

    const normalizedStatus =
      normalizeLeaveStatus(
        approvalStatus ||
          'Pending',
      )

    if (!normalizedStatus) {
      return res.status(400).json({
        message:
          'Invalid leave approval status. Use Pending, Approved, or Rejected.',
      })
    }

    if (
      approvedDate &&
      !parseDateOnly(
        approvedDate,
      )
    ) {
      return res.status(400).json({
        message:
          'Invalid approved date. Use YYYY-MM-DD.',
      })
    }

    const employee =
      await resolveEmployee(
        employeeId,
      )

    if (!employee) {
      return res.status(404).json({
        message:
          'Employee not found',
      })
    }

    const requestId =
      req.body.requestId ||
      req.body.id ||
      `LR-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`

    const leaveRequest =
      await prisma.$transaction(
        async (tx) => {
          //
          // Approved leave must not overlap another approved
          // leave for the same employee.
          //
          if (
            normalizedStatus ===
            'Approved'
          ) {
            const overlap =
              await findOverlappingApprovedLeave(
                {
                  employeeId:
                    employee.id,

                  startDate,

                  endDate,

                  db: tx,
                },
              )

            if (overlap) {
              const error =
                new Error(
                  `Employee already has approved leave from ${overlap.startDate} to ${overlap.endDate}.`,
                )

                error.statusCode =
                  409

              throw error
            }
          }

          //
          // Annual leave balance is consumed only when approved.
          //
          if (
            normalizedStatus ===
              'Approved' &&
            isAnnualLeaveType(
              leaveType,
            )
          ) {
            const balance =
              await getAnnualLeaveBalance(
                employee,
                tx,
              )

            if (
              calculatedDays >
              balance.available
            ) {
              const error =
                new Error(
                  `Insufficient annual leave balance. Available: ${balance.available} days. Requested: ${calculatedDays} days.`,
                )

              error.statusCode =
                400

              throw error
            }
          }

          const currentBalance =
            isAnnualLeaveType(
              leaveType,
            )
              ? Math.max(
                  0,
                  Number(
                    employee.annualLeaveEntitled,
                  ) -
                    Number(
                      employee.annualLeaveTaken,
                    ) -
                    (normalizedStatus ===
                    'Approved'
                      ? calculatedDays
                      : 0),
                )
              : null

          const created =
            await tx.leaveRequest.create(
              {
                data: {
                  id: requestId,

                  employeeId:
                    employee.id,

                  employeeName:
                    employee.name,

                  department:
                    employee.department,

                  leaveType:
                    String(
                      leaveType,
                    ).trim(),

                  requestDate,

                  startDate,

                  endDate,

                  days:
                    calculatedDays,

                  approvalStatus:
                    normalizedStatus,

                  approvedBy:
                    normalizedStatus ===
                    'Approved'
                      ? approvedBy ||
                        'HR Manager'
                      : null,

                  approvedDate:
                    normalizedStatus ===
                    'Approved'
                      ? approvedDate ||
                        requestDate
                      : null,

                  remarks:
                    remarks || null,

                  balance:
                    currentBalance,
                },

                include: {
                  employee: true,
                },
              },
            )

          //
          // Update annualLeaveTaken only for approved annual leave.
          //
          if (
            normalizedStatus ===
              'Approved' &&
            isAnnualLeaveType(
              leaveType,
            )
          ) {
            await updateAnnualLeaveTaken(
              employee.id,
              calculatedDays,
              tx,
            )
          }

          //
          // Hardened synchronization.
          //
          await synchronizeLeaveAttendance(
            {
              previousLeave:
                null,

              nextLeave:
                created,

              previousEmployee:
                null,

              nextEmployee:
                employee,

              db: tx,
            },
          )

          return created
        },
      )

    res.status(201).json(
      serializeLeaveRequest(
        leaveRequest,
      ),
    )
  } catch (error) {
    console.error(
      'Create leave request error:',
      error,
    )

    if (error?.statusCode) {
      return res.status(
        error.statusCode,
      ).json({
        message:
          error.message,
      })
    }

    res.status(500).json({
      message:
        'Failed to create leave request',
    })
  }
}

export async function updateLeaveRequest(
  req,
  res,
) {
  try {
    const { id } = req.params

    const existing =
      await prisma.leaveRequest.findUnique(
        {
          where: {
            id,
          },
        },
      )

    if (!existing) {
      return res.status(404).json({
        message:
          'Leave request not found',
      })
    }

    const {
      employeeId,
      leaveType,
      requestDate,
      startDate,
      endDate,
      approvalStatus,
      approvedBy,
      approvedDate,
      remarks,
    } = req.body

    //
    // Resolve the NEW employee.
    //
    const nextEmployee =
      employeeId
        ? await resolveEmployee(
            employeeId,
          )
        : await resolveEmployee(
            existing.employeeId,
          )

    if (!nextEmployee) {
      return res.status(404).json({
        message:
          'Employee not found',
      })
    }

    //
    // Build the complete NEW leave state.
    //
    const nextLeaveType =
      String(
        leaveType ??
          existing.leaveType ??
          '',
      ).trim()

    if (!nextLeaveType) {
      return res.status(400).json({
        message:
          'Leave type is required',
      })
    }

    const nextRequestDate =
      requestDate ??
      existing.requestDate

    const nextStartDate =
      startDate ??
      existing.startDate

    const nextEndDate =
      endDate ??
      existing.endDate

    if (
      !parseDateOnly(
        nextRequestDate,
      )
    ) {
      return res.status(400).json({
        message:
          'Invalid request date. Use YYYY-MM-DD.',
      })
    }

    if (
      !parseDateOnly(
        nextStartDate,
      ) ||
      !parseDateOnly(
        nextEndDate,
      )
    ) {
      return res.status(400).json({
        message:
          'Invalid leave dates. Use YYYY-MM-DD.',
      })
    }

    const calculatedDays =
      calculateLeaveDays(
        nextStartDate,
        nextEndDate,
      )

    if (
      calculatedDays === null ||
      calculatedDays <= 0
    ) {
      return res.status(400).json({
        message:
          'Invalid leave dates. End date cannot be before start date.',
      })
    }

    const normalizedStatus =
      normalizeLeaveStatus(
        approvalStatus ??
          existing.approvalStatus,
      )

    if (!normalizedStatus) {
      return res.status(400).json({
        message:
          'Invalid leave approval status. Use Pending, Approved, or Rejected.',
      })
    }

    if (
      approvedDate &&
      !parseDateOnly(
        approvedDate,
      )
    ) {
      return res.status(400).json({
        message:
          'Invalid approved date. Use YYYY-MM-DD.',
      })
    }

    const updatedLeaveRequest =
      await prisma.$transaction(
        async (tx) => {
          //
          // Load the OLD employee inside the transaction.
          //
          const previousEmployee =
            await tx.employee.findUnique(
              {
                where: {
                  id:
                    existing.employeeId,
                },
              },
            )

          if (!previousEmployee) {
            const error =
              new Error(
                'Previous employee not found',
              )

            error.statusCode =
              404

            throw error
          }

          //
          // Re-load the NEW employee inside the same transaction.
          //
          const currentEmployee =
            await tx.employee.findUnique(
              {
                where: {
                  id:
                    nextEmployee.id,
                },
              },
            )

          if (!currentEmployee) {
            const error =
              new Error(
                'Employee not found',
              )

            error.statusCode =
              404

            throw error
          }

          const wasApproved =
            existing.approvalStatus ===
            'Approved'

          const willBeApproved =
            normalizedStatus ===
            'Approved'

          //
          // Old annual leave consumption.
          //
          const oldAnnualDays =
            wasApproved &&
            isAnnualLeaveType(
              existing.leaveType,
            )
              ? Number(
                  existing.days || 0,
                )
              : 0

          //
          // New annual leave consumption.
          //
          const newAnnualDays =
            willBeApproved &&
            isAnnualLeaveType(
              nextLeaveType,
            )
              ? calculatedDays
              : 0

          //
          // If the employee changes, the old employee's annual
          // balance must be reversed and the new employee's
          // balance must be checked.
          //
          const employeeChanged =
            previousEmployee.id !==
            currentEmployee.id

          //
          // Check approved overlap for the NEW state.
          //
          if (willBeApproved) {
            const overlap =
              await findOverlappingApprovedLeave(
                {
                  employeeId:
                    currentEmployee.id,

                  startDate:
                    nextStartDate,

                  endDate:
                    nextEndDate,

                  excludeId:
                    id,

                  db: tx,
                },
              )

            if (overlap) {
              const error =
                new Error(
                  `Employee already has approved leave from ${overlap.startDate} to ${overlap.endDate}.`,
                )

              error.statusCode =
                409

              throw error
            }
          }

          //
          // Check annual balance.
          //
          if (
            newAnnualDays > 0
          ) {
            let availableBalance =
              Number(
                currentEmployee.annualLeaveEntitled,
              ) -
              Number(
                currentEmployee.annualLeaveTaken,
              )

            //
            // If editing the same employee, the old approved
            // annual leave is temporarily returned before
            // checking the new request.
            //
            if (
              !employeeChanged &&
              wasApproved &&
              isAnnualLeaveType(
                existing.leaveType,
              )
            ) {
              availableBalance +=
                oldAnnualDays
            }

            availableBalance =
              Math.max(
                0,
                availableBalance,
              )

            if (
              newAnnualDays >
              availableBalance
            ) {
              const error =
                new Error(
                  `Insufficient annual leave balance. Available: ${availableBalance} days. Requested: ${newAnnualDays} days.`,
                )

              error.statusCode =
                400

              throw error
            }
          }

          //
          // Calculate the new stored balance.
          //
          const newBalance =
            isAnnualLeaveType(
              nextLeaveType,
            )
              ? Math.max(
                  0,
                  Number(
                    currentEmployee.annualLeaveEntitled,
                  ) -
                    Number(
                      currentEmployee.annualLeaveTaken,
                    ) -
                    newAnnualDays +
                    (
                      !employeeChanged &&
                      oldAnnualDays
                    ),
                )
              : null

          //
          // Update the leave record first.
          //
          const updated =
            await tx.leaveRequest.update(
              {
                where: {
                  id,
                },

                data: {
                  employeeId:
                    currentEmployee.id,

                  employeeName:
                    currentEmployee.name,

                  department:
                    currentEmployee.department,

                  leaveType:
                    nextLeaveType,

                  requestDate:
                    nextRequestDate,

                  startDate:
                    nextStartDate,

                  endDate:
                    nextEndDate,

                  days:
                    calculatedDays,

                  approvalStatus:
                    normalizedStatus,

                  approvedBy:
                    normalizedStatus ===
                    'Approved'
                      ? approvedBy ||
                        existing.approvedBy ||
                        'HR Manager'
                      : null,

                  approvedDate:
                    normalizedStatus ===
                    'Approved'
                      ? approvedDate ||
                        existing.approvedDate ||
                        nextRequestDate
                      : null,

                  remarks:
                    remarks !==
                    undefined
                      ? remarks ||
                        null
                      : existing.remarks,

                  balance:
                    newBalance,
                },

                include: {
                  employee: true,
                },
              },
            )

          //
          // ====================================================
          // ANNUAL LEAVE BALANCE RECONCILIATION
          // ====================================================
          //
          // First remove the old consumption.
          //
          if (
            oldAnnualDays > 0
          ) {
            await updateAnnualLeaveTaken(
              previousEmployee.id,
              -oldAnnualDays,
              tx,
            )
          }

          //
          // Then apply the new consumption.
          //
          if (
            newAnnualDays > 0
          ) {
            await updateAnnualLeaveTaken(
              currentEmployee.id,
              newAnnualDays,
              tx,
            )
          }

          //
          // ====================================================
          // ATTENDANCE RECONCILIATION
          // ====================================================
          //
          // This is the key hardening.
          //
          // The OLD approved state is removed first.
          // The NEW approved state is then created.
          //
          // This guarantees that stale attendance from an old
          // date range/type/employee does not remain.
          //
          await synchronizeLeaveAttendance(
            {
              previousLeave:
                existing,

              nextLeave:
                updated,

              previousEmployee:
                previousEmployee,

              nextEmployee:
                currentEmployee,

              db: tx,
            },
          )

          return updated
        },
      )

    res.json(
      serializeLeaveRequest(
        updatedLeaveRequest,
      ),
    )
  } catch (error) {
    console.error(
      'Update leave request error:',
      error,
    )

    if (error?.statusCode) {
      return res.status(
        error.statusCode,
      ).json({
        message:
          error.message,
      })
    }

    res.status(500).json({
      message:
        'Failed to update leave request',
    })
  }
}

export async function deleteLeaveRequest(
  req,
  res,
) {
  try {
    const { id } = req.params

    const existing =
      await prisma.leaveRequest.findUnique(
        {
          where: {
            id,
          },
        },
      )

    if (!existing) {
      return res.status(404).json({
        message:
          'Leave request not found',
      })
    }

    await prisma.$transaction(
      async (tx) => {
        const employee =
          await tx.employee.findUnique(
            {
              where: {
                id:
                  existing.employeeId,
              },
            },
          )

        //
        // Remove synchronized attendance BEFORE deleting the
        // leave request.
        //
        if (
          existing.approvalStatus ===
            'Approved' &&
          employee
        ) {
          await removeSynchronizedLeaveAttendance(
            {
              employeeId:
                employee.id,

              startDate:
                existing.startDate,

              endDate:
                existing.endDate,

              leaveType:
                existing.leaveType,

              db: tx,
            },
          )
        }

        //
        // Reverse annual leave consumption.
        //
        if (
          existing.approvalStatus ===
            'Approved' &&
          isAnnualLeaveType(
            existing.leaveType,
          )
        ) {
          await updateAnnualLeaveTaken(
            existing.employeeId,
            -Number(
              existing.days || 0,
            ),
            tx,
          )
        }

        await tx.leaveRequest.delete(
          {
            where: {
              id,
            },
          },
        )
      },
    )

    res.json({
      message:
        'Leave request deleted successfully',
    })
  } catch (error) {
    console.error(
      'Delete leave request error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to delete leave request',
    })
  }
}