// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// Punch clock business logic: check-in, check-out, emergency check-out.
//
// WORK TIME RULES (UTC+3 — Addis Ababa):
//   Work day:        Mon–Fri, 08:00 → 17:30
//   Check-in window: 08:00 → 14:00 (rejected after 14:00)
//   Check-out:       accepted ONLY at/after 17:30 (enforced here)
//   Emergency:       check-out with mandatory remark, notifies HR
// ------------------------------------------------------------------

import prisma from '../db.js'
import { notifyHrOfEmergencyCheckOut } from '../lib/notifyHr.js'
import { emitAttendanceToHr } from '../lib/attendanceEvents.js'

const WORK_START_MINUTES = 8 * 60 // 08:00
const CHECK_IN_CUTOFF_MINUTES = 14 * 60 // 14:00 — last moment to check in
const WORK_END_MINUTES = 17 * 60 + 30 // 17:30 — earliest allowed check-out
const STANDARD_WORK_MINUTES = 8 * 60 + 30 // 08:00 → 17:30 including break

// ── Geofencing ─────────────────────────────────────────────
// Punches are only accepted while the employee is physically within
// PUNCH_RADIUS_METERS of the office coordinates.
const OFFICE_LATITUDE = 8.9994852
const OFFICE_LONGITUDE = 38.8206109
const PUNCH_RADIUS_METERS = 50

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Returns the distance in meters from a punch co-ordinate to the office,
// or null when the client didn't send co-ordinates at all (untrusted client).
function geoDistanceMeters(req) {
  const { latitude, longitude } = req.body || {}
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return haversineMeters(lat, lng, OFFICE_LATITUDE, OFFICE_LONGITUDE)
}

// Throws { code: 'OUTSIDE_PUNCH_RADIUS' } when the punch is not authorized
// by location. Relies on the co-ordinates the client passes; a client that
// sends none is treated as outside (can't prove it's at the office).
function assertWithinPunchRadius(req) {
  const distance = geoDistanceMeters(req)
  console.log(
    `[PUNCH-GEO] ${req.route?.path || req.path || '?'} lat=${req.body?.latitude ?? 'none'} lng=${req.body?.longitude ?? 'none'} distanceMeters=${distance ?? 'none'}`
  )
  if (distance === null) {
    const err = new Error('Location is required to punch. Allow location access in your browser.')
    err.code = 'LOCATION_REQUIRED'
    throw err
  }
  if (distance > PUNCH_RADIUS_METERS) {
    const shown = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`
    const err = new Error(
      `You are ${shown} from the office — check-in/check-out is limited to a ${PUNCH_RADIUS_METERS}m radius. Move closer and try again.`
    )
    err.code = 'OUTSIDE_PUNCH_RADIUS'
    throw err
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getAddisNow() {
  const now = new Date()
  const addis = new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000)
  return {
    day: addis.getUTCDay(), // 0 = Sunday … 6 = Saturday
    minutes: addis.getUTCHours() * 60 + addis.getUTCMinutes(),
    time: addis.toISOString().slice(11, 16), // "HH:MM"
    date: addis.toISOString().slice(0, 10), // "YYYY-MM-DD"
  }
}

function isWorkDay(day) {
  return day >= 1 && day <= 5
}

function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

const WORK_START_LABEL = '08:00'

// Late = minutes past 08:00. Early departure = minutes before 17:30
// (waived for emergency check-outs — that's the point of the remark).
function deriveStats(checkIn, checkOut, isEmergency = false) {
  const late = Math.max(0, minutesBetween(WORK_START_LABEL, checkIn))
  const earlyDeparture = isEmergency
    ? 0
    : Math.max(0, WORK_END_MINUTES - minutesBetween('00:00', checkOut))
  const worked = minutesBetween(checkIn, checkOut)
  const overtime = Math.max(0, worked - STANDARD_WORK_MINUTES)
  return {
    late,
    earlyDeparture,
    regular: Math.round(Math.min(worked, STANDARD_WORK_MINUTES) / 15) * 0.25,
    overtime: Math.round(overtime / 15) * 0.25,
  }
}

// The JWT stores the auth user id (Int). Employee rows are linked to auth
// users by matching email — fallback is the first employee for demo seed.
async function ensureEmployee(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  // SQLite has no case-insensitive filter — normalise in JS instead.
  const email = (user.email || '').toLowerCase()
  const employees = await prisma.employee.findMany()
  const employee = employees.find((e) => (e.email || '').toLowerCase() === email)
  if (employee) return employee

  // Fallback for demo data where employee emails don't match auth users
  return prisma.employee.findFirst({ orderBy: { id: 'asc' } })
}

// Returns the employee's currently-active approved leave for the given date
// (leave range includes the date and the request was approved), or null.
async function getActiveLeave(employeeId, date) {
  return prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      approvalStatus: 'Approved',
      startDate: { lte: date },
      endDate: { gte: date },
    },
  })
}

function buildLeaveBlock(leave) {
  const err = new Error(
    `You are on ${leave.leaveType} until ${leave.endDate}. Check-in/check-out is disabled while on leave.`
  )
  err.code = 'ON_LEAVE'
  err.leaveType = leave.leaveType
  err.leaveEnd = leave.endDate
  return err
}

function buildStatus(attendance) {
  const punchClosed = Boolean(attendance.checkOut)
  return {
    record: attendance,
    checkedIn: Boolean(attendance.checkIn),
    checkedOut: punchClosed,
  }
}

// HR-adjusted status on today's record (e.g. changed to Absent, or
// emergency departure acknowledged). Consumed by the employee portal.
function buildHrStatus(attendance) {
  if (!attendance?.hrStatus) return null
  return {
    hrStatus: attendance.hrStatus,
    hrNote: attendance.hrNote || null,
    hrUpdatedAt: attendance.hrUpdatedAt || null,
  }
}

// Fresh punch status for the employee portal (includes HR feedback).
const punchStatus = (record) => ({
  ...buildStatus(record),
  employeeRemark: record.employeeRemark || null,
  isEmergency: record.status === 'Emergency Departure',
  ...buildHrStatus(record),
})

// ── GET /api/employer/punch — today's punch status ───────────

export async function getPunchStatus(req, res) {
  try {
    const employee = await ensureEmployee(req.user.id)
    if (!employee) {
      return res.status(404).json({ message: 'No employee profile linked to this account' })
    }

    const { date } = getAddisNow()
    const attendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date },
    })

    const activeLeave = await getActiveLeave(employee.id, date)

    res.json({
      date,
      workEnd: '17:30',
      checkIn: attendance?.checkIn || null,
      checkOut: attendance?.checkOut || null,
      checkedIn: Boolean(attendance?.checkIn),
      checkedOut: Boolean(attendance?.checkOut),
      isEmergency: attendance?.status === 'Emergency Departure',
      employeeRemark: attendance?.employeeRemark || null,
      hrStatus: attendance?.hrStatus || null,
      hrNote: attendance?.hrNote || null,
      hrUpdatedAt: attendance?.hrUpdatedAt || null,
      onLeave: activeLeave
        ? {
            leaveType: activeLeave.leaveType,
            startDate: activeLeave.startDate,
            endDate: activeLeave.endDate,
          }
        : null,
    })
  } catch (error) {
    console.error('Get punch status error:', error)
    res.status(500).json({ message: 'Failed to load punch status' })
  }
}

// ── POST /api/employer/punch/check-in ────────────────────────

export async function punchCheckIn(req, res) {
  try {
    const employee = await ensureEmployee(req.user.id)
    if (!employee) {
      return res.status(404).json({ message: 'No employee profile linked to this account' })
    }

    const { day, minutes, time, date } = getAddisNow()

    const activeLeave = await getActiveLeave(employee.id, date)
    if (activeLeave) {
      const leaveBlock = buildLeaveBlock(activeLeave)
      return res.status(403).json({
        message: leaveBlock.message,
        code: leaveBlock.code,
        leaveType: activeLeave.leaveType,
        leaveEnd: activeLeave.endDate,
      })
    }

    try {
      assertWithinPunchRadius(req)
    } catch (err) {
      return res.status(403).json({ message: err.message, code: err.code })
    }

    if (!isWorkDay(day)) {
      return res.status(400).json({ message: 'Weekend — check-in is disabled (Mon–Fri only).' })
    }
    if (minutes < WORK_START_MINUTES) {
      return res.status(400).json({ message: 'Check-in opens at 08:00 (UTC+3).' })
    }
    if (minutes > CHECK_IN_CUTOFF_MINUTES) {
      return res.status(400).json({ message: 'Check-in is closed after 14:00 (UTC+3).' })
    }

    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date },
    })

    if (existing?.checkIn) {
      return res.status(409).json({
        message: `Already checked in today at ${existing.checkIn}.`,
        ...buildStatus(existing),
      })
    }

    const late = Math.max(0, minutesBetween(WORK_START_LABEL, time))

    let attendance
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkIn: time, late, status: 'Present' },
      })
    } else {
      attendance = await prisma.attendance.create({
        data: {
          id: crypto.randomUUID(),
          employeeId: employee.id,
          employeeName: employee.name,
          department: employee.department,
          date,
          status: 'Present',
          checkIn: time,
          late,
        },
      })
    }

    emitAttendanceToHr(attendance)

    res.status(201).json({
      message: `Checked in at ${time} (UTC+3).`,
      ...punchStatus(attendance),
      stats: { late },
    })
  } catch (error) {
    console.error('Punch check-in error:', error)
    res.status(500).json({ message: 'Failed to check in' })
  }
}

// ── POST /api/employer/punch/check-out ───────────────────────
// The backend is the single source of truth: check-out is only
// accepted at/after 17:30 UTC+3. Earlier requests are rejected.

export async function punchCheckOut(req, res) {
  try {
    const employee = await ensureEmployee(req.user.id)
    if (!employee) {
      return res.status(404).json({ message: 'No employee profile linked to this account' })
    }

    const { day, minutes, time, date } = getAddisNow()

    const activeLeave = await getActiveLeave(employee.id, date)
    if (activeLeave) {
      const leaveBlock = buildLeaveBlock(activeLeave)
      return res.status(403).json({
        message: leaveBlock.message,
        code: leaveBlock.code,
        leaveType: activeLeave.leaveType,
        leaveEnd: activeLeave.endDate,
      })
    }

    try {
      assertWithinPunchRadius(req)
    } catch (err) {
      return res.status(403).json({ message: err.message, code: err.code })
    }

    if (!isWorkDay(day)) {
      return res.status(400).json({ message: 'Weekend — check-out is disabled (Mon–Fri only).' })
    }
    if (!req.body.emergency && minutes < WORK_END_MINUTES) {
      const remaining = WORK_END_MINUTES - minutes
      return res.status(400).json({
        message: `Check-out is only accepted at 17:30 (UTC+3). ${Math.floor(remaining / 60)}h ${remaining % 60}m remaining.`,
        code: 'CHECK_OUT_TOO_EARLY',
        remainingMinutes: remaining,
        workEnd: '17:30',
      })
    }

    const attendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date },
    })

    if (!attendance?.checkIn) {
      return res.status(400).json({ message: 'Check in first before checking out.' })
    }
    if (attendance.checkOut) {
      return res.status(409).json({
        message: `Already checked out today at ${attendance.checkOut}.`,
        ...buildStatus(attendance),
      })
    }

    const isEmergency = Boolean(req.body.emergency)
    const stats = deriveStats(attendance.checkIn, time, isEmergency)

    // Emergency check-outs must carry a reason and notify HR before the
    // record is closed. If HR can't be reached the punch is NOT recorded.
    if (isEmergency) {
      const reason = String(req.body.remark || '').trim()
      if (reason.length < 5) {
        return res.status(400).json({
          message: 'A reason (at least 5 characters) is required for an emergency check-out.',
        })
      }

      try {
        await notifyHrOfEmergencyCheckOut({
          senderUserId: req.user.id,
          employeeName: attendance.employeeName,
          employeeCode: employee.employeeId,
          date,
          time,
          reason,
        })
      } catch (err) {
        console.error('Emergency HR notification failed:', err)
        return res.status(502).json({
          message:
            'Could not reach HR. Your check-out was NOT recorded — try again or contact HR directly.',
        })
      }
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: time,
        earlyDeparture: stats.earlyDeparture,
        regular: stats.regular,
        overtime: stats.overtime,
        status: req.body.emergency ? 'Emergency Departure' : attendance.status,
        ...(req.body.emergency
          ? { employeeRemark: reason, emergencyAt: new Date() }
          : {}),
      },
    })

    // Live-update HR dashboards (also covers the emergency case).
    emitAttendanceToHr(updated)

    res.json({
      message: req.body.emergency
        ? `Emergency check-out recorded at ${time} (UTC+3).`
        : `Checked out at ${time} (UTC+3). See you tomorrow!`,
      ...punchStatus(updated),
      stats,
    })
  } catch (error) {
    console.error('Punch check-out error:', error)
    res.status(500).json({ message: 'Failed to check out' })
  }
}
