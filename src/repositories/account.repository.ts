import { db } from '../lib/db'
import { accountCache } from '../lib/cache'
import { CreateAccountInput } from '../types'

export const createAccount = async (userId: string, accountData: CreateAccountInput) => {
  const account = await db.account.create({
    data: {
      ...accountData,
      userId,
      type: accountData.type || 'CHECKING',
      currency: accountData.currency || 'USD'
    }
  })

  await accountCache.invalidateUserAccounts(userId)
  return account
}

export const findAccountsByUserId = async (userId: string) => {
  const cached = await accountCache.getUserAccounts(userId)
  if (cached) {
    return cached
  }

  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })

  await accountCache.setUserAccounts(userId, accounts)
  return accounts
}

export const findAccountById = async (id: string) => {
  const cached = await accountCache.getAccount(id)
  if (cached) {
    return cached
  }

  const account = await db.account.findUnique({
    where: { id }
  })

  if (account) {
    await accountCache.setAccount(id, account)
  }

  return account
}

export const findAccountByIdWithUser = async (id: string) => {
  return db.account.findUnique({
    where: { id },
    include: { user: true }
  })
}

export const updateAccountBalance = async (id: string, balance: number) => {
  const account = await db.account.update({
    where: { id },
    data: { balance }
  })

  await accountCache.invalidateAccount(id)
  return account
}
