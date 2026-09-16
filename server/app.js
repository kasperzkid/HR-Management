import express from 'express'
import cors from 'cors'

import authRoutes      from './routes/auth.routes.js'
import employerRoutes   from './routes/employer.routes.js'
import hrManagerRoutes  from './routes/hr-manager.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

// ─── Public routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// ─── Protected / dashboard routes ─────────────────────────────
app.use('/api/employer',   employerRoutes)
app.use('/api/hr-manager', hrManagerRoutes)

// ─── 404 fallback ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' })
})

export default app