import rateLimit from 'express-rate-limit'
import { redis } from '../lib/redis'
import { AuthenticatedRequest } from './auth'

// Per-user rate limiter using Redis store
const createUserRateLimit = (windowMs: number, max: number) => {
  const store = new Map<string, { count: number; resetTime: number }>()

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
  })
}

// Per-user transfer rate limiter - stricter for financial operations
export const userTransferLimiter = createUserRateLimit(60 * 1000, 10) // 10 per minute

// Per-user API rate limiter
export const userApiLimiter = createUserRateLimit(15 * 60 * 1000, 200) // 200 per 15 minutes

// Per-user auth rate limiter
export const userAuthLimiter = createUserRateLimit(15 * 60 * 1000, 20) // 20 per 15 minutes

// Custom Redis-based rate limiter for distributed systems
class DistributedRateLimiter {
  private windowMs: number
  private max: number
  private prefix: string

  constructor(prefix: string, windowMs: number, max: number) {
    this.prefix = prefix
    this.windowMs = windowMs
    this.max = max
  }

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const windowKey = `${this.prefix}:${key}:${Math.floor(now / this.windowMs)}`
    const resetTime = Math.ceil((now + this.windowMs) / 1000)

    try {
      const current = await redis.incr(windowKey)
      
      if (current === 1) {
        await redis.expire(windowKey, Math.ceil(this.windowMs / 1000))
      }

      const remaining = Math.max(0, this.max - current)

      return {
        allowed: current <= this.max,
        remaining,
        resetTime,
      }
    } catch (error) {
      // If Redis is down, allow the request
      return { allowed: true, remaining: this.max, resetTime }
    }
  }

  middleware() {
    return async (req: any, res: any, next: any) => {
      const authReq = req as AuthenticatedRequest
      const key = authReq.userId || req.ip || 'unknown'
      
      const result = await this.check(key)
      
      res.setHeader('X-RateLimit-Limit', String(this.max))
      res.setHeader('X-RateLimit-Remaining', String(result.remaining))
      res.setHeader('X-RateLimit-Reset', String(result.resetTime))

      if (!result.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(this.windowMs / 1000),
        })
        return
      }

      next()
    }
  }
}

// Distributed rate limiters
export const distributedTransferLimiter = new DistributedRateLimiter('transfer', 60 * 1000, 10)
export const distributedApiLimiter = new DistributedRateLimiter('api', 15 * 60 * 1000, 200)
