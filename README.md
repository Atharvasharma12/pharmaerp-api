# 🏥 Retail Pharmacy ERP Backend

A comprehensive, production-ready Node.js backend for managing retail pharmacy operations. This full-featured ERP system provides complete end-to-end solutions for inventory management, sales, billing, finances, HR, and more.

This is a complete, scalable REST API backend built with Express.js and designed for retail pharmacy businesses. It handles everything from product cataloging to financial reporting, providing an integrated platform for pharmacy operations.

## 🎯 Purpose

A complete ERP solution for retail pharmacies with integrated modules for:

- Pharmacy inventory and stock management
- Point of Sale (POS) and billing
- Sales and purchase management
- Financial accounting and reporting
- Customer Relationship Management (CRM)
- Human Resources Management (HRM)
- Organization and workspace management
- Subscription and usage tracking
- Tax compliance and GST management

## ✅ Key Features

- **Express.js + Node.js** — Fast, scalable API server
- **Modular Architecture** — 20+ independent business modules
- **Multi-tenant Support** — Workspaces, companies, and branches
- **Authentication & Authorization** — JWT-based with role-based access control
- **Inventory Management** — Real-time stock tracking and expiry management
- **POS Integration** — Complete billing and payment processing
- **Financial Accounting** — Ledger, transactions, and expense tracking
- **Audit Logging** — Complete audit trail for compliance
- **Request Logging & Error Tracking** — Winston-based structured logging
- **Rate Limiting & Security** — Helmet security + CORS
- **Global Error Handling** — Centralized error management
- **Data Validation** — Request validation at all endpoints
- **Comprehensive Tests** — Jest-based unit and API tests
- **ESLint** — Code quality enforcement

## 📁 Repository Structure

```
erp-backend/
├── src/
│   ├── app.js                      # Express app configuration
│   ├── server.js                   # Server startup & DB connection
│   │
│   ├── config/                     # Global configurations
│   │   ├── env.js                  # Environment variables
│   │   ├── database.js             # Database connection
│   │   ├── cors.js                 # CORS configuration
│   │   └── logger.js               # Winston logger setup
│   │
│   ├── constants/                  # Global constants
│   │   ├── app.constant.js         # Application-wide constants
│   │   ├── http.constant.js        # HTTP status codes
│   │   ├── roles.constant.js       # User roles
│   │   └── status.constant.js      # Custom status codes
│   │
│   ├── middlewares/                # Custom middleware functions
│   │   ├── auth.middleware.js      # JWT authentication
│   │   ├── error.middleware.js     # Global error handler
│   │   ├── notFound.middleware.js  # 404 handler
│   │   ├── rateLimiter.middleware.js
│   │   ├── requestLogger.middleware.js
│   │   └── validate.middleware.js  # Request validation
│   │
│   ├── modules/                    # Business modules (20+)
│   │   │
│   │   ├── core/                   # Core functionality
│   │   │   ├── auth/               # Authentication & authorization
│   │   │   ├── users/              # User management
│   │   │   ├── access-control/     # Roles & permissions
│   │   │   └── settings/           # App & user settings
│   │   │
│   │   ├── organization/           # Multi-tenant support
│   │   │   ├── workspaces/         # Workspace management
│   │   │   ├── companies/          # Company profiles
│   │   │   └── branches/           # Branch locations
│   │   │
│   │   ├── subscription/           # Subscription management
│   │   │   ├── plans/
│   │   │   ├── subscriptions/
│   │   │   └── usage/
│   │   │
│   │   ├── catalog/                # Product management
│   │   │   ├── products/           # General products
│   │   │   ├── medicines/          # Medicines/drugs
│   │   │   ├── categories/         # Product categories
│   │   │   └── batches/            # Batch tracking
│   │   │
│   │   ├── inventory/              # Stock management
│   │   │   ├── stock/              # Current stock levels
│   │   │   ├── stock-movements/    # Stock in/out tracking
│   │   │   └── expiry/             # Expiry management
│   │   │
│   │   ├── parties/                # Parties management
│   │   │   ├── customers/          # Customer records
│   │   │   └── suppliers/          # Supplier records
│   │   │
│   │   ├── purchase/               # Purchase module
│   │   │   ├── purchases/          # Purchase orders
│   │   │   └── purchase-returns/   # Return handling
│   │   │
│   │   ├── sales/                  # Sales module
│   │   │   ├── sales/              # Sales orders
│   │   │   └── sales-returns/      # Sales returns
│   │   │
│   │   ├── billing/                # Billing & POS
│   │   │   ├── pos/                # Point of Sale
│   │   │   └── bills/              # Bill generation
│   │   │
│   │   ├── invoicing/              # Invoice management
│   │   │   └── invoices/           # Customer invoices
│   │   │
│   │   ├── taxation/               # Tax compliance
│   │   │   ├── gst/                # GST calculations
│   │   │   └── taxes/              # Tax management
│   │   │
│   │   ├── finance/                # Financial accounting
│   │   │   ├── payments/           # Payment tracking
│   │   │   ├── transactions/       # Ledger transactions
│   │   │   ├── ledger/             # General ledger
│   │   │   ├── expenses/           # Expense tracking
│   │   │   └── income/             # Income tracking
│   │   │
│   │   ├── orders/                 # Order management
│   │   │   ├── orders/             # Order processing
│   │   │   ├── shipping/           # Shipping details
│   │   │   └── delivery/           # Delivery tracking
│   │   │
│   │   ├── ecommerce/              # E-commerce features
│   │   │   ├── cart/               # Shopping cart
│   │   │   ├── checkout/           # Checkout process
│   │   │   ├── wishlist/           # Customer wishlist
│   │   │   └── coupons/            # Discount codes
│   │   │
│   │   ├── crm/                    # Customer relationship
│   │   │   ├── leads/              # Lead management
│   │   │   └── followups/          # Follow-up tracking
│   │   │
│   │   ├── hrm/                    # Human resources
│   │   │   ├── employees/          # Employee records
│   │   │   ├── attendance/         # Attendance tracking
│   │   │   └── payroll/            # Payroll management
│   │   │
│   │   ├── reports/                # Business reports
│   │   │
│   │   ├── notifications/          # Notification system
│   │   │
│   │   └── system/                 # System utilities
│   │       ├── files/              # File management
│   │       ├── logs/               # System logs
│   │       └── audit/              # Audit trails
│   │
│   ├── routes/                     # Global route wiring
│   │   └── index.routes.js         # Central route loader
│   │
│   ├── utils/                      # Shared utilities
│   │   ├── asyncHandler.js         # Async error wrapper
│   │   ├── ApiError.js             # Error formatter
│   │   ├── ApiResponse.js          # Response formatter
│   │   ├── jwt.js                  # JWT utilities
│   │   ├── hash.js                 # Password hashing
│   │   └── helpers.js              # Generic helpers
│   │
│   ├── docs/                       # API documentation
│   │
│   └── jobs/                       # Background jobs & schedulers
│
├── tests/                          # Test suite
│   ├── api/                        # API integration tests
│   └── unit/                       # Unit tests
│
├── logs/                           # Application logs (auto-generated)
├── uploads/                        # File uploads storage
├── public/                         # Static files
├── scripts/                        # Utility scripts
│
├── .env.example                    # Example environment config
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies & scripts
├── package-lock.json               # Dependency lock file
├── nodemon.json                    # Development watcher config
└── README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- MongoDB (or your configured database)
- Git

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd erp-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
copy .env.example .env
```

Update `.env` with your configuration:

```env
NODE_ENV=development
PORT=5000
APP_NAME=Pharmacy ERP

# Database
DB_URI=mongodb://localhost:27017/pharmacy-erp

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Server
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# File uploads
MAX_UPLOAD_SIZE=10mb
UPLOAD_DIR=uploads

# Email (optional)
MAIL_HOST=smtp.your-email.com
MAIL_PORT=587
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-password
```

4. **Start the development server**

```bash
npm run dev
```

The server will start on `http://localhost:5000`

5. **Verify the service**

```bash
curl http://localhost:5000/api/v1/core/health
```

Should return:

```json
{
  "success": true,
  "message": "Health check passed",
  "data": { "status": "OK" }
}
```

## 🔧 Core Application Flow

1. **Server Initialization** (`src/server.js`) → Loads env variables & connects to database
2. **App Setup** (`src/app.js`) → Configures middleware, security, routing
3. **Route Loading** (`src/routes/index.routes.js`) → Mounts all business modules
4. **Request Processing** → Authentication → Validation → Business Logic → Response
5. **Error Handling** → Global middleware catches and formats all errors

## 🌐 API Routing & Endpoints

All endpoints are prefixed with `/api/v1`

### Core Module Endpoints

```
/api/v1/core/auth/*           # Authentication & login
/api/v1/core/users/*          # User management
/api/v1/core/access-control/* # Roles & permissions
/api/v1/core/settings/*       # Settings management
/api/v1/core/health           # Health check (public)
```

### Business Module Endpoints

```
# Organization
/api/v1/organization/workspaces/*
/api/v1/organization/companies/*
/api/v1/organization/branches/*

# Catalog & Inventory
/api/v1/catalog/products/*
/api/v1/catalog/medicines/*
/api/v1/catalog/categories/*
/api/v1/inventory/stock/*
/api/v1/inventory/stock-movements/*

# Sales & Billing
/api/v1/sales/orders/*
/api/v1/billing/pos/*
/api/v1/billing/bills/*
/api/v1/invoicing/invoices/*

# Purchase & Parties
/api/v1/purchase/orders/*
/api/v1/parties/customers/*
/api/v1/parties/suppliers/*

# Finance & Accounting
/api/v1/finance/payments/*
/api/v1/finance/ledger/*
/api/v1/finance/transactions/*
/api/v1/taxation/gst/*

# Human Resources
/api/v1/hrm/employees/*
/api/v1/hrm/attendance/*
/api/v1/hrm/payroll/*

# Other Modules
/api/v1/reports/*
/api/v1/crm/leads/*
/api/v1/notifications/*
```

## 📌 Detailed Folder Guide

### `src/config/` — Global Configuration

- `env.js` — Environment variable loader with validation
- `database.js` — Database connection setup (MongoDB/SQL)
- `cors.js` — CORS policy for client requests
- `logger.js` — Winston logger with daily rotation

### `src/constants/` — Application Constants

- `app.constant.js` — API prefix, version, feature flags
- `http.constant.js` — HTTP status codes and messages
- `status.constant.js` — Custom status codes
- `roles.constant.js` — User role definitions

### `src/middlewares/` — Global Middleware

| Middleware                    | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `auth.middleware.js`          | JWT verification & token validation |
| `error.middleware.js`         | Global error handler                |
| `notFound.middleware.js`      | 404 handler                         |
| `rateLimiter.middleware.js`   | Request rate limiting               |
| `requestLogger.middleware.js` | Log incoming requests               |
| `validate.middleware.js`      | Request body/param validation       |

### `src/modules/` — Business Modules

Each module follows a standardized structure:

```
module-name/
├── models/              # Database schemas
├── controllers/         # Route handlers (request/response)
├── services/            # Business logic
├── repositories/        # Database queries
├── routes/              # Route definitions
├── validations/         # Request validation schemas
├── constants/           # Module-specific constants
└── module.js            # Module registration
```

**Module Architecture Pattern:**

- **Controllers** → Handle HTTP requests & responses
- **Services** → Implement core business logic
- **Repositories** → Abstract database operations
- **Validations** → Validate request data
- **Models** → Define data schemas

### `src/utils/` — Shared Utilities

| Utility           | Purpose                          |
| ----------------- | -------------------------------- |
| `ApiError.js`     | Standardized error formatting    |
| `ApiResponse.js`  | Standardized response formatting |
| `asyncHandler.js` | Async error catching wrapper     |
| `jwt.js`          | JWT generation & verification    |
| `hash.js`         | Password hashing & verification  |
| `helpers.js`      | Generic utility functions        |

### `logs/` — Application Logs

- Auto-generated daily rotation logs
- Structured JSON logging via Winston
- Error and combined logs separated
- Log retention policy configurable

### `tests/` — Test Suite

- `api/` — Integration tests for endpoints
- `unit/` — Unit tests for services/utilities
- Uses Jest test runner
- Includes mock data and fixtures

## 🧩 Module Development Guide

### Creating a New Business Module

Follow this checklist when adding a new feature:

1. **Create module directory** under `src/modules/[module-name]/`

2. **Create folder structure**

   ```bash
   mkdir -p src/modules/my-module/{models,controllers,services,repositories,routes,validations,constants}
   ```

3. **Create module files** in order:
   - `models/my-feature.model.js` — Define database schema
   - `repositories/my-feature.repository.js` — Database operations
   - `services/my-feature.service.js` — Business logic
   - `validations/my-feature.validation.js` — Request validation
   - `controllers/my-feature.controller.js` — Route handlers
   - `routes/my-feature.routes.js` — Route definitions

4. **Create module entry point**

   ```javascript
   // src/modules/my-module/my-module.js
   export const MyModuleRouter = require("./routes/my-feature.routes");
   ```

5. **Register in routing** — Update `src/routes/index.routes.js`:

   ```javascript
   app.use("/api/v1/my-module", MyModuleRouter);
   ```

6. **Use API utilities** for consistency:

   ```javascript
   // Response success
   return ApiResponse.success(res, data, "Operation successful", 200);

   // Response error
   throw new ApiError(400, "Validation failed");
   ```

### Module Template Example

**Controller:**

```javascript
import { asyncHandler } from "../../../utils/asyncHandler";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

export const getFeature = asyncHandler(async (req, res) => {
  const data = await featureService.getFeature(req.params.id);
  return ApiResponse.success(res, data, "Feature retrieved", 200);
});
```

**Service:**

```javascript
export const getFeature = async (id) => {
  const feature = await featureRepository.findById(id);
  if (!feature) {
    throw new ApiError(404, "Feature not found");
  }
  return feature;
};
```

**Repository:**

```javascript
export const findById = async (id) => {
  return await Feature.findById(id);
};

export const create = async (data) => {
  return await Feature.create(data);
};
```

## ⚙️ Environment Configuration

Create a `.env` file in the root directory using `.env.example` as reference:

### Core Settings

```env
NODE_ENV=development
PORT=5000
APP_NAME=Pharmacy ERP Backend
```

### Database Configuration

```env
DB_URI=mongodb://localhost:27017/pharmacy-erp
DB_NAME=pharmacy-erp
```

### Authentication & Security

```env
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=refresh-secret-key-min-32-chars
REFRESH_TOKEN_EXPIRES_IN=30d
```

### Server Configuration

```env
CORS_ORIGIN=http://localhost:3000
API_PREFIX=/api/v1
BASE_URL=http://localhost:5000
```

### File Upload

```env
MAX_UPLOAD_SIZE=10mb
UPLOAD_DIR=uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xls,xlsx
```

### Logging

```env
LOG_LEVEL=info
LOG_DIR=logs
LOG_MAX_FILES=30d
```

### Email Configuration (Optional)

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@pharmacy-erp.com
```

### SMS Configuration (Optional)

```env
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=your-account-sid
SMS_AUTH_TOKEN=your-auth-token
SMS_FROM_NUMBER=+1234567890
```

### Payment Gateway (Optional)

```env
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
```

### Third-party Services

```env
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

## 📋 NPM Scripts

| Script                  | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Start development server with hot-reload (nodemon) |
| `npm start`             | Start production server                            |
| `npm test`              | Run all tests (Jest)                               |
| `npm run test:watch`    | Run tests in watch mode                            |
| `npm run test:coverage` | Generate test coverage report                      |
| `npm run lint`          | Check code quality with ESLint                     |
| `npm run lint:fix`      | Fix ESLint issues automatically                    |
| `npm run build`         | Build for production                               |
| `npm run seed`          | Populate database with sample data                 |
| `npm run migrate`       | Run database migrations                            |

## 🚀 Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

### 2. Create a New Module

```bash
mkdir -p src/modules/my-module/{models,controllers,services,repositories,routes,validations}
```

### 3. Add Your Business Logic

- Create models, services, controllers, repositories
- Define validation schemas
- Create routes

### 4. Register Module Routes

Update `src/routes/index.routes.js` to include your new module

### 5. Test Your Endpoints

```bash
npm test
```

### 6. Fix Code Issues

```bash
npm run lint:fix
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- tests/api/health.test.js
```

### Test Coverage

```bash
npm run test:coverage
```

Test files should be placed in:

- `tests/api/` — Integration/API tests
- `tests/unit/` — Unit tests for services

## 🏗️ Production Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Environment Setup

1. Ensure `.env` is configured for production
2. Set `NODE_ENV=production`
3. Use production database URL
4. Configure all third-party services
5. Enable security headers & CORS restrictions
6. Set up monitoring & alerting

## 📚 Key Pharmacy ERP Modules

### Core Modules

- **Authentication** — User login, JWT tokens, session management
- **User Management** — Employee and user profiles
- **Access Control** — Roles, permissions, and privilege management
- **Settings** — Application and user preferences

### Organization

- **Workspaces** — Multi-tenant workspace support
- **Companies** — Company hierarchy and profiles
- **Branches** — Multiple location management

### Catalog & Inventory

- **Products** — General product management
- **Medicines** — Pharmaceutical product tracking
- **Stock Management** — Real-time inventory levels
- **Batch Tracking** — Batch-wise stock tracking
- **Expiry Management** — Automatic expiry alerts

### Sales & Billing

- **Point of Sale** — Counter sales and POS transactions
- **Billing** — Bill generation and printing
- **Sales Orders** — Customer order management
- **Invoicing** — Invoice generation and tracking

### Purchase & Supply Chain

- **Purchase Orders** — Supplier purchase management
- **Purchase Returns** — Return handling
- **Supplier Management** — Vendor database

### Financial Management

- **Payments** — Payment recording and tracking
- **General Ledger** — Accounting ledger
- **Transactions** — Financial transaction tracking
- **Expense Management** — Operating expense tracking
- **Income Tracking** — Revenue and income tracking

### Compliance & Tax

- **GST Management** — GST calculation and filing
- **Tax Compliance** — Tax reporting
- **Audit Logging** — Complete audit trail

### Human Resources

- **Employee Management** — Employee records
- **Attendance Tracking** — Attendance management
- **Payroll** — Salary and payroll processing

### Reporting & Analytics

- **Sales Reports** — Sales analysis and trends
- **Inventory Reports** — Stock status and movements
- **Financial Reports** — P&L, Balance sheet
- **Customer Reports** — Customer analytics

### Customer Management

- **Customer Database** — Customer profiles
- **CRM Features** — Lead and followup tracking
- **Customer Communications** — Notifications and alerts

### E-Commerce (Optional)

- **Online Catalog** — Product listing
- **Shopping Cart** — Online ordering
- **Wishlist** — Customer favorites
- **Discount Coupons** — Promotional codes

## 🔐 Security Features

- **JWT Authentication** — Secure token-based auth
- **Role-Based Access Control** — Permission management
- **Password Hashing** — Bcrypt password storage
- **Request Validation** — Schema validation for all inputs
- **Rate Limiting** — API rate limiting protection
- **CORS Protection** — Cross-origin request control
- **Helmet Headers** — Security headers enforcement
- **Audit Logging** — Complete user action tracking
- **SQL Injection Prevention** — Parameterized queries
- **XSS Protection** — Input sanitization

## 📊 Performance & Scalability

- **Modular Architecture** — Easy to scale and maintain
- **Async/Await** — Non-blocking operations
- **Database Indexing** — Optimized queries
- **Caching Layer** — Redis support for caching
- **Pagination** — Large dataset handling
- **Batch Operations** — Bulk data processing
- **Background Jobs** — Scheduled tasks support
- **Error Recovery** — Graceful error handling

## 🤝 Contributing

Contributions are welcome! Please:

1. Create a feature branch from `main`
2. Follow the module structure guidelines
3. Write tests for new features
4. Ensure code passes ESLint checks
5. Submit a pull request with detailed description

## 📖 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Jest Testing Guide](https://jestjs.io/docs/getting-started)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

## 💡 Architecture Principles

- **Separation of Concerns** — Clear layer separation (controller → service → repository)
- **DRY (Don't Repeat Yourself)** — Reuse utilities and helpers
- **Single Responsibility** — Each module has one clear purpose
- **Scalability** — Easy to add new modules and features
- **Maintainability** — Consistent structure and naming conventions
- **Testability** — All business logic is testable
- **Security** — Security-first approach throughout

## 📞 Support & Documentation

For detailed API documentation, please refer to the API endpoints section above.

For issues, bugs, or feature requests, please open an issue in the repository.

## 🎯 Roadmap

- [ ] Complete module implementations
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Advanced reporting dashboards
- [ ] Mobile app backend optimization
- [ ] Microservices architecture support
- [ ] Kubernetes deployment scripts
- [ ] Enhanced security features
- [ ] Performance optimization

## 👥 Team

Developed for retail pharmacy operations management.

## 📄 License

ISC License - Feel free to use this project for your pharmacy operations.

---

**Last Updated:** May 2026
**Version:** 1.0.0
**Status:** Active Development

For more information or support, reach out to the development team.
