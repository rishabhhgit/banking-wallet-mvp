import { Request, Response, NextFunction } from 'express'

export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const nonce = Buffer.from(Math.random().toString(36).substring(2)).toString('base64')
  
  // Store nonce for use in templates if needed
  res.locals.cspNonce = nonce

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: https:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ]

  // In development, allow unsafe-eval for hot reloading
  if (process.env.NODE_ENV === 'development') {
    directives[1] = `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}'`
  }

  const csp = directives.join('; ')

  res.setHeader('Content-Security-Policy', csp)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  next()
}
