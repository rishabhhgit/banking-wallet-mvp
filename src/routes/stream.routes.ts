import { Router, Response } from 'express'
import { verifyToken } from '../utils/auth'
import { AuthenticatedRequest } from '../middleware/auth'
import * as streamingService from '../services/streaming.service'

const router = Router()

/**
 * @swagger
 * /api/v1/stream/transactions:
 *   get:
 *     tags: [Streaming]
 *     summary: SSE stream for real-time transaction updates
 *     description: |
 *       Server-Sent Events endpoint for receiving real-time transaction updates.
 *       
 *       **Events:**
 *       - `transaction.completed` - Transfer completed successfully
 *       - `transaction.failed` - Transfer failed
 *       - `transaction.initiated` - Transfer initiated
 *       
 *       **Connection:**
 *       - Requires Authorization header with Bearer token
 *       - Auto-reconnects on connection loss
 *       - Events are JSON formatted
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SSE stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Access token required
 *       403:
 *         description: Invalid token
 */
router.get('/transactions', (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    res.status(401).json({ error: 'Access token required' })
    return
  }

  try {
    const decoded = verifyToken(token)
    req.userId = decoded.userId
  } catch {
    res.status(403).json({ error: 'Invalid token' })
    return
  }

  streamingService.addClient(req.userId!, res)

  req.on('close', () => {
    // client cleanup handled by streaming.service via res.on('close')
  })
})

export default router
