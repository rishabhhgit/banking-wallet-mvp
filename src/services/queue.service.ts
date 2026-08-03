import { Queue, QueueEvents } from 'bullmq'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'

const connection = {
  host: redis.options.host || 'localhost',
  port: redis.options.port || 6379,
}

// Transaction processing queue
export const transactionQueue = new Queue('transactions', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

// SSE broadcast queue (decoupled from API response)
export const broadcastQueue = new Queue('broadcasts', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: true,
  },
})

export const shutdownQueues = async () => {
  await transactionQueue.close()
  await broadcastQueue.close()
}

// Health check
export const getQueueHealth = async () => {
  const transactionCounts = await transactionQueue.getJobCounts(
    'active',
    'waiting',
    'completed',
    'failed'
  )
  const broadcastCounts = await broadcastQueue.getJobCounts(
    'active',
    'waiting',
    'completed',
    'failed'
  )
  return {
    transactions: transactionCounts,
    broadcasts: broadcastCounts,
  }
}
