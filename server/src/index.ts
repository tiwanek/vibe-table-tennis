import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import matchRoutes from './routes/matches.js'
import tournamentRoutes from './routes/tournaments.js'
import { errorHandler } from './middleware/errorHandler.js'

export const prisma = new PrismaClient()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/tournaments', tournamentRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use(errorHandler)

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
