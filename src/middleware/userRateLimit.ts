import rateLimit from 'express-rate-limit'
import { AuthenticatedRequest } from './auth'

// Per-user rate limiter using Redis store
const createUserRateLimit = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const authReq = req as AuthenticatedRequest
      return authReq.userId || req.ip || 'unknown'
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests from this user',
        retryAfter: Math.ceil(windowMs / 1000),
      })
    },
    skipSuccessfulRequests: false,
    // Use default in-memory store for compatibility
    // In production, use RedisStore with ioredis
  })
}

// Per-user transfer rate limiter - stricter for financial operations
export const userTransferLimiter = createUserRateLimit(60 * 1000, 10) // 10 per minute

// Per-user API rate limiter
export const userApiLimiter = createUserRateLimit(15 * 60 * 1000, 200) // 200 per 15 minutes

// Per-user auth rate limiter
export const userAuthLimiter = createUserRateLimit(15 * 60 * 1000, 20) // 20 per 15 minutes
