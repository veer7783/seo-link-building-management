import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireSuperAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to map legacy statuses for backward compatibility
function mapLegacyStatus(status: string): string {
  switch (status) {
    case 'PENDING': return 'APPROVED';
    case 'LIVE': return 'PLACED';
    default: return status;
  }
}

// Helper function to generate placement ID
const generatePlacementId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `GBP-${year}-`;
  
  // @ts-ignore - Prisma client has guestBlogPlacement at runtime
  const lastPlacement = await prisma.guestBlogPlacement.findFirst({
    where: {
      placementId: {
        startsWith: prefix
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let nextNumber = 1;
  if (lastPlacement) {
    const lastNumber = parseInt(lastPlacement.placementId.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
};

/**
 * @swagger
 * /api/guest-blog-placements:
 *   get:
 *     summary: Get all guest blog placements
 *     tags: [Guest Blog Placements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const clientId = req.query.clientId as string;
    const projectId = req.query.projectId as string;
    const search = req.query.search as string;
    const status = req.query.status as string;

    // Build where clause with filters
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { placementId: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { project: { projectName: { contains: search, mode: 'insensitive' } } },
        { guestBlogSite: { site_url: { contains: search, mode: 'insensitive' } } },
        { guestBlogSite: { publisher: { publisherName: { contains: search, mode: 'insensitive' } } } },
        { guestBlogSite: { publisher: { email: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    // @ts-ignore - Prisma client has guestBlogPlacement at runtime
    const placements = await prisma.guestBlogPlacement.findMany({
      where,
      skip,
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            percentage: true
          }
        },
        // @ts-ignore - Project relation will exist after migration
        project: {
          select: {
            id: true,
            projectName: true,
            websiteUrl: true,
            companyName: true
          }
        },
        guestBlogSite: {
          select: {
            id: true,
            site_url: true,
            da: true,
            dr: true,
            category: true,
            base_price: true,
            publisher: {
              select: {
                id: true,
                publisherName: true,
                email: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // @ts-ignore - Prisma client has guestBlogPlacement at runtime
    const total = await prisma.guestBlogPlacement.count({ where });

    // Map legacy statuses for backward compatibility
    const mappedPlacements = placements.map(placement => ({
      ...placement,
      status: mapLegacyStatus(placement.status)
    }));

    res.json({
      success: true,
      data: mappedPlacements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching guest blog placements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch placements'
    });
  }
});

/**
 * @swagger
 * /api/guest-blog-placements:
 *   post:
 *     summary: Create placements from orders
 *     tags: [Guest Blog Placements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', [
  authenticate,
  requireSuperAdmin,
  body('orderIds').isArray({ min: 1 }).withMessage('Order IDs are required'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { orderIds } = req.body;
    const createdPlacements = [];

    // Create placements in a transaction
    await prisma.$transaction(async (tx) => {
      for (const orderId of orderIds) {
        // @ts-ignore - Prisma client has guestBlogOrder at runtime
        const order = await tx.guestBlogOrder.findUnique({
          where: { id: orderId },
          include: {
            client: true,
            // @ts-ignore - Project relation will exist after migration
            project: true,
            guestBlogSite: true
          }
        });

        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }

        const placementId = await generatePlacementId();

        // @ts-ignore - Prisma client has guestBlogPlacement at runtime
        const placement = await tx.guestBlogPlacement.create({
          // @ts-ignore - projectId field will exist after migration
          data: {
            placementId,
            originalOrderId: order.id,
            originalOrderNumber: order.orderId,
            clientId: order.clientId,
            // @ts-ignore - projectId will exist after migration
            projectId: order.projectId,
            guestBlogSiteId: order.guestBlogSiteId,
            price: order.price,
            contentText: order.contentText,
            contentDocUrl: order.contentDocUrl,
            status: 'READY_TO_PUBLISH' as any, // Using string literal until Prisma client is regenerated
            createdById: req.user!.id,
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            // @ts-ignore - Project relation will exist after migration
            project: {
              select: {
                id: true,
                projectName: true,
                websiteUrl: true,
                companyName: true
              }
            },
            guestBlogSite: {
              select: {
                id: true,
                site_url: true,
                da: true,
                dr: true
              }
            }
          }
        });

        createdPlacements.push(placement);
      }
    });

    // Map legacy statuses for backward compatibility
    const mappedPlacements = createdPlacements.map(placement => ({
      ...placement,
      status: mapLegacyStatus(placement.status)
    }));

    res.status(201).json({
      success: true,
      data: mappedPlacements,
      message: `Successfully created ${createdPlacements.length} placements`
    });
  } catch (error) {
    logger.error('Error creating placements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create placements'
    });
  }
});

/**
 * @swagger
 * /api/guest-blog-placements/{id}:
 *   put:
 *     summary: Update guest blog placement
 *     tags: [Guest Blog Placements]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', [
  authenticate,
  requireSuperAdmin,
  body('status').optional().isIn(['READY_TO_PUBLISH', 'FOR_REVIEW', 'COMPLETED', 'FAILED', 'PENDING', 'PLACED', 'LIVE', 'APPROVED']),
  body('liveUrl').optional().isString(),
  body('notes').optional().isString(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { id } = req.params;
    const updateData: any = {};

    if (req.body.status) {
      updateData.status = req.body.status;
      // Set placedAt for statuses that indicate placement
      if (req.body.status === 'PLACED' || req.body.status === 'FOR_REVIEW' || req.body.status === 'COMPLETED') {
        updateData.placedAt = new Date();
      }
    }
    if (req.body.liveUrl !== undefined) updateData.liveUrl = req.body.liveUrl;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    // @ts-ignore - Prisma client has guestBlogPlacement at runtime
    const placement = await prisma.guestBlogPlacement.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // @ts-ignore - Project relation will exist after migration
        project: {
          select: {
            id: true,
            projectName: true,
            websiteUrl: true,
            companyName: true
          }
        },
        guestBlogSite: {
          select: {
            id: true,
            site_url: true,
            da: true,
            dr: true
          }
        }
      }
    });

    // Map legacy status for backward compatibility
    const mappedPlacement = {
      ...placement,
      status: mapLegacyStatus(placement.status)
    };

    res.json({
      success: true,
      data: mappedPlacement,
      message: 'Placement updated successfully'
    });
  } catch (error) {
    logger.error('Error updating placement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update placement'
    });
  }
});

/**
 * @swagger
 * /api/guest-blog-placements/{id}:
 *   delete:
 *     summary: Delete guest blog placement
 *     tags: [Guest Blog Placements]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // @ts-ignore - Prisma client has guestBlogPlacement at runtime
    await prisma.guestBlogPlacement.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Placement deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting placement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete placement'
    });
  }
});

export default router;
