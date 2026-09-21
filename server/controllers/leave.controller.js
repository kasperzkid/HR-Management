// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// Employer leave endpoints:
//   GET  /api/employer/leave   — my leave requests (+ balance summary)
//   POST /api/employer/leave   — create a pending leave request
// Employee identity comes from the authenticated user, matched to an
// Employee row by email (SQLite — normalised in JS).
// ------------------------------------------------------------------

import crypto from 'node:crypto'
import prisma from '../db.js'

// ── Helpers ──────────────────────────────────────────────────

// NETWORKDAYS(start, end) — business days between two dates, inclusive
function networkdays(start, end) {
  const startD = new Date(start)
  const endD = new Date(end)
  let count = 0
  const cursor = new Date(startD)
  while (cursor <= endD) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

async function ensureEmployee(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const email = (user.email || '').toLowerCase()
  const employees = await prisma.employee.findMany()
  const employee = employees.find((e) => (e.email || '').toLowerCase() === email)
  if (employee) return employee

  // Fallback for demo data where employee emails don't match auth users
  return prisma.employee.findFirst({ orderBy: { id: 'asc' } })
}

// ── GET /api/employer/leave ──────────────────────────────────

export async function getMyLeave(req, res) {
  try {
    const employee = await ensureEmployee(req.user.id)
    if (!employee) {
      return res.status(404).json({ message: 'No employee profile linked to this account' })
    }

    const requests = await prisma.leaveRequest.findMany({
      where: { businessId: employee.employeeId },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ requests })
  } catch (error) {
    console.error('Get my leave error:', error)
    res.status(500).json({ message: 'Failed to load leave requests' })
  }
}

// ── POST /api/employer/leave ─────────────────────────────────

export async function createLeave(req, res) {
  try {
    // ── Resolve employee ───────────────────────────────────────
    // Priority 1: employeeId sent from the employee portal (UUID or business ID).
    // Priority 2: authenticated user → match by email (existing behaviour).
    // Priority 3: first employee in DB (demo fallback).
    let employee = null

    const bodyEmployeeId = req.body?.employeeId
    if (bodyEmployeeId) {
      employee = await prisma.employee.findUnique({ where: { id: bodyEmployeeId } })
      if (!employee) {
        employee = await prisma.employee.findUnique({ where: { employeeId: bodyEmployeeId } })
      }
    }

    if (!employee && req.user?.id) {
      employee = await ensureEmployee(req.user.id)
    }

    if (!employee) {
      return res.status(404).json({ message: 'No employee profile linked to this account' })
    }

    const { leaveType, startDate, endDate, remarks } = req.body || {}

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ message: 'leaveType, startDate and endDate are required' })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start/end date' })
    }
    if (end < start) {
      return res.status(400).json({ message: 'End date must be on or after start date' })
    }

    const days = networkdays(startDate, endDate)

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
        balance: null,
        businessId: employee.employeeId,
      },
    })

    res.status(201).json({ request: created })
  } catch (error) {
    console.error('Create leave error:', error)
    res.status(500).json({ message: 'Failed to create leave request' })
  }
}
