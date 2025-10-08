import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { clientRoutes } from './routes/clients';
import { projectRoutes } from './routes/projects';
import { publisherRoutes } from './routes/publishers';
import { siteRoutes } from './routes/sites';
import { guestBlogSiteRoutes } from './routes/guestBlogSites';
import guestBlogOrderRoutes from './routes/guestBlogOrders_fixed';
import guestBlogPlacementRoutes from './routes/guestBlogPlacements';
import { orderRoutes } from './routes/orders';
import { reportRoutes } from './routes/reports';
import { auditRoutes } from './routes/audit';
import { setupSwagger } from './config/swagger';
import { logger } from './utils/logger';
import { initializeJobs } from './jobs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost and 127.0.0.1 on any port
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // Production origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting - DISABLED FOR DEVELOPMENT
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
//   message: 'Too many requests from this IP, please try again later.',
// });
// app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/guest-sites', guestBlogSiteRoutes);
app.use('/api/guest-blog-orders', guestBlogOrderRoutes);
app.use('/api/guest-blog-placements', guestBlogPlacementRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/clients',
      '/api/projects',
      '/api/publishers',
      '/api/sites',
      '/api/guest-sites',
      '/api/guest-blog-orders',
      '/api/guest-blog-placements',
      '/api/orders',
      '/api/reports',
      '/api/audit'
    ]
  });
});

// Setup Swagger documentation
setupSwagger(app);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SEO Link Building API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      docs: '/api/docs',
      auth: '/api/auth',
    }
  });
});

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize background jobs (optional in local dev)
if ((process.env.ENABLE_JOBS || '').toLowerCase() === 'true') {
  initializeJobs();
} else {
  logger.info('Background jobs disabled (set ENABLE_JOBS=true to enable).');
}

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 API Documentation available at http://localhost:${PORT}/api/docs`);
  logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
});

export default app;
