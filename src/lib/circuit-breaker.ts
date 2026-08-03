import { logger } from './logger'

interface CircuitBreakerOptions {
  failureThreshold?: number
  successThreshold?: number
  timeout?: number
  monitoringPeriod?: number
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0
  private options: Required<CircuitBreakerOptions>

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 3,
      timeout: options.timeout ?? 30000,
      monitoringPeriod: options.monitoringPeriod ?? 10000,
    }
  }

  private name: string

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
        logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`)
      }
    }
    return this.state
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState()

    if (state === 'OPEN') {
      logger.warn(`Circuit breaker ${this.name} is OPEN, rejecting request`)
      throw new CircuitBreakerOpenError(`Circuit breaker ${this.name} is open`)
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED'
        this.failureCount = 0
        this.successCount = 0
        logger.info(`Circuit breaker ${this.name} closed after recovery`)
      }
    } else {
      this.failureCount = 0
    }
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN'
      logger.warn(`Circuit breaker ${this.name} re-opened from HALF_OPEN`)
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN'
      logger.warn(`Circuit breaker ${this.name} opened after ${this.failureCount} failures`)
    }
  }

  getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

// Circuit breakers for external dependencies
export const databaseCircuitBreaker = new CircuitBreaker('database', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
})

export const redisCircuitBreaker = new CircuitBreaker('redis', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
})

export const externalApiCircuitBreaker = new CircuitBreaker('external-api', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000,
})

// Get all circuit breaker stats
export const getCircuitBreakerStats = () => ({
  database: databaseCircuitBreaker.getStats(),
  redis: redisCircuitBreaker.getStats(),
  externalApi: externalApiCircuitBreaker.getStats(),
})
