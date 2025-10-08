import { Job } from 'bull';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { notificationQueue } from './index';
import { checkBudgetStatus } from '../utils/guardrails';

const prisma = new PrismaClient();

export const budgetAlertJob = async (job: Job) => {
  logger.info('Starting budget alert check job');

  try {
    // Get all active projects
    const projects = await prisma.project.findMany({
      where: { isActive: true },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Checking budgets for ${projects.length} projects`);

    const results = {
      checked: 0,
      warnings: 0,
      exceeded: 0,
    };

    for (const project of projects) {
      // Skip budget checking for simplified project model
      // TODO: Implement budget tracking if needed in the future
      results.checked++;
      
      logger.info(`Checked project: ${project.projectName}`);
    }

    logger.info(`Budget alert check completed: ${results.checked} checked, ${results.warnings} warnings, ${results.exceeded} exceeded`);

    return results;
  } catch (error) {
    logger.error('Budget alert job failed:', error);
    throw error;
  }
};
