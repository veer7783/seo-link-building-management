import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Link Management System API',
      version: '1.0.0',
      description: 'Internal Guest Post & Link Management System API Documentation',
      contact: {
        name: 'API Support',
        email: 'support@linkmanagement.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'SUPER_ADMIN'],
            },
            isActive: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Client: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            phone: {
              type: 'string',
            },
            address: {
              type: 'string',
            },
            billingEmail: {
              type: 'string',
              format: 'email',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'GBP', 'INR'],
            },
            isActive: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            minDomainRating: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
            },
            minMonthlyTraffic: {
              type: 'integer',
              minimum: 0,
            },
            budgetCap: {
              type: 'number',
              format: 'decimal',
            },
            budgetUsed: {
              type: 'number',
              format: 'decimal',
            },
            anchorDistribution: {
              type: 'object',
            },
            blacklistedDomains: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            whitelistedDomains: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            isActive: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            orderNumber: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'CONTENT_READY', 'PLACED', 'LIVE', 'COMPLETED', 'CANCELLED'],
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
            },
            totalCost: {
              type: 'number',
              format: 'decimal',
            },
            targetUrl: {
              type: 'string',
              format: 'uri',
            },
            anchorText: {
              type: 'string',
            },
            anchorType: {
              type: 'string',
              enum: ['EXACT_MATCH', 'PARTIAL_MATCH', 'BRANDED', 'GENERIC', 'NAKED_URL'],
            },
            deadline: {
              type: 'string',
              format: 'date-time',
            },
            notes: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Link Management API Documentation',
  }));
  
  // Serve swagger.json
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};
