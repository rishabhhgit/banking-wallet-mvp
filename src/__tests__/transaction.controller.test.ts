import { Response } from 'express'
import * as transactionController from '../controllers/transaction.controller'
import * as accountRepository from '../repositories/account.repository'
import * as idempotencyService from '../services/idempotency.service'
import * as auditService from '../services/audit.service'
import { AuthenticatedRequest } from '../middleware/auth'

jest.mock('../repositories/account.repository')
jest.mock('../services/idempotency.service')
jest.mock('../services/audit.service')

// Mock dynamic imports
jest.mock('../repositories/transaction.repository', () => ({
  createTransaction: jest.fn(),
  findTransactionsByAccountId: jest.fn(),
}))

jest.mock('../services/streaming.service', () => ({
  broadcastTransaction: jest.fn(),
}))

const mockReq = (
  body: Record<string, unknown> = {},
  userId = 'user1',
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  headers: Record<string, string> = {}
) =>
  ({
    body,
    userId,
    params,
    query,
    headers,
  }) as unknown as AuthenticatedRequest

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

describe('transaction.controller', () => {
  afterEach(() => jest.clearAllMocks())

  describe('createTransaction', () => {
    const validBody = {
      amount: 100,
      description: 'Test transfer',
      debitAccountId: 'debit1',
      creditAccountId: 'credit1',
    }

    beforeEach(() => {
      jest.spyOn(idempotencyService, 'checkIdempotency').mockResolvedValue(null)
      jest.spyOn(idempotencyService, 'storeIdempotency').mockResolvedValue()
      jest.spyOn(idempotencyService, 'acquireTransferLock').mockResolvedValue(true)
      jest.spyOn(idempotencyService, 'releaseTransferLock').mockResolvedValue()
      jest.spyOn(auditService, 'logEvent').mockResolvedValue()
    })

    it('should create a transfer and return 201', async () => {
      const transaction = {
        id: 'tx1',
        ...validBody,
        amount: 100,
        type: 'TRANSFER',
        status: 'COMPLETED',
        debitAccount: { id: 'debit1', name: 'Checking', userId: 'user1' },
        creditAccount: { id: 'credit1', name: 'Savings', userId: 'user2' },
      }

      jest.spyOn(accountRepository, 'findAccountById').mockResolvedValue({
        id: 'debit1',
        userId: 'user1',
      } as any)

      const transactionRepo = require('../repositories/transaction.repository')
      const streamingService = require('../services/streaming.service')
      transactionRepo.createTransaction.mockResolvedValue(transaction)
      streamingService.broadcastTransaction.mockImplementation()

      const res = mockRes()
      await transactionController.createTransaction(mockReq(validBody), res)

      expect(accountRepository.findAccountById).toHaveBeenCalledWith('debit1')
      expect(transactionRepo.createTransaction).toHaveBeenCalledWith(validBody)
      expect(streamingService.broadcastTransaction).toHaveBeenCalledWith(
        'user1',
        transaction
      )
      expect(streamingService.broadcastTransaction).toHaveBeenCalledWith(
        'user2',
        transaction
      )
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(transaction)
    })

    it('should return 403 if user does not own debit account', async () => {
      jest.spyOn(accountRepository, 'findAccountById').mockResolvedValue({
        id: 'debit1',
        userId: 'other',
      } as any)

      const res = mockRes()
      await transactionController.createTransaction(mockReq(validBody), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied to debit account',
      })
    })

    it('should return 403 if debit account not found', async () => {
      jest.spyOn(accountRepository, 'findAccountById').mockResolvedValue(null)

      const res = mockRes()
      await transactionController.createTransaction(mockReq(validBody), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied to debit account',
      })
    })

    it('should return 400 on insufficient funds', async () => {
      jest.spyOn(accountRepository, 'findAccountById').mockResolvedValue({
        id: 'debit1',
        userId: 'user1',
      } as any)

      const transactionRepo = require('../repositories/transaction.repository')
      transactionRepo.createTransaction.mockRejectedValue(
        new Error('Insufficient funds')
      )

      const res = mockRes()
      await transactionController.createTransaction(mockReq(validBody), res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient funds' })
    })

    it('should return cached response on idempotency hit', async () => {
      const cachedResponse = {
        id: 'tx1',
        amount: 100,
        type: 'TRANSFER',
        status: 'COMPLETED',
      }

      jest
        .spyOn(idempotencyService, 'checkIdempotency')
        .mockResolvedValue({ response: cachedResponse, status: 201 })

      const res = mockRes()
      await transactionController.createTransaction(
        mockReq(validBody, 'user1', {}, {}, { 'idempotency-key': 'key123' }),
        res
      )

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(cachedResponse)
    })

    it('should return 500 on unexpected error', async () => {
      jest.spyOn(accountRepository, 'findAccountById').mockRejectedValue(
        new Error('unexpected')
      )

      const res = mockRes()
      await transactionController.createTransaction(mockReq(validBody), res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction failed' })
    })
  })

  describe('getAccountTransactions', () => {
    it('should return transactions for owned account', async () => {
      const transactions = [{ id: 'tx1', amount: 50 }]
      jest
        .spyOn(accountRepository, 'findAccountById')
        .mockResolvedValue({ id: 'acc1', userId: 'user1' } as any)

      const transactionRepo = require('../repositories/transaction.repository')
      transactionRepo.findTransactionsByAccountId.mockResolvedValue(
        transactions
      )

      const res = mockRes()
      await transactionController.getAccountTransactions(
        mockReq({}, 'user1', { id: 'acc1' }, { limit: '50', offset: '0' }),
        res
      )

      expect(
        transactionRepo.findTransactionsByAccountId
      ).toHaveBeenCalledWith('acc1', 50, 0)
      expect(res.json).toHaveBeenCalledWith(transactions)
    })

    it('should return 403 for unowned account', async () => {
      jest.spyOn(accountRepository, 'findAccountById').mockResolvedValue({
        id: 'acc1',
        userId: 'other',
      } as any)

      const res = mockRes()
      await transactionController.getAccountTransactions(
        mockReq({}, 'user1', { id: 'acc1' }),
        res
      )

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied to account',
      })
    })

    it('should return 500 on error', async () => {
      jest.spyOn(accountRepository, 'findAccountById').mockRejectedValue(
        new Error('db error')
      )

      const res = mockRes()
      await transactionController.getAccountTransactions(
        mockReq({}, 'user1', { id: 'acc1' }),
        res
      )

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    })
  })
})
