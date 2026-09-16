// ------------------------------------------------------------------
// HR-MANAGER TEAM — OWN THIS FILE
// Business logic for HR-Manager endpoints lives here.
// ------------------------------------------------------------------

import prisma from '../db.js'

export async function getDashboard(req, res) {
  const userCount = await prisma.user.count()
  res.json({ message: 'HR Manager dashboard', userCount })
}