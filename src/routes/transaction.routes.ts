import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { createTransaction, getAccountTransactions } from '../controllers/transaction.controller'

const router = Router()

router.use(authenticateToken)

/**
 * @swagger
 * /api/v1/transactions:
 *   post:
 *     tags: [Transactions]
 *     summary: Create a transfer
 *     description: |
 *       Create an atomic money transfer between accounts.
 *       
 *       **Features:**
 *       - Serializable isolation prevents race conditions
 *       - Idempotency keys prevent duplicate processing
 *       - Distributed locks prevent concurrent transfers on same accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema:
 *           type: string
 *         description: Unique key for idempotent requests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, description, debitAccountId, creditAccountId]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               debitAccountId:
 *                 type: string
 *                 description: Source account ID
 *               creditAccountId:
 *                 type: string
 *                 description: Destination account ID
 *     responses:
 *       201:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input or insufficient funds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to account
 *       409:
 *         description: Transfer already in progress (lock conflict)
 */
router.post('/', createTransaction)

/**
 * @swagger
 * /api/v1/transactions/account/{id}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transactions for an account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to account
 */
router.get('/account/:id', getAccountTransactions)

export default router
