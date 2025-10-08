import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireAnyAdmin, requireSuperAdmin, redactSensitiveFields } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get dashboard overview data
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalClients,
      totalProjects,
      totalOrders,
      totalPlacements,
      activeOrders,
      liveLinks,
      overdueOrders,
      recentOrders,
    ] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.project.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.placement.count(),
      prisma.order.count({
        where: {
          status: { in: ['APPROVED', 'IN_PROGRESS', 'CONTENT_READY'] },
        },
      }),
      prisma.placement.count({
        where: { isLive: true },
      }),
      prisma.order.count({
        where: {
          deadline: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              projectName: true,
              client: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Get revenue data (Super Admin only)
    let revenueData = null;
    if (req.user!.role === 'SUPER_ADMIN') {
      const [totalRevenue, totalCost] = await Promise.all([
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { status: { notIn: ['CANCELLED'] } },
        }),
        prisma.order.aggregate({
          _sum: { totalCost: true },
          where: { status: { notIn: ['CANCELLED'] } },
        }),
      ]);

      revenueData = {
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalCost: totalCost._sum.totalCost || 0,
        totalMargin: Number(totalRevenue._sum.totalAmount || 0) - Number(totalCost._sum.totalCost || 0),
      };
    }

    const dashboardData = {
      overview: {
        totalClients,
        totalProjects,
        totalOrders,
        totalPlacements,
        activeOrders,
        liveLinks,
        overdueOrders,
      },
      revenueData,
      recentOrders: redactSensitiveFields(recentOrders, req.user!.role),
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/reports/orders-by-stage:
 *   get:
 *     summary: Get orders grouped by stage
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders by stage retrieved successfully
 */
router.get('/orders-by-stage', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const ordersByStage = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const stageData = ordersByStage.map(stage => ({
      stage: stage.status,
      count: stage._count.id,
    }));

    res.json({
      success: true,
      data: stageData,
    });
  } catch (error) {
    logger.error('Get orders by stage error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/reports/sla-breaches:
 *   get:
 *     summary: Get SLA breach report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SLA breach report retrieved successfully
 */
router.get('/sla-breaches', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const overdueOrders = await prisma.order.findMany({
      where: {
        deadline: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        project: {
          select: {
            projectName: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { deadline: 'asc' },
    });

    const breachData = overdueOrders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      projectName: order.project.projectName,
      clientName: order.project.client.name,
      deadline: order.deadline,
      status: order.status,
      daysOverdue: Math.floor((new Date().getTime() - new Date(order.deadline!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const redactedData = redactSensitiveFields(breachData, req.user!.role);

    res.json({
      success: true,
      data: redactedData,
    });
  } catch (error) {
    logger.error('Get SLA breaches error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/reports/link-health:
 *   get:
 *     summary: Get link health report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Link health report retrieved successfully
 */
router.get('/link-health', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const [totalLinks, liveLinks, removedLinks, recentRemovals] = await Promise.all([
      prisma.placement.count(),
      prisma.placement.count({ where: { isLive: true } }),
      prisma.placement.count({ where: { isLive: false } }),
      prisma.placement.findMany({
        where: {
          status: 'REMOVED',
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          orderSite: {
            include: {
              order: {
                select: {
                  orderNumber: true,
                  project: {
                    select: {
                      projectName: true,
                      client: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              site: {
                select: {
                  domain: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const healthData = {
      summary: {
        totalLinks,
        liveLinks,
        removedLinks,
        healthPercentage: totalLinks > 0 ? ((liveLinks / totalLinks) * 100).toFixed(2) : 0,
      },
      recentRemovals: redactSensitiveFields(recentRemovals, req.user!.role),
    };

    res.json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    logger.error('Get link health error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/reports/revenue-analysis:
 *   get:
 *     summary: Get revenue and margin analysis (Super Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Revenue analysis retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
router.get('/revenue-analysis', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const period = req.query.period as string || 'month';
    
    let dateFilter: Date;
    switch (period) {
      case 'quarter':
        dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [revenueData, clientBreakdown, projectBreakdown] = await Promise.all([
      prisma.order.aggregate({
        _sum: {
          totalAmount: true,
          totalCost: true,
        },
        _count: {
          id: true,
        },
        where: {
          createdAt: { gte: dateFilter },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      prisma.order.groupBy({
        by: ['projectId'],
        _sum: {
          totalAmount: true,
          totalCost: true,
        },
        _count: {
          id: true,
        },
        where: {
          createdAt: { gte: dateFilter },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      prisma.project.findMany({
        select: {
          id: true,
          projectName: true,
          client: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              orders: {
                where: {
                  createdAt: { gte: dateFilter },
                  status: { notIn: ['CANCELLED'] },
                },
              },
            },
          },
        },
      }),
    ]);

    const totalRevenue = revenueData._sum.totalAmount || 0;
    const totalCost = revenueData._sum.totalCost || 0;
    const totalMargin = Number(totalRevenue) - Number(totalCost);
    // @ts-ignore
    const marginPercentage = Number(totalRevenue) > 0 ? ((totalMargin / Number(totalRevenue)) * 100).toFixed(2) : 0;

    const analysisData = {
      summary: {
        period,
        totalRevenue,
        totalCost,
        totalMargin,
        marginPercentage,
        totalOrders: revenueData._count.id,
        averageOrderValue: revenueData._count.id > 0 ? (Number(totalRevenue) / revenueData._count.id).toFixed(2) : 0,
      },
      clientBreakdown: clientBreakdown.map(item => {
        const project = projectBreakdown.find(p => p.id === item.projectId);
        return {
          projectId: item.projectId,
          projectName: project?.projectName || 'Unknown',
          clientName: project?.client?.name || 'Unknown',
          revenue: item._sum.totalAmount || 0,
          cost: item._sum.totalCost || 0,
          margin: (Number(item._sum.totalAmount || 0)) - (Number(item._sum.totalCost || 0)),
          orders: item._count.id,
        };
      }).sort((a, b) => Number(b.revenue) - Number(a.revenue)),
    };

    res.json({
      success: true,
      data: analysisData,
    });
  } catch (error) {
    logger.error('Get revenue analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/reports/publisher-performance:
 *   get:
 *     summary: Get publisher performance report (Super Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Publisher performance retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
router.get('/publisher-performance', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const publisherStats = await prisma.publisher.findMany({
      include: {
        sites: {
          include: {
            orderSites: {
              include: {
                placement: {
                  select: {
                    isLive: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            sites: true,
            publisherBills: true,
          },
        },
      },
    });

    const performanceData = publisherStats.map(publisher => {
      const totalOrders = publisher.sites.reduce((sum: number, site) => sum + site.orderSites.length, 0);
      const liveLinks = publisher.sites.reduce((sum: number, site) => 
        sum + site.orderSites.filter(os => os.placement?.isLive).length, 0
      );
      const totalRevenue = publisher.sites.reduce((sum: number, site) => 
        sum + site.orderSites.reduce((orderSum: number, os) => orderSum + Number(os.price), 0), 0
      );
      const totalCost = publisher.sites.reduce((sum: number, site) => 
        sum + site.orderSites.reduce((orderSum: number, os) => orderSum + Number(os.cost), 0), 0
      );

      return {
        publisherId: publisher.id,
        publisherName: publisher.publisherName,
        totalSites: publisher._count.sites,
        totalOrders,
        liveLinks,
        linkSuccessRate: totalOrders > 0 ? ((liveLinks / totalOrders) * 100).toFixed(2) : 0,
        totalRevenue,
        totalCost,
        averageTurnaround: publisher.sites.length > 0 ? 
          (publisher.sites.reduce((sum, site) => sum + (parseInt(site.turnaroundTime) || 0), 0) / publisher.sites.length).toFixed(1) : 0,
      };
    }).sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));

    res.json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    logger.error('Get publisher performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as reportRoutes };
