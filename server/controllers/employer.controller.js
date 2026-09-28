import crypto from 'crypto'
import { unlink } from 'node:fs/promises'
import prisma from '../db.js'
import { getResumeFilePath } from '../middleware/resume-upload.js'
import { getAttendanceConfigurationFromDb } from './hr-settings.controller.js'

function getEmployeeRecordId(req) {
  return req.user?.employeeRecordId || null
}

async function getCurrentEmployee(req) {
  const employeeRecordId = getEmployeeRecordId(req)

  if (employeeRecordId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeRecordId },
    })
    if (employee) return employee
  }

  if (req.user?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user.userId) },
      include: { employee: true },
    })
    if (user?.employee) return user.employee
  }

  if (req.user?.email) {
    return prisma.employee.findFirst({
      where: { email: req.user.email },
    })
  }

  return null
}

/* =========================================================
   DASHBOARD
========================================================= */

export async function getDashboard(req, res) {
  try {
    const employee = await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message: 'This account is not linked to an employee',
      })
    }

    res.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        jobTitle: employee.jobTitle,
        employmentStatus: employee.employmentStatus,
      },
    })
  } catch (error) {
    console.error('Employer dashboard error:', error)

    res.status(500).json({
      message: 'Failed to load employee dashboard',
    })
  }
}

/* =========================================================
   EMPLOYEES
========================================================= */

export async function getEmployees(req, res) {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        jobTitle: true,
        employmentType: true,
        employmentStatus: true,
        joinDate: true,
        basicSalary: true,
        transportAllowance: true,
        housingAllowance: true,
        mealAllowance: true,
        otherAllowance: true,
      },
    })

    res.json(employees)
  } catch (error) {
    console.error('Employer employees error:', error)

    res.status(500).json({
      message: 'Failed to load employees',
    })
  }
}

function professionalProfile(employee) {
  return {
    githubUrl: employee.githubUrl,
    linkedinUrl: employee.linkedinUrl,
    portfolioUrl: employee.portfolioUrl,
    skills: employee.skills,
    resumeFileName: employee.resumeFileName,
    resumeFileSize: employee.resumeFileSize,
  }
}

export async function getMyProfile(req, res) {
  try {
    const employee = await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message: 'This account is not linked to an employee',
      })
    }

    return res.json(professionalProfile(employee))
  } catch (error) {
    console.error('Employee profile load error:', error)
    return res.status(500).json({ message: 'Failed to load professional profile' })
  }
}

export async function updateMyProfile(req, res) {
  try {
    const employee = await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message: 'This account is not linked to an employee',
      })
    }

    const data = req.body || {}
    const profileFields = ['githubUrl', 'linkedinUrl', 'portfolioUrl']
    const profile = {}

    for (const field of profileFields) {
      const value = String(data[field] ?? '').trim()
      if (value.length > 2048) {
        return res.status(400).json({ message: `${field} must be 2048 characters or fewer` })
      }
      if (value) {
        try {
          const url = new URL(value)
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol')
        } catch {
          return res.status(400).json({ message: `Enter a valid URL for ${field}` })
        }
      }
      profile[field] = value
    }

    const skills = String(data.skills ?? '').trim()
    if (skills.length > 4000) {
      return res.status(400).json({ message: 'Skills must be 4000 characters or fewer' })
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: { ...profile, skills },
    })

    return res.json(professionalProfile(updatedEmployee))
  } catch (error) {
    console.error('Employee profile update error:', error)
    return res.status(500).json({ message: 'Failed to update professional profile' })
  }
}

export async function uploadMyResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Select a resume file to upload.' })
  }

  try {
    const employee = await getCurrentEmployee(req)
    if (!employee) {
      await unlink(req.file.path).catch(() => {})
      return res.status(403).json({ message: 'This account is not linked to an employee' })
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        resumeStorageName: req.file.filename,
        resumeFileName: req.file.originalname,
        resumeMimeType: req.file.mimetype,
        resumeFileSize: req.file.size,
      },
    })

    if (employee.resumeStorageName) {
      const oldFilePath = getResumeFilePath(employee.resumeStorageName)
      if (oldFilePath) await unlink(oldFilePath).catch(() => {})
    }

    return res.json(professionalProfile(updatedEmployee))
  } catch (error) {
    await unlink(req.file.path).catch(() => {})
    console.error('Employee resume upload error:', error)
    return res.status(500).json({ message: 'Failed to save resume' })
  }
}

export async function downloadMyResume(req, res) {
  try {
    const employee = await getCurrentEmployee(req)
    const filePath = getResumeFilePath(employee?.resumeStorageName)
    if (!employee || !filePath || !employee.resumeFileName) {
      return res.status(404).json({ message: 'No resume has been uploaded' })
    }
    return res.download(filePath, employee.resumeFileName)
  } catch (error) {
    console.error('Employee resume download error:', error)
    return res.status(500).json({ message: 'Failed to download resume' })
  }
}

/* =========================================================
   ATTENDANCE CONFIGURATION
========================================================= */

function parseStoredSetting(value) {
  if (value === null || value === undefined) {
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

async function getAttendanceConfiguration() {
  return getAttendanceConfigurationFromDb()
}

export async function getAttendanceConfig(req, res) {
  try {
    const config = await getAttendanceConfiguration()
    res.json(config)
  } catch (error) {
    console.error('Get attendance config error:', error)
    res.status(500).json({
      message: 'Failed to load attendance configuration',
    })
  }
}

function calculateDistanceMeters(
  latitude1,
  longitude1,
  latitude2,
  longitude2,
) {
  const earthRadius = 6371000

  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180

  const lat1 = toRadians(latitude1)
  const lat2 = toRadians(latitude2)

  const deltaLatitude = toRadians(
    latitude2 - latitude1,
  )

  const deltaLongitude = toRadians(
    longitude2 - longitude1,
  )

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLongitude / 2) ** 2

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    )

  return earthRadius * c
}

function isInsideOffice(
  latitude,
  longitude,
  configuration,
) {
  // If geo restriction is disabled in HR settings, allow punch regardless of location
  if (configuration?.geoRestrictionEnabled === false) {
    return {
      verified: true,
      distanceMeters: 0,
      geoRestrictionDisabled: true,
    }
  }

  if (
    configuration.officeLatitude === null ||
    configuration.officeLongitude === null
  ) {
    return {
      verified: true,
      distanceMeters: null,
      configurationMissing: true,
    }
  }

  const userLatitude = Number(latitude)
  const userLongitude = Number(longitude)

  if (
    !Number.isFinite(userLatitude) ||
    !Number.isFinite(userLongitude)
  ) {
    return {
      verified: false,
      distanceMeters: null,
    }
  }

  const distanceMeters = calculateDistanceMeters(
    userLatitude,
    userLongitude,
    configuration.officeLatitude,
    configuration.officeLongitude,
  )

  const allowedRadius = Number(configuration.allowedRadiusMeters) || 100

  return {
    verified: distanceMeters <= allowedRadius,
    distanceMeters,
  }
}

function calculateLateMinutes(
  checkInTime,
  requiredCheckInTime,
) {
  if (
    !checkInTime ||
    !requiredCheckInTime
  ) {
    return 0
  }

  const checkInParts =
    String(checkInTime).split(':')

  const requiredParts =
    String(requiredCheckInTime).split(':')

  if (
    checkInParts.length < 2 ||
    requiredParts.length < 2
  ) {
    return 0
  }

  const checkInMinutes =
    Number(checkInParts[0]) * 60 +
    Number(checkInParts[1])

  const requiredMinutes =
    Number(requiredParts[0]) * 60 +
    Number(requiredParts[1])

  if (
    !Number.isFinite(checkInMinutes) ||
    !Number.isFinite(requiredMinutes)
  ) {
    return 0
  }

  return Math.max(
    0,
    checkInMinutes - requiredMinutes,
  )
}

function getAddisDateTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const values = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function getTodayDateKey() {
  return getAddisDateTime().date
}

function getCurrentTimeKey() {
  return getAddisDateTime().time
}

/* =========================================================
   CHECK-IN TIME RULES

   Times are dynamic — configured by the HR admin via
   Settings > Attendance, Work Hours & Office Geofence.
   Defaults: check-in 08:00, cutoff 08:30, check-out 17:30.
========================================================= */

function formatTimeDisplay(timeStr) {
  if (!timeStr) return ''
  const [h, m] = String(timeStr).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return timeStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 || 12
  return `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`
}

function timeToMinutes(time) {
  const parts =
    String(time || '').split(':')

  if (parts.length < 2) {
    return null
  }

  const hours =
    Number(parts[0])

  const minutes =
    Number(parts[1])

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

function getCheckInTiming(time, configuration = {}) {
  const minutes =
    timeToMinutes(time)

  if (minutes === null) {
    return {
      allowed: false,
      status: 'INVALID',
      lateMinutes: 0,
    }
  }

  const startMinutes =
    timeToMinutes(configuration.checkInStartTime || '08:00') ?? (8 * 60)

  const cutoffMinutes =
    timeToMinutes(configuration.requiredCheckInTime || '08:30') ?? (8 * 60 + 30)

  if (
    minutes <
    startMinutes
  ) {
    return {
      allowed: false,
      status: 'TOO_EARLY',
      lateMinutes: 0,
    }
  }

  if (
    minutes <=
    cutoffMinutes
  ) {
    return {
      allowed: true,
      status: 'PRESENT',
      lateMinutes: 0,
    }
  }

  return {
    allowed: true,
    status: 'ABSENT',
    lateMinutes:
      minutes -
      cutoffMinutes,
  }
}

/* =========================================================
   ATTENDANCE
========================================================= */

export async function getAttendance(req, res) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      startDate,
      endDate,
      month,
      year,
    } = req.query

    const where = {
      employeeId:
        employee.id,
    }

    if (
      startDate &&
      endDate
    ) {
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    } else if (startDate) {
      where.date = {
        gte: startDate,
      }
    } else if (endDate) {
      where.date = {
        lte: endDate,
      }
    }

    if (
      month &&
      year
    ) {
      const numericMonth =
        Number(month)

      const numericYear =
        Number(year)

      if (
        Number.isInteger(
          numericMonth,
        ) &&
        Number.isInteger(
          numericYear,
        ) &&
        numericMonth >= 1 &&
        numericMonth <= 12
      ) {
        const monthKey =
          String(numericMonth)
            .padStart(2, '0')

        const firstDay =
          `${numericYear}-${monthKey}-01`

        const lastDayNumber =
          new Date(
            numericYear,
            numericMonth,
            0,
          ).getDate()

        const lastDay =
          `${numericYear}-${monthKey}-${String(
            lastDayNumber,
          ).padStart(2, '0')}`

        where.date = {
          gte: firstDay,
          lte: lastDay,
        }
      }
    }

    const records =
      await prisma.attendance.findMany({
        where,

        orderBy: [
          {
            date: 'desc',
          },
          {
            createdAt:
              'desc',
          },
        ],
      })

    res.json(records)
  } catch (error) {
    console.error(
      'Employer attendance error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load attendance',
    })
  }
}

/* =========================================================
   CHECK IN
========================================================= */

export async function checkIn(req, res) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      latitude,
      longitude,
      checkIn,
    } = req.body || {}

    const configuration =
      await getAttendanceConfiguration()

    const attendanceDate =
      getTodayDateKey()

    const attendanceTime =
      checkIn ||
      getCurrentTimeKey()

    const timing =
      getCheckInTiming(
        attendanceTime,
        configuration,
      )

    if (!timing.allowed) {
      if (
        timing.status ===
        'TOO_EARLY'
      ) {
        const startDisplay = formatTimeDisplay(configuration.checkInStartTime || '08:00')
        return res.status(403).json({
          message:
            `Check-in opens at ${startDisplay}.`,
          code:
            'CHECK_IN_NOT_OPEN',
          checkInStart:
            configuration.checkInStartTime || '08:00',
          checkInEnd:
            configuration.requiredCheckInTime || '08:30',
        })
      }

      return res.status(400).json({
        message:
          'Invalid check-in time.',
        code:
          'INVALID_CHECK_IN_TIME',
      })
    }

    const location =
      isInsideOffice(
        latitude,
        longitude,
        configuration,
      )

    if (
      configuration.geoRestrictionEnabled !== false &&
      configuration.officeLatitude !==
        null &&
      configuration.officeLongitude !==
        null &&
      !location.verified
    ) {
      return res.status(403).json({
        message:
          'You are outside the configured office location.',
        code:
          'OUTSIDE_PUNCH_RADIUS',
        distanceMeters:
          location.distanceMeters,
        allowedRadiusMeters:
          configuration.allowedRadiusMeters,
      })
    }

    const existing =
      await prisma.attendance.findFirst({
        where: {
          employeeId:
            employee.id,
          date:
            attendanceDate,
        },
      })

    if (
      existing &&
      existing.checkIn
    ) {
      return res.status(409).json({
        message:
          'You have already checked in today.',
        attendance:
          existing,
        record:
          existing,
      })
    }

    const status =
      timing.status === 'PRESENT'
        ? 'PRESENT'
        : 'ABSENT'

    const lateMinutes =
      timing.lateMinutes

    const data = {
      id: crypto.randomUUID(),
      employeeId:
        employee.id,

      employeeName:
        employee.name,

      department:
        employee.department ||
        '',

      date:
        attendanceDate,

      checkIn:
        attendanceTime,

      checkOut:
        existing?.checkOut ||
        null,

      status,

      late: lateMinutes,

      checkInLatitude:
        Number.isFinite(
          Number(latitude),
        ) && latitude !== null && latitude !== undefined
          ? Number(latitude)
          : null,

      checkInLongitude:
        Number.isFinite(
          Number(longitude),
        ) && longitude !== null && longitude !== undefined
          ? Number(longitude)
          : null,

      checkInLocationStatus:
        location.verified
          ? 'VERIFIED'
          : 'NOT_CONFIGURED',

      reviewStatus:
        status === 'ABSENT'
          ? 'PENDING'
          : existing?.reviewStatus ||
            'NONE',

      reviewRemarks:
        status === 'ABSENT'
          ? `Late check-in after ${formatTimeDisplay(configuration.requiredCheckInTime || '08:30')}. ${lateMinutes} minute(s) late.`
          : existing?.reviewRemarks ||
            null,
    }

    let attendance

    if (existing) {
      attendance =
        await prisma.attendance.update({
          where: {
            id:
              existing.id,
          },
          data,
        })
    } else {
      attendance =
        await prisma.attendance.create({
          data,
        })
    }

    res.status(201).json({
      message:
        status === 'PRESENT'
          ? 'Check-in recorded successfully.'
          : `Check-in recorded as absent. You are ${lateMinutes} minute(s) late.`,

      attendance,

      record:
        attendance,

      status,

      lateMinutes,

      location: {
        verified:
          location.verified,
        distanceMeters:
          location.distanceMeters,
      },
    })
  } catch (error) {
    console.error(
      'Employer check-in error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to record check-in',
    })
  }
}

/* =========================================================
   CHECK OUT
========================================================= */

export async function checkOut(req, res) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      latitude,
      longitude,
      checkOut,
    } = req.body || {}

    const configuration =
      await getAttendanceConfiguration()

    const attendanceDate =
      getTodayDateKey()

    const attendanceTime =
      checkOut ||
      getCurrentTimeKey()

    const checkoutMinutes =
      timeToMinutes(
        attendanceTime,
      )

    const requiredCheckoutMinutes =
      timeToMinutes(configuration.checkOutStartTime || '17:30') ??
      (17 * 60 + 30)

    if (
      checkoutMinutes === null
    ) {
      return res.status(400).json({
        message:
          'Invalid check-out time.',
        code:
          'INVALID_CHECK_OUT_TIME',
      })
    }

    if (
      checkoutMinutes <
      requiredCheckoutMinutes
    ) {
      const checkoutDisplay = formatTimeDisplay(configuration.checkOutStartTime || '17:30')
      return res.status(403).json({
        message:
          `Check-out is available at ${checkoutDisplay}.`,
        code:
          'CHECK_OUT_NOT_OPEN',
        checkOutTime:
          configuration.checkOutStartTime || '17:30',
      })
    }

    const location =
      isInsideOffice(
        latitude,
        longitude,
        configuration,
      )

    if (
      configuration.geoRestrictionEnabled !== false &&
      configuration.officeLatitude !==
        null &&
      configuration.officeLongitude !==
        null &&
      !location.verified
    ) {
      return res.status(403).json({
        message:
          'You are outside the configured office location.',
        code:
          'OUTSIDE_PUNCH_RADIUS',
        distanceMeters:
          location.distanceMeters,
        allowedRadiusMeters:
          configuration.allowedRadiusMeters,
      })
    }

    const attendance =
      await prisma.attendance.findFirst({
        where: {
          employeeId:
            employee.id,
          date:
            attendanceDate,
        },
      })

    if (
      !attendance ||
      !attendance.checkIn
    ) {
      return res.status(400).json({
        message:
          'You must check in before checking out.',
      })
    }

    if (
      attendance.checkOut
    ) {
      return res.status(409).json({
        message:
          'You have already checked out today.',
        attendance,
        record:
          attendance,
      })
    }

    const updated =
      await prisma.attendance.update({
        where: {
          id:
            attendance.id,
        },

        data: {
          checkOut:
            attendanceTime,

          checkOutLatitude:
            Number.isFinite(
              Number(latitude),
            ) && latitude !== null && latitude !== undefined
              ? Number(latitude)
              : null,

          checkOutLongitude:
            Number.isFinite(
              Number(longitude),
            ) && longitude !== null && longitude !== undefined
              ? Number(longitude)
              : null,

          checkOutLocationStatus:
            location.verified
              ? 'VERIFIED'
              : 'NOT_CONFIGURED',

          status:
            attendance.status ||
            'PRESENT',
        },
      })

    res.json({
      message:
        'Check-out recorded successfully.',

      attendance:
        updated,

      record:
        updated,

      location: {
        verified:
          location.verified,
        distanceMeters:
          location.distanceMeters,
      },
    })
  } catch (error) {
    console.error(
      'Employer check-out error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to record check-out',
    })
  }
}

/* =========================================================
   ATTENDANCE STATUS
========================================================= */

export async function getAttendanceStatus(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const attendanceDate =
      getTodayDateKey()

    const attendance =
      await prisma.attendance.findFirst({
        where: {
          employeeId:
            employee.id,

          date:
            attendanceDate,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      })

    const leaveRequest =
      await prisma.leaveRequest.findFirst({
        where: {
          employeeId:
            employee.id,

          startDate: {
            lte:
              attendanceDate,
          },

          endDate: {
            gte:
              attendanceDate,
          },

          approvalStatus:
            'Approved',
        },

        orderBy: {
          createdAt:
            'desc',
        },
      })

    res.json({
      loaded: true,

      checkedIn:
        Boolean(
          attendance?.checkIn,
        ),

      checkIn:
        attendance?.checkIn ||
        null,

      checkedOut:
        Boolean(
          attendance?.checkOut,
        ),

      checkOut:
        attendance?.checkOut ||
        null,

      status:
        attendance?.status ||
        null,

      lateMinutes:
        attendance?.late ||
        0,

      reviewStatus:
        attendance?.reviewStatus ||
        null,

      reviewRemarks:
        attendance?.reviewRemarks ||
        null,

      onLeave:
        leaveRequest
          ? {
              leaveType:
                leaveRequest.leaveType,
              startDate:
                leaveRequest.startDate,
              endDate:
                leaveRequest.endDate,
            }
          : null,
    })
  } catch (error) {
    console.error(
      'Employer attendance status error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load attendance status',
    })
  }
}

/* =========================================================
   EMERGENCY CHECK OUT
========================================================= */

export async function emergencyCheckOut(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      latitude,
      longitude,
      checkOut,
      reason,
    } = req.body || {}

    const configuration =
      await getAttendanceConfiguration()

    const location =
      isInsideOffice(
        latitude,
        longitude,
        configuration,
      )

    if (
      configuration.geoRestrictionEnabled !== false &&
      configuration.officeLatitude !==
        null &&
      configuration.officeLongitude !==
        null &&
      !location.verified
    ) {
      return res.status(403).json({
        message:
          'You are outside the configured office location. Emergency check-out is not available.',
        code:
          'OUTSIDE_PUNCH_RADIUS',
        distanceMeters:
          location.distanceMeters,
        allowedRadiusMeters:
          configuration.allowedRadiusMeters,
      })
    }

    const attendanceDate =
      getTodayDateKey()

    const attendanceTime =
      checkOut ||
      getCurrentTimeKey()

    const attendance =
      await prisma.attendance.findFirst({
        where: {
          employeeId:
            employee.id,
          date:
            attendanceDate,
        },
      })

    if (
      !attendance ||
      !attendance.checkIn
    ) {
      return res.status(400).json({
        message:
          'You must check in before checking out.',
      })
    }

    if (
      attendance.checkOut
    ) {
      return res.status(409).json({
        message:
          'You have already checked out today.',
        attendance,
        record:
          attendance,
      })
    }

    const emergencyReason =
      String(
        reason || '',
      ).trim()

    const updated =
      await prisma.attendance.update({
        where: {
          id:
            attendance.id,
        },

        data: {
          checkOut:
            attendanceTime,

          checkOutLatitude:
            Number.isFinite(Number(latitude)) && latitude !== null && latitude !== undefined
              ? Number(latitude)
              : null,

          checkOutLongitude:
            Number.isFinite(Number(longitude)) && longitude !== null && longitude !== undefined
              ? Number(longitude)
              : null,

          checkOutLocationStatus:
            'VERIFIED',

          status:
            'PENDING_REVIEW',

          reviewStatus:
            'PENDING',

          reviewRemarks:
            emergencyReason
              ? `Emergency check-out: ${emergencyReason}`
              : 'Emergency check-out requested by employee.',
        },
      })

    res.json({
      message:
        'Emergency check-out recorded. HR review is required.',

      attendance:
        updated,

      record:
        updated,

      location: {
        verified: true,
        distanceMeters:
          location.distanceMeters,
      },
    })
  } catch (error) {
    console.error(
      'Employer emergency check-out error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to record emergency check-out',
    })
  }
}

/* =========================================================
   LEAVE
========================================================= */

export async function getLeaveRequests(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const records =
      await prisma.leaveRequest.findMany({
        where: {
          employeeId:
            employee.id,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      })

    res.json(records)
  } catch (error) {
    console.error(
      'Employer leave error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load leave requests',
    })
  }
}

export async function createLeaveRequest(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      leaveType,
      startDate,
      endDate,
      days,
      requestDate,
      remarks,
    } = req.body || {}

    if (
      !leaveType ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        message:
          'Leave type, start date and end date are required',
      })
    }

    const calculatedDays =
      Number(days) > 0
        ? Number(days)
        : Math.max(
            1,
            Math.ceil(
              (
                new Date(
                  `${endDate}T00:00:00`,
                ) -
                new Date(
                  `${startDate}T00:00:00`,
                )
              ) /
                (1000 * 60 * 60 * 24),
            ) + 1,
          )

    const leaveRequest =
      await prisma.leaveRequest.create({
        data: {
          id:
            crypto.randomUUID(),

          employeeId:
            employee.id,

          employeeName:
            employee.name,

          department:
            employee.department ||
            '',

          leaveType,

          requestDate:
            requestDate ||
            getTodayDateKey(),

          startDate,

          endDate,

          days:
            calculatedDays,

          approvalStatus:
            'Pending',

          approvedBy:
            null,

          approvedDate:
            null,

          remarks:
            remarks || null,

          balance:
            null,
        },
      })

    res.status(201).json({
      message:
        'Leave request submitted successfully',

      request:
        leaveRequest,
    })
  } catch (error) {
    console.error(
      'Employer create leave error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to create leave request',
    })
  }
}

/* =========================================================
   PAYROLL
========================================================= */

export async function getPayroll(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const records =
      await prisma.payrollRecord.findMany({
        where: {
          employeeId:
            employee.id,
        },

        orderBy: {
          payrollMonth:
            'desc',
        },
      })

    res.json({
      records,
    })
  } catch (error) {
    console.error(
      'Employer payroll error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load payroll records',
    })
  }
}