import './lib/env'
import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { logger } from './lib/logger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { generalRateLimit } from './middleware/rateLimit'
import authRoutes from './routes/auth'
import accountRoutes from './routes/accounts'
import budgetRoutes from './routes/budgets'
import stockRoutes from './routes/stocks'
import taxRoutes from './routes/tax'
import invitationRoutes from './routes/invitations'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())
app.use(pinoHttp({ logger }))
app.use(generalRateLimit)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/accounts', accountRoutes)
app.use('/api/v1/budgets', budgetRoutes)
app.use('/api/v1/stocks', stockRoutes)
app.use('/api/v1/tax', taxRoutes)
app.use('/api/v1/invitations', invitationRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

// Skip listen() when running as a Vercel serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Clearline API running on http://localhost:${PORT}`)
  })
}

export default app
