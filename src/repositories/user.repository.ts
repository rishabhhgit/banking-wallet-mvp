import { db } from '../lib/db'
import { CreateUserInput } from '../types'

export const createUser = async (userData: CreateUserInput & { password: string }) => {
    return db.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    })
  }

export const findUserByEmail = async (email:string)=>{
    return db.user.findUnique({
      where: { email }
    })
}

export const findUserById = async(userId:string)=>{
    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    })
}

export const findAllUsers = async () => {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  })
  return { users }
}

export const updateUserPassword = async (userId: string, hashedPassword: string) => {
  return db.user.update({
    where: { id: userId },
    data: { password: hashedPassword, updatedAt: new Date() },
  })
}

export const updateUserTwoFactor = async (userId: string, enabled: boolean) => {
  return db.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: enabled, updatedAt: new Date() },
  })
}
