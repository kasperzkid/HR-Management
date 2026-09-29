import './env.js'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import { Server as SocketServer } from 'socket.io'
import app from './app.js'
import { verifySmtpConfiguration } from './services/email.service.js'

const PORT = process.env.PORT || 4000
const server = http.createServer(app)
const io = new SocketServer(server, {
  cors: { origin: true, credentials: true },
})
app.set('io', io)

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Missing token'))
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET || 'hr-management-development-secret')
    return next()
  } catch {
    return next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  socket.join(`user:${socket.user.userId}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`API server is already running on http://localhost:${PORT}`)
    process.exit(0)
  }
  throw error
})

/**
 * Report the email configuration at startup.
 *
 * This deliberately does not stop the server. Without working email the app is
 * still usable for everything except password resets and emailing new
 * employees their temporary password, and both of those endpoints already
 * return a clear error rather than pretending to succeed. Crashing the whole
 * HR system over a missing mail server would be a far worse outcome.
 */
async function reportEmailStatus() {
  const { ok, message, hint } = await verifySmtpConfiguration()

  const line = ok
    ? `[email] OK  ${message}`
    : `[email] NOT READY  ${message}`

  if (ok) {
    console.log(line)
    return
  }

  console.warn('')
  console.warn('  +-- Email (SMTP) is not working --------------------------')
  console.warn(`  | ${message}`)
  if (hint) console.warn(`  | ${hint}`)
  console.warn('  |')
  console.warn('  | Affected: "Forgot password", confirming a login-email')
  console.warn('  | change, and emailing a new employee their temporary')
  console.warn('  | password. Everything else still works.')
  console.warn('  | An email change can still be confirmed from the server')
  console.warn('  | console: npm run auth:confirm-email')
  console.warn('  | Run "npm run email:check" to re-test on its own.')
  console.warn('  +---------------------------------------------------------')
  console.warn('')
}

server.listen(PORT, async () => {
  console.log(`API server running on http://localhost:${PORT}`)

  try {
    await reportEmailStatus()
  } catch (error) {
    console.error(
      '[email] startup check failed unexpectedly:',
      error?.message || error,
    )
  }
})