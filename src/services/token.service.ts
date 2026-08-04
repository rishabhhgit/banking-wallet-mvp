import { redis } from '../lib/redis'

const BLACKLIST_PREFIX = 'token:blacklist:'
const RESET_PREFIX = 'password:reset:'
const RESET_TOKEN_LOOKUP_PREFIX = 'password:reset:token:'

export const blacklistToken = async (token: string, expiresInSeconds: number): Promise<void> => {
  await redis.set(`${BLACKLIST_PREFIX}${token}`, '1', 'EX', expiresInSeconds)
}

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const result = await redis.get(`${BLACKLIST_PREFIX}${token}`)
    return result === '1'
  } catch {
    return false
  }
}

export const storeResetToken = async (userId: string, token: string, ttlSeconds: number = 3600): Promise<void> => {
  await redis.set(`${RESET_PREFIX}${userId}`, token, 'EX', ttlSeconds)
  // Store reverse lookup: token -> userId
  await redis.set(`${RESET_TOKEN_LOOKUP_PREFIX}${token}`, userId, 'EX', ttlSeconds)
}

export const getResetToken = async (userId: string): Promise<string | null> => {
  return await redis.get(`${RESET_PREFIX}${userId}`)
}

export const getUserIdByResetToken = async (token: string): Promise<string | null> => {
  return await redis.get(`${RESET_TOKEN_LOOKUP_PREFIX}${token}`)
}

export const deleteResetToken = async (userId: string): Promise<void> => {
  const token = await redis.get(`${RESET_PREFIX}${userId}`)
  await redis.del(`${RESET_PREFIX}${userId}`)
  if (token) {
    await redis.del(`${RESET_TOKEN_LOOKUP_PREFIX}${token}`)
  }
}
