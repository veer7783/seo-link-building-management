import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, Currency } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireAnyAdmin, redactSensitiveFields } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Get all clients
 *     tags: [Clients]
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
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
 */
router.get('/', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          projects: {
            select: {
              id: true,
              projectName: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              projects: true,
              invoices: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }),
    ]);

    const redactedClients = redactSensitiveFields(clients, req.user!.role);

    res.json({
      success: true,
      data: redactedClients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               country:
 *                 type: string
 *               address:
 *                 type: string
 *               billingEmail:
 *                 type: string
 *                 format: email
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, INR]
 *     responses:
 *       201:
 *         description: Client created successfully
 */
router.post('/', [
  authenticate,
  requireAnyAdmin,
  body('name').trim().isLength({ min: 1 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('country').optional().trim(),
  body('address').optional().trim(),
  body('billingEmail').optional().isEmail().normalizeEmail(),
  body('currency').optional().isIn(Object.values(Currency)),
  body('percentage').optional().isInt({ min: 10 }).custom((value, { req }) => {
    // Only super admin can set percentage
    if (value !== undefined && req.user?.role !== 'SUPER_ADMIN') {
      throw new Error('Only super admin can set client percentage');
    }
    // Must be in increments of 5
    if (value !== undefined && value % 5 !== 0) {
      throw new Error('Percentage must be in increments of 5');
    }
    return true;
  }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const client = await prisma.client.create({
      data: {
        ...req.body,
        createdById: req.user!.id,
      },
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
          },
        },
      },
    });

    logger.info(`Client ${client.name} created by ${req.user!.email}`);

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    logger.error('Create client error:', error);
    
    // Handle unique constraint violation for email
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({
        success: false,
        error: 'A client with this email already exists',
        field: 'email',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
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
 *         description: Client retrieved successfully
 *       404:
 *         description: Client not found
 */
router.get('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        projects: {
          select: {
            id: true,
            projectName: true,
            isActive: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            projects: true,
            invoices: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    const redactedClient = redactSensitiveFields(client, req.user!.role);

    res.json({
      success: true,
      data: redactedClient,
    });
  } catch (error) {
    logger.error('Get client error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Update client
 *     tags: [Clients]
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               country:
 *                 type: string
 *               address:
 *                 type: string
 *               billingEmail:
 *                 type: string
 *                 format: email
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, INR]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       404:
 *         description: Client not found
 */
router.put('/:id', [
  authenticate,
  requireAnyAdmin,
  body('name').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('country').optional().trim(),
  body('address').optional().trim(),
  body('billingEmail').optional().isEmail().normalizeEmail(),
  body('currency').optional().isIn(Object.values(Currency)),
  body('percentage').optional().isInt({ min: 10 }).custom((value, { req }) => {
    // Only super admin can set percentage
    if (value !== undefined && req.user?.role !== 'SUPER_ADMIN') {
      throw new Error('Only super admin can set client percentage');
    }
    // Must be in increments of 5
    if (value !== undefined && value % 5 !== 0) {
      throw new Error('Percentage must be in increments of 5');
    }
    return true;
  }),
  body('isActive').optional().isBoolean(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    const updatedClient = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
          },
        },
      },
    });

    logger.info(`Client ${client.name} updated by ${req.user!.email}`);

    res.json({
      success: true,
      data: updatedClient,
    });
  } catch (error: any) {
    logger.error('Update client error:', error);
    
    // Handle unique constraint violation for email
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({
        success: false,
        error: 'A client with this email already exists',
        field: 'email',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Delete client
 *     tags: [Clients]
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
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       400:
 *         description: Cannot delete client with active projects
 */
router.delete('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        projects: {
          where: { isActive: true },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    if (client.projects.length > 0) {
      const projectNames = client.projects.map(p => p.projectName).join(', ');
      return res.status(400).json({
        success: false,
        error: `Cannot delete client with ${client.projects.length} active project(s): ${projectNames}. Please deactivate or delete these projects first.`,
      });
    }

    await prisma.client.delete({
      where: { id: req.params.id },
    });

    logger.info(`Client ${client.name} deleted by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    logger.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as clientRoutes };
