import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { createAccount, getUserAccounts } from '../controllers/account.controller'

const router = Router()

router.use(authenticateToken)

/**
 * @swagger
 * /api/v1/accounts:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a new account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [CHECKING, SAVINGS]
 *                 default: CHECKING
 *               currency:
 *                 type: string
 *                 default: USD
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post('/', createAccount)

/**
 * @swagger
 * /api/v1/accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: Get all user accounts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized
 */
router.get('/', getUserAccounts)

export default router
