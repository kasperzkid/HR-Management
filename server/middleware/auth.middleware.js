import jwt from 'jsonwebtoken'

const JWT_SECRET =
  process.env.JWT_SECRET || 'hr-management-development-secret'

export function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || ''

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required',
      })
    }

    const token = authorization.slice(7).trim()

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required',
      })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    req.user = decoded

    next()
  } catch (error) {
    console.error('Authentication error:', error)

    return res.status(401).json({
      message: 'Invalid or expired authentication token',
    })
  }
}