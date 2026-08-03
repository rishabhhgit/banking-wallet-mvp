import rateLimit from 'express-rate-limit'

// Strict rate limit for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
  skipSuccessfulRequests: true,
})

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

// Transfer rate limiter - more restrictive for financial operations
export const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 transfers per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many transfers, please wait before trying again' },
})

// Refresh token rate limiter - prevent brute force attacks
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 refresh attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts, please try again later' },
  skipSuccessfulRequests: true,
})
