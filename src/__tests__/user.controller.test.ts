import { Request, Response } from 'express'
import * as userController from '../controllers/user.controller'
import * as userRepository from '../repositories/user.repository'
import * as authUtils from '../utils/auth'
import * as twoFactorService from '../services/twoFactor.service'

jest.mock('../repositories/user.repository')
jest.mock('../utils/auth', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}))
jest.mock('../services/twoFactor.service', () => ({
  isTwoFactorEnabled: jest.fn().mockResolvedValue(false),
  verifyTwoFactorLogin: jest.fn(),
}))

const mockReq = (body: Record<string, unknown>) => ({ body } as Request)
const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

describe('user.controller', () => {
  afterEach(() => jest.clearAllMocks())

  describe('createUser', () => {
    it('should register a new user and return user + token + refreshToken', async () => {
      const body = { email: 'test@example.com', password: 'Secure123!pass', firstName: 'A', lastName: 'B' }
      const createdUser = { id: '1', email: 'test@example.com', firstName: 'A', lastName: 'B', createdAt: new Date() }

      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(null)
      jest.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed')
      jest.spyOn(userRepository, 'createUser').mockResolvedValue(createdUser as any)
      jest.spyOn(authUtils, 'generateToken').mockReturnValue('token123')
      jest.spyOn(authUtils, 'generateRefreshToken').mockReturnValue('refresh123')

      const res = mockRes()
      await userController.createUser(mockReq(body), res)

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com')
      expect(authUtils.hashPassword).toHaveBeenCalledWith('Secure123!pass')
      expect(userRepository.createUser).toHaveBeenCalledWith({ ...body, password: 'hashed' })
      expect(authUtils.generateToken).toHaveBeenCalledWith({ userId: '1' })
      expect(authUtils.generateRefreshToken).toHaveBeenCalledWith({ userId: '1' })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ user: createdUser, token: 'token123', refreshToken: 'refresh123' })
    })

    it('should return 400 if user already exists', async () => {
      const body = { email: 'dup@example.com', password: 'Secure123!pass', firstName: 'A', lastName: 'B' }
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue({ id: 'existing' } as any)

      const res = mockRes()
      await userController.createUser(mockReq(body), res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' })
    })

    it('should return 400 on invalid input', async () => {
      const res = mockRes()
      await userController.createUser(mockReq({ email: 'bad' }), res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid input data' })
    })
  })

  describe('loginUser', () => {
    it('should login and return user + token + refreshToken', async () => {
      const body = { email: 'test@example.com', password: 'pass123' }
      const user = { id: '1', email: 'test@example.com', password: 'hashed', firstName: 'A', lastName: 'B', createdAt: new Date() }

      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(user as any)
      jest.spyOn(authUtils, 'comparePassword').mockResolvedValue(true)
      jest.spyOn(authUtils, 'generateToken').mockReturnValue('token123')
      jest.spyOn(authUtils, 'generateRefreshToken').mockReturnValue('refresh123')

      const res = mockRes()
      await userController.loginUser(mockReq(body), res)

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com')
      expect(authUtils.comparePassword).toHaveBeenCalledWith('pass123', 'hashed')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        user: { id: '1', email: 'test@example.com', firstName: 'A', lastName: 'B', createdAt: user.createdAt },
        token: 'token123',
        refreshToken: 'refresh123',
      })
    })

    it('should return 400 for invalid email', async () => {
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(null)

      const res = mockRes()
      await userController.loginUser(mockReq({ email: 'x@x.com', password: 'pass' }), res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' })
    })

    it('should return 400 for invalid password', async () => {
      const user = { id: '1', email: 'test@example.com', password: 'hashed' }
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(user as any)
      jest.spyOn(authUtils, 'comparePassword').mockResolvedValue(false)

      const res = mockRes()
      await userController.loginUser(mockReq({ email: 'test@example.com', password: 'wrong' }), res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' })
    })
  })
})
