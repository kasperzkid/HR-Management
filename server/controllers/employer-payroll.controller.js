// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// GET /api/employer/payroll — certified payroll run history from the
// PayrollRecord table. EMPLOYEE accounts only receive their own rows
// (matched by email, same as the leave controller); EMPLOYER and
// HR_MANAGER accounts receive all records.
// ------------------------------------------------------------------

import prisma from '../db.js'

export async function getPayrollRecords(req, res) {
  try {
    const { payrollMonth } = req.query
    const where = {}

    if (payrollMonth) {
      where.payrollMonth = payrollMonth
    }

    if (req.user.role === 'EMPLOYEE') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } })
      const email = (user?.email || '').toLowerCase()

      // SQLite has no case-insensitive filter — normalise in JS.
      const employees = await prisma.employee.findMany()
      const me = employees.find((e) => (e.email || '').toLowerCase() === email)
      if (!me) {
        return res.json({ records: [] })
      }
      where.employeeId = me.id
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      orderBy: [{ payrollMonth: 'desc' }, { employeeName: 'asc' }],
    })

    res.json({ records })
  } catch (error) {
    console.error('Get payroll records error:', error)
    res.status(500).json({ message: 'Failed to load payroll records' })
  }
}
