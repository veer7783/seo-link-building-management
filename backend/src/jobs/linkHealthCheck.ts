import { Job } from 'bull';
import axios from 'axios';
import { PrismaClient, PlacementStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { notificationQueue } from './index';

const prisma = new PrismaClient();

export const linkHealthCheckJob = async (job: Job) => {
  logger.info('Starting link health check job');

  try {
    // Get all live placements
    const placements = await prisma.placement.findMany({
      where: {
        status: PlacementStatus.LIVE,
        liveUrl: { not: null },
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
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            site: {
              select: {
                domain: true,
                publisher: {
                  select: {
                    publisherName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    logger.info(`Checking ${placements.length} live links`);

    const results = {
      checked: 0,
      live: 0,
      removed: 0,
      errors: 0,
    };

    for (const placement of placements) {
      try {
        const startTime = Date.now();
        
        const response = await axios.get(placement.liveUrl!, {
          timeout: parseInt(process.env.LINK_CHECK_TIMEOUT_MS || '10000'),
          headers: {
            'User-Agent': process.env.LINK_CHECK_USER_AGENT || 'LinkHealthBot/1.0',
          },
          validateStatus: () => true, // Don't throw on any status code
        });

        const responseTime = Date.now() - startTime;
        const isLive = response.status >= 200 && response.status < 400;

        // Update placement status
        await prisma.placement.update({
          where: { id: placement.id },
          data: {
            isLive,
            lastChecked: new Date(),
            checkCount: { increment: 1 },
            status: isLive ? PlacementStatus.LIVE : PlacementStatus.REMOVED,
          },
        });

        // Log the check
        await prisma.linkHealthLog.create({
          data: {
            placementId: placement.id,
            isLive,
            statusCode: response.status,
            responseTime,
          },
        });

        results.checked++;
        if (isLive) {
          results.live++;
        } else {
          results.removed++;
          
          // Send notification for removed link
          await notificationQueue.add('send-notification', {
            type: 'link-removed',
            recipients: [
              placement.orderSite.order.project.client.email,
              placement.orderSite.site.publisher.email,
            ],
            data: {
              orderNumber: placement.orderSite.order.orderNumber,
              projectName: placement.orderSite.order.project.projectName,
              clientName: placement.orderSite.order.project.client.name,
              siteDomain: placement.orderSite.site.domain,
              publisherName: placement.orderSite.site.publisher.publisherName,
              liveUrl: placement.liveUrl,
              statusCode: response.status,
            },
          });
        }

        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        results.errors++;
        
        // Update placement as removed
        await prisma.placement.update({
          where: { id: placement.id },
          data: {
            isLive: false,
            lastChecked: new Date(),
            checkCount: { increment: 1 },
            status: PlacementStatus.REMOVED,
          },
        });

        // Log the failed check
        await prisma.linkHealthLog.create({
          data: {
            placementId: placement.id,
            isLive: false,
            statusCode: error.response?.status || null,
            errorMessage: error.message,
          },
        });

        logger.error(`Link check failed for placement ${placement.id}:`, error.message);
      }
    }

    logger.info(`Link health check completed: ${results.checked} checked, ${results.live} live, ${results.removed} removed, ${results.errors} errors`);

    return results;
  } catch (error) {
    logger.error('Link health check job failed:', error);
    throw error;
  }
};
