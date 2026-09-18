import crypto from 'node:crypto'
import prisma from '../db.js'

const EMPLOYEE_INCLUDE = {
  certifications: {
    orderBy: {
      createdAt: 'asc',
    },
  },
}

function initialsFromName(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function normalizeCertifications(list = []) {
  if (!Array.isArray(list)) return []

  return list
    .map((cert) => ({
      id: cert.id || crypto.randomUUID(),
      name: String(cert.name || '').trim(),
      issuer: String(cert.issuer || '').trim(),
      issueDate: String(cert.issueDate || '').trim(),
      expiryDate: String(cert.expiryDate || '').trim(),
      fileName: String(cert.fileName || '').trim(),
      fileUrl: String(cert.fileUrl || '').trim(),
      mimeType: String(cert.mimeType || cert.type || '').trim(),
      fileSize: Number(cert.fileSize || cert.size) || 0,
    }))
    .filter((cert) => cert.name)
}

function identityFields(data = {}, existing = {}) {
  return {
    identityType: data.identityType ?? existing.identityType ?? '',
    identityNumber: data.identityNumber ?? existing.identityNumber ?? '',
    identityIssueDate: data.identityIssueDate ?? existing.identityIssueDate ?? '',
    identityExpiryDate: data.identityExpiryDate ?? existing.identityExpiryDate ?? '',
    identityFrontUrl: data.identityFrontUrl ?? existing.identityFrontUrl ?? '',
    identityFrontName: data.identityFrontName ?? existing.identityFrontName ?? '',
    identityBackUrl: data.identityBackUrl ?? existing.identityBackUrl ?? '',
    identityBackName: data.identityBackName ?? existing.identityBackName ?? '',
    cvUrl: data.cvUrl ?? existing.cvUrl ?? '',
    cvName: data.cvName ?? existing.cvName ?? '',
  }
}

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
      include: EMPLOYEE_INCLUDE,
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

    const certifications = normalizeCertifications(data.certifications)

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
        status: data.status || data.employmentStatus || '',
        avatar: data.avatar || '',
        location: data.location || data.address || '',
        salary: Number(data.salary) || Number(data.basicSalary) || 0,
        manager: data.manager || '',
        roleType: data.roleType || data.employmentType || '',
        initials: data.initials || initialsFromName(data.name),
        ...identityFields(data),
        certifications: {
          create: certifications,
        },
      },
      include: EMPLOYEE_INCLUDE,
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

        ...identityFields(data, existing),
      },
      include: EMPLOYEE_INCLUDE,
    })

    if (Array.isArray(data.certifications)) {
      const certifications = normalizeCertifications(data.certifications)

      await prisma.employeeCertification.deleteMany({
        where: {
          employeeId: id,
        },
      })

      if (certifications.length > 0) {
        await prisma.employeeCertification.createMany({
          data: certifications.map((cert) => ({
            ...cert,
            employeeId: id,
          })),
        })
      }

      const refreshed = await prisma.employee.findUnique({
        where: { id },
        include: EMPLOYEE_INCLUDE,
      })

      return res.json(refreshed)
    }

    res.json(employee)
  } catch (error) {
    console.error('Update employee error:', error)

    res.status(500).json({
      message: 'Failed to update employee',
    })
  }
}

export function uploadEmployeeDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({
      message: 'No file uploaded',
    })
  }

  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  })
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