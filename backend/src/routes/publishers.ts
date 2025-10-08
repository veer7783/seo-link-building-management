import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireAnyAdmin, requireSuperAdmin, redactSensitiveFields } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/publishers:
 *   get:
 *     summary: Get all publishers
 *     tags: [Publishers]
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
 *         description: Publishers retrieved successfully
 */
router.get('/', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('Publishers GET route called');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    console.log('Query params:', { page, limit, skip, search });

    // Simplified query first - no includes
    const publishers = await prisma.publisher.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    console.log('Found publishers:', publishers.length);

    const total = await prisma.publisher.count();

    console.log('Total count:', total);

    res.json({
      success: true,
      data: publishers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get publishers error:', error);
    logger.error('Get publishers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/publishers:
 *   post:
 *     summary: Create a new publisher
 *     tags: [Publishers]
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
 *               phone:
 *                 type: string
 *               website:
 *                 type: string
 *               paymentInfo:
 *                 type: object
 *     responses:
 *       201:
 *         description: Publisher created successfully
 */
router.post('/', [
  authenticate,
  requireSuperAdmin, // Only super admin can create publishers
  body('publisherName').trim().isLength({ min: 1 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('whatsapp').optional().trim(),
  body('modeOfCommunication').isIn(['EMAIL', 'WHATSAPP']),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const publisher = await prisma.publisher.create({
      data: {
        ...req.body,
        createdById: req.user!.id,
      },
      include: {
        _count: {
          select: {
            sites: true,
            publisherBills: true,
          },
        },
      },
    });

    logger.info(`Publisher ${(publisher as any).publisherName || (publisher as any).name || 'Unknown'} created by ${req.user!.email}`);

    const redactedPublisher = redactSensitiveFields(publisher, req.user!.role);

    res.status(201).json({
      success: true,
      data: redactedPublisher,
    });
  } catch (error) {
    logger.error('Create publisher error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/publishers/{id}:
 *   get:
 *     summary: Get publisher by ID
 *     tags: [Publishers]
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
 *         description: Publisher retrieved successfully
 *       404:
 *         description: Publisher not found
 */
router.get('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const publisher = await prisma.publisher.findUnique({
      where: { id: req.params.id },
      include: {
        sites: {
          select: {
            id: true,
            domain: true,
            domainRating: true,
            monthlyTraffic: true,
            category: true,
            language: true,
            country: true,
            turnaroundTime: true,
            basePrice: true,
            internalCost: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        publisherBills: {
          select: {
            id: true,
            billNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            sites: true,
            publisherBills: true,
          },
        },
      },
    });

    if (!publisher) {
      return res.status(404).json({
        success: false,
        error: 'Publisher not found',
      });
    }

    const redactedPublisher = redactSensitiveFields(publisher, req.user!.role);

    res.json({
      success: true,
      data: redactedPublisher,
    });
  } catch (error) {
    logger.error('Get publisher error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/publishers/{id}:
 *   put:
 *     summary: Update publisher
 *     tags: [Publishers]
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
 *         description: Publisher updated successfully
 *       404:
 *         description: Publisher not found
 */
router.put('/:id', [
  authenticate,
  requireSuperAdmin, // Only super admin can update publishers
  body('publisherName').optional().trim().isLength({ min: 1 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('whatsapp').optional().trim(),
  body('modeOfCommunication').optional().isIn(['EMAIL', 'WHATSAPP']),
  body('isActive').optional().isBoolean(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('🔍 PUT Validation errors:', errors.array());
    console.log('🔍 PUT Request body that failed validation:', req.body);
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    console.log('🔍 Update publisher request body:', req.body);
    console.log('🔍 Publisher ID:', req.params.id);
    console.log('🔍 Request headers:', req.headers['content-type']);

    const publisher = await prisma.publisher.findUnique({
      where: { id: req.params.id },
    });

    if (!publisher) {
      return res.status(404).json({
        success: false,
        error: 'Publisher not found',
      });
    }

    // Filter only the fields that exist in our schema
    const allowedFields = ['publisherName', 'email', 'whatsapp', 'modeOfCommunication', 'isActive'];
    const updateData = Object.keys(req.body)
      .filter(key => allowedFields.includes(key) && req.body[key] !== undefined)
      .reduce((obj: any, key) => {
        const value = req.body[key];
        // Handle empty strings for optional fields
        if (key === 'email' || key === 'whatsapp') {
          obj[key] = value === '' ? null : value;
        } else {
          obj[key] = value;
        }
        return obj;
      }, {});

    console.log('🔍 Filtered update data:', updateData);
    console.log('🔍 Original publisher data:', publisher);

    const updatedPublisher = await prisma.publisher.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            sites: true,
            publisherBills: true,
          },
        },
      },
    });

    logger.info(`Publisher ${(publisher as any).publisherName || (publisher as any).name || 'Unknown'} updated by ${req.user!.email}`);

    const redactedPublisher = redactSensitiveFields(updatedPublisher, req.user!.role);

    res.json({
      success: true,
      data: redactedPublisher,
    });
  } catch (error) {
    logger.error('Update publisher error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/publishers/{id}:
 *   delete:
 *     summary: Delete publisher
 *     tags: [Publishers]
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
 *         description: Publisher deleted successfully
 *       404:
 *         description: Publisher not found
 *       400:
 *         description: Cannot delete publisher with active sites
 */
router.delete('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const publisher = await prisma.publisher.findUnique({
      where: { id: req.params.id },
      include: {
        sites: {
          where: { isActive: true },
        },
      },
    });

    if (!publisher) {
      return res.status(404).json({
        success: false,
        error: 'Publisher not found',
      });
    }

    if (publisher.sites.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete publisher with active sites',
      });
    }

    await prisma.publisher.delete({
      where: { id: req.params.id },
    });

    logger.info(`Publisher ${(publisher as any).publisherName || (publisher as any).name || 'Unknown'} deleted by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Publisher deleted successfully',
    });
  } catch (error) {
    logger.error('Delete publisher error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as publisherRoutes };
