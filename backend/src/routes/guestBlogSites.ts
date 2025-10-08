import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { authenticate, AuthenticatedRequest, requireAnyAdmin, requireSuperAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';
import { normalizeUrl, validateNormalizedUrl } from '../utils/urlNormalization';
import {
  parseCSV,
  parseExcel,
  autoDetectColumnMappings,
  generatePreview,
  saveBulkData,
  generateCSVTemplate,
  GUEST_BLOG_SITE_COLUMNS,
  type ColumnMapping,
  type BulkUploadPreview
} from '../services/bulkUploadService';

// Force TypeScript to recognize Prisma types
// @ts-ignore - Prisma client types are correctly generated at runtime

// Define enums locally since they're not exported from Prisma client
enum GuestBlogSiteCategory {
  BUSINESS_ENTREPRENEURSHIP = 'BUSINESS_ENTREPRENEURSHIP',
  MARKETING_SEO = 'MARKETING_SEO',
  TECHNOLOGY_GADGETS = 'TECHNOLOGY_GADGETS',
  HEALTH_FITNESS = 'HEALTH_FITNESS',
  LIFESTYLE_WELLNESS = 'LIFESTYLE_WELLNESS',
  FINANCE_INVESTMENT = 'FINANCE_INVESTMENT',
  EDUCATION_CAREER = 'EDUCATION_CAREER',
  TRAVEL_TOURISM = 'TRAVEL_TOURISM',
  FOOD_NUTRITION = 'FOOD_NUTRITION',
  REAL_ESTATE_HOME_IMPROVEMENT = 'REAL_ESTATE_HOME_IMPROVEMENT',
  AI_FUTURE_TECH = 'AI_FUTURE_TECH',
  ECOMMERCE_STARTUPS = 'ECOMMERCE_STARTUPS',
  SUSTAINABILITY_GREEN_LIVING = 'SUSTAINABILITY_GREEN_LIVING',
  PARENTING_RELATIONSHIPS = 'PARENTING_RELATIONSHIPS',
  FASHION_BEAUTY = 'FASHION_BEAUTY',
  ENTERTAINMENT_MEDIA = 'ENTERTAINMENT_MEDIA',
  SPORTS_FITNESS = 'SPORTS_FITNESS',
  GENERAL = 'GENERAL',
  OTHERS = 'OTHERS',
}

enum GuestBlogSiteStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

const router = express.Router();
const prisma = new PrismaClient();

// Category mapping for display
const CATEGORY_DISPLAY_MAP = {
  BUSINESS_ENTREPRENEURSHIP: 'Business & Entrepreneurship',
  MARKETING_SEO: 'Marketing & SEO',
  TECHNOLOGY_GADGETS: 'Technology & Gadgets',
  HEALTH_FITNESS: 'Health & Fitness',
  LIFESTYLE_WELLNESS: 'Lifestyle & Wellness',
  FINANCE_INVESTMENT: 'Finance & Investment',
  EDUCATION_CAREER: 'Education & Career',
  TRAVEL_TOURISM: 'Travel & Tourism',
  FOOD_NUTRITION: 'Food & Nutrition',
  REAL_ESTATE_HOME_IMPROVEMENT: 'Real Estate & Home Improvement',
  AI_FUTURE_TECH: 'AI & Future Tech',
  ECOMMERCE_STARTUPS: 'E-commerce & Startups',
  SUSTAINABILITY_GREEN_LIVING: 'Sustainability & Green Living',
  PARENTING_RELATIONSHIPS: 'Parenting & Relationships',
  FASHION_BEAUTY: 'Fashion & Beauty',
  ENTERTAINMENT_MEDIA: 'Entertainment & Media',
  SPORTS_FITNESS: 'Sports & Fitness',
  GENERAL: 'General',
  OTHERS: 'Others',
};

// Helper function to calculate displayed price
const calculateDisplayedPrice = (basePrice: number, clientPercentage?: number): number => {
  const percentage = clientPercentage || 25; // Default 25% markup
  return basePrice + (basePrice * percentage / 100);
};

/**
 * @swagger
 * /api/guest-sites:
 *   get:
 *     summary: Get all guest blog sites
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Guest blog sites retrieved successfully
 */
router.get('/', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const country = req.query.country as string;
    const status = req.query.status as GuestBlogSiteStatus;
    const publisherId = req.query.publisherId as string;
    const clientId = req.query.clientId as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { site_url: { contains: search, mode: 'insensitive' as const } },
        { country: { contains: search, mode: 'insensitive' as const } },
        { publisher: { publisherName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (country) {
      where.country = { contains: country, mode: 'insensitive' as const };
    }

    if (status) {
      where.status = status;
    }

    if (publisherId) {
      where.publisher_id = publisherId;
    }

    // Get client for pricing calculation if provided
    let client = null;
    if (clientId) {
      client = await prisma.client.findUnique({
        where: { id: clientId },
      });
    }

    const [sites, total] = await Promise.all([
      // @ts-ignore - Prisma client has guestBlogSite at runtime
      prisma.guestBlogSite.findMany({
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
          overrides: clientId ? {
            where: { clientId },
          } : false,
        },
        orderBy: { dr: 'desc' },
      }),
      // @ts-ignore - Prisma client has guestBlogSite at runtime
      prisma.guestBlogSite.count({ where }),
    ]);

    // Transform sites to include displayed price
    const transformedSites = sites.map(site => {
      const basePrice = parseFloat(site.base_price.toString());
      let displayedPrice = calculateDisplayedPrice(basePrice);
      let isOverride = false;

      // Check for client-specific override
      if (client && site.overrides && site.overrides.length > 0) {
        displayedPrice = parseFloat(site.overrides[0].overridePrice.toString());
        isOverride = true;
      } else if (client) {
        // Use client percentage
        displayedPrice = calculateDisplayedPrice(basePrice, client.percentage);
      }

      return {
        id: site.id,
        site_url: site.site_url,
        da: site.da,
        dr: site.dr,
        ahrefs_traffic: site.ahrefs_traffic,
        ss: site.ss,
        tat: site.tat,
        category: site.category,
        categoryDisplay: CATEGORY_DISPLAY_MAP[site.category],
        status: site.status,
        base_price: basePrice, // Internal base price
        displayed_price: displayedPrice,
        country: site.country,
        publisher_id: site.publisher_id,
        site_language: site.site_language,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
        publisher: site.publisher,
        isOverride,
      };
    });

    res.json({
      success: true,
      data: transformedSites,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get guest blog sites error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/guest-sites:
 *   post:
 *     summary: Create a new guest blog site
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', [
  authenticate,
  requireAnyAdmin,
  body('site_url').trim().isLength({ min: 1 }).custom(async (value) => {
    // Normalize the URL
    let normalizedUrl;
    try {
      normalizedUrl = normalizeUrl(value);
    } catch (error) {
      throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Check for existing site with normalized URL
    // @ts-ignore - Prisma client has guestBlogSite at runtime
    const existingSite = await prisma.guestBlogSite.findUnique({
      where: { site_url: normalizedUrl },
    });
    if (existingSite) {
      throw new Error('Guest blog site with this URL already exists');
    }
    return true;
  }),
  body('da').isInt({ min: 0, max: 100 }),
  body('dr').isInt({ min: 0, max: 100 }),
  body('ahrefs_traffic').isInt({ min: 0 }),
  body('ss').optional().isInt({ min: 0, max: 100 }),
  body('tat').trim().isLength({ min: 1 }),
  body('category').isIn(Object.keys(CATEGORY_DISPLAY_MAP)),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']),
  body('base_price').isFloat({ min: 0 }),
  body('country').trim().isLength({ min: 1 }),
  body('publisher_id').isUUID(),
  body('site_language').trim().isLength({ min: 1 }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    // Validate publisher exists
    const publisher = await prisma.publisher.findUnique({
      where: { id: req.body.publisher_id },
    });

    if (!publisher) {
      return res.status(400).json({
        success: false,
        error: 'Publisher not found',
      });
    }

    // Normalize the URL before saving
    const normalizedUrl = normalizeUrl(req.body.site_url);

    // @ts-ignore - Prisma client has guestBlogSite at runtime
    const site = await prisma.guestBlogSite.create({
      data: {
        site_url: normalizedUrl,
        da: parseInt(req.body.da),
        dr: parseInt(req.body.dr),
        ahrefs_traffic: parseInt(req.body.ahrefs_traffic),
        ss: req.body.ss ? parseInt(req.body.ss) : null,
        tat: req.body.tat,
        category: req.body.category as GuestBlogSiteCategory,
        status: (req.body.status as GuestBlogSiteStatus) || GuestBlogSiteStatus.ACTIVE,
        base_price: parseFloat(req.body.base_price),
        country: req.body.country,
        publisher_id: req.body.publisher_id,
        site_language: req.body.site_language,
      },
      include: {
        publisher: {
          select: {
            id: true,
            publisherName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Guest blog site ${site.site_url} created by ${req.user!.email}`);

    const basePrice = parseFloat(site.base_price.toString());
    const displayedPrice = calculateDisplayedPrice(basePrice);

    const transformedSite = {
      id: site.id,
      site_url: site.site_url,
      da: site.da,
      dr: site.dr,
      ahrefs_traffic: site.ahrefs_traffic,
      ss: site.ss,
      tat: site.tat,
      category: site.category,
      categoryDisplay: CATEGORY_DISPLAY_MAP[site.category],
      status: site.status,
      base_price: basePrice,
      displayed_price: displayedPrice,
      country: site.country,
      publisher_id: site.publisher_id,
      site_language: site.site_language,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      publisher: site.publisher,
      isOverride: false,
    };

    res.status(201).json({
      success: true,
      data: transformedSite,
    });
  } catch (error) {
    logger.error('Create guest blog site error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/guest-sites/{id}:
 *   put:
 *     summary: Update guest blog site
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', [
  authenticate,
  requireAnyAdmin,
  body('site_url').optional().trim().isLength({ min: 1 }).custom(async (value, { req }) => {
    if (!value) return true; // Skip if not provided
    
    // Normalize the URL
    let normalizedUrl;
    try {
      normalizedUrl = normalizeUrl(value);
    } catch (error) {
      throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Check for existing site with normalized URL (excluding current site)
    // @ts-ignore - Prisma client has guestBlogSite at runtime
    const existingSite = await prisma.guestBlogSite.findUnique({
      where: { site_url: normalizedUrl },
    });
    if (existingSite && existingSite.id !== req.params.id) {
      throw new Error('Guest blog site with this URL already exists');
    }
    return true;
  }),
  body('da').optional().isInt({ min: 0, max: 100 }),
  body('dr').optional().isInt({ min: 0, max: 100 }),
  body('ahrefs_traffic').optional().isInt({ min: 0 }),
  body('ss').optional().isInt({ min: 0, max: 100 }),
  body('tat').optional().trim().isLength({ min: 1 }),
  body('category').optional().isIn(Object.keys(CATEGORY_DISPLAY_MAP)),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']),
  body('base_price').optional().isFloat({ min: 0 }),
  body('country').optional().trim().isLength({ min: 1 }),
  body('publisher_id').optional().isUUID(),
  body('site_language').optional().trim().isLength({ min: 1 }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    // @ts-ignore - Prisma client has guestBlogSite at runtime
    const site = await prisma.guestBlogSite.findUnique({
      where: { id: req.params.id },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Guest blog site not found',
      });
    }

    // Validate publisher if provided
    if (req.body.publisher_id) {
      const publisher = await prisma.publisher.findUnique({
        where: { id: req.body.publisher_id },
      });

      if (!publisher) {
        return res.status(400).json({
          success: false,
          error: 'Publisher not found',
        });
      }
    }

    const updateData: any = {};
    if (req.body.site_url) updateData.site_url = normalizeUrl(req.body.site_url);
    if (req.body.da !== undefined) updateData.da = parseInt(req.body.da);
    if (req.body.dr !== undefined) updateData.dr = parseInt(req.body.dr);
    if (req.body.ahrefs_traffic !== undefined) updateData.ahrefs_traffic = parseInt(req.body.ahrefs_traffic);
    if (req.body.ss !== undefined) updateData.ss = req.body.ss ? parseInt(req.body.ss) : null;
    if (req.body.tat) updateData.tat = req.body.tat;
    if (req.body.category) updateData.category = req.body.category as GuestBlogSiteCategory;
    if (req.body.status) updateData.status = req.body.status as GuestBlogSiteStatus;
    if (req.body.base_price !== undefined) updateData.base_price = parseFloat(req.body.base_price);
    if (req.body.country) updateData.country = req.body.country;
    if (req.body.publisher_id) updateData.publisher_id = req.body.publisher_id;
    if (req.body.site_language) updateData.site_language = req.body.site_language;

    // @ts-ignore - Prisma client has guestBlogSite at runtime
    const updatedSite = await prisma.guestBlogSite.update({
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
      },
    });

    logger.info(`Guest blog site ${site.site_url} updated by ${req.user!.email}`);

    const basePrice = parseFloat(updatedSite.base_price.toString());
    const displayedPrice = calculateDisplayedPrice(basePrice);

    const transformedSite = {
      id: updatedSite.id,
      site_url: updatedSite.site_url,
      da: updatedSite.da,
      dr: updatedSite.dr,
      ahrefs_traffic: updatedSite.ahrefs_traffic,
      ss: updatedSite.ss,
      tat: updatedSite.tat,
      category: updatedSite.category,
      categoryDisplay: CATEGORY_DISPLAY_MAP[updatedSite.category],
      status: updatedSite.status,
      base_price: basePrice,
      displayed_price: displayedPrice,
      country: updatedSite.country,
      publisher_id: updatedSite.publisher_id,
      site_language: updatedSite.site_language,
      createdAt: updatedSite.createdAt,
      updatedAt: updatedSite.updatedAt,
      publisher: updatedSite.publisher,
      isOverride: false,
    };

    res.json({
      success: true,
      data: transformedSite,
    });
  } catch (error) {
    logger.error('Update guest blog site error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/guest-sites/{id}:
 *   delete:
 *     summary: Delete guest blog site
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // @ts-ignore - Prisma client has guestBlogSite at runtime
    const site = await prisma.guestBlogSite.findUnique({
      where: { id: req.params.id },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Guest blog site not found',
      });
    }

    try {
      // @ts-ignore - Prisma client has guestBlogSite at runtime
      await prisma.guestBlogSite.delete({
        where: { id: req.params.id },
      });

      logger.info(`Guest blog site ${site.site_url} deleted by ${req.user!.email}`);
    } catch (error) {
      logger.error('Delete guest blog site error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }

    res.json({
      success: true,
      message: 'Guest blog site deleted successfully',
    });
  } catch (error) {
    logger.error('Delete guest blog site error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/guest-sites/pricing/{clientId}/{siteId}/override:
 *   post:
 *     summary: Set price override for a specific client-site combination (Super Admin only)
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
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
    const { clientId, siteId } = req.params;
    const { overridePrice } = req.body;

    // Validate client and site exist
    const [client, site] = await Promise.all([
      // @ts-ignore - Prisma client has client at runtime
      prisma.client.findUnique({ where: { id: clientId } }),
      // @ts-ignore - Prisma client has guestBlogSite at runtime
      prisma.guestBlogSite.findUnique({ where: { id: siteId } }),
    ]);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Guest blog site not found',
      });
    }

    // Create or update override
    // @ts-ignore - Prisma client has clientGuestBlogSiteOverride at runtime
    await prisma.clientGuestBlogSiteOverride.upsert({
      where: {
        clientId_guestBlogSiteId: {
          clientId,
          guestBlogSiteId: siteId,
        },
      },
      update: {
        overridePrice: parseFloat(overridePrice),
      },
      create: {
        clientId,
        guestBlogSiteId: siteId,
        overridePrice: parseFloat(overridePrice),
        createdById: req.user!.id,
      },
    });

    logger.info(`Price override set for client ${clientId} and guest blog site ${siteId} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Price override set successfully',
    });
  } catch (error) {
    logger.error('Set price override error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/guest-sites/pricing/{clientId}/{siteId}/override:
 *   delete:
 *     summary: Remove price override for a specific client-site combination (Super Admin only)
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/pricing/:clientId/:siteId/override', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { clientId, siteId } = req.params;

    // @ts-ignore - Prisma client has clientGuestBlogSiteOverride at runtime
    await prisma.clientGuestBlogSiteOverride.deleteMany({
      where: {
        clientId,
        guestBlogSiteId: siteId,
      },
    });

    logger.info(`Price override removed for client ${clientId} and guest blog site ${siteId} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Price override removed successfully',
    });
  } catch (error) {
    logger.error('Remove price override error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

/**
 * @swagger
 * /api/guest-sites/bulk-upload/template:
 *   get:
 *     summary: Download CSV template for bulk upload
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV template file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/bulk-upload/template', authenticate, requireAnyAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const csvTemplate = generateCSVTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="guest-blog-sites-template.csv"');
    res.send(csvTemplate);
  } catch (error) {
    logger.error('Generate template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template',
    });
  }
});

/**
 * @swagger
 * /api/guest-sites/bulk-upload/parse:
 *   post:
 *     summary: Parse uploaded CSV/Excel file and generate preview
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               clientId:
 *                 type: string
 *                 description: Optional client ID for percentage calculation
 *     responses:
 *       200:
 *         description: File parsed successfully with preview data
 *       400:
 *         description: Invalid file or parsing error
 */
router.post('/bulk-upload/parse', authenticate, requireAnyAdmin, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    let parsedData: any[];
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();

    // Parse file based on type
    if (fileExtension === 'csv' || req.file.mimetype === 'text/csv') {
      const fileContent = req.file.buffer.toString('utf-8');
      parsedData = parseCSV(fileContent);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parsedData = parseExcel(req.file.buffer);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file format. Please upload CSV or Excel files only.'
      });
    }

    if (parsedData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data found in the uploaded file'
      });
    }

    // Auto-detect column mappings
    const availableColumns = Object.keys(parsedData[0]);
    const autoMappings = autoDetectColumnMappings(availableColumns);

    // Get client percentage if provided
    let clientPercentage = 25; // Default 25%
    if (req.body.clientId) {
      // @ts-ignore - Prisma client has client at runtime
      const client = await prisma.client.findUnique({
        where: { id: req.body.clientId },
        select: { percentage: true }
      });
      if (client && client.percentage) {
        clientPercentage = client.percentage;
      }
    }

    res.json({
      success: true,
      data: {
        totalRows: parsedData.length,
        availableColumns,
        autoMappings,
        guestBlogSiteColumns: GUEST_BLOG_SITE_COLUMNS,
        clientPercentage,
        sessionId: Date.now().toString() // Simple session ID for tracking
      }
    });

  } catch (error: any) {
    logger.error('Parse file error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to parse file'
    });
  }
});

/**
 * @swagger
 * /api/guest-sites/bulk-upload/preview:
 *   post:
 *     summary: Generate preview with column mappings
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               mappings:
 *                 type: string
 *                 description: JSON string of column mappings
 *               clientId:
 *                 type: string
 *                 description: Optional client ID for percentage calculation
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *       400:
 *         description: Invalid mappings or file error
 */
router.post('/bulk-upload/preview', authenticate, requireAnyAdmin, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!req.body.mappings) {
      return res.status(400).json({
        success: false,
        error: 'Column mappings are required'
      });
    }

    let parsedData: any[];
    let columnMappings: ColumnMapping[];

    try {
      columnMappings = JSON.parse(req.body.mappings);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid column mappings format'
      });
    }

    // Parse file
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    if (fileExtension === 'csv' || req.file.mimetype === 'text/csv') {
      const fileContent = req.file.buffer.toString('utf-8');
      parsedData = parseCSV(fileContent);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parsedData = parseExcel(req.file.buffer);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file format'
      });
    }

    // Get client percentage if provided
    let clientPercentage = 25; // Default 25%
    if (req.body.clientId) {
      // @ts-ignore - Prisma client has client at runtime
      const client = await prisma.client.findUnique({
        where: { id: req.body.clientId },
        select: { percentage: true }
      });
      if (client && client.percentage) {
        clientPercentage = client.percentage;
      }
    }

    // Generate preview
    const preview = await generatePreview(parsedData, columnMappings, clientPercentage);

    res.json({
      success: true,
      data: preview
    });

  } catch (error: any) {
    logger.error('Generate preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate preview'
    });
  }
});

/**
 * @swagger
 * /api/guest-sites/bulk-upload/save:
 *   post:
 *     summary: Save selected rows from bulk upload preview
 *     tags: [Guest Blog Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               previewData:
 *                 type: array
 *                 description: Preview data from previous step
 *               selectedRows:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Array of row indexes to save
 *     responses:
 *       200:
 *         description: Bulk upload completed
 *       400:
 *         description: Invalid data or validation errors
 */
router.post('/bulk-upload/save', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { previewData, selectedRows } = req.body;

    if (!previewData || !Array.isArray(previewData)) {
      return res.status(400).json({
        success: false,
        error: 'Preview data is required'
      });
    }

    if (!selectedRows || !Array.isArray(selectedRows)) {
      return res.status(400).json({
        success: false,
        error: 'Selected rows are required'
      });
    }

    // Get all publishers for validation
    // @ts-ignore - Prisma client has publisher at runtime
    const publishers = await prisma.publisher.findMany({
      select: { id: true, publisherName: true, email: true }
    });

    // Save bulk data
    const result = await saveBulkData(previewData, selectedRows, publishers);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Bulk save error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save bulk data'
    });
  }
});

export { router as guestBlogSiteRoutes };
