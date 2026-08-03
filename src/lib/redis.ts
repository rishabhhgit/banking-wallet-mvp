import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times > 3) return null
    return Math.min(times * 200, 2000)
  },
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message)
})

redis.on('connect', () => {
  console.log('Redis connected')
})
