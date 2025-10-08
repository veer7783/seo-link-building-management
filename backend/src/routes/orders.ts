import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, OrderStatus, AnchorType } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireAnyAdmin, redactSensitiveFields } from '../middleware/auth';
import { logger } from '../utils/logger';
import { validateProjectGuardrails } from '../utils/guardrails';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
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
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const projectId = req.query.projectId as string;
    const status = req.query.status as OrderStatus;

    const where: any = {};
    
    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        { targetUrl: { contains: search, mode: 'insensitive' as const } },
        { anchorText: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              projectName: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          orderSites: {
            include: {
              site: {
                select: {
                  id: true,
                  domain: true,
                  domainRating: true,
                  category: true,
                  basePrice: true,
                  internalCost: true,
                },
              },
              placement: {
                select: {
                  id: true,
                  status: true,
                  liveUrl: true,
                  isLive: true,
                },
              },
            },
          },
          content: {
            select: {
              id: true,
              status: true,
              wordCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    const redactedOrders = redactSensitiveFields(orders, req.user!.role);

    res.json({
      success: true,
      data: redactedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - targetUrl
 *               - anchorText
 *               - anchorType
 *               - siteIds
 *             properties:
 *               projectId:
 *                 type: string
 *               targetUrl:
 *                 type: string
 *               anchorText:
 *                 type: string
 *               anchorType:
 *                 type: string
 *                 enum: [EXACT_MATCH, PARTIAL_MATCH, BRANDED, GENERIC, NAKED_URL]
 *               siteIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.post('/', [
  authenticate,
  requireAnyAdmin,
  body('projectId').isUUID(),
  body('targetUrl').isURL(),
  body('anchorText').trim().isLength({ min: 1 }),
  body('anchorType').isIn(Object.values(AnchorType)),
  body('siteIds').isArray({ min: 1 }),
  body('deadline').optional().isISO8601(),
  body('notes').optional().trim(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { projectId, targetUrl, anchorText, anchorType, siteIds, deadline, notes } = req.body;

  try {
    // Validate project exists and get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
      },
    });

    if (!project) {
      return res.status(400).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Get sites and validate they exist
    const sites = await prisma.site.findMany({
      where: {
        id: { in: siteIds },
        isActive: true,
      },
    });

    if (sites.length !== siteIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more sites not found or inactive',
      });
    }

    // Validate project guardrails
    const guardrailValidation = await validateProjectGuardrails(project, sites, anchorType);
    if (!guardrailValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: guardrailValidation.error,
      });
    }

    // Calculate total amounts
    const totalAmount = sites.reduce((sum, site) => sum + Number((site as any).basePrice || (site as any).clientPrice), 0);
    const totalCost = sites.reduce((sum, site) => sum + Number(site.internalCost), 0);

    // Budget checking removed for simplified project model
    // TODO: Implement budget tracking if needed in the future

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

    // Create order with sites
    const order = await prisma.order.create({
      data: {
        orderNumber,
        projectId,
        targetUrl,
        anchorText,
        anchorType,
        totalAmount,
        totalCost,
        deadline: deadline ? new Date(deadline) : null,
        notes,
        createdById: req.user!.id,
        orderSites: {
          create: sites.map(site => ({
            siteId: site.id,
            price: (site as any).basePrice || (site as any).clientPrice,
            cost: site.internalCost,
          })),
        },
      },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        orderSites: {
          include: {
            site: {
              select: {
                id: true,
                domain: true,
                domainRating: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // Budget tracking removed for simplified project model
    // TODO: Implement budget tracking if needed in the future

    // Create initial content record
    await prisma.content.create({
      data: {
        orderId: order.id,
        brief: `Create content for ${anchorText} linking to ${targetUrl}`,
      },
    });

    logger.info(`Order ${orderNumber} created by ${req.user!.email}`);

    const redactedOrder = redactSensitiveFields(order, req.user!.role);

    res.status(201).json({
      success: true,
      data: redactedOrder,
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
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
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        orderSites: {
          include: {
            site: {
              include: {
                publisher: {
                  select: {
                    id: true,
                    publisherName: true,
                    email: true,
                  },
                },
              },
            },
            placement: true,
          },
        },
        content: {
          include: {
            files: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                totalAmount: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const redactedOrder = redactSensitiveFields(order, req.user!.role);

    res.json({
      success: true,
      data: redactedOrder,
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PENDING_APPROVAL, APPROVED, IN_PROGRESS, CONTENT_READY, PLACED, LIVE, COMPLETED, CANCELLED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.put('/:id/status', [
  authenticate,
  requireAnyAdmin,
  body('status').isIn(Object.values(OrderStatus)),
  body('notes').optional().trim(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        notes: req.body.notes || order.notes,
      },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
          },
        },
      },
    });

    logger.info(`Order ${order.orderNumber} status updated to ${req.body.status} by ${req.user!.email}`);

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as orderRoutes };
