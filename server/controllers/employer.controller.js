// ------------------------------------------------------------------
// EMPLOYER TEAM — OWN THIS FILE
// Business logic for employer endpoints lives here.
// ------------------------------------------------------------------

import prisma from '../db.js'

export async function getDashboard(req, res) {
  // Example placeholder the employer team can build out.
  const userCount = await prisma.user.count()
  res.json({ message: 'Employer dashboard', userCount })
}