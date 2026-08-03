import { Request, Response, NextFunction } from 'express'

// HTML entity encoding for XSS prevention
const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// SQL injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FETCH|DECLARE|TRUNCATE)\b)/i,
  /(--|;|\/\*|\*\/|xp_|sp_)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(CHAR\(|CONCAT\(|0x[0-9a-f]+)/i,
]

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\'/g,
  /%2e%2e/i,
]

// NoSQL injection patterns
const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$regex/i,
  /\$ne/i,
  /\$gt/i,
  /\$lt/i,
]

const containsSqlInjection = (value: string): boolean => {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value))
}

const containsPathTraversal = (value: string): boolean => {
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(value))
}

const containsNoSqlInjection = (value: string): boolean => {
  return NOSQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value))
}

const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return escapeHtml(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  return obj
}

const detectInjection = (obj: any, path = ''): string | null => {
  if (typeof obj === 'string') {
    if (containsSqlInjection(obj)) {
      return `${path}: SQL injection attempt detected`
    }
    if (containsPathTraversal(obj)) {
      return `${path}: Path traversal attempt detected`
    }
    if (containsNoSqlInjection(obj)) {
      return `${path}: NoSQL injection attempt detected`
    }
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = detectInjection(obj[i], `${path}[${i}]`)
      if (result) return result
    }
  }
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const result = detectInjection(value, path ? `${path}.${key}` : key)
      if (result) return result
    }
  }
  return null
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // Detect injection attempts
    const injectionResult = detectInjection(req.body)
    if (injectionResult) {
      res.status(400).json({ error: 'Invalid input detected' })
      return
    }

    // Sanitize HTML entities
    req.body = sanitizeObject(req.body)
  }

  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        const injectionResult = detectInjection(value)
        if (injectionResult) {
          res.status(400).json({ error: 'Invalid input detected' })
          return
        }
      }
    }
  }

  next()
}
