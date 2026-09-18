import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import prisma from '../db.js'

const SECRET = process.env.JWT_SECRET || 'yanol-hr-secret-key-enterprise-2026'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function signSession(user, jti) {
  return jwt.sign({ sub: user.id, role: user.role, jti, type: 'session' }, SECRET, { expiresIn: EXPIRES_IN })
}

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  const jti = crypto.randomUUID()
  const token = signSession(user, jti)

  const decoded = jwt.decode(token)
  await prisma.session.create({
    data: {
      jti,
      userId: user.id,
      expiresAt: new Date(decoded.exp * 1000),
    },
  })

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  })
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  res.json({ user })
}

export async function logout(req, res) {
  await prisma.session.update({
    where: { id: req.session.id },
    data: { revokedAt: new Date() },
  })
  res.json({ message: 'Logged out' })
}
