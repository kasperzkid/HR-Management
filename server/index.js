import http from 'node:http'
import fs from 'node:fs'
import app from './app.js'
import { initSocket } from './socket.js'
import { UPLOAD_DIR } from './middleware/upload.js'

const PORT = process.env.PORT || 4000

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const server = http.createServer(app)

initSocket(server)

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})