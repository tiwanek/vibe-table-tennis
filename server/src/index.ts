import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import matchRoutes from './routes/matches.js'
import tournamentRoutes from './routes/tournaments.js'
import { errorHandler } from './middleware/errorHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const prisma = new PrismaClient()

const app = express()
const PORT = process.env.PORT || 3001
const isProduction = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/tournaments', tournamentRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve static files in production
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDistPath))

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'))
    }
  })
}

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
  if (isProduction) {
    console.log('Serving static files from client/dist')
  }
})

export default app
