import { Server } from 'http'
import { redis } from './redis'
import { logger } from './logger'
import { shutdownQueues } from '../services/queue.service'
import { metrics } from './metrics'

let isShuttingDown = false

export const gracefulShutdown = async (server: Server) => {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info('Graceful shutdown initiated')

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed')

    try {
      await metrics.shutdown()
      logger.info('Metrics service shut down')
    } catch {
      logger.error('Error shutting down metrics service')
    }

    try {
      await shutdownQueues()
      logger.info('Job queues shut down')
    } catch {
      logger.error('Error shutting down job queue')
    }

    try {
      await redis.quit()
      logger.info('Redis connection closed')
    } catch {
      logger.error('Error closing Redis connection')
    }

    process.exit(0)
  })

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

export const setupShutdownHandlers = (server: Server) => {
  process.on('SIGTERM', () => gracefulShutdown(server))
  process.on('SIGINT', () => gracefulShutdown(server))
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection')
  })
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception')
    gracefulShutdown(server)
  })
}
