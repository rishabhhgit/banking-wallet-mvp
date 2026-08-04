import { redis } from './redis'
import { logger } from './logger'

interface Metric {
  name: string
  value: number
  labels?: Record<string, string>
  timestamp: number
}

const METRICS_PREFIX = 'metrics:'
const COUNTERS_KEY = `${METRICS_PREFIX}counters`
const HISTOGRAMS_KEY = `${METRICS_PREFIX}histograms`

class MetricsService {
  private counters: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()
  private persistenceInterval: NodeJS.Timeout | null = null
  private redisAvailable = true
  private lastRedisAttempt = 0
  private redisRetryDelay = 30000 // 30 seconds

  constructor() {
    // Load persisted metrics on startup
    this.loadFromRedis()
    
    // Persist metrics to Redis every 30 seconds
    this.persistenceInterval = setInterval(() => {
      this.persistToRedis()
    }, 30000)
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name
    const sortedLabels = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    return `${name}{${sortedLabels}}`
  }

  private async loadFromRedis() {
    try {
      // Load counters
      const countersData = await redis.hgetall(COUNTERS_KEY)
      if (countersData) {
        for (const [key, value] of Object.entries(countersData)) {
          this.counters.set(key, parseInt(value, 10) || 0)
        }
      }

      // Load histograms
      const histogramsData = await redis.hgetall(HISTOGRAMS_KEY)
      if (histogramsData) {
        for (const [key, value] of Object.entries(histogramsData)) {
          this.histograms.set(key, JSON.parse(value))
        }
      }

      this.redisAvailable = true
      logger.info(`Metrics loaded from Redis (counters=${this.counters.size}, histograms=${this.histograms.size})`)
    } catch (error) {
      this.redisAvailable = false
      this.lastRedisAttempt = Date.now()
      logger.warn('Failed to load metrics from Redis, starting fresh')
    }
  }

  private async persistToRedis() {
    // Skip if Redis was recently unavailable
    if (!this.redisAvailable && Date.now() - this.lastRedisAttempt < this.redisRetryDelay) {
      return
    }

    try {
      // Persist counters
      const countersData: Record<string, string> = {}
      this.counters.forEach((value, key) => {
        countersData[key] = String(value)
      })
      if (Object.keys(countersData).length > 0) {
        await redis.del(COUNTERS_KEY)
        await redis.hset(COUNTERS_KEY, countersData)
      }

      // Persist histograms (keep only summary stats, not all values)
      const histogramsData: Record<string, string> = {}
      this.histograms.forEach((values, key) => {
        const sorted = [...values].sort((a, b) => a - b)
        const sum = sorted.reduce((a, b) => a + b, 0)
        const stats = {
          count: sorted.length,
          sum,
          avg: sum / sorted.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
          p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
          p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
          values: sorted.slice(-1000), // Keep last 1000 values
        }
        histogramsData[key] = JSON.stringify(stats)
      })
      if (Object.keys(histogramsData).length > 0) {
        await redis.del(HISTOGRAMS_KEY)
        await redis.hset(HISTOGRAMS_KEY, histogramsData)
      }

      this.redisAvailable = true
      logger.debug('Metrics persisted to Redis')
    } catch (error) {
      this.redisAvailable = false
      this.lastRedisAttempt = Date.now()
      logger.warn('Failed to persist metrics to Redis, will retry later')
    }
  }

  counter(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)
  }

  gauge(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels)
    this.counters.set(key, value)
  }

  histogram(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels)
    let values = this.histograms.get(key)
    if (!Array.isArray(values)) {
      values = []
    }
    values.push(value)
    // Keep only last 10000 values to prevent memory issues
    if (values.length > 10000) {
      values.splice(0, values.length - 10000)
    }
    this.histograms.set(key, values)
  }

  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.getMetricKey(name, labels)
    return this.counters.get(key) || 0
  }

  getHistogram(name: string, labels?: Record<string, string>): {
    count: number
    sum: number
    avg: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
  } | null {
    const key = this.getMetricKey(name, labels)
    const values = this.histograms.get(key) || []
    if (values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)

    return {
      count: sorted.length,
      sum,
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }

  getAll(): Record<string, any> {
    const counters: Record<string, number> = {}
    this.counters.forEach((value, key) => {
      counters[key] = value
    })

    const histograms: Record<string, any> = {}
    this.histograms.forEach((values, key) => {
      const sorted = [...values].sort((a, b) => a - b)
      const sum = sorted.reduce((a, b) => a + b, 0)
      histograms[key] = {
        count: sorted.length,
        sum,
        avg: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      }
    })

    return { counters, histograms }
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable
  }

  async shutdown() {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval)
    }
    await this.persistToRedis()
  }

  reset() {
    this.counters.clear()
    this.histograms.clear()
  }
}

export const metrics = new MetricsService()

// HTTP request metrics middleware
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start

    metrics.counter('http_requests_total', 1, { method: req.method, status: String(res.statusCode) })
    metrics.histogram('http_request_duration_ms', duration, { method: req.method, path: req.route?.path || req.path })

    if (res.statusCode >= 400) {
      metrics.counter('http_errors_total', 1, { method: req.method, status: String(res.statusCode) })
    }
  })

  next()
}

// Business metrics
export const trackTransfer = (status: 'success' | 'failed' | 'insufficient_funds') => {
  metrics.counter('transfers_total', 1, { status })
}

export const trackUserAction = (action: 'register' | 'login' | 'logout' | 'forgot_password' | 'reset_password') => {
  metrics.counter('user_actions_total', 1, { action })
}

export const trackAuditEvent = (eventType: string) => {
  metrics.counter('audit_events_total', 1, { event_type: eventType })
}

// Prometheus format exporter
export const getPrometheusMetrics = (): string => {
  const all = metrics.getAll()
  const lines: string[] = []

  // Counters
  for (const [key, value] of Object.entries(all.counters)) {
    const safeName = key.replace(/[{}="]/g, '_')
    lines.push(`# HELP ${safeName} Counter metric`)
    lines.push(`# TYPE ${safeName} counter`)
    lines.push(`${safeName} ${value}`)
  }

  // Histograms
  for (const [key, stats] of Object.entries(all.histograms)) {
    const safeName = key.replace(/[{}="]/g, '_')
    const s = stats as { count: number; sum: number; avg: number; min: number; max: number; p50: number; p95: number; p99: number }
    lines.push(`# HELP ${safeName} Histogram metric`)
    lines.push(`# TYPE ${safeName} histogram`)
    lines.push(`${safeName}_count ${s.count}`)
    lines.push(`${safeName}_sum ${s.sum}`)
    lines.push(`${safeName}_avg ${s.avg}`)
    lines.push(`${safeName}_min ${s.min}`)
    lines.push(`${safeName}_max ${s.max}`)
    lines.push(`${safeName}_p50 ${s.p50}`)
    lines.push(`${safeName}_p95 ${s.p95}`)
    lines.push(`${safeName}_p99 ${s.p99}`)
  }

  return lines.join('\n') + '\n'
}
