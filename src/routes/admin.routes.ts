import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserTransactions,
  getUserAccounts,
  forceLogoutUser,
  getDashboardStats,
  searchUsers,
  bulkUpdateUsers,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users (paginated, searchable)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email, firstName, or lastName
 *     responses:
 *       200:
 *         description: List of users with pagination
 *       403:
 *         description: Admin access required
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/v1/admin/users/search:
 *   get:
 *     tags: [Admin]
 *     summary: Advanced user search with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term (email, name)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN]
 *       - in: query
 *         name: twoFactorEnabled
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get('/users/search', searchUsers);

/**
 * @swagger
 * /api/v1/admin/users/bulk:
 *   patch:
 *     tags: [Admin]
 *     summary: Bulk update users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds, action]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *               action:
 *                 type: string
 *                 enum: [setRole, disable2FA]
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bulk update result
 *       400:
 *         description: Invalid input
 */
router.patch('/users/bulk', bulkUpdateUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get user by ID with accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details with accounts
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.get('/users/:id', getUserById);

/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *     responses:
 *       200:
 *         description: User role updated
 *       400:
 *         description: Invalid role
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.patch('/users/:id/role', updateUserRole);

/**
 * @swagger
 * /api/v1/admin/users/{id}/accounts:
 *   get:
 *     tags: [Admin]
 *     summary: Get user's accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's accounts
 *       404:
 *         description: User not found
 */
router.get('/users/:id/accounts', getUserAccounts);

/**
 * @swagger
 * /api/v1/admin/users/{id}/transactions:
 *   get:
 *     tags: [Admin]
 *     summary: Get user's transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: User's transactions
 *       404:
 *         description: User not found
 */
router.get('/users/:id/transactions', getUserTransactions);

/**
 * @swagger
 * /api/v1/admin/users/{id}/force-logout:
 *   post:
 *     tags: [Admin]
 *     summary: Force logout user (invalidate sessions)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User logged out
 *       404:
 *         description: User not found
 */
router.post('/users/:id/force-logout', forceLogoutUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete user (cascades to accounts/transactions)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete self
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.delete('/users/:id', deleteUser);

export default router;
