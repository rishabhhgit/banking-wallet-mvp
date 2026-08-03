import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { createTransactionSchema } from '../types'
import * as accountRepository from '../repositories/account.repository'
import * as idempotencyService from '../services/idempotency.service'
import * as auditService from '../services/audit.service'
import { transactionQueue } from '../services/queue.service'
import { logger } from '../lib/logger'
import { trackTransfer } from '../lib/metrics'
import { captureException } from '../lib/sentry'

export const createTransaction = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string
  const log = logger.child({ requestId, userId: req.userId })

  try {
    const validatedData = createTransactionSchema.parse(req.body)
    const userId = req.userId!
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    // Redis-backed idempotency check
    if (idempotencyKey) {
      const existing = await idempotencyService.checkIdempotency(idempotencyKey)
      if (existing) {
        log.info({ idempotencyKey }, 'Idempotency hit, returning cached response')
        await auditService.logEvent({
          eventType: 'IDEMPOTENCY_HIT',
          userId,
          metadata: { idempotencyKey },
        })
        res.status(existing.status).json(existing.response)
        return
      }
    }

    // Acquire distributed lock for this transfer
    const lockKey = `${validatedData.debitAccountId}-${validatedData.creditAccountId}-${validatedData.amount}`
    const lockAcquired = idempotencyKey
      ? await idempotencyService.acquireTransferLock(lockKey)
      : true

    if (!lockAcquired) {
      res.status(409).json({ error: 'Transfer already in progress' })
      return
    }

    // Verify user owns the debit account
    const debitAccount = await accountRepository.findAccountById(
      validatedData.debitAccountId
    )
    if (!debitAccount || debitAccount.userId !== userId) {
      log.warn('Access denied to debit account')
      res.status(403).json({ error: 'Access denied to debit account' })
      return
    }

    // Log initiation
    await auditService.logEvent({
      eventType: 'TRANSFER_INITIATED',
      userId,
      metadata: {
        amount: validatedData.amount,
        debitAccountId: validatedData.debitAccountId,
        creditAccountId: validatedData.creditAccountId,
      },
    })

    // Process synchronously for now (queue for high-throughput in production)
    const transactionRepository = await import(
      '../repositories/transaction.repository'
    )
    const streamingService = await import('../services/streaming.service')

    const transaction =
      await transactionRepository.createTransaction(validatedData)

    // Broadcast via SSE
    if (transaction.debitAccount?.userId) {
      streamingService.broadcastTransaction(
        transaction.debitAccount.userId,
        transaction
      )
    }
    if (transaction.creditAccount?.userId) {
      streamingService.broadcastTransaction(
        transaction.creditAccount.userId,
        transaction
      )
    }

    // Complete audit log
    await auditService.logEvent({
      eventType: 'TRANSFER_COMPLETED',
      userId,
      metadata: {
        transactionId: transaction.id,
        amount: transaction.amount,
      },
    })

    // Store idempotency response
    if (idempotencyKey) {
      await idempotencyService.storeIdempotency(idempotencyKey, 201, transaction)
      await idempotencyService.releaseTransferLock(lockKey)
    }

    log.info({ transactionId: transaction.id }, 'Transaction created')
    trackTransfer('success')
    res.status(201).json(transaction)
  } catch (error) {
    log.error({ err: error }, 'Create transaction error')
    captureException(error as Error, {
      requestId,
      userId: req.userId,
      transactionData: req.body,
    })

    if (error instanceof Error) {
      if (
        error.message === 'Insufficient funds' ||
        error.message === 'One or both accounts not found' ||
        error.message === 'Cannot transfer to the same account'
      ) {
        const eventType =
          error.message === 'Insufficient funds'
            ? 'TRANSFER_INSUFFICIENT_FUNDS'
            : 'TRANSFER_FAILED'

        await auditService.logEvent({
          eventType: eventType as any,
          userId: req.userId,
          metadata: { error: error.message },
        })

        trackTransfer(error.message === 'Insufficient funds' ? 'insufficient_funds' : 'failed')
        res.status(400).json({ error: error.message })
        return
      }
    }

    res.status(500).json({ error: 'Transaction failed' })
  }
}

export const getAccountTransactions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: accountId } = req.params
    const userId = req.userId!

    const account = await accountRepository.findAccountById(accountId)
    if (!account || account.userId !== userId) {
      res.status(403).json({ error: 'Access denied to account' })
      return
    }

    const rawLimit = parseInt(req.query.limit as string) || 50
    const limit = Math.min(Math.max(rawLimit, 1), 100)
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)

    const transactionRepository = await import(
      '../repositories/transaction.repository'
    )
    const transactions =
      await transactionRepository.findTransactionsByAccountId(
        accountId,
        limit,
        offset
      )

    res.json(transactions)
  } catch (error) {
    logger.error({ err: error }, 'Get transactions error')
    res.status(500).json({ error: 'Internal server error' })
  }
}
