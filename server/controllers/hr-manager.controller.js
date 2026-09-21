import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import prisma from '../db.js'
import { sendEmployeeCredentialsEmail } from '../lib/mailer.js'
import {
  serializeAttendance,
  emitAttendanceToHr,
  emitAttendanceToEmployee,
} from '../lib/attendanceEvents.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'      // no I/O (look alike)
const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz'      // no l (look alike)
const PASSWORD_DIGITS = '23456789'                       // no 0/1 (look alike)
const PASSWORD_SYMBOLS = '!@#$%&*?+'
const ALL_PASSWORD_CHARS = PASSWORD_UPPER + PASSWORD_LOWER + PASSWORD_DIGITS + PASSWORD_SYMBOLS

function randomChar(set) {
  return set[crypto.randomInt(set.length)]
}

// Generates an 8-character password guaranteed to contain at least one
// upper-case letter, lower-case letter, digit and symbol.
function generateTemporaryPassword() {
  const picks = [
    randomChar(PASSWORD_UPPER),
    randomChar(PASSWORD_LOWER),
    randomChar(PASSWORD_DIGITS),
    randomChar(PASSWORD_SYMBOLS),
  ]
  for (let i = 0; i < 4; i += 1) picks.push(randomChar(ALL_PASSWORD_CHARS))

  // Fisher-Yates shuffle so the guaranteed classes aren't always in front
  for (let i = picks.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1)
    ;[picks[i], picks[j]] = [picks[j], picks[i]]
  }

  return picks.join('')
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

export async function getCurrentUserEmployee(req, res) {
  try {
    const userId = req.user.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const email = (user.email || '').toLowerCase()
    const employee = await prisma.employee.findFirst({
      where: { email },
      include: EMPLOYEE_INCLUDE,
    })

    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' })
    }

    res.json(employee)
  } catch (error) {
    console.error('Get current user employee error:', error)
    res.status(500).json({ message: 'Failed to load employee record' })
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

    // ─── Portal account + credentials email ──────────────────────────
    // Every new employee gets a User login (role EMPLOYEE) and their
    // credentials are emailed to them via Gmail SMTP (see lib/mailer.js).
    const credentialResult = await provisionEmployeeAccount(data)

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

    res.status(201).json({
      ...employee,
      credentialsEmail: credentialResult,
    })
  } catch (error) {
    console.error('Create employee error:', error)

    res.status(500).json({
      message: 'Failed to create employee',
    })
  }
}

// ─── Employee portal account provisioning ──────────────────────────
// Generates a temporary password, creates the User login row and sends
// the credentials by email. Best-effort: the employee record is still
// created if the email fails, and the response reports what happened.
async function provisionEmployeeAccount(data) {
  const email = String(data.email || '').trim()

  if (!email) {
    return { created: false, emailed: false, reason: 'No email address on the employee record.' }
  }

  // Generate a strong 8-char temporary password using at least one
  // char from each class (upper, lower, digit, symbol), e.g. "K7&mQ2#z"
  const password = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await prisma.user.create({
      data: {
        name: data.name,
        email,
        password: passwordHash,
        role: 'EMPLOYEE',
      },
    })
  } catch (error) {
    // P2002 = unique constraint violation (email already registered).
    // Don't email a password that won't match the existing account.
    if (error?.code === 'P2002') {
      return {
        created: false,
        emailed: false,
        reason: 'A portal account with this email already exists — no new credentials were sent.',
      }
    }
    throw error
  }

  const loginUrl = `${process.env.APP_URL || 'http://localhost:5173'}/login`

  const emailed = await sendEmployeeCredentialsEmail({
    name: data.name,
    email,
    employeeId: data.employeeId,
    password,
    loginUrl,
  })

  return {
    created: true,
    emailed: emailed.sent,
    emailError: emailed.error || null,
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

    // Live-update the employee portal with the new status.
    emitAttendanceToEmployee(attendance)
    emitAttendanceToHr(attendance)

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

    // Live-update the employee portal with the new status.
    emitAttendanceToEmployee(attendance)
    emitAttendanceToHr(attendance)

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

// Workbook overtime rule:
// Weighted hours × (Basic Salary ÷ 208), where each tier's hours carry
// its multiplier (Labour Proclamation No. 1156/2019, Art. 68):
//   Daytime normal OT     1.25×  (6:00 AM – 10:00 PM)
//   Night shift / rest day 1.5×
//   Public holiday         2.0×
const STANDARD_MONTHLY_HOURS = 208
const OVERTIME_OT_MULTIPLIERS = {
  regular: 1.25,
  night: 1.5,
  restDay: 1.5,
  holiday: 2.0,
}
const OVERTIME_NIGHT_START_MINUTES = 22 * 60 // 10:00 PM
const OVERTIME_NIGHT_END_MINUTES = 6 * 60 // 6:00 AM

const PAYE_BRACKETS = [
  { min: 0, max: 2000, rate: 0, subtraction: 0 },
  { min: 2001, max: 4000, rate: 0.15, subtraction: 300 },
  { min: 4001, max: 7000, rate: 0.2, subtraction: 500 },
  { min: 7001, max: 10000, rate: 0.25, subtraction: 850 },
  { min: 10001, max: 14000, rate: 0.3, subtraction: 1350 },
  { min: 14001, max: Infinity, rate: 0.35, subtraction: 2050 },
]

function payrollMonthRange(month) {
  if (!month) {
    return {
      start: '',
      end: '',
    }
  }

  const [year, monthNumber] = month.split('-').map(Number)

  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 0)

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function payrollGetCurrentMonth() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function payrollCalculateIncomeTax(taxableIncome) {
  const income = Math.max(0, Number(taxableIncome || 0))

  const bracket =
    PAYE_BRACKETS.find(
      (item) => income >= item.min && income <= item.max,
    ) || PAYE_BRACKETS[PAYE_BRACKETS.length - 1]

  return Math.max(0, income * bracket.rate - bracket.subtraction)
}

function payrollIsExcludedFromStatutoryDeductions(employee) {
  const type = String(
    employee?.employmentType ||
      employee?.employment_type ||
      employee?.roleType ||
      '',
  ).toLowerCase()

  return type === 'contractual' || type === 'intern'
}

function otTimeToMinutes(time) {
  if (time == null || time === '') return null
  const [h, m] = String(time).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function overtimeTierOfRecord(record) {
  const code = String(
    record?.status || record?.attendanceStatus || record?.attendance_status || record?.code || '',
  )
    .trim()
    .toUpperCase()

  if (code === 'PH') return 'holiday'

  const date = record?.date ? new Date(`${String(record.date).slice(0, 10)}T00:00:00`) : null
  if (date && !Number.isNaN(date.getTime())) {
    const day = date.getDay() // 0 Sun … 6 Sat
    if (day === 0 || day === 6) return 'restDay'
  }

  const checkIn = otTimeToMinutes(record?.checkIn)
  const checkOut = otTimeToMinutes(record?.checkOut)
  if (
    (checkIn !== null && checkIn < OVERTIME_NIGHT_END_MINUTES) ||
    (checkOut !== null && checkOut >= OVERTIME_NIGHT_START_MINUTES)
  ) {
    return 'night'
  }

  return 'regular'
}

function payrollCalculateOvertimePay(basicSalary, summary) {
  const salary = Number(basicSalary || 0)
  if (!(salary > 0)) return 0

  const weightedHours =
    (Number(summary?.regularOvertimeHours || 0) * OVERTIME_OT_MULTIPLIERS.regular) +
    (Number(summary?.nightOvertimeHours || 0) * OVERTIME_OT_MULTIPLIERS.night) +
    (Number(summary?.restDayOvertimeHours || 0) * OVERTIME_OT_MULTIPLIERS.restDay) +
    (Number(summary?.holidayOvertimeHours || 0) * OVERTIME_OT_MULTIPLIERS.holiday)

  const hoursValue = weightedHours > 0 ? weightedHours : Number(summary?.overtimeHours || 0)

  const hourlyRate = salary / STANDARD_MONTHLY_HOURS

  return Number((hoursValue * hourlyRate).toFixed(2))
}

function payrollAttendanceSummary(records = []) {
  const summary = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    overtimeHours: 0,
    regularOvertimeHours: 0,
    nightOvertimeHours: 0,
    restDayOvertimeHours: 0,
    holidayOvertimeHours: 0,
    lateMinutes: 0,
  }

  const LEAVE_CODES = new Set(['SL', 'AL', 'ML', 'OL'])

  for (const item of records) {
    const code = String(
      item.status ||
        item.attendanceStatus ||
        item.attendance_status ||
        item.code ||
        '',
    ).toUpperCase()

    const overtime = Number(
      item.overtime ??
        item.overtimeHours ??
        item.overtime_hours ??
        0,
    )

    // OT hours are counted even on weekends/public holidays — those rows
    // are exactly where the higher rest-day / holiday tiers apply.
    if (overtime > 0) {
      summary.overtimeHours += overtime
      summary[`${overtimeTierOfRecord(item)}OvertimeHours`] += overtime
    }

    if (code === 'WK' || code === 'PH') {
      continue
    }

    summary.workingDays += 1

    if (code === 'P') {
      summary.presentDays += 1
    }

    if (code === 'A') {
      summary.absentDays += 1
    }

    if (LEAVE_CODES.has(code)) {
      summary.leaveDays += 1
    }

    summary.lateMinutes += Number(
      item.late ??
        item.lateMinutes ??
        item.late_minutes ??
        0,
    )
  }

  return summary
}

function payrollCalculate(employee, { overtimePay = 0, loanDeduction = 0, otherDeduction = 0 }) {
  const basicSalary = Number(employee.basicSalary || 0)
  const transportAllowance = Number(employee.transportAllowance || 0)
  const housingAllowance = Number(employee.housingAllowance || 0)
  const mealAllowance = Number(employee.mealAllowance || 0)
  const otherAllowance = Number(employee.otherAllowance || 0)

  const grossSalary =
    basicSalary +
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance +
    Number(overtimePay || 0)

  const excluded = payrollIsExcludedFromStatutoryDeductions(employee)

  const pensionDeduction = excluded
    ? 0
    : Number((basicSalary * EMPLOYEE_PENSION_RATE).toFixed(2))

  const taxableIncome = Math.max(0, grossSalary - pensionDeduction)

  const incomeTax = excluded
    ? 0
    : Number(payrollCalculateIncomeTax(taxableIncome).toFixed(2))

  const loanDeductionValue = Number(loanDeduction || 0)
  const otherDeductionValue = Number(otherDeduction || 0)

  const totalDeductions = Number(
    (pensionDeduction + incomeTax + loanDeductionValue + otherDeductionValue).toFixed(2),
  )

  const netSalary = Number((grossSalary - totalDeductions).toFixed(2))

  const employerPension = excluded
    ? 0
    : Number((basicSalary * EMPLOYER_PENSION_RATE).toFixed(2))

  const employerCost = Number((grossSalary + employerPension).toFixed(2))

  return {
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    overtimePay: Number(overtimePay || 0),
    grossSalary,
    pensionDeduction,
    incomeTax,
    loanDeduction: loanDeductionValue,
    otherDeduction: otherDeductionValue,
    totalDeductions,
    netSalary,
    employerPension,
    employerCost,
  }
}

export async function getPayroll(req, res) {
  try {
    const { payrollMonth } = req.query

    const where = payrollMonth
      ? {
          payrollMonth,
        }
      : {}

    const records = await prisma.payrollRecord.findMany({
      where,
      orderBy: [
        {
          employeeName: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    })

    res.json(records)
  } catch (error) {
    console.error('Get payroll error:', error)

    res.status(500).json({
      message: 'Failed to load payroll records',
    })
  }
}

export async function createPayroll(req, res) {
  try {
    const {
      employeeId,
      payrollMonth,
      loanDeduction,
      otherDeduction,
    } = req.body

    if (!employeeId || !payrollMonth) {
      return res.status(400).json({
        message: 'Employee ID and payroll month are required',
      })
    }

    const employee = await prisma.employee.findUnique({
      where: {
        id: employeeId,
      },
    })

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      })
    }

    const { start, end } = payrollMonthRange(payrollMonth)

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: start,
          lte: end,
        },
      },
    })

    const summary = payrollAttendanceSummary(attendance)

    // Overtime is always calculated from Attendance for the selected month.
    // A client-provided overtime value must never override fresh attendance data.
    const computedOvertime = payrollCalculateOvertimePay(employee.basicSalary, summary)

    const figures = payrollCalculate(employee, {
      overtimePay: computedOvertime,
      loanDeduction,
      otherDeduction,
    })

    // Prevent duplicate payroll for the same employee and month.
    const existing = await prisma.payrollRecord.findFirst({
      where: {
        employeeId,
        payrollMonth,
      },
    })

    if (existing) {
      return res.status(409).json({
        message:
          'Payroll record already exists for this employee and month',
        record: existing,
      })
    }

    const record = await prisma.payrollRecord.create({
      data: {
        id: crypto.randomUUID(),
        employeeId,
        employeeName: employee.name || '',
        department: employee.department || '',
        payrollMonth,
        ...figures,
      },
    })

    res.status(201).json(record)
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

    const {
      loanDeduction,
      otherDeduction,
    } = req.body

    const existing = await prisma.payrollRecord.findUnique({
      where: {
        id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Payroll record not found',
      })
    }

    const employee = await prisma.employee.findUnique({
      where: {
        id: existing.employeeId,
      },
    })

    if (!employee) {
      return res.status(404).json({
        message: 'The employee linked to this payroll record was not found',
      })
    }

    const { start, end } = payrollMonthRange(existing.payrollMonth)

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: existing.employeeId,
        date: {
          gte: start,
          lte: end,
        },
      },
    })

    const summary = payrollAttendanceSummary(attendance)

    // Overtime is always recalculated from the month's Attendance data.
    // A client-provided overtime value must never override fresh attendance data.
    const computedOvertime = payrollCalculateOvertimePay(employee.basicSalary, summary)

    const figures = payrollCalculate(employee, {
      overtimePay: computedOvertime,
      loanDeduction: loanDeduction !== undefined ? loanDeduction : existing.loanDeduction,
      otherDeduction: otherDeduction !== undefined ? otherDeduction : existing.otherDeduction,
    })

    const record = await prisma.payrollRecord.update({
      where: {
        id,
      },
      data: {
        ...figures,
      },
    })

    res.json(record)
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

    const existing = await prisma.payrollRecord.findUnique({
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

// ─────────────────────────────────────────────────────────────
// BULK IMPORT EMPLOYEES FROM XLSX
// ─────────────────────────────────────────────────────────────
const REQUIRED_COLUMNS = new Set([
  'Employee ID',
  'Full Name',
  'Gender',
  'Date of Birth',
  'Join Date',
  'Job Title',
  'Department',
  'Employment Type',
  'Basic Salary',
  'Transport Allow.',
  'Housing Allow.',
  'Meal Allow.',
  'Other Allow.',
  'Bank Name',
  'Bank Account No.',
  'TIN',
  'Pension ID',
  'Phone',
  'Email',
  'Address',
  'Emergency Contact',
  'Employment Status',
  'Exit Date',
  'Notes',
  'Data Check',
])

function normaliseHeader(h) {
  return (h || '').trim().replace(/\uFEFF/g, '')
}

function parseSalary(v) {
  if (v == null || v === '') return 0
  const s = String(v).replace(/[,\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function parseDate(v) {
  if (v == null || v === '') return ''
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return ''
    return v.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  if (!s) return ''
  // Try ISO-like parsing first
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  // Try DD/MM/YYYY or D/M/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, day, month, year] = m
    const nd = new Date(Number(year), Number(month) - 1, Number(day))
    if (!isNaN(nd.getTime())) return nd.toISOString().slice(0, 10)
  }
  return s
}

function rowToEmployeeData(row, index) {
  const id = String(row['Employee ID'] || '').trim()
  const rawName = row['Full Name']
  const name = String(rawName || '').trim()

  const genderRaw = row['Gender']
  let gender = ''
  if (typeof genderRaw === 'string') {
    const g = genderRaw.trim().toLowerCase()
    if (g === 'male' || g === 'm') gender = 'Male'
    else if (g === 'female' || g === 'f') gender = 'Female'
    else gender = genderRaw.trim()
  } else if (typeof genderRaw === 'number') {
    gender = genderRaw === 1 ? 'Male' : 'Female'
  }

  return {
    employeeId: id || `IMP-${String(index + 1).padStart(3, '0')}`,
    name: name || `Imported Employee ${index + 1}`,
    gender,
    dateOfBirth: parseDate(row['Date of Birth']),
    joinDate: parseDate(row['Join Date']),
    jobTitle: String(row['Job Title'] || '').trim(),
    department: String(row['Department'] || '').trim(),
    employmentType: String(row['Employment Type'] || '').trim(),
    basicSalary: parseSalary(row['Basic Salary']),
    transportAllowance: parseSalary(row['Transport Allow.']),
    housingAllowance: parseSalary(row['Housing Allow.']),
    mealAllowance: parseSalary(row['Meal Allow.']),
    otherAllowance: parseSalary(row['Other Allow.']),
    bankName: String(row['Bank Name'] || '').trim(),
    bankAccount: String(row['Bank Account No.'] || '').trim(),
    tin: String(row['TIN'] || '').trim(),
    pensionId: String(row['Pension ID'] || '').trim(),
    phone: String(row['Phone'] || '').trim(),
    email: String(row['Email'] || '').trim(),
    address: String(row['Address'] || '').trim(),
    emergencyContact: String(row['Emergency Contact'] || '').trim(),
    employmentStatus: String(row['Employment Status'] || '').trim(),
    exitDate: parseDate(row['Exit Date']),
    notes: String(row['Notes'] || '').trim(),
    dataCheck: String(row['Data Check'] || '').trim(),
  }
}

// ============================================================
// ATTENDANCE HR STATUS (today's punch panel)
// ============================================================

// PATCH /api/hr-manager/attendance/:id/hr-status
// HR adjusts an attendance record's status for the day (Acknowledged,
// Absent, Approved, …). Persisted on the record and pushed to the
// employee portal in real time.
export async function updateAttendanceHrStatus(req, res) {
  try {
    const { id } = req.params
    const { hrStatus, hrNote } = req.body || {}

    const record = await prisma.attendance.findUnique({ where: { id } })
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' })
    }

    const status = String(hrStatus || '').trim()
    if (!status) {
      return res.status(400).json({ message: 'hrStatus is required' })
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        hrStatus: status,
        hrNote: hrNote ? String(hrNote).trim() : null,
        hrUpdatedAt: new Date(),
      },
    })

    // Push the fresh record to the affected employee (live status change).
    emitAttendanceToEmployee(updated)

    res.json({ record: serializeAttendance(updated) })
  } catch (error) {
    console.error('Update attendance HR status error:', error)
    res.status(500).json({ message: 'Failed to update attendance status' })
  }
}

// POST /api/hr-manager/attendance/:id/acknowledge
// Marks an emergency check-out as reviewed so HR dashboards stop
// flagging it as awaiting acknowledgement.
export async function acknowledgeEmergencyDeparture(req, res) {
  try {
    const { id } = req.params

    const record = await prisma.attendance.findUnique({ where: { id } })
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' })
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        hrStatus: 'Acknowledged',
        hrUpdatedAt: new Date(),
      },
    })

    emitAttendanceToEmployee(updated)

    res.json({ record: serializeAttendance(updated) })
  } catch (error) {
    console.error('Acknowledge emergency departure error:', error)
    res.status(500).json({ message: 'Failed to acknowledge emergency departure' })
  }
}

// ============================================================
// LEAVE REQUESTS
// ============================================================

export async function getLeaveRequests(req, res) {
  try {
    const requests = await prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json(requests)
  } catch (error) {
    console.error('Get leave requests error:', error)
    res.status(500).json({ message: 'Failed to load leave requests' })
  }
}

export async function createLeaveRequest(req, res) {
  try {
    const {
      employeeId,
      leaveType,
      startDate,
      endDate,
      remarks,
    } = req.body || {}

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({
        message: 'employeeId, leaveType, startDate and endDate are required',
      })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start/end date' })
    }
    if (end < start) {
      return res.status(400).json({ message: 'End date must be on or after start date' })
    }

    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: employeeId }, { employeeId }],
      },
    })

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' })
    }

    const created = await prisma.leaveRequest.create({
      data: {
        id: crypto.randomUUID(),
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        leaveType,
        requestDate: new Date().toISOString().slice(0, 10),
        startDate,
        endDate,
        days,
        approvalStatus: 'Pending',
        approvedBy: null,
        approvedDate: null,
        remarks: remarks || null,
      },
    })

    res.status(201).json({ request: created })
  } catch (error) {
    console.error('Create leave request error:', error)
    res.status(500).json({ message: 'Failed to create leave request' })
  }
}

export async function updateLeaveRequest(req, res) {
  try {
    const { id } = req.params
    const { approvalStatus, approvedBy, approvedDate } = req.body || {}

    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ message: 'Leave request not found' })
    }

    const updateData = {}
    if (approvalStatus) updateData.approvalStatus = approvalStatus
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy
    if (approvedDate) updateData.approvedDate = approvedDate

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
    })

    res.json({ request: updated })
  } catch (error) {
    console.error('Update leave request error:', error)
    res.status(500).json({ message: 'Failed to update leave request' })
  }
}

export async function getLeaveRequest(req, res) {
  try {
    const { id } = req.params

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
    })

    if (!request) {
      return res.status(404).json({ message: 'Leave request not found' })
    }

    res.json({ request })
  } catch (error) {
    console.error('Get leave request error:', error)
    res.status(500).json({ message: 'Failed to load leave request' })
  }
}

export async function deleteLeaveRequest(req, res) {
  try {
    const { id } = req.params

    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ message: 'Leave request not found' })
    }

    await prisma.leaveRequest.delete({
      where: { id },
    })

    res.json({ message: 'Leave request deleted successfully' })
  } catch (error) {
    console.error('Delete leave request error:', error)
    res.status(500).json({ message: 'Failed to delete leave request' })
  }
}

export async function getPayrollRecord(req, res) {
  try {
    const { id } = req.params

    const record = await prisma.payrollRecord.findUnique({
      where: { id },
    })

    if (!record) {
      return res.status(404).json({ message: 'Payroll record not found' })
    }

    res.json({ record })
  } catch (error) {
    console.error('Get payroll record error:', error)
    res.status(500).json({ message: 'Failed to load payroll record' })
  }
}

export async function importEmployees(req, res) {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const ext = (file.originalname || '').split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx') {
      return res.status(400).json({
        message: 'Only .xlsx files are accepted',
      })
    }

    const workbook = XLSX.readFile(file.path)
    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        message: 'The spreadsheet is empty or could not be read',
      })
    }

    // Header row = first row
    const headerMap = new Map()
    rawRows[0] && Object.keys(rawRows[0]).forEach((k) => {
      headerMap.set(normaliseHeader(k), k)
    })

    const missing = [...REQUIRED_COLUMNS].filter(
      (c) => !headerMap.has(c)
    )
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required columns: ${missing.join(', ')}`,
        missingColumns: missing,
      })
    }

    // Map each data row using the original keys
    const dataRows = rawRows.slice(1) // skip header
    const results = []
    const errors = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row || Object.keys(row).length === 0) continue

      try {
        const data = rowToEmployeeData(row, i)

        const existingId = await prisma.employee.findUnique({
          where: { employeeId: data.employeeId },
        })

        if (existingId) {
          errors.push({
            row: i + 2,
            employeeId: data.employeeId,
            error: `Employee ID already exists`,
          })
          continue
        }

        const employee = await prisma.employee.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: data.employeeId,
            name: data.name,
            gender: data.gender,
            dateOfBirth: data.dateOfBirth,
            joinDate: data.joinDate,
            jobTitle: data.jobTitle,
            department: data.department,
            employmentType: data.employmentType,
            basicSalary: data.basicSalary,
            transportAllowance: data.transportAllowance,
            housingAllowance: data.housingAllowance,
            mealAllowance: data.mealAllowance,
            otherAllowance: data.otherAllowance,
            otherDeductions: 0,
            loanDeductions: 0,
            bankName: data.bankName,
            bankAccount: data.bankAccount,
            tin: data.tin,
            pensionId: data.pensionId,
            phone: data.phone,
            email: data.email,
            address: data.address,
            emergencyContact: data.emergencyContact,
            employmentStatus: data.employmentStatus,
            exitDate: data.exitDate || null,
            notes: data.notes,
            status: data.employmentStatus,
            avatar: '',
            location: data.address,
            salary: data.basicSalary,
            roleType: data.employmentType,
            initials: data.name
              ? data.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()
              : '',
          },
          include: EMPLOYEE_INCLUDE,
        })

        results.push(employee)
      } catch (err) {
        errors.push({
          row: i + 2,
          employeeId: row['Employee ID'] || `(row ${i + 2})`,
          error: err.message || 'Unknown error',
        })
      }
    }

    // Clean up the uploaded file
    try { fs.unlinkSync(file.path) } catch (_) {}

    res.json({
      message: `Import complete: ${results.length} added, ${errors.length} skipped`,
      imported: results.length,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Import employees error:', error)
    res.status(500).json({
      message: 'Failed to import employees',
    })
  }
}