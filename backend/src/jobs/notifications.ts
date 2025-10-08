import { Job } from 'bull';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const notificationJob = async (job: Job) => {
  const { type, recipients, data } = job.data;

  try {
    let subject: string;
    let htmlContent: string;

    switch (type) {
      case 'link-removed':
        subject = `Link Removed Alert - Order ${data.orderNumber}`;
        htmlContent = generateLinkRemovedEmail(data);
        break;
      
      case 'budget-warning':
        subject = `Budget Warning - Project ${data.projectName}`;
        htmlContent = generateBudgetWarningEmail(data);
        break;
      
      case 'budget-exceeded':
        subject = `Budget Exceeded - Project ${data.projectName}`;
        htmlContent = generateBudgetExceededEmail(data);
        break;
      
      case 'order-overdue':
        subject = `Order Overdue - ${data.orderNumber}`;
        htmlContent = generateOrderOverdueEmail(data);
        break;
      
      case 'content-ready':
        subject = `Content Ready for Review - Order ${data.orderNumber}`;
        htmlContent = generateContentReadyEmail(data);
        break;
      
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    // Send email to all recipients
    for (const recipient of recipients) {
      if (recipient && recipient.includes('@')) {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL || 'noreply@linkmanagement.com',
          to: recipient,
          subject,
          html: htmlContent,
        });

        // Log notification
        await prisma.notification.create({
          data: {
            type: 'email',
            recipient,
            subject,
            message: htmlContent,
            sentAt: new Date(),
          },
        });
      }
    }

    logger.info(`Notification sent: ${type} to ${recipients.length} recipients`);
  } catch (error) {
    logger.error('Notification job failed:', error);
    throw error;
  }
};

const generateLinkRemovedEmail = (data: any): string => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f;">Link Removal Alert</h2>
          
          <p>We detected that a link has been removed from a live placement:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Order Details:</strong><br>
            Order Number: ${data.orderNumber}<br>
            Project: ${data.projectName}<br>
            Client: ${data.clientName}<br>
            Site: ${data.siteDomain}<br>
            Publisher: ${data.publisherName}<br>
            URL: <a href="${data.liveUrl}">${data.liveUrl}</a><br>
            Status Code: ${data.statusCode || 'N/A'}
          </div>
          
          <p>Please investigate this issue and take appropriate action.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Link Management System.
          </p>
        </div>
      </body>
    </html>
  `;
};

const generateBudgetWarningEmail = (data: any): string => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff9800;">Budget Warning</h2>
          
          <p>The project budget is approaching its limit:</p>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <strong>Project Details:</strong><br>
            Project: ${data.projectName}<br>
            Client: ${data.clientName}<br>
            Budget Cap: $${data.budgetCap}<br>
            Budget Used: $${data.budgetUsed}<br>
            Budget Remaining: $${data.budgetRemaining}<br>
            Utilization: ${data.budgetPercentage}%
          </div>
          
          <p>Please review upcoming orders and consider adjusting the budget if needed.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Link Management System.
          </p>
        </div>
      </body>
    </html>
  `;
};

const generateBudgetExceededEmail = (data: any): string => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f;">Budget Exceeded</h2>
          
          <p>The project budget has been exceeded:</p>
          
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;">
            <strong>Project Details:</strong><br>
            Project: ${data.projectName}<br>
            Client: ${data.clientName}<br>
            Budget Cap: $${data.budgetCap}<br>
            Budget Used: $${data.budgetUsed}<br>
            Over Budget: $${data.budgetUsed - data.budgetCap}<br>
            Utilization: ${data.budgetPercentage}%
          </div>
          
          <p><strong>Action Required:</strong> No new orders can be created until the budget is increased or existing orders are cancelled.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Link Management System.
          </p>
        </div>
      </body>
    </html>
  `;
};

const generateOrderOverdueEmail = (data: any): string => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f;">Order Overdue</h2>
          
          <p>The following order has exceeded its deadline:</p>
          
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;">
            <strong>Order Details:</strong><br>
            Order Number: ${data.orderNumber}<br>
            Project: ${data.projectName}<br>
            Client: ${data.clientName}<br>
            Deadline: ${new Date(data.deadline).toLocaleDateString()}<br>
            Days Overdue: ${data.daysOverdue}<br>
            Current Status: ${data.status}
          </div>
          
          <p>Please review this order and take appropriate action to complete it.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Link Management System.
          </p>
        </div>
      </body>
    </html>
  `;
};

const generateContentReadyEmail = (data: any): string => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4caf50;">Content Ready for Review</h2>
          
          <p>Content has been completed and is ready for review:</p>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <strong>Order Details:</strong><br>
            Order Number: ${data.orderNumber}<br>
            Project: ${data.projectName}<br>
            Client: ${data.clientName}<br>
            Word Count: ${data.wordCount}<br>
            Plagiarism Score: ${data.plagiarismScore}%<br>
            AI Score: ${data.aiScore}%
          </div>
          
          <p>Please review the content and approve it for publication.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Link Management System.
          </p>
        </div>
      </body>
    </html>
  `;
};
