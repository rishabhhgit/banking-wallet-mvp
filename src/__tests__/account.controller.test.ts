import { Response } from 'express'
import * as accountController from '../controllers/account.controller'
import * as accountRepository from '../repositories/account.repository'
import { AuthenticatedRequest } from '../middleware/auth'

jest.mock('../repositories/account.repository')

const mockReq = (body: Record<string, unknown> = {}, userId = 'user1', params: Record<string, string> = {}) =>
  ({ body, userId, params } as unknown as AuthenticatedRequest)

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

describe('account.controller', () => {
  afterEach(() => jest.clearAllMocks())

  describe('createAccount', () => {
    it('should create an account and return 201', async () => {
      const body = { name: 'Savings', type: 'SAVINGS' }
      const created = { id: 'acc1', name: 'Savings', type: 'SAVINGS', userId: 'user1', balance: 0, currency: 'USD', createdAt: new Date(), updatedAt: new Date() }

      jest.spyOn(accountRepository, 'createAccount').mockResolvedValue(created as any)

      const res = mockRes()
      await accountController.createAccount(mockReq(body), res)

      expect(accountRepository.createAccount).toHaveBeenCalledWith('user1', body)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(created)
    })

    it('should return 500 on error', async () => {
      jest.spyOn(accountRepository, 'createAccount').mockRejectedValue(new Error('db error'))

      const res = mockRes()
      await accountController.createAccount(mockReq({ name: 'X' }), res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    })
  })

  describe('getUserAccounts', () => {
    it('should return list of accounts', async () => {
      const accounts = [{ id: 'acc1', name: 'Checking' }]
      jest.spyOn(accountRepository, 'findAccountsByUserId').mockResolvedValue(accounts as any)

      const res = mockRes()
      await accountController.getUserAccounts(mockReq(), res)

      expect(accountRepository.findAccountsByUserId).toHaveBeenCalledWith('user1')
      expect(res.json).toHaveBeenCalledWith(accounts)
    })

    it('should return 500 on error', async () => {
      jest.spyOn(accountRepository, 'findAccountsByUserId').mockRejectedValue(new Error('db error'))

      const res = mockRes()
      await accountController.getUserAccounts(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    })
  })
})
