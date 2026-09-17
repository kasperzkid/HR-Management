import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.routes.js'
import employerRoutes from './routes/employer.routes.js'
import hrManagerRoutes from './routes/hr-manager.routes.js'
import messageRoutes from './routes/message.routes.js'
import { authenticate, requireSession, authorize } from './middleware/auth.js'
import { UPLOAD_DIR } from './middleware/upload.js'

const app = express()

app.use(cors())
app.use(express.json())

// Served uploaded message attachments
app.use('/uploads', express.static(UPLOAD_DIR))

// Public routes
app.use('/api/auth', authRoutes)

// Protected routes — messaging (any authenticated role)
app.use('/api/messages', authenticate, requireSession, messageRoutes)

// Protected routes — employer only
app.use(
  '/api/employer',
  authenticate,
  requireSession,
  authorize('EMPLOYER', 'HR_MANAGER'),
  employerRoutes
)

// Protected routes — hr-manager only
app.use(
  '/api/hr-manager',
  authenticate,
  requireSession,
  authorize('HR_MANAGER', 'EMPLOYER'),
  hrManagerRoutes
)

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' })
})

export default app
