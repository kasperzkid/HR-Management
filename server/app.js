import './env.js'
import express from 'express'
import cors from 'cors'

import authRoutes      from './routes/auth.routes.js'
import employerRoutes   from './routes/employer.routes.js'
import hrManagerRoutes  from './routes/hr-manager.routes.js'
import messagesRoutes    from './routes/messages.routes.js'
import announcementsRoutes from './routes/announcements.routes.js'
import { requirePermission } from './middleware/rbac.middleware.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '4mb' }))

// ─── Public routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// ─── Protected / dashboard routes ─────────────────────────────
app.use('/api/employer',   employerRoutes)
app.use('/api/hr-manager', hrManagerRoutes)
app.use('/api/messages', messagesRoutes)

// Announcements are read by every signed-in account - the employee portal shows
// them too - so the read is left to the route's own filtering. Writing is HR
// work and is permission-checked.
//
// The guard sits here rather than inside the router because the announcement
// router and controller are the user's own in-progress files, and a guard in
// front of them gets the 403 enforced without editing them. The controller
// keeps its own role check as a second layer.
app.post('/api/announcements', ...requirePermission('announcements.create'))
app.delete('/api/announcements/:id', ...requirePermission('announcements.delete'))
app.use('/api/announcements', announcementsRoutes)

// ─── 404 fallback ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' })
})

export default app
