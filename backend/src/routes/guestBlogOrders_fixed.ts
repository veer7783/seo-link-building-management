import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, GuestBlogPlacementStatus } from '@prisma/client';
import { authenticate, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = express.Router();
const prisma = new PrismaClient();

// Ensure upload directory exists
const uploadDir = 'uploads/content-docs/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and RTF files are allowed.'));
    }
  }
});

// Generate unique order ID per client
const generateOrderId = async (clientId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const prefix = `GBO-${year}${month}-`;
  
  try {
    // Get client info to make ID more unique
    // @ts-ignore - Prisma client has client at runtime
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true }
    });
    
    const clientPrefix = client?.name.substring(0, 3).toUpperCase() || 'CLI';
    
    // @ts-ignore - Prisma client has guestBlogOrder at runtime
    const lastOrder = await prisma.guestBlogOrder.findFirst({
      where: {
        clientId: clientId,
        orderId: {
          startsWith: prefix
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastOrder) {
      const parts = lastOrder.orderId.split('-');
      if (parts.length >= 3) {
        const lastNumber = parseInt(parts[2].replace(/[A-Z]/g, ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    // Include client prefix and timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${clientPrefix}${nextNumber.toString().padStart(3, '0')}-${timestamp}`;
  } catch (error) {
    logger.error('Error generating order ID:', error);
    // Fallback with timestamp to ensure uniqueness
    const timestamp = Date.now();
    return `GBO-${year}${month}-${timestamp}`;
  }
};

// GET /api/guest-blog-orders - Get all orders
router.get('/', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const clientId = req.query.clientId as string;
    const projectId = req.query.projectId as string;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { project: { projectName: { contains: search, mode: 'insensitive' } } },
        { guestBlogSite: { site_url: { contains: search, mode: 'insensitive' } } },
        { guestBlogSite: { publisher: { publisherName: { contains: search, mode: 'insensitive' } } } },
        { guestBlogSite: { publisher: { email: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    // @ts-ignore - Prisma client has guestBlogOrder at runtime
    const orders = await prisma.guestBlogOrder.findMany({
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
            status: true,
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

    // @ts-ignore - Prisma client has guestBlogOrder at runtime
    const total = await prisma.guestBlogOrder.count({ where });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching guest blog orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// POST /api/guest-blog-orders - Create orders from cart
router.post('/', [
  authenticate,
  requireSuperAdmin,
  body('cartItems').isArray({ min: 1 }).withMessage('Cart items are required'),
], async (req: AuthenticatedRequest, res) => {
  // Add detailed logging
  logger.info('Order creation request received', {
    body: req.body,
    user: req.user?.email,
    cartItemsLength: req.body?.cartItems?.length
  });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors in order creation:', errors.array());
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { cartItems } = req.body;
    const createdOrders = [];

    // Validate each cart item
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      logger.info(`Validating cart item ${i}:`, item);
      
      if (!item.clientId || !item.projectId || !item.guestBlogSiteId) {
        throw new Error(`Cart item ${i} missing required fields: clientId, projectId, or guestBlogSiteId`);
      }
      
      if (typeof item.price !== 'number' || item.price <= 0) {
        throw new Error(`Cart item ${i} has invalid price: ${item.price}`);
      }
    }

    // Create orders in a transaction
    await prisma.$transaction(async (tx) => {
      for (const item of cartItems) {
        const orderId = await generateOrderId(item.clientId);
        
        // Determine status based on site status
        // @ts-ignore - Prisma client has guestBlogSite at runtime
        const guestBlogSite = await tx.guestBlogSite.findUnique({
          where: { id: item.guestBlogSiteId },
          select: { status: true }
        });
        
        const orderStatus = guestBlogSite?.status === 'ACTIVE' ? 'ACTIVE' : 'IN_PROGRESS';
        
        // @ts-ignore - Prisma client has guestBlogOrder at runtime
        const order = await tx.guestBlogOrder.create({
          // @ts-ignore - projectId field will exist after migration
          data: {
            orderId,
            clientId: item.clientId,
            projectId: item.projectId,
            guestBlogSiteId: item.guestBlogSiteId,
            price: item.price,
            contentText: item.contentText,
            contentDocUrl: item.contentDocUrl,
            status: orderStatus,
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

        createdOrders.push(order);
      }
    });

    res.status(201).json({
      success: true,
      data: createdOrders,
      message: `Successfully created ${createdOrders.length} orders`
    });
  } catch (error) {
    logger.error('Error creating orders:', {
      error: error.message,
      stack: error.stack,
      cartItems: req.body?.cartItems
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create orders',
      details: error.message
    });
  }
});

// PUT /api/guest-blog-orders/:id - Update order
router.put('/:id', [
  authenticate,
  requireSuperAdmin,
  body('contentText').optional().isString(),
  body('status').optional().isIn(['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  body('contentDocUrl').optional().isString(),
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

    if (req.body.contentText !== undefined) updateData.contentText = req.body.contentText;
    if (req.body.contentDocUrl !== undefined) updateData.contentDocUrl = req.body.contentDocUrl;
    if (req.body.status) updateData.status = req.body.status;

    // @ts-ignore - Prisma client has guestBlogOrder at runtime
    const order = await prisma.guestBlogOrder.update({
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

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    logger.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order'
    });
  }
});

// DELETE /api/guest-blog-orders/:id - Delete order
router.delete('/:id', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // @ts-ignore - Prisma client has guestBlogOrder at runtime
    await prisma.guestBlogOrder.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting order:', error);
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete order'
      });
    }
  }
});

// POST /api/guest-blog-orders/bulk/place - Place multiple orders
router.post('/bulk/place', [
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
    logger.info('Bulk place request:', { orderIds, count: orderIds.length });
    const createdPlacements = [];

    // Create placements in a transaction
    await prisma.$transaction(async (tx) => {
      for (const orderId of orderIds) {
        logger.info(`Processing order: ${orderId}`);
        
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
          logger.error(`Order not found: ${orderId}`);
          throw new Error(`Order ${orderId} not found`);
        }
        
        // @ts-ignore - Client relation will exist after migration
        logger.info(`Found order: ${order.orderId} for client: ${order.client.name}`);

        // Generate placement ID
        const year = new Date().getFullYear();
        const placementPrefix = `GBP-${year}-`;
        
        // @ts-ignore - Prisma client has guestBlogPlacement at runtime
        const lastPlacement = await tx.guestBlogPlacement.findFirst({
          where: {
            placementId: {
              startsWith: placementPrefix
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        let nextPlacementNumber = 1;
        if (lastPlacement) {
          const lastNumber = parseInt(lastPlacement.placementId.split('-')[2]);
          nextPlacementNumber = lastNumber + 1;
        }

        const placementId = `${placementPrefix}${nextPlacementNumber.toString().padStart(3, '0')}`;
        logger.info(`Generated placement ID: ${placementId}`);

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

      // After creating all placements, delete the original orders
      logger.info('Deleting original orders after placement creation');
      for (const orderId of orderIds) {
        // @ts-ignore - Prisma client has guestBlogOrder at runtime
        await tx.guestBlogOrder.delete({
          where: { id: orderId }
        });
        logger.info(`Deleted order: ${orderId}`);
      }
    });

    res.status(201).json({
      success: true,
      data: createdPlacements,
      message: `Successfully placed ${createdPlacements.length} orders and moved them to placements`
    });
  } catch (error) {
    logger.error('Error placing orders:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
      orderIds: req.body?.orderIds
    });
    res.status(500).json({
      success: false,
      error: 'Failed to place orders',
      details: error.message,
      code: error.code
    });
  }
});

// POST /api/guest-blog-orders/upload-content-doc - Upload content document
router.post('/upload-content-doc', authenticate, requireSuperAdmin, upload.single('contentDoc'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/content-docs/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    logger.error('Error uploading content document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// GET /api/guest-blog-orders/ordered-sites/:clientId - Get ordered sites for a client
router.get('/ordered-sites/:clientId', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { clientId } = req.params;

    // @ts-ignore - Prisma client has guestBlogOrder at runtime
    const orders = await prisma.guestBlogOrder.findMany({
      where: {
        clientId: clientId
      },
      select: {
        guestBlogSiteId: true
      }
    });

    // Extract unique site IDs
    const orderedSiteIds = [...new Set(orders.map(order => order.guestBlogSiteId))];

    res.json({
      success: true,
      data: orderedSiteIds
    });
  } catch (error) {
    logger.error('Error fetching ordered sites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ordered sites'
    });
  }
});

// GET /api/guest-blog-orders/download/:filename - Download content document
router.get('/download/:filename', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'content-docs', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send file
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

export default router;
