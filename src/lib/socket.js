import { io } from 'socket.io-client'
import { getToken } from './auth'

// Socket.IO lives behind the Vite dev proxy (/:5173 -> :4000) in development and
// on the same origin in a build, so connect to the current origin unless overridden.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

let socket = null

export function connectSocket() {
  const token = getToken()
  if (!token) return null
  if (socket && socket.connected) return socket

  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  })

  socket.on('connect_error', (err) => {
    if (err.message === 'Invalid token' || err.message === 'Missing token') {
      socket.close()
    }
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}