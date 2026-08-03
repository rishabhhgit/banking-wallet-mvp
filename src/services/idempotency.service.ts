import { redis } from '../lib/redis'

const IDEMPOTENCY_TTL = 3600 // 1 hour in seconds

interface IdempotencyEntry {
  response: unknown
  status: number
}

export const checkIdempotency = async (
  key: string
): Promise<IdempotencyEntry | null> => {
  const raw = await redis.get(`idempotency:${key}`)
  if (!raw) return null
  return JSON.parse(raw) as IdempotencyEntry
}

export const storeIdempotency = async (
  key: string,
  status: number,
  response: unknown
): Promise<void> => {
  const entry: IdempotencyEntry = { response, status }
  await redis.setex(
    `idempotency:${key}`,
    IDEMPOTENCY_TTL,
    JSON.stringify(entry)
  )
}

export const acquireTransferLock = async (
  idempotencyKey: string
): Promise<boolean> => {
  const lockKey = `transfer_lock:${idempotencyKey}`
  const result = await redis.set(lockKey, '1', 'EX', 30, 'NX')
  return result === 'OK'
}

export const releaseTransferLock = async (
  idempotencyKey: string
): Promise<void> => {
  await redis.del(`transfer_lock:${idempotencyKey}`)
}
