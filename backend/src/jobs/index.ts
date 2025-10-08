import Bull from 'bull';
import { createClient } from 'redis';
import { linkHealthCheckJob } from './linkHealthCheck';
import { notificationJob } from './notifications';
import { budgetAlertJob } from './budgetAlerts';
import { logger } from '../utils/logger';

// Redis connection for Bull queues
const redis = createClient({
  url: process.env.REDIS_JOB_QUEUE_URL || process.env.REDIS_URL || 'redis://localhost:6379',
});

// Create job queues
export const linkHealthQueue = new Bull('link health check', {
  redis: {
    port: 6379,
    host: 'localhost',
  },
});

export const notificationQueue = new Bull('notifications', {
  redis: {
    port: 6379,
    host: 'localhost',
  },
});

export const budgetAlertQueue = new Bull('budget alerts', {
  redis: {
    port: 6379,
    host: 'localhost',
  },
});

// Process jobs
linkHealthQueue.process('check-links', parseInt(process.env.JOB_CONCURRENCY || '5'), linkHealthCheckJob);
notificationQueue.process('send-notification', parseInt(process.env.JOB_CONCURRENCY || '5'), notificationJob);
budgetAlertQueue.process('check-budgets', parseInt(process.env.JOB_CONCURRENCY || '5'), budgetAlertJob);

// Job event handlers
linkHealthQueue.on('completed', (job) => {
  logger.info(`Link health check job ${job.id} completed`);
});

linkHealthQueue.on('failed', (job, err) => {
  logger.error(`Link health check job ${job.id} failed:`, err);
});

notificationQueue.on('completed', (job) => {
  logger.info(`Notification job ${job.id} completed`);
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Notification job ${job.id} failed:`, err);
});

budgetAlertQueue.on('completed', (job) => {
  logger.info(`Budget alert job ${job.id} completed`);
});

budgetAlertQueue.on('failed', (job, err) => {
  logger.error(`Budget alert job ${job.id} failed:`, err);
});

export const initializeJobs = async () => {
  try {
    logger.info('Initializing background jobs...');

    // Schedule recurring jobs
    
    // Link health checks - every 24 hours
    await linkHealthQueue.add('check-links', {}, {
      repeat: { 
        cron: '0 2 * * *' // 2 AM daily
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    // Budget alerts - every hour
    await budgetAlertQueue.add('check-budgets', {}, {
      repeat: { 
        cron: '0 * * * *' // Every hour
      },
      removeOnComplete: 5,
      removeOnFail: 3,
    });

    logger.info('Background jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize background jobs:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down job queues...');
  await linkHealthQueue.close();
  await notificationQueue.close();
  await budgetAlertQueue.close();
  process.exit(0);
});
