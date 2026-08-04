import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as userRepository from '../repositories/user.repository';
import {
  generateTwoFactorSecret,
  verifyTwoFactorSetup,
  disableTwoFactor,
  isTwoFactorEnabled,
} from '../services/twoFactor.service';
import { logger } from '../lib/logger';

// Setup 2FA - generate secret and QR code
export const setupTwoFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if 2FA is already enabled
    const enabled = await isTwoFactorEnabled(userId);
    if (enabled) {
      res.status(400).json({ error: '2FA is already enabled' });
      return;
    }

    const user = await userRepository.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const setup = await generateTwoFactorSecret(userId, user.email);

    res.status(200).json({
      secret: setup.secret,
      qrCode: setup.qrCodeDataUrl,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    });
  } catch (error) {
    logger.error({ err: error }, '2FA setup error');
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
};

// Verify and enable 2FA
export const verifyAndEnableTwoFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    const verified = await verifyTwoFactorSetup(userId, code);
    if (!verified) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    // Update user in database
    await userRepository.updateUserTwoFactor(userId, true);

    res.status(200).json({
      message: '2FA enabled successfully',
      enabled: true,
    });
  } catch (error) {
    logger.error({ err: error }, '2FA verify error');
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

// Disable 2FA
export const disableTwoFactorAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Verification code is required to disable 2FA' });
      return;
    }

    // Verify the code before disabling
    const { verifyTwoFactorLogin } = await import('../services/twoFactor.service');
    const { verified } = await verifyTwoFactorLogin(userId, code);
    if (!verified) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    const disabled = await disableTwoFactor(userId);
    if (disabled) {
      await userRepository.updateUserTwoFactor(userId, false);
    }

    res.status(200).json({
      message: '2FA disabled successfully',
      enabled: false,
    });
  } catch (error) {
    logger.error({ err: error }, '2FA disable error');
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// Get 2FA status
export const getTwoFactorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const enabled = await isTwoFactorEnabled(userId);

    res.status(200).json({
      enabled,
    });
  } catch (error) {
    logger.error({ err: error }, '2FA status error');
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
};
