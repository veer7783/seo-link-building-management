import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireAnyAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
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
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter projects by client ID
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 */
router.get('/', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const clientId = req.query.clientId as string;

    const where: any = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: 'insensitive' as const } },
        { companyName: { contains: search, mode: 'insensitive' as const } },
        { websiteUrl: { contains: search, mode: 'insensitive' as const } },
        { client: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *               - clientId
 *             properties:
 *               projectName:
 *                 type: string
 *               websiteUrl:
 *                 type: string
 *                 format: uri
 *               companyName:
 *                 type: string
 *               clientId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post('/', [
  authenticate,
  requireAnyAdmin,
  body('projectName').trim().isLength({ min: 1 }),
  body('websiteUrl').optional().isURL(),
  body('companyName').optional().trim(),
  body('clientId').isUUID(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: req.body.clientId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    const project = await prisma.project.create({
      data: {
        projectName: req.body.projectName,
        websiteUrl: req.body.websiteUrl || null,
        companyName: req.body.companyName || null,
        clientId: req.body.clientId,
        createdById: req.user!.id,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    logger.info(`Project ${project.projectName} created by ${req.user!.email}`);

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    logger.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
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
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
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
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 */
router.put('/:id', [
  authenticate,
  requireAnyAdmin,
  body('projectName').optional().trim().isLength({ min: 1 }),
  body('websiteUrl').optional().isURL(),
  body('companyName').optional().trim(),
  body('clientId').optional().isUUID(),
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
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // If clientId is being updated, verify the new client exists
    if (req.body.clientId && req.body.clientId !== project.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: req.body.clientId },
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found',
        });
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    logger.info(`Project ${project.projectName} updated by ${req.user!.email}`);

    res.json({
      success: true,
      data: updatedProject,
    });
  } catch (error: any) {
    logger.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
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
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 *       400:
 *         description: Cannot delete project with active orders
 */
router.delete('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          where: { 
            status: { 
              in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'CONTENT_READY', 'PLACED'] 
            } 
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    if (project.orders.length > 0) {
      const orderNumbers = project.orders.map(o => o.orderNumber).join(', ');
      return res.status(400).json({
        success: false,
        error: `Cannot delete project with ${project.orders.length} active order(s): ${orderNumbers}. Please complete or cancel these orders first.`,
      });
    }

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    logger.info(`Project ${project.projectName} deleted by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as projectRoutes };
