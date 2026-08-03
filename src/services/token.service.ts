import { redis } from '../lib/redis'

const BLACKLIST_PREFIX = 'token:blacklist:'
const RESET_PREFIX = 'password:reset:'

export const blacklistToken = async (token: string, expiresInSeconds: number): Promise<void> => {
  await redis.set(`${BLACKLIST_PREFIX}${token}`, '1', 'EX', expiresInSeconds)
}

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redis.get(`${BLACKLIST_PREFIX}${token}`)
  return result === '1'
}

export const storeResetToken = async (userId: string, token: string, ttlSeconds: number = 3600): Promise<void> => {
  await redis.set(`${RESET_PREFIX}${userId}`, token, 'EX', ttlSeconds)
}

export const getResetToken = async (userId: string): Promise<string | null> => {
  return await redis.get(`${RESET_PREFIX}${userId}`)
}

export const deleteResetToken = async (userId: string): Promise<void> => {
  await redis.del(`${RESET_PREFIX}${userId}`)
}
