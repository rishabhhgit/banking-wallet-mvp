import { redis } from './redis'
import { logger } from './logger'

const CACHE_PREFIX = 'cache:'
const DEFAULT_TTL = 60 // 60 seconds

interface CacheOptions {
  ttl?: number
  prefix?: string
}

class CacheService {
  private defaultTtl: number
  private prefix: string
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  }

  constructor(options: CacheOptions = {}) {
    this.defaultTtl = options.ttl || DEFAULT_TTL
    this.prefix = options.prefix || CACHE_PREFIX
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(this.getKey(key))
      if (data) {
        this.stats.hits++
        logger.debug(`Cache hit: ${key}`)
        return JSON.parse(data) as T
      }
      this.stats.misses++
      logger.debug(`Cache miss: ${key}`)
      return null
    } catch (error) {
      logger.warn(`Cache get failed for ${key}`)
      return null
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const data = JSON.stringify(value)
      const expiration = ttl || this.defaultTtl
      await redis.setex(this.getKey(key), expiration, data)
      this.stats.sets++
      logger.debug(`Cache set: ${key} (TTL: ${expiration}s)`)
    } catch (error) {
      logger.warn(`Cache set failed for ${key}`)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(this.getKey(key))
      this.stats.deletes++
      logger.debug(`Cache delete: ${key}`)
    } catch (error) {
      logger.warn(`Cache delete failed for ${key}`)
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(this.getKey(pattern))
      if (keys.length > 0) {
        await redis.del(...keys)
        this.stats.deletes += keys.length
        logger.debug(`Cache delete pattern: ${pattern} (${keys.length} keys)`)
      }
    } catch (error) {
      logger.warn(`Cache delete pattern failed for ${pattern}`)
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.delPattern(`user:${userId}:*`)
    await this.delPattern(`accounts:${userId}`)
  }

  getStats() {
    return { ...this.stats }
  }

  resetStats() {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 }
  }
}

export const cache = new CacheService({ ttl: 60 })

// Account-specific caching helpers
export const accountCache = {
  async getAccount(accountId: string) {
    return cache.get<any>(`account:${accountId}`)
  },

  async setAccount(accountId: string, account: any, ttl = 30) {
    await cache.set(`account:${accountId}`, account, ttl)
  },

  async invalidateAccount(accountId: string) {
    await cache.del(`account:${accountId}`)
  },

  async getUserAccounts(userId: string) {
    return cache.get<any[]>(`accounts:${userId}`)
  },

  async setUserAccounts(userId: string, accounts: any[], ttl = 30) {
    await cache.set(`accounts:${userId}`, accounts, ttl)
  },

  async invalidateUserAccounts(userId: string) {
    await cache.del(`accounts:${userId}`)
  },

  async getAccountBalance(accountId: string) {
    const account = await this.getAccount(accountId)
    return account?.balance ?? null
  },

  async updateAccountBalance(accountId: string, newBalance: number) {
    const account = await this.getAccount(accountId)
    if (account) {
      account.balance = newBalance
      await this.setAccount(accountId, account)
    }
  },
}
