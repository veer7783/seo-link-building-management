import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireAnyAdmin, requireSuperAdmin, redactSensitiveFields } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getSitePricingForClient, getSitePricingForClientSite, setSitePriceOverride, removeSitePriceOverride } from '../utils/pricing';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Get all guest blog posting sites
 *     tags: [Guest Blog Posting Sites]
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
 *         name: publisherId
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: minDR
 *         schema:
 *           type: integer
 *       - in: query
 *         name: minTraffic
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sites retrieved successfully
 */
router.get('/', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const publisherId = req.query.publisherId as string;
    const category = req.query.category as string;
    const country = req.query.country as string;
    const minDR = parseInt(req.query.minDR as string);
    const minTraffic = parseInt(req.query.minTraffic as string);
    const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;

    const where: any = {};
    
    if (publisherId) {
      where.publisherId = publisherId;
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' as const };
    }

    if (country) {
      where.country = { contains: country, mode: 'insensitive' as const };
    }

    if (minDR) {
      where.domainRating = { gte: minDR };
    }

    if (minTraffic) {
      where.monthlyTraffic = { gte: minTraffic };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { domain: { contains: search, mode: 'insensitive' as const } },
        { category: { contains: search, mode: 'insensitive' as const } },
        { country: { contains: search, mode: 'insensitive' as const } },
        { publisher: { publisherName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [sites, total] = await Promise.all([
      prisma.site.findMany({
        where,
        skip,
        take: limit,
        include: {
          publisher: {
            select: {
              id: true,
              publisherName: true,
              email: true,
            },
          },
          _count: {
            select: {
              orderSites: true,
            },
          },
        },
        orderBy: { domainRating: 'desc' },
      }),
      prisma.site.count({ where }),
    ]);

    const redactedSites = redactSensitiveFields(sites, req.user!.role);

    res.json({
      success: true,
      data: redactedSites,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get sites error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/sites:
 *   post:
 *     summary: Create a new site
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - publisherId
 *               - domainRating
 *               - monthlyTraffic
 *               - category
 *               - basePrice
 *               - internalCost
 *             properties:
 *               domain:
 *                 type: string
 *               publisherId:
 *                 type: string
 *               domainRating:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               monthlyTraffic:
 *                 type: integer
 *                 minimum: 0
 *               category:
 *                 type: string
 *               language:
 *                 type: string
 *               country:
 *                 type: string
 *               turnaroundTime:
 *                 type: integer
 *               basePrice:
 *                 type: number
 *               internalCost:
 *                 type: number
 *     responses:
 *       201:
 *         description: Site created successfully
 */
router.post('/', [
  authenticate,
  requireAnyAdmin,
  body('domain').trim().isLength({ min: 1 }).custom(async (value) => {
    // Check for duplicate domain
    const existingSite = await prisma.site.findUnique({
      where: { domain: value },
    });
    if (existingSite) {
      throw new Error('Site with this domain already exists');
    }
    return true;
  }),
  body('publisherId').isUUID(),
  body('domainAuthority').isInt({ min: 0, max: 100 }),
  body('domainRating').isInt({ min: 0, max: 100 }),
  body('monthlyTraffic').isInt({ min: 0 }),
  body('spamScore').optional().isInt({ min: 0, max: 100 }),
  body('turnaroundTime').isString().trim().isLength({ min: 1 }),
  body('category').trim().isLength({ min: 1 }),
  body('language').trim().isLength({ min: 1 }),
  body('country').trim().isLength({ min: 1 }),
  body('basePrice').isDecimal({ decimal_digits: '0,2' }),
  body('internalCost').isDecimal({ decimal_digits: '0,2' }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    console.log('🔍 Creating site with data:', req.body);

    // Validate publisher exists
    const publisher = await prisma.publisher.findUnique({
      where: { id: req.body.publisherId },
    });

    if (!publisher) {
      return res.status(400).json({
        success: false,
        error: 'Publisher not found',
      });
    }

    console.log('🔍 Publisher found:', publisher.publisherName);

    // Validate pricing
    if (parseFloat(req.body.basePrice) <= parseFloat(req.body.internalCost)) {
      return res.status(400).json({
        success: false,
        error: 'Base price must be greater than internal cost',
      });
    }

    console.log('🔍 Creating site in database...');
    const site = await prisma.site.create({
      data: {
        domain: req.body.domain,
        domainAuthority: parseInt(req.body.domainAuthority),
        domainRating: parseInt(req.body.domainRating),
        monthlyTraffic: parseInt(req.body.monthlyTraffic),
        spamScore: req.body.spamScore ? parseInt(req.body.spamScore) : null,
        turnaroundTime: req.body.turnaroundTime,
        category: req.body.category,
        language: req.body.language,
        country: req.body.country,
        basePrice: parseFloat(req.body.basePrice),
        internalCost: parseFloat(req.body.internalCost),
        publisherId: req.body.publisherId,
      },
      include: {
        publisher: {
          select: {
            id: true,
            publisherName: true,
            email: true,
          },
        },
        _count: {
          select: {
            orderSites: true,
          },
        },
      },
    });

    console.log('🔍 Site created successfully:', site.id);
    logger.info(`Site ${site.domain} created by ${req.user!.email}`);

    const redactedSite = redactSensitiveFields(site, req.user!.role);

    res.status(201).json({
      success: true,
      data: redactedSite,
    });
  } catch (error) {
    console.error('🔍 Site creation error:', error);
    logger.error('Create site error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/sites/{id}:
 *   get:
 *     summary: Get site by ID
 *     tags: [Sites]
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
 *         description: Site retrieved successfully
 *       404:
 *         description: Site not found
 */
router.get('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const site = await prisma.site.findUnique({
      where: { id: req.params.id },
      include: {
        publisher: {
          select: {
            id: true,
            publisherName: true,
            email: true,
            // website field removed from schema
          },
        },
        orderSites: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                targetUrl: true,
                anchorText: true,
                createdAt: true,
              },
            },
            placement: {
              select: {
                id: true,
                status: true,
                liveUrl: true,
                isLive: true,
                placedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            orderSites: true,
          },
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found',
      });
    }

    const redactedSite = redactSensitiveFields(site, req.user!.role);

    res.json({
      success: true,
      data: redactedSite,
    });
  } catch (error) {
    logger.error('Get site error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/sites/{id}:
 *   put:
 *     summary: Update site
 *     tags: [Sites]
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
 *         description: Site updated successfully
 *       404:
 *         description: Site not found
 */
router.put('/:id', [
  authenticate,
  requireAnyAdmin,
  body('domainRating').optional().isInt({ min: 0, max: 100 }),
  body('monthlyTraffic').optional().isInt({ min: 0 }),
  body('spamScore').optional().isInt({ min: 0, max: 100 }),
  body('turnaroundTime').optional().trim().isLength({ min: 1 }),
  body('category').optional().trim().isLength({ min: 1 }),
  body('language').optional().trim().isLength({ min: 1 }),
  body('country').optional().trim().isLength({ min: 1 }),
  body('basePrice').optional().isDecimal({ decimal_digits: '0,2' }),
  body('internalCost').optional().isDecimal({ decimal_digits: '0,2' }),
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
    const site = await prisma.site.findUnique({
      where: { id: req.params.id },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found',
      });
    }

    // Validate pricing if both are provided
    if (req.body.basePrice && req.body.internalCost) {
      if (parseFloat(req.body.basePrice) <= parseFloat(req.body.internalCost)) {
        return res.status(400).json({
          success: false,
          error: 'Base price must be greater than internal cost',
        });
      }
    }

    const updateData: any = {};
    if (req.body.domain) updateData.domain = req.body.domain;
    if (req.body.domainAuthority) updateData.domainAuthority = parseInt(req.body.domainAuthority);
    if (req.body.domainRating) updateData.domainRating = parseInt(req.body.domainRating);
    if (req.body.monthlyTraffic) updateData.monthlyTraffic = parseInt(req.body.monthlyTraffic);
    if (req.body.spamScore !== undefined) updateData.spamScore = req.body.spamScore ? parseInt(req.body.spamScore) : null;
    if (req.body.turnaroundTime) updateData.turnaroundTime = req.body.turnaroundTime;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.language) updateData.language = req.body.language;
    if (req.body.country) updateData.country = req.body.country;
    if (req.body.basePrice) updateData.basePrice = parseFloat(req.body.basePrice);
    if (req.body.internalCost) updateData.internalCost = parseFloat(req.body.internalCost);
    if (req.body.publisherId) updateData.publisherId = req.body.publisherId;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const updatedSite = await prisma.site.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        publisher: {
          select: {
            id: true,
            publisherName: true,
            email: true,
          },
        },
        _count: {
          select: {
            orderSites: true,
          },
        },
      },
    });

    logger.info(`Site ${site.domain} updated by ${req.user!.email}`);

    const redactedSite = redactSensitiveFields(updatedSite, req.user!.role);

    res.json({
      success: true,
      data: redactedSite,
    });
  } catch (error) {
    logger.error('Update site error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/sites/bulk-import:
 *   post:
 *     summary: Bulk import sites
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sites
 *             properties:
 *               sites:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Sites imported successfully
 */
router.post('/bulk-import', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { sites } = req.body;

    if (!Array.isArray(sites) || sites.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Sites array is required and must not be empty',
      });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const siteData of sites) {
      try {
        // Check if site already exists
        const existingSite = await prisma.site.findUnique({
          where: { domain: siteData.domain },
        });

        if (existingSite) {
          results.skipped++;
          continue;
        }

        // Validate publisher exists
        const publisher = await prisma.publisher.findUnique({
          where: { id: siteData.publisherId },
        });

        if (!publisher) {
          results.errors.push({
            domain: siteData.domain,
            error: 'Publisher not found',
          });
          continue;
        }

        await prisma.site.create({
          data: siteData,
        });

        results.imported++;
      } catch (error) {
        results.errors.push({
          domain: siteData.domain,
          error: (error as Error).message,
        });
      }
    }

    logger.info(`Bulk import completed by ${req.user!.email}: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/sites/pricing/{clientId}:
 *   get:
 *     summary: Get site pricing for a specific client
 *     tags: [Guest Blog Posting Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Site pricing retrieved successfully
 */
router.get('/pricing/:clientId', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const pricing = await getSitePricingForClient(req.params.clientId);
    
    res.json({
      success: true,
      data: pricing,
    });
  } catch (error: any) {
    logger.error('Get site pricing error:', error);
    
    if (error.message === 'Client not found') {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
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
 * /api/sites/pricing/{clientId}/{siteId}:
 *   get:
 *     summary: Get pricing for a specific site for a specific client
 *     tags: [Guest Blog Posting Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Site pricing retrieved successfully
 */
router.get('/pricing/:clientId/:siteId', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const pricing = await getSitePricingForClientSite(req.params.clientId, req.params.siteId);
    
    res.json({
      success: true,
      data: pricing,
    });
  } catch (error: any) {
    logger.error('Get site pricing error:', error);
    
    if (error.message === 'Client not found' || error.message === 'Site not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
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
 * /api/sites/pricing/{clientId}/{siteId}/override:
 *   post:
 *     summary: Set price override for a specific client-site combination (Super Admin only)
 *     tags: [Guest Blog Posting Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: siteId
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
 *               overridePrice:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Price override set successfully
 */
router.post('/pricing/:clientId/:siteId/override', [
  authenticate,
  requireSuperAdmin,
  body('overridePrice').isFloat({ min: 0 }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    await setSitePriceOverride(
      req.params.clientId,
      req.params.siteId,
      req.body.overridePrice,
      req.user!.id
    );
    
    logger.info(`Price override set for client ${req.params.clientId} and site ${req.params.siteId} by ${req.user!.email}`);
    
    res.json({
      success: true,
      message: 'Price override set successfully',
    });
  } catch (error: any) {
    logger.error('Set price override error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/sites/{siteId}/client-price/{clientId}:
 *   get:
 *     summary: Calculate price for a specific site for a specific client
 *     tags: [Guest Blog Posting Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Site pricing calculated successfully
 */
router.get('/:siteId/client-price/:clientId', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { siteId, clientId } = req.params;

    // Get site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        clientSiteOverrides: {
          where: { clientId },
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found',
      });
    }

    // Get client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    // Check for override
    const override = site.clientSiteOverrides[0];
    const hasOverride = !!override;

    let finalPrice: number;
    if (hasOverride) {
      finalPrice = parseFloat(override.overridePrice.toString());
    } else {
      // Calculate with client percentage: basePrice + (basePrice * clientPercentage / 100)
      finalPrice = parseFloat(site.basePrice.toString()) * (1 + client.percentage / 100);
    }

    res.json({
      success: true,
      data: {
        siteId,
        basePrice: parseFloat(site.basePrice.toString()),
        clientPercentage: client.percentage,
        finalPrice,
        isOverride: hasOverride,
        overridePrice: hasOverride ? parseFloat(override.overridePrice.toString()) : undefined,
      },
    });
  } catch (error: any) {
    logger.error('Calculate client price error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as siteRoutes };
