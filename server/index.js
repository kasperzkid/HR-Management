import http from 'node:http'
import jwt from 'jsonwebtoken'
import { Server as SocketServer } from 'socket.io'
import app from './app.js'

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

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})