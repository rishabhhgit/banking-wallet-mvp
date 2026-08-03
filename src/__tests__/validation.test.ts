import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Mock the database for unit tests
jest.mock('../lib/db', () => ({
  db: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    account: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}))

// Mock Redis
jest.mock('../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    set: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn(),
    options: { host: 'localhost', port: 6379 },
    on: jest.fn(),
  },
}))

// Mock audit service
jest.mock('../services/audit.service', () => ({
  logEvent: jest.fn(),
  getRecentEvents: jest.fn(),
  getEventCounts: jest.fn(),
}))

// Mock streaming service
jest.mock('../services/streaming.service', () => ({
  broadcastTransaction: jest.fn(),
  getClientCount: jest.fn().mockReturnValue(0),
  addClient: jest.fn(),
  removeClient: jest.fn(),
}))

import { createUserSchema, createTransactionSchema, createAccountSchema } from '../types'

describe('Zod Validation Schemas', () => {
  describe('createUserSchema', () => {
    it('should accept valid user data', () => {
      const valid = {
        email: 'test@example.com',
        password: 'StrongPass1!',
        firstName: 'John',
        lastName: 'Doe',
      }
      expect(() => createUserSchema.parse(valid)).not.toThrow()
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',
        'nouppercase1!',
        'NOLOWERCASE1!',
        'NoNumbers!',
        'NoSpecial123',
        '1234567890',
      ]

      for (const password of weakPasswords) {
        expect(() =>
          createUserSchema.parse({
            email: 'test@example.com',
            password,
            firstName: 'John',
            lastName: 'Doe',
          })
        ).toThrow()
      }
    })

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MyStr0ng!Pass',
        'C0mpl3x#Key',
        'B@nk1ng$ecur3',
      ]

      for (const password of strongPasswords) {
        expect(() =>
          createUserSchema.parse({
            email: 'test@example.com',
            password,
            firstName: 'John',
            lastName: 'Doe',
          })
        ).not.toThrow()
      }
    })

    it('should reject invalid emails', () => {
      const invalidEmails = ['notanemail', '@domain.com', 'user@', 'user@.com']

      for (const email of invalidEmails) {
        expect(() =>
          createUserSchema.parse({
            email,
            password: 'StrongPass1!',
            firstName: 'John',
            lastName: 'Doe',
          })
        ).toThrow()
      }
    })

    it('should reject empty names', () => {
      expect(() =>
        createUserSchema.parse({
          email: 'test@example.com',
          password: 'StrongPass1!',
          firstName: '',
          lastName: 'Doe',
        })
      ).toThrow()

      expect(() =>
        createUserSchema.parse({
          email: 'test@example.com',
          password: 'StrongPass1!',
          firstName: 'John',
          lastName: '',
        })
      ).toThrow()
    })
  })

  describe('createTransactionSchema', () => {
    it('should accept valid transaction data', () => {
      const valid = {
        amount: 100.5,
        description: 'Payment for services',
        debitAccountId: 'acct_123',
        creditAccountId: 'acct_456',
      }
      expect(() => createTransactionSchema.parse(valid)).not.toThrow()
    })

    it('should reject zero amount', () => {
      expect(() =>
        createTransactionSchema.parse({
          amount: 0,
          description: 'Payment',
          debitAccountId: 'acct_123',
          creditAccountId: 'acct_456',
        })
      ).toThrow()
    })

    it('should reject negative amount', () => {
      expect(() =>
        createTransactionSchema.parse({
          amount: -100,
          description: 'Payment',
          debitAccountId: 'acct_123',
          creditAccountId: 'acct_456',
        })
      ).toThrow()
    })

    it('should reject amount exceeding maximum', () => {
      expect(() =>
        createTransactionSchema.parse({
          amount: 1000001,
          description: 'Payment',
          debitAccountId: 'acct_123',
          creditAccountId: 'acct_456',
        })
      ).toThrow()
    })

    it('should accept maximum allowed amount', () => {
      expect(() =>
        createTransactionSchema.parse({
          amount: 1000000,
          description: 'Payment',
          debitAccountId: 'acct_123',
          creditAccountId: 'acct_456',
        })
      ).not.toThrow()
    })

    it('should reject empty description', () => {
      expect(() =>
        createTransactionSchema.parse({
          amount: 100,
          description: '',
          debitAccountId: 'acct_123',
          creditAccountId: 'acct_456',
        })
      ).toThrow()
    })

    it('should reject description exceeding 500 chars', () => {
      expect(() =>
        createTransactionSchema.parse({
          amount: 100,
          description: 'x'.repeat(501),
          debitAccountId: 'acct_123',
          creditAccountId: 'acct_456',
        })
      ).toThrow()
    })
  })

  describe('createAccountSchema', () => {
    it('should accept valid account data', () => {
      const valid = { name: 'Main Checking', type: 'CHECKING' as const }
      expect(() => createAccountSchema.parse(valid)).not.toThrow()
    })

    it('should accept without type (optional)', () => {
      expect(() =>
        createAccountSchema.parse({ name: 'My Account' })
      ).not.toThrow()
    })

    it('should reject invalid type', () => {
      expect(() =>
        createAccountSchema.parse({ name: 'Account', type: 'CREDIT' })
      ).toThrow()
    })

    it('should accept SAVINGS type', () => {
      expect(() =>
        createAccountSchema.parse({ name: 'Savings', type: 'SAVINGS' })
      ).not.toThrow()
    })
  })
})

describe('Auth Utils', () => {
  const { hashPassword, comparePassword, generateToken, verifyToken } =
    require('../utils/auth')

  it('should hash and verify passwords', async () => {
    const password = 'TestPassword123!'
    const hash = await hashPassword(password)
    expect(hash).not.toBe(password)
    expect(await comparePassword(password, hash)).toBe(true)
    expect(await comparePassword('wrong', hash)).toBe(false)
  })

  it('should generate and verify JWT tokens', () => {
    const payload = { userId: 'user_123' }
    const token = generateToken(payload)
    const decoded = verifyToken(token)
    expect(decoded.userId).toBe('user_123')
  })

  it('should reject invalid tokens', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow()
  })
})
