# Internal Guest Post & Link Management System

A centralized system for managing guest posts and link-building campaigns across multiple clients with role-based access control.

## Features

- **Client & Project Management**: CRUD operations with budget caps and guardrails
- **Publisher & Site Inventory**: Master catalog with DR/traffic metrics
- **Order Management**: Multi-site orders with automated pricing
- **Content Workflow**: Brief → Draft → QA → Plagiarism/AI scoring
- **Link Health Monitoring**: Automated nightly checks with SLA tracking
- **Invoicing & Billing**: Multi-currency support with margin visibility
- **Role-Based Access**: Admin vs Super Admin with field-level redaction
- **Reporting & Dashboards**: Performance metrics and financial analysis
- **Audit Logging**: Complete activity tracking

## Architecture

```
├── backend/           # Node.js/Express API server
├── frontend/          # React.js web application
├── database/          # PostgreSQL migrations and seeds
├── shared/            # Shared types and utilities
├── docs/          # Internal Guest Post & Link Management System

A comprehensive monorepo solution for managing guest posts, link building campaigns, and publisher relationships with role-based access control and automated workflows.

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL with Redis for caching
- **Frontend**: React, TypeScript, Material-UI
- **Authentication**: JWT with role-based access control
- **Background Jobs**: Bull Queue with Redis
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: Docker, Docker Compose

### Project Structure
```
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── middleware/# Auth, validation, error handling
│   │   ├── jobs/      # Background job processors
│   │   ├── config/    # Configuration files
│   │   └── utils/     # Utility functions
│   ├── prisma/        # Database schema and migrations
│   └── Dockerfile     # Backend container config
├── frontend/          # React web application
│   ├── src/
│   │   ├── components/# Reusable UI components
│   │   ├── pages/     # Application pages
│   │   ├── services/  # API service layer
│   │   ├── contexts/  # React contexts
│   │   └── utils/     # Frontend utilities
│   ├── public/        # Static assets
│   └── Dockerfile     # Frontend container config
├── scripts/           # Deployment and setup scripts
├── docker-compose.yml # Multi-container orchestration
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd link-management-system
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and settings
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

### Docker Deployment

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 🔐 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/linkmanagement"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# External APIs
AHREFS_API_KEY="your-ahrefs-api-key"
STRIPE_SECRET_KEY="your-stripe-secret-key"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@yourcompany.com"

# Application Settings
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Link Monitoring
LINK_CHECK_INTERVAL_HOURS=24
LINK_CHECK_TIMEOUT_MS=10000
LINK_CHECK_USER_AGENT="LinkHealthBot/1.0"

# Logging
LOG_LEVEL="info"
LOG_FILE="logs/app.log"

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="your-session-secret"

# Background Jobs
REDIS_QUEUE_PREFIX="linkmanagement"

# Notifications
NOTIFICATION_BATCH_SIZE=50
NOTIFICATION_RETRY_ATTEMPTS=3
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_APP_NAME=Link Management System
REACT_APP_VERSION=1.0.0
```

## 📊 Usage

### Default Credentials
- **Super Admin**: superadmin@example.com / password123
- **Admin**: admin@example.com / password123

### Application URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs

### Key Features

#### 📈 Dashboard
- Real-time metrics and KPIs
- Order pipeline visualization
- Link health monitoring
- SLA breach alerts
- Recent activity feed

#### 👥 Client Management
- Complete CRUD operations
- Contact information management
- Project association
- Status tracking
- Role-based data visibility

#### 📋 Project Management
- Budget tracking and alerts
- Guardrail configuration
- Anchor distribution rules
- Domain restrictions
- Spending analytics

#### 🌐 Publisher Network
- Site inventory management
- Performance metrics (DR, traffic)
- Pricing configuration
- Category classification
- Bulk import capabilities

#### 🛒 Order Management
- Multi-site order creation
- Automated pricing calculation
- Status workflow tracking
- Guardrail validation
- Budget cap enforcement

#### ✍️ Content Workflow
- Brief creation and approval
- Draft submission and review
- QA process management
- File attachment support
- Revision tracking

#### 🔗 Link Health Monitoring
- Automated nightly checks
- Status change notifications
- Manual verification tools
- Historical tracking
- Alert system

#### 💰 Invoicing & Billing
- Client invoice generation
- Publisher bill management
- Multi-currency support
- Payment tracking
- Automated calculations

#### 📊 Reporting & Analytics
- Performance dashboards
- Revenue analysis
- Publisher metrics
- SLA compliance tracking
- Custom date ranges

#### 🔍 Audit & Compliance
- Complete activity logging
- User action tracking
- Data change history
- Export capabilities
- Compliance reporting

## 🔒 Role-Based Access Control

### Admin Role
- Manage clients, projects, publishers, and sites
- Create and manage orders and content
- View client pricing (internal costs hidden)
- Generate client invoices
- Access reporting dashboards
- Monitor link health and placements

### Super Admin Role
- All Admin permissions
- View internal costs and profit margins
- Manage publisher bills and payments
- User management and system settings
- Export data with cost information
- Access audit logs and system metrics
- Global system configuration

### Field-Level Redaction
Sensitive fields are automatically hidden based on user role:
- **Internal Costs**: Hidden from Admin users
- **Profit Margins**: Super Admin only
- **Publisher Payments**: Super Admin only
- **System Settings**: Super Admin only
- **User Management**: Super Admin only

## 🛡️ Security Features

- **JWT Authentication** with secure token management
- **Role-Based Access Control** with field-level permissions
- **Input Validation** using express-validator
- **Rate Limiting** to prevent API abuse
- **Security Headers** via Helmet middleware
- **CORS Configuration** for cross-origin requests
- **Password Hashing** with bcrypt (12 rounds)
- **Audit Logging** for all CRUD operations
- **SQL Injection Protection** via Prisma ORM
- **XSS Protection** with content security policies

## 📈 Performance Targets

- **Load Times**: <400ms for pages with ≤50 rows
- **Uptime**: 99.5% availability target
- **Scalability**: Horizontal scaling via Docker containers
- **Caching**: Redis for session and query caching
- **Background Jobs**: Async processing for heavy operations
- **Database**: Optimized queries with proper indexing

## 🔧 Development

### Available Scripts

#### Root Level
- `npm run dev` - Start both backend and frontend in development
- `npm run build` - Build both applications for production
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database and reseed

#### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run backend tests
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma client

#### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run frontend tests
- `npm run lint` - Lint frontend code

### API Documentation
Access interactive Swagger documentation at: `http://localhost:3001/api/docs`

### Database Management
- **Prisma Studio**: Visual database browser at `http://localhost:5555`
- **Migrations**: Automatic schema versioning and deployment
- **Seeding**: Sample data for development and testing

## 🚀 Deployment

### Docker Compose (Recommended)
```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Development environment
docker-compose up -d
```

### Manual Deployment
1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Build applications**
   ```bash
   npm run build
   ```

3. **Set up database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start services**
   ```bash
   npm run start
   ```

### Environment-Specific Configurations
- **Development**: Hot reload, detailed logging, debug mode
- **Staging**: Production-like with additional logging
- **Production**: Optimized builds, minimal logging, security hardening

### Health Checks
- **Backend**: `GET /health` - API health status
- **Database**: Connection and query performance
- **Redis**: Cache connectivity and performance
- **Background Jobs**: Queue processing status

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # Generate coverage report
```

### Frontend Testing
```bash
cd frontend
npm test                   # Run all tests
npm run test:coverage     # Generate coverage report
```

### End-to-End Testing
```bash
npm run test:e2e          # Full application testing
```

## 🔍 Monitoring & Logging

### Application Logs
- **Location**: `backend/logs/`
- **Levels**: error, warn, info, debug
- **Rotation**: Daily rotation with compression
- **Format**: JSON structured logging

### Metrics & Monitoring
- **Health Endpoints**: Built-in health checks
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Comprehensive error logging
- **Audit Trail**: Complete user action logging

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run linting and tests
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

## 📝 License

This project is proprietary software. All rights reserved.

---

## 🆘 Support

For technical support or questions:
- Check the API documentation at `/api/docs`
- Review the audit logs for troubleshooting
- Monitor application health endpoints
- Check Docker container logs for deployment issues

### Common Issues
- **Database Connection**: Verify PostgreSQL is running and credentials are correct
- **Redis Connection**: Ensure Redis is accessible and configured properly
- **CORS Errors**: Check frontend/backend URL configuration
- **Authentication**: Verify JWT secret and token expiration settings
