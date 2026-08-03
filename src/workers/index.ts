import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'
import { broadcastQueue } from '../services/queue.service'
import * as transactionRepository from '../repositories/transaction.repository'
import * as streamingService from '../services/streaming.service'
import * as auditService from '../services/audit.service'

const connection = {
  host: redis.options.host || 'localhost',
  port: redis.options.port || 6379,
}

// Transaction processor
const transactionWorker = new Worker(
  'transactions',
  async (job) => {
    const { idempotencyKey, transactionData, userId } = job.data
    logger.info({ jobId: job.id, idempotencyKey }, 'Processing transaction')

    try {
      const transaction = await transactionRepository.createTransaction(transactionData)

      await auditService.logEvent({
        eventType: 'TRANSFER_COMPLETED',
        userId,
        metadata: {
          transactionId: transaction.id,
          amount: transaction.amount,
          debitAccountId: transactionData.debitAccountId,
          creditAccountId: transactionData.creditAccountId,
        },
      })

      // Queue broadcast for SSE
      if (transaction.debitAccount?.userId) {
        await broadcastQueue.add('notify', {
          userId: transaction.debitAccount.userId,
          transaction,
        })
      }
      if (transaction.creditAccount?.userId) {
        await broadcastQueue.add('notify', {
          userId: transaction.creditAccount.userId,
          transaction,
        })
      }

      return transaction
    } catch (error) {
      await auditService.logEvent({
        eventType: 'TRANSFER_FAILED',
        userId,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          transactionData,
        },
      })
      throw error
    }
  },
  {
    connection,
    concurrency: 5,
  }
)

// Broadcast processor
const broadcastWorker = new Worker(
  'broadcasts',
  async (job) => {
    const { userId, transaction } = job.data
    streamingService.broadcastTransaction(userId, transaction)
  },
  {
    connection,
    concurrency: 10,
  }
)

// Event listeners
transactionWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Transaction completed')
})

transactionWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Transaction failed')
})

transactionWorker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'Transaction stalled')
})

broadcastWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Broadcast completed')
})

broadcastWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Broadcast failed')
})

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down workers...')
  await transactionWorker.close()
  await broadcastWorker.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

logger.info('Workers started (transactionConcurrency=5, broadcastConcurrency=10)')
