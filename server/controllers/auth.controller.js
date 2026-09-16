import prisma from '../db.js'

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
}