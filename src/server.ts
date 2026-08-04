import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import passport from 'passport'
import session from 'express-session'
import { randomUUID } from 'crypto'

import userRoutes from './routes/user.routes'
import accountRoutes from './routes/account.routes'
import transactionRoutes from './routes/transaction.routes'
import streamRoutes from './routes/stream.routes'
import twoFactorRoutes from './routes/twoFactor.routes'
import adminRoutes from './routes/admin.routes'
import { authLimiter, apiLimiter } from './middleware/rateLimit'
import { userApiLimiter } from './middleware/userRateLimit'
import { cspMiddleware } from './middleware/csp'
import { sanitizeInput } from './middleware/sanitize'
import { redis } from './lib/redis'
import { logger } from './lib/logger'
import { getQueueHealth, shutdownQueues } from './services/queue.service'
import { getEventCounts, getRecentEvents } from './services/audit.service'
import { getClientCount } from './services/streaming.service'
import { configureGoogleAuth } from './config/google-auth'
import { setupShutdownHandlers } from './lib/shutdown'
import { metrics, metricsMiddleware, getPrometheusMetrics } from './lib/metrics'
import { initSentry, captureException } from './lib/sentry'
import { setupSwagger } from './lib/swagger'
import { getCircuitBreakerStats } from './lib/circuit-breaker'

// Initialize Sentry before other middleware
initSentry()

const app = express()
const PORT = process.env.PORT || '8000'

// Request ID middleware
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID()
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
})

// Middleware
app.use(helmet())
app.use(cspMiddleware)

// CORS - restrict to allowed origins
const isDev = process.env.NODE_ENV !== 'production'
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || []
app.use(
  cors({
    origin: isDev
      ? true
      : allowedOrigins.length > 0
        ? allowedOrigins
        : false,
    credentials: true,
  })
)

// Session (required for Passport)
app.use(session({
  secret: process.env.JWT_SECRET || 'session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isDev ? false : true },
}))

// Passport
app.use(passport.initialize())
app.use(passport.session())
configureGoogleAuth()

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'],
    })
  })
  next()
})

// Reduced body limit for banking API (100KB max)
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true }))

// Global rate limiter
app.use(apiLimiter)

// Input sanitization
app.use(sanitizeInput)

// Metrics middleware
app.use(metricsMiddleware)

// Swagger documentation
setupSwagger(app)

// Enhanced health check
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {}

  // Database check
  try {
    const { db } = await import('./lib/db')
    await db.$queryRaw`SELECT 1`
    checks.postgres = 'healthy'
  } catch {
    checks.postgres = 'unhealthy'
  }

  // Redis check
  try {
    await redis.ping()
    checks.redis = 'healthy'
  } catch {
    checks.redis = 'unhealthy'
  }

  // Queue check
  try {
    const queueHealth = await getQueueHealth()
    checks.queues = 'healthy'
    checks.queue_depth = String(queueHealth.transactions.waiting)
  } catch {
    checks.queues = 'unhealthy'
  }

  // SSE clients
  checks.sse_clients = String(getClientCount())

  const allHealthy = Object.values(checks).every(
    (v) => v === 'healthy' || !v.includes('unhealthy')
  )

  // Circuit breaker stats
  const circuitBreakers = getCircuitBreakerStats()

  const status = allHealthy ? 200 : 503
  res.status(status).json({
    status: allHealthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    checks,
    circuitBreakers,
    uptime: process.uptime(),
  })
})

// Detailed health for ops
app.get('/health/ready', async (req, res) => {
  try {
    const { db } = await import('./lib/db')
    await db.$queryRaw`SELECT 1`
    await redis.ping()
    res.json({ status: 'ready' })
  } catch {
    res.status(503).json({ status: 'not ready' })
  }
})

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.send(getPrometheusMetrics())
})

// JSON metrics endpoint
app.get('/metrics/json', (req, res) => {
  res.json(metrics.getAll())
})

// API Versioning
const v1Router = express.Router()

// Mount routes on v1 router
v1Router.use('/users', authLimiter, userRoutes)
v1Router.use('/accounts', accountRoutes)
v1Router.use('/transactions', transactionRoutes)
v1Router.use('/stream', streamRoutes)
v1Router.use('/2fa', twoFactorRoutes)
v1Router.use('/admin', adminRoutes)

// Audit endpoints on v1
v1Router.get('/audit/recent', async (req, res) => {
  try {
    const events = await getRecentEvents(50)
    res.json(events)
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit events' })
  }
})

v1Router.get('/audit/counts', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24
    const counts = await getEventCounts(hours)
    res.json(counts)
  } catch {
    res.status(500).json({ error: 'Failed to fetch event counts' })
  }
})

// Mount v1 router
app.use('/api/v1', v1Router)

// Legacy routes (redirect to v1)
app.use('/api/users', (req, res) => {
  res.redirect(301, `/api/v1/users${req.url}`)
})
app.use('/api/accounts', (req, res) => {
  res.redirect(301, `/api/v1/accounts${req.url}`)
})
app.use('/api/transactions', (req, res) => {
  res.redirect(301, `/api/v1/transactions${req.url}`)
})
app.use('/api/stream', (req, res) => {
  res.redirect(301, `/api/v1/stream${req.url}`)
})
app.use('/api/audit', (req, res) => {
  res.redirect(301, `/api/v1/audit${req.url}`)
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error({ err }, 'Unhandled error')
    captureException(err, {
      url: req.url,
      method: req.method,
      requestId: req.headers['x-request-id'],
    })
    res.status(500).json({ error: 'Something went wrong!' })
  }
)

const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`)
  logger.info(`Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
setupShutdownHandlers(server)
