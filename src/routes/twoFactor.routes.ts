import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  disableTwoFactorAuth,
  getTwoFactorStatus,
} from '../controllers/twoFactor.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/2fa/setup:
 *   post:
 *     tags: [2FA]
 *     summary: Setup 2FA - generates secret and QR code
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup data with QR code
 *       400:
 *         description: 2FA already enabled
 *       401:
 *         description: Unauthorized
 */
router.post('/setup', authenticateToken, setupTwoFactor);

/**
 * @swagger
 * /api/v1/2fa/verify:
 *   post:
 *     tags: [2FA]
 *     summary: Verify code and enable 2FA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: 6-digit TOTP code from authenticator app
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       400:
 *         description: Invalid code
 *       401:
 *         description: Unauthorized
 */
router.post('/verify', authenticateToken, verifyAndEnableTwoFactor);

/**
 * @swagger
 * /api/v1/2fa/disable:
 *   post:
 *     tags: [2FA]
 *     summary: Disable 2FA (requires verification code)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: 6-digit TOTP code to confirm disable
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       400:
 *         description: Invalid code
 *       401:
 *         description: Unauthorized
 */
router.post('/disable', authenticateToken, disableTwoFactorAuth);

/**
 * @swagger
 * /api/v1/2fa/status:
 *   get:
 *     tags: [2FA]
 *     summary: Get 2FA status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status
 *       401:
 *         description: Unauthorized
 */
router.get('/status', authenticateToken, getTwoFactorStatus);

export default router;
