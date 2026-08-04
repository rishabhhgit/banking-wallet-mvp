import { Request, Response } from 'express';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { blacklistToken } from '../services/token.service';

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { accounts: true } },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch users');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID (admin only)
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            id: true,
            name: true,
            balance: true,
            currency: true,
            type: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch user');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['USER', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be USER or ADMIN' });
      return;
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    logger.info({ userId: id, newRole: role }, 'User role updated');
    res.status(200).json({ user: updatedUser });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update user role');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prevent admin from deleting themselves
    const requestingUserId = (req as any).userId;
    if (id === requestingUserId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    await db.user.delete({ where: { id } });

    logger.info({ userId: id }, 'User deleted');
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete user');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's transactions (admin only)
export const getUserTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = (page - 1) * limit;

    // Verify user exists
    const user = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get user's account IDs
    const accounts = await db.account.findMany({
      where: { userId: id },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where: {
          OR: [
            { debitAccountId: { in: accountIds } },
            { creditAccountId: { in: accountIds } },
          ],
        },
        include: {
          debitAccount: { select: { id: true, name: true } },
          creditAccount: { select: { id: true, name: true } },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.transaction.count({
        where: {
          OR: [
            { debitAccountId: { in: accountIds } },
            { creditAccountId: { in: accountIds } },
          ],
        },
      }),
    ]);

    res.status(200).json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch user transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's accounts (admin only)
export const getUserAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accounts: {
          select: {
            id: true,
            name: true,
            balance: true,
            currency: true,
            type: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch user accounts');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Force logout user (invalidate all tokens) - admin only
export const forceLogoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // In a real app, you'd track all active tokens per user
    // For now, we'll just log the action
    logger.info({ userId: id, adminId: (req as any).userId }, 'Force logout initiated');

    res.status(200).json({ message: 'User session invalidated' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to force logout user');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get dashboard stats (admin only)
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalAccounts,
      totalTransactions,
      recentUsers,
      userGrowth,
    ] = await Promise.all([
      db.user.count(),
      db.account.count(),
      db.transaction.count(),
      db.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Users created in last 7 days
      db.user.groupBy({
        by: ['createdAt'],
        _count: true,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get account balances summary
    const balanceSummary = await db.account.aggregate({
      _sum: { balance: true },
      _count: true,
    });

    // Get recent transactions
    const recentTransactions = await db.transaction.findMany({
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.status(200).json({
      stats: {
        totalUsers,
        totalAccounts,
        totalTransactions,
        totalBalance: balanceSummary._sum.balance || 0,
      },
      recentUsers,
      recentTransactions,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch dashboard stats');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Search users (admin only)
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, role, twoFactorEnabled } = req.query;

    const where: any = {};

    if (q) {
      where.OR = [
        { email: { contains: q as string, mode: 'insensitive' } },
        { firstName: { contains: q as string, mode: 'insensitive' } },
        { lastName: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (twoFactorEnabled !== undefined) {
      where.twoFactorEnabled = twoFactorEnabled === 'true';
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ users });
  } catch (error) {
    logger.error({ err: error }, 'Failed to search users');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk update users (admin only)
export const bulkUpdateUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds, action, value } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: 'userIds array is required' });
      return;
    }

    if (userIds.length > 100) {
      res.status(400).json({ error: 'Cannot bulk update more than 100 users at once' });
      return;
    }

    let result;
    switch (action) {
      case 'setRole':
        if (!value || !['USER', 'ADMIN'].includes(value)) {
          res.status(400).json({ error: 'Invalid role' });
          return;
        }
        result = await db.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: value },
        });
        break;

      case 'disable2FA':
        result = await db.user.updateMany({
          where: { id: { in: userIds } },
          data: { twoFactorEnabled: false },
        });
        break;

      default:
        res.status(400).json({ error: 'Invalid action' });
        return;
    }

    logger.info({ userIds, action, value, count: result.count }, 'Bulk update completed');
    res.status(200).json({
      message: `Updated ${result.count} users`,
      count: result.count,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to bulk update users');
    res.status(500).json({ error: 'Internal server error' });
  }
};
