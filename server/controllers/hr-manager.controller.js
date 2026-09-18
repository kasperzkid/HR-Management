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
        basicSalary: Number(data.basicSalary) || 0,
        transportAllowance: Number(data.transportAllowance) || 0,
        housingAllowance: Number(data.housingAllowance) || 0,
        mealAllowance: Number(data.mealAllowance) || 0,
        otherAllowance: Number(data.otherAllowance) || 0,
        otherDeductions: Number(data.otherDeductions) || 0,
        loanDeductions: Number(data.loanDeductions) || 0,
        bankName: data.bankName || '',
        bankAccount: data.bankAccount || '',
        tin: data.tin || '',
        pensionId: data.pensionId || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        emergencyContact: data.emergencyContact || '',
        employmentStatus: data.employmentStatus || '',
        exitDate: data.exitDate || null,
        notes: data.notes || '',
        status: data.status || '',
        avatar: data.avatar || '',
        location: data.location || '',
        salary: Number(data.salary) || 0,
        manager: data.manager || '',
        roleType: data.roleType || '',
        initials: data.initials || '',
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
        employeeId: data.employeeId ?? existing.employeeId,
        name: data.name ?? existing.name,
        gender: data.gender ?? existing.gender,
        dateOfBirth: data.dateOfBirth ?? existing.dateOfBirth,
        joinDate: data.joinDate ?? existing.joinDate,
        jobTitle: data.jobTitle ?? existing.jobTitle,
        department: data.department ?? existing.department,
        employmentType:
          data.employmentType ?? existing.employmentType,

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

        bankName: data.bankName ?? existing.bankName,
        bankAccount: data.bankAccount ?? existing.bankAccount,
        tin: data.tin ?? existing.tin,
        pensionId: data.pensionId ?? existing.pensionId,
        phone: data.phone ?? existing.phone,
        email: data.email ?? existing.email,
        address: data.address ?? existing.address,
        emergencyContact:
          data.emergencyContact ?? existing.emergencyContact,

        employmentStatus:
          data.employmentStatus ?? existing.employmentStatus,

        exitDate:
          data.exitDate !== undefined
            ? data.exitDate || null
            : existing.exitDate,

        notes: data.notes ?? existing.notes,
        status: data.status ?? existing.status,
        avatar: data.avatar ?? existing.avatar,
        location: data.location ?? existing.location,
        manager: data.manager ?? existing.manager,
        roleType: data.roleType ?? existing.roleType,
        initials: data.initials ?? existing.initials,

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

    // Single-day request
    if (date) {
      where = {
        date,
      }
    }

    // Date-range request
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

    const attendance = await prisma.attendance.findMany({
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

    const attendance = await prisma.attendance.findUnique({
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
    console.error('Get attendance record error:', error)

    res.status(500).json({
      message: 'Failed to load attendance record',
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

    if (!employeeId || !date || !status) {
      return res.status(400).json({
        message: 'Employee, date, and status are required',
      })
    }

    // Prevent duplicate attendance for the same
    // employee and date.
    const existing = await prisma.attendance.findFirst({
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

    const attendance = await prisma.attendance.create({
      data: {
        id: crypto.randomUUID(),

        employeeId,

        employeeName: employeeName || '',

        department: department || '',

        date,

        status,

        checkIn: checkIn || null,

        checkOut: checkOut || null,

        late: Number(late) || 0,

        earlyDeparture:
          Number(earlyDeparture) || 0,

        regular: Number(regular) || 0,

        overtime: Number(overtime) || 0,
      },
    })

    res.status(201).json(attendance)
  } catch (error) {
    console.error('Create attendance error:', error)

    res.status(500).json({
      message: 'Failed to create attendance record',
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

    if (!employeeId || !date || !status) {
      return res.status(400).json({
        message: 'Employee, date, and status are required',
      })
    }

    const existing = await prisma.attendance.findUnique({
      where: {
        id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Attendance record not found',
      })
    }

    // Prevent changing this record into a duplicate
    // employee/date combination.
    const duplicate = await prisma.attendance.findFirst({
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

    const attendance = await prisma.attendance.update({
      where: {
        id,
      },

      data: {
        employeeId,

        employeeName: employeeName || '',

        department: department || '',

        date,

        status,

        checkIn: checkIn || null,

        checkOut: checkOut || null,

        late: Number(late) || 0,

        earlyDeparture:
          Number(earlyDeparture) || 0,

        regular: Number(regular) || 0,

        overtime: Number(overtime) || 0,
      },
    })

    res.json(attendance)
  } catch (error) {
    console.error('Update attendance error:', error)

    res.status(500).json({
      message: 'Failed to update attendance record',
    })
  }
}

export async function deleteAttendance(req, res) {
  try {
    const { id } = req.params

    const existing = await prisma.attendance.findUnique({
      where: {
        id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Attendance record not found',
      })
    }

    await prisma.attendance.delete({
      where: {
        id,
      },
    })

    res.json({
      message: 'Attendance record deleted successfully',
    })
  } catch (error) {
    console.error('Delete attendance error:', error)

    res.status(500).json({
      message: 'Failed to delete attendance record',
    })
  }
}
// ============================================================
// PAYROLL
// ============================================================

const EMPLOYEE_PENSION_RATE = 0.07
const EMPLOYER_PENSION_RATE = 0.11

const PAYE_BRACKETS = [
  { min: 0, max: 2000, rate: 0, subtraction: 0 },
  { min: 2000.01, max: 4000, rate: 0.15, subtraction: 300 },
  { min: 4000.01, max: 7000, rate: 0.20, subtraction: 500 },
  { min: 7000.01, max: 10000, rate: 0.25, subtraction: 850 },
  { min: 10000.01, max: 14000, rate: 0.30, subtraction: 1350 },
  { min: 14000.01, max: Infinity, rate: 0.35, subtraction: 2050 },
]

function calculateIncomeTax(taxableIncome) {
  const income = Math.max(0, Number(taxableIncome) || 0)

  const bracket =
    PAYE_BRACKETS.find(
      (item) => income >= item.min && income <= item.max,
    ) || PAYE_BRACKETS[PAYE_BRACKETS.length - 1]

  return Math.max(
    0,
    income * bracket.rate - bracket.subtraction,
  )
}

function isExcludedFromStatutoryDeductions(employmentType) {
  const type = String(employmentType || '').trim().toLowerCase()

  return (
    type === 'contractual' ||
    type === 'contract' ||
    type === 'intern' ||
    type === 'internship'
  )
}

function calculatePayrollValues(employee, data = {}) {
  const employmentType = employee.employmentType || ''

  const basicSalary =
    Number(data.basicSalary ?? employee.basicSalary) || 0

  const transportAllowance =
    Number(
      data.transportAllowance ?? employee.transportAllowance,
    ) || 0

  const housingAllowance =
    Number(
      data.housingAllowance ?? employee.housingAllowance,
    ) || 0

  const mealAllowance =
    Number(
      data.mealAllowance ?? employee.mealAllowance,
    ) || 0

  const otherAllowance =
    Number(
      data.otherAllowance ?? employee.otherAllowance,
    ) || 0

  const overtimePay =
    Number(data.overtimePay) || 0

  const loanDeduction =
    Number(
      data.loanDeduction ?? employee.loanDeductions,
    ) || 0

  const otherDeduction =
    Number(
      data.otherDeduction ?? employee.otherDeductions,
    ) || 0

  const grossSalary =
    basicSalary +
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance +
    overtimePay

  const excluded =
    isExcludedFromStatutoryDeductions(employmentType)

  const pensionDeduction = excluded
    ? 0
    : basicSalary * EMPLOYEE_PENSION_RATE

  /*
   * Taxable income is calculated after the employee pension
   * deduction.
   *
   * Overtime and allowances are included in gross salary.
   */
  const taxableIncome = Math.max(
    0,
    grossSalary - pensionDeduction,
  )

  const incomeTax = excluded
    ? 0
    : calculateIncomeTax(taxableIncome)

  const totalDeductions =
    pensionDeduction +
    incomeTax +
    loanDeduction +
    otherDeduction

  const netSalary =
    grossSalary - totalDeductions

  const employerPension = excluded
    ? 0
    : basicSalary * EMPLOYER_PENSION_RATE

  const employerCost =
    grossSalary + employerPension

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

async function resolvePayrollEmployee(employeeId) {
  if (!employeeId) {
    return null
  }

  let employee = await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },
  })

  if (!employee) {
    employee = await prisma.employee.findUnique({
      where: {
        employeeId,
      },
    })
  }

  return employee
}

export async function getPayroll(req, res) {
  try {
    const {
      payrollMonth,
      employeeId,
      department,
    } = req.query

    const where = {}

    if (payrollMonth) {
      where.payrollMonth = payrollMonth
    }

    if (employeeId) {
      const employee = await resolvePayrollEmployee(employeeId)

      if (!employee) {
        return res.status(404).json({
          message: 'Employee not found',
        })
      }

      where.employeeId = employee.id
    }

    if (department) {
      where.department = department
    }

    const payroll = await prisma.payrollRecord.findMany({
      where,
      orderBy: [
        {
          payrollMonth: 'desc',
        },
        {
          employeeName: 'asc',
        },
      ],
    })

    res.json(payroll)
  } catch (error) {
    console.error('Get payroll error:', error)

    res.status(500).json({
      message: 'Failed to load payroll records',
    })
  }
}

export async function getPayrollRecord(req, res) {
  try {
    const { id } = req.params

    const payroll = await prisma.payrollRecord.findUnique({
      where: {
        id,
      },
    })

    if (!payroll) {
      return res.status(404).json({
        message: 'Payroll record not found',
      })
    }

    res.json(payroll)
  } catch (error) {
    console.error('Get payroll record error:', error)

    res.status(500).json({
      message: 'Failed to load payroll record',
    })
  }
}

export async function createPayroll(req, res) {
  try {
    const {
      employeeId,
      payrollMonth,
      overtimePay,
    } = req.body

    if (!employeeId || !payrollMonth) {
      return res.status(400).json({
        message: 'Employee and payroll month are required',
      })
    }

    const employee =
      await resolvePayrollEmployee(employeeId)

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    const existing =
      await prisma.payrollRecord.findUnique({
        where: {
          employeeId_payrollMonth: {
            employeeId: employee.id,
            payrollMonth,
          },
        },
      })

    if (existing) {
      return res.status(409).json({
        message:
          'Payroll already exists for this employee and month',
        record: existing,
      })
    }

    const values = calculatePayrollValues(
      employee,
      {
        ...req.body,
        overtimePay,
      },
    )

    const payroll = await prisma.payrollRecord.create({
      data: {
        id: req.body.id || crypto.randomUUID(),

        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        payrollMonth,

        basicSalary: values.basicSalary,
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
    })

    res.status(201).json(payroll)
  } catch (error) {
    console.error('Create payroll error:', error)

    res.status(500).json({
      message: 'Failed to create payroll record',
    })
  }
}

export async function updatePayroll(req, res) {
  try {
    const { id } = req.params

    const existing =
      await prisma.payrollRecord.findUnique({
        where: {
          id,
        },
      })

    if (!existing) {
      return res.status(404).json({
        message: 'Payroll record not found',
      })
    }

    const employee =
      await prisma.employee.findUnique({
        where: {
          id: existing.employeeId,
        },
      })

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    const values = calculatePayrollValues(
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
    )

    const payroll =
      await prisma.payrollRecord.update({
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
      })

    res.json(payroll)
  } catch (error) {
    console.error('Update payroll error:', error)

    res.status(500).json({
      message: 'Failed to update payroll record',
    })
  }
}

export async function deletePayroll(req, res) {
  try {
    const { id } = req.params

    const existing =
      await prisma.payrollRecord.findUnique({
        where: {
          id,
        },
      })

    if (!existing) {
      return res.status(404).json({
        message: 'Payroll record not found',
      })
    }

    await prisma.payrollRecord.delete({
      where: {
        id,
      },
    })

    res.json({
      message: 'Payroll record deleted successfully',
    })
  } catch (error) {
    console.error('Delete payroll error:', error)

    res.status(500).json({
      message: 'Failed to delete payroll record',
    })
  }
}
// ============================================================
// LEAVE MANAGEMENT
// ============================================================

function serializeLeaveRequest(request) {
  return {
    ...request,
    employeeId: request.employee?.employeeId || request.employeeId,
    employeeName: request.employee?.name || request.employeeName,
    department: request.employee?.department || request.department,
    employee: undefined,
  }
}

async function resolveEmployee(employeeId) {
  if (!employeeId) {
    return null
  }

  // Accept either the database Employee.id or the business Employee ID.
  let employee = await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },
  })

  if (!employee) {
    employee = await prisma.employee.findUnique({
      where: {
        employeeId,
      },
    })
  }

  return employee
}

export async function getLeaveRequests(req, res) {
  try {
    const { status, employeeId, startDate, endDate } = req.query

    const where = {}

    if (status) {
      where.approvalStatus = status
    }

    if (employeeId) {
      const employee = await resolveEmployee(employeeId)

      if (!employee) {
        return res.json([])
      }

      where.employeeId = employee.id
    }

    if (startDate || endDate) {
      where.startDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      }
    }

    const requests = await prisma.leaveRequest.findMany({
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
    })

    res.json(requests.map(serializeLeaveRequest))
  } catch (error) {
    console.error('Get leave requests error:', error)

    res.status(500).json({
      message: 'Failed to load leave requests',
    })
  }
}

export async function getLeaveRequest(req, res) {
  try {
    const { id } = req.params

    const request = await prisma.leaveRequest.findUnique({
      where: {
        id,
      },
      include: {
        employee: true,
      },
    })

    if (!request) {
      return res.status(404).json({
        message: 'Leave request not found',
      })
    }

    res.json(serializeLeaveRequest(request))
  } catch (error) {
    console.error('Get leave request error:', error)

    res.status(500).json({
      message: 'Failed to load leave request',
    })
  }
}

export async function createLeaveRequest(req, res) {
  try {
    const {
      employeeId,
      leaveType,
      requestDate,
      startDate,
      endDate,
      days,
      approvalStatus,
      approvedBy,
      approvedDate,
      remarks,
      balance,
    } = req.body

    if (!employeeId || !leaveType || !requestDate || !startDate || !endDate) {
      return res.status(400).json({
        message:
          'Employee, leave type, request date, start date, and end date are required',
      })
    }

    if (endDate < startDate) {
      return res.status(400).json({
        message: 'End date cannot be before start date',
      })
    }

    const employee = await resolveEmployee(employeeId)

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    const requestId =
      req.body.id ||
      `LR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        id: requestId,
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        leaveType,
        requestDate,
        startDate,
        endDate,
        days: Number(days) || 0,
        approvalStatus: approvalStatus || 'Pending',
        approvedBy: approvedBy || null,
        approvedDate: approvedDate || null,
        remarks: remarks || null,
        balance:
          balance !== undefined && balance !== null
            ? Number(balance)
            : null,
      },
      include: {
        employee: true,
      },
    })

    res.status(201).json(serializeLeaveRequest(leaveRequest))
  } catch (error) {
    console.error('Create leave request error:', error)

    res.status(500).json({
      message: 'Failed to create leave request',
    })
  }
}

export async function updateLeaveRequest(req, res) {
  try {
    const { id } = req.params

    const existing = await prisma.leaveRequest.findUnique({
      where: {
        id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Leave request not found',
      })
    }

    const {
      employeeId,
      leaveType,
      requestDate,
      startDate,
      endDate,
      days,
      approvalStatus,
      approvedBy,
      approvedDate,
      remarks,
      balance,
    } = req.body

    let employee = null

    if (employeeId) {
      employee = await resolveEmployee(employeeId)

      if (!employee) {
        return res.status(404).json({
          message: 'Employee not found',
        })
      }
    } else {
      employee = await prisma.employee.findUnique({
        where: {
          id: existing.employeeId,
        },
      })
    }

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    const nextStartDate = startDate ?? existing.startDate
    const nextEndDate = endDate ?? existing.endDate

    if (nextEndDate < nextStartDate) {
      return res.status(400).json({
        message: 'End date cannot be before start date',
      })
    }

    const leaveRequest = await prisma.leaveRequest.update({
      where: {
        id,
      },
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        leaveType: leaveType ?? existing.leaveType,
        requestDate: requestDate ?? existing.requestDate,
        startDate: nextStartDate,
        endDate: nextEndDate,
        days:
          days !== undefined
            ? Number(days) || 0
            : existing.days,
        approvalStatus:
          approvalStatus ?? existing.approvalStatus,
        approvedBy:
          approvedBy !== undefined
            ? approvedBy || null
            : existing.approvedBy,
        approvedDate:
          approvedDate !== undefined
            ? approvedDate || null
            : existing.approvedDate,
        remarks:
          remarks !== undefined
            ? remarks || null
            : existing.remarks,
        balance:
          balance !== undefined
            ? balance === null || balance === ''
              ? null
              : Number(balance)
            : existing.balance,
      },
      include: {
        employee: true,
      },
    })

    res.json(serializeLeaveRequest(leaveRequest))
  } catch (error) {
    console.error('Update leave request error:', error)

    res.status(500).json({
      message: 'Failed to update leave request',
    })
  }
}

export async function deleteLeaveRequest(req, res) {
  try {
    const { id } = req.params

    const existing = await prisma.leaveRequest.findUnique({
      where: {
        id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Leave request not found',
      })
    }

    await prisma.leaveRequest.delete({
      where: {
        id,
      },
    })

    res.json({
      message: 'Leave request deleted successfully',
    })
  } catch (error) {
    console.error('Delete leave request error:', error)

    res.status(500).json({
      message: 'Failed to delete leave request',
    })
  }
}