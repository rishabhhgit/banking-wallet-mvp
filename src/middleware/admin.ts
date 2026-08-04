import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { db } from '../lib/db';
import { logger } from '../lib/logger';

// Middleware to check if user is an admin
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    next();
  } catch (error) {
    logger.error({ err: error }, 'Admin check failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};
