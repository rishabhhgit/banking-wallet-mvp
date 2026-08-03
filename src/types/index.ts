import { z } from 'zod'

// User schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100)
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

// Account schemas
export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['CHECKING', 'SAVINGS']).optional(),
  currency: z.string().length(3).optional()
})

// Transaction schemas
export const createTransactionSchema = z.object({
  amount: z.number().positive().max(1000000, 'Amount exceeds maximum allowed'),
  description: z.string().min(1).max(500),
  debitAccountId: z.string(),
  creditAccountId: z.string()
})

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>