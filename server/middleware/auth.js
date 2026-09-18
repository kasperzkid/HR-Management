import jwt from 'jsonwebtoken'
import prisma from '../db.js'

const SECRET = process.env.JWT_SECRET || 'yanol-hr-secret-key-enterprise-2026'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' })
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, SECRET)

    if (payload.type !== 'session') {
      return res.status(401).json({ message: 'Invalid token type' })
    }

    req.user = { id: payload.sub, role: payload.role, jti: payload.jti }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export function requireSession(req, res, next) {
  const { jti } = req.user

  prisma.session
    .findUnique({ where: { jti } })
    .then((session) => {
      if (!session || session.revokedAt) {
        return res.status(401).json({ message: 'Session revoked', code: 'SESSION_REVOKED' })
      }
      if (session.expiresAt < new Date()) {
        return res.status(401).json({ message: 'Session expired', code: 'SESSION_EXPIRED' })
      }
      req.session = session
      next()
    })
    .catch(next)
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' })
    }
    next()
  }
}
