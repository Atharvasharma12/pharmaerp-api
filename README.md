# ERP Backend

A modular backend for a retail pharmacy ERP platform. The project is built with Node.js, Express, MongoDB, JWT-based authentication, and a feature-driven module structure that separates platform operations, organization management, subscription handling, and catalog management.

---

## Overview

This backend is designed to support two main product areas:

1. **ERP customer side** for pharmacy/workspace users
2. **Platform/admin side** for internal ERP owners and operators

The API is served under the base prefix:

```txt
/api/v1
```

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (ERP users) and platform JWT
- **Validation:** Joi
- **Security:** Helmet, CORS, cookie parsing
- **Logging:** Winston + daily rotate file logs
- **Testing:** Jest
- **Development:** Nodemon

---

## Main Features

- Modular route registration with a centralized router
- Multi-workspace and multi-company organization flow
- ERP user authentication and profile management
- Platform admins and platform users management
- Subscription plans and subscription lifecycle handling
- Workspace-level catalog/product management
- Platform-level global catalog management
- Request and error handling middleware
- Environment-based configuration
- Email-based auth flows

---

## Project Structure

```txt
erp-backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── cors.js
│   │   ├── database.js
│   │   ├── env.js
│   │   └── logger.js
│   ├── constants/
│   │   ├── app.constant.js
│   │   ├── http.constant.js
│   │   ├── platformRoles.constant.js
│   │   └── platformStatus.constant.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── companyContext.middleware.js
│   │   ├── error.middleware.js
│   │   ├── notFound.middleware.js
│   │   ├── permission.middleware.js
│   │   ├── platformAuth.middleware.js
│   │   ├── platformRole.middleware.js
│   │   ├── requestLogger.middleware.js
│   │   ├── subscriptionGuard.middleware.js
│   │   ├── validate.middleware.js
│   │   ├── workspaceContext.middleware.js
│   │   └── branchContext.middleware.js
│   ├── modules/
│   │   ├── core/
│   │   ├── organization/
│   │   ├── platform/
│   │   ├── subscription/
│   │   └── catalog/
│   ├── routes/
│   │   └── index.routes.js
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── hash.js
│   │   ├── jwt.js
│   │   └── platform/
│   ├── docs/
│   └── jobs/
├── scripts/
├── tests/
├── uploads/
├── logs/
└── .env.example
```

---

## API Base Routing

All routes are mounted from [src/routes/index.routes.js](src/routes/index.routes.js), and the application exposes these main API groups:

```txt
/api/v1/core/*
/api/v1/platform/*
/api/v1/organization/*
/api/v1/subscription/*
/api/v1/catalog/*
```

---

## Module Breakdown

### 1. Core Module

Purpose: common auth, user profile, health checks, and access control.

Mounted at:

```txt
/api/v1/core
```

Included areas:

- `/health` — server health check
- `/auth` — register, login, forgot/reset password, OTP flows, logout
- `/users` — me/profile, avatar, email/phone updates, account deletion
- `/access-control` — access control related endpoints

---

### 2. Organization Module

Purpose: workspace, company, and branch management for ERP tenants.

Mounted at:

```txt
/api/v1/organization
```

Included areas:

- `/workspaces` — create, update, invite, manage workspace members
- `/companies` — workspace company CRUD
- `/branches` — company branch CRUD and workspace-level branch listing

These APIs are built around workspace/company/branch context and are intended for ERP customer-side operations.

---

### 3. Platform Module

Purpose: admin/internal operations for the platform owner.

Mounted at:

```txt
/api/v1/platform
```

Included areas:

- `/auth` — platform login/logout/me
- `/users` — platform user CRUD
- `/plans` — platform subscription plan management
- `/subscriptions` — platform subscription lifecycle management
- `/global-catalog` — platform-wide catalog masters and products

This module is used for internal platform operations such as customer onboarding, subscription oversight, and global master-data control.

---

### 4. Subscription Module

Purpose: customer-facing subscription operations for workspaces.

Mounted at:

```txt
/api/v1/subscription
```

Included areas:

- `/plans` — active and available plan retrieval
- `/subscriptions` — purchase, trial, renew, upgrade, downgrade, cancel, and reporting flows

This is used to manage workspace subscription state, billing cycles, seat availability, and subscription actions.

---

### 5. Catalog Module

Purpose: workspace-level catalog and product management for ERP users.

Mounted at:

```txt
/api/v1/catalog
```

Included areas:

- `/products` — workspace product CRUD and listing
- `/global-products` — global/shared product listing for the workspace context
- `/hsn-master` — HSN master endpoints
- `/manufacturer-master` — manufacturer master endpoints
- `/uom-master` — unit of measure master endpoints
- `/category-master` — category master endpoints
- `/product-form-master` — product form master endpoints
- `/salt-master` — salt master endpoints

---

## Catalog Master Details

The catalog area is one of the most important sections of the backend. It supports both product-level data and master records needed for pharmacy ERP operations.

### Products

- Create/update/delete workspace products
- Fetch product details and lists
- Operate under the current workspace context

### Global Products

- Access shared/global catalog products
- Used for cross-workspace catalog reference or central product data

### Masters

- **HSN Master** — HSN code and tax-related reference records
- **Manufacturer Master** — manufacturer information and reference data
- **UOM Master** — unit-of-measure definitions
- **Category Master** — product categorization
- **Product Form Master** — dosage/form classification
- **Salt Master** — active ingredient/salt definitions

---

## Authentication Model

The project uses two authentication flows:

### ERP User Authentication

- JWT-based login for customer/workspace users
- Authenticated routes use middleware to validate the token and context
- User context includes workspace/company/branch awareness where needed

### Platform Authentication

- Separate JWT flow for platform/internal users
- Platform routes use dedicated platform auth middleware

---

## Middleware Layer

Common middleware in the app includes:

- `requestLogger` — logs request details
- `authMiddleware` — validates ERP user tokens
- `platformAuthMiddleware` — validates platform tokens
- `workspaceContextMiddleware` — sets workspace context
- `companyContextMiddleware` — sets company context
- `branchContextMiddleware` — sets branch context
- `subscriptionGuard` — validates subscription state where needed
- `validate` — validates request payloads using Joi schemas
- `error.middleware` — global error handling
- `notFound.middleware` — 404 responses

---

## Environment Configuration

Create a `.env` file using the sample file:

```bash
cp .env.example .env
```

Important variables:

```env
NODE_ENV=development
PORT=5000
DB_URI=mongodb://localhost:27017/erp-backend
JWT_SECRET=your-jwt-secret
PLATFORM_JWT_SECRET=your-platform-jwt-secret
CORS_ORIGIN=http://localhost:3000
API_PREFIX=/api/v1
```

---

## Installation

```bash
npm install
```

---

## Running the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

---

## Useful Scripts

```bash
npm run dev
npm start
npm test
npm run lint
npm run seed:platform-user
```

- `seed:platform-user` seeds a platform user for admin/platform setup.

---

## Testing

The repository includes Jest-based tests under the `tests` folder:

```txt
tests/
├── api/
└── unit/
```

---

## Logging and File Storage

- Request and application logs are written to the `logs` directory.
- Uploads are stored under the `uploads` directory.
- The logger is configured to support rotating logs for better production monitoring.

---

## Notes on Architecture

The backend follows a clean separation of concerns:

- **Routes** define API endpoints
- **Controllers** handle requests and responses
- **Services** contain business logic
- **Repositories/models** manage database access
- **Middlewares** handle auth, validation, context, and error handling

This keeps each module focused and easier to maintain as the application grows.

---

## Recommended Development Flow

1. Start the server with `npm run dev`
2. Configure the `.env` file properly
3. Use the platform auth flow to create platform users
4. Create workspace/company/branch records for ERP customers
5. Manage subscription lifecycle and catalog data
6. Test APIs using Postman or your frontend integration layer

---

## Summary

The backend currently covers:

- ERP user and organization flows
- Platform admin and global catalog operations
- Subscription management for workspaces
- Workspace and platform-level catalog master data
- Secure authentication and request handling

This makes the project a strong foundation for a full pharmacy ERP ecosystem.
│   ├── controllers/
│   │   └── platformSubscription.controller.js
│   ├── services/
│   │   └── platformSubscription.service.js
│   ├── repositories/
│   │   └── platformSubscription.repository.js
│   ├── routes/
│   │   └── platformSubscription.routes.js
│   ├── validations/
│   │   └── platformSubscription.validation.js
│   ├── constants/
│   │   └── platformSubscription.constant.js
│   └── platformSubscription.module.js
│
├── global-catalog/
│   ├── medicines/
│   │   ├── models/
│   │   │   └── globalMedicine.model.js
│   │   ├── controllers/
│   │   │   └── globalMedicine.controller.js
│   │   ├── services/
│   │   │   └── globalMedicine.service.js
│   │   ├── repositories/
│   │   │   └── globalMedicine.repository.js
│   │   ├── routes/
│   │   │   └── globalMedicine.routes.js
│   │   ├── validations/
│   │   │   └── globalMedicine.validation.js
│   │   └── globalMedicine.module.js
│   │
│   ├── categories/
│   │   ├── models/
│   │   │   └── globalCategory.model.js
│   │   ├── controllers/
│   │   │   └── globalCategory.controller.js
│   │   ├── services/
│   │   │   └── globalCategory.service.js
│   │   ├── repositories/
│   │   │   └── globalCategory.repository.js
│   │   ├── routes/
│   │   │   └── globalCategory.routes.js
│   │   ├── validations/
│   │   │   └── globalCategory.validation.js
│   │   └── globalCategory.module.js
│   │
│   ├── globalCatalog.routes.js
│   └── globalCatalog.module.js
│
└── audit-logs/
    ├── models/
    │   └── platformAuditLog.model.js
    ├── controllers/
    │   └── platformAuditLog.controller.js
    ├── services/
    │   └── platformAuditLog.service.js
    ├── repositories/
    │   └── platformAuditLog.repository.js
    ├── routes/
    │   └── platformAuditLog.routes.js
    └── platformAuditLog.module.js
```

---

# 📌 Platform Feature Modules

## 1. `auth/`

Used for platform team login/logout.

Responsibilities:

- Platform admin login
- Generate platform JWT
- Validate platform user credentials
- Store last login time
- Protect platform routes

Example routes:

```txt
POST /api/v1/platform/auth/login
POST /api/v1/platform/auth/logout
GET  /api/v1/platform/auth/me
```

---

## 2. `users/`

Used to manage internal platform team members.

Responsibilities:

- Create platform user
- Update platform user
- Disable platform user
- Change platform user role
- List internal team users

Example roles:

```txt
SUPER_ADMIN
ADMIN
SUPPORT
BILLING_MANAGER
CATALOG_MANAGER
READ_ONLY
```

Example routes:

```txt
GET    /api/v1/platform/users
POST   /api/v1/platform/users
GET    /api/v1/platform/users/:id
PATCH  /api/v1/platform/users/:id
DELETE /api/v1/platform/users/:id
```

---

## 3. `dashboard/`

Used for platform-level analytics and overview.

Responsibilities:

- Total ERP customers
- Active subscriptions
- Expired subscriptions
- Monthly revenue
- New signups
- Plan-wise customer count
- Recent activities

Example routes:

```txt
GET /api/v1/platform/dashboard/stats
GET /api/v1/platform/dashboard/revenue
GET /api/v1/platform/dashboard/subscription-summary
GET /api/v1/platform/dashboard/recent-activity
```

---

## 4. `customers/`

Used to manage ERP customers.

Here, customer means pharmacy/business that purchased the ERP.

Responsibilities:

- View all ERP customers
- View customer workspace
- View customer companies
- View customer branches
- Suspend or activate customer
- View customer subscription
- View customer usage
- Support customer account

Example routes:

```txt
GET   /api/v1/platform/customers
GET   /api/v1/platform/customers/:workspaceId
GET   /api/v1/platform/customers/:workspaceId/companies
GET   /api/v1/platform/customers/:workspaceId/branches
GET   /api/v1/platform/customers/:workspaceId/subscription
PATCH /api/v1/platform/customers/:workspaceId/status
```

---

## 5. `plans/`

Used to manage master SaaS plans.

Plan means the package you sell.

Example plans:

```txt
Starter
Professional
Enterprise
```

Responsibilities:

- Create plan
- Update plan pricing
- Update plan limits
- Enable/disable plan
- Manage plan features

Example plan data:

```js
{
  name: "Professional",
  monthlyPrice: 1999,
  yearlyPrice: 19999,
  features: ["Inventory", "POS", "Reports"],
  limits: {
    branches: 10,
    users: 50,
    products: 10000
  },
  status: "ACTIVE"
}
```

Example routes:

```txt
GET    /api/v1/platform/plans
POST   /api/v1/platform/plans
GET    /api/v1/platform/plans/:id
PATCH  /api/v1/platform/plans/:id
DELETE /api/v1/platform/plans/:id
```

---

## 6. `subscriptions/`

Used to manage customer subscriptions.

Subscription means a customer’s active purchase of a plan.

Responsibilities:

- View all subscriptions
- View subscription by workspace
- Change customer plan
- Renew subscription
- Cancel subscription
- Mark subscription expired
- Extend trial
- View billing cycle

Example subscription data:

```js
{
  workspaceId: "...",
  planId: "...",
  status: "ACTIVE",
  startsAt: "2026-05-01",
  expiresAt: "2026-06-01",
  billingCycle: "MONTHLY"
}
```

Example routes:

```txt
GET   /api/v1/platform/subscriptions
GET   /api/v1/platform/subscriptions/:id
PATCH /api/v1/platform/subscriptions/:id/change-plan
PATCH /api/v1/platform/subscriptions/:id/renew
PATCH /api/v1/platform/subscriptions/:id/cancel
PATCH /api/v1/platform/subscriptions/:id/extend-trial
```

---

## 7. `global-catalog/`

Used to manage global/master catalog.

This is different from each pharmacy’s local catalog.

Responsibilities:

- Manage global medicine database
- Manage global medicine categories
- Provide master medicine data to customer workspaces
- Help customers import common medicines quickly
- Keep standardized medicine names, salt, manufacturer, HSN, GST, etc.

Example global medicine data:

```js
{
  name: "Paracetamol 500mg",
  salt: "Paracetamol",
  manufacturer: "Example Pharma",
  categoryId: "...",
  hsnCode: "3004",
  gstRate: 12,
  isPrescriptionRequired: false,
  status: "ACTIVE"
}
```

Example routes:

```txt
GET    /api/v1/platform/global-catalog/medicines
POST   /api/v1/platform/global-catalog/medicines
GET    /api/v1/platform/global-catalog/medicines/:id
PATCH  /api/v1/platform/global-catalog/medicines/:id
DELETE /api/v1/platform/global-catalog/medicines/:id

GET    /api/v1/platform/global-catalog/categories
POST   /api/v1/platform/global-catalog/categories
PATCH  /api/v1/platform/global-catalog/categories/:id
DELETE /api/v1/platform/global-catalog/categories/:id
```

---

## 8. `audit-logs/`

Used to track important platform admin actions.

Responsibilities:

- Track who changed a plan
- Track who changed a subscription
- Track who suspended a customer
- Track who updated global catalog
- Track platform login events
- Help debug and investigate issues

Example audit log:

```js
{
  action: "PLAN_UPDATED",
  entityType: "PLAN",
  entityId: "...",
  performedBy: "...",
  performedByRole: "SUPER_ADMIN",
  metadata: {
    oldPrice: 999,
    newPrice: 1499
  },
  ipAddress: "...",
  userAgent: "...",
  createdAt: "2026-05-13T10:00:00.000Z"
}
```

Example routes:

```txt
GET /api/v1/platform/audit-logs
GET /api/v1/platform/audit-logs/:id
GET /api/v1/platform/audit-logs?entityType=PLAN
GET /api/v1/platform/audit-logs?performedBy=userId
```

---

# 🔐 Platform Auth Design

Platform users should not use the normal ERP customer `User` model.

Use separate model:

```txt
PlatformUser
```

Recommended schema:

```js
{
  name: String,

  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: [
      "SUPER_ADMIN",
      "ADMIN",
      "SUPPORT",
      "BILLING_MANAGER",
      "CATALOG_MANAGER",
      "READ_ONLY"
    ],
    default: "READ_ONLY"
  },

  status: {
    type: String,
    enum: ["ACTIVE", "SUSPENDED", "INVITED"],
    default: "ACTIVE"
  },

  lastLoginAt: Date,

  createdBy: {
    type: ObjectId,
    ref: "PlatformUser"
  },

  createdAt: Date,
  updatedAt: Date
}
```

---

## Platform JWT Payload

```js
{
  id: platformUser._id,
  email: platformUser.email,
  role: platformUser.role,
  userType: "PLATFORM_USER"
}
```

---

## ERP Customer JWT Payload

```js
{
  id: user._id,
  workspaceId: user.workspaceId,
  role: user.role,
  userType: "ERP_USER"
}
```

---

# 🔑 Platform Role Constants

```js
// src/constants/platformRoles.constant.js

export const PLATFORM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SUPPORT: "SUPPORT",
  BILLING_MANAGER: "BILLING_MANAGER",
  CATALOG_MANAGER: "CATALOG_MANAGER",
  READ_ONLY: "READ_ONLY",
};
```

---

# 🛡️ Platform Role Middleware

```js
// src/middlewares/platformRole.middleware.js

import { ApiError } from "../utils/ApiError.js";

export const allowPlatformRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.platformUser) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!roles.includes(req.platformUser.role)) {
      throw new ApiError(403, "Forbidden");
    }

    next();
  };
};
```

Example usage:

```js
router.post(
  "/plans",
  platformAuth,
  allowPlatformRoles("SUPER_ADMIN", "ADMIN", "BILLING_MANAGER"),
  createPlan,
);
```

---

# 🌐 API Routing

All routes use the `/api/v1` prefix.

## Main API Modules

```txt
/api/v1/core
/api/v1/platform
/api/v1/organization
/api/v1/subscription
/api/v1/catalog
/api/v1/inventory
/api/v1/parties
/api/v1/purchase
/api/v1/sales
/api/v1/billing
/api/v1/invoicing
/api/v1/taxation
/api/v1/finance
/api/v1/orders
/api/v1/ecommerce
/api/v1/crm
/api/v1/hrm
/api/v1/reports
/api/v1/notifications
/api/v1/system
```

---

## Route Registration Example

```js
// src/routes/index.routes.js

import express from "express";

import coreRoutes from "../modules/core/core.routes.js";
import platformRoutes from "../modules/platform/platform.routes.js";
import organizationRoutes from "../modules/organization/organization.routes.js";
import subscriptionRoutes from "../modules/subscription/subscription.routes.js";

const router = express.Router();

router.use("/core", coreRoutes);
router.use("/platform", platformRoutes);
router.use("/organization", organizationRoutes);
router.use("/subscription", subscriptionRoutes);

export default router;
```

---

## Platform Route Registration Example

```js
// src/modules/platform/platform.routes.js

import express from "express";

import platformAuthRoutes from "./auth/routes/platformAuth.routes.js";
import platformUserRoutes from "./users/routes/platformUser.routes.js";
import platformDashboardRoutes from "./dashboard/routes/platformDashboard.routes.js";
import platformCustomerRoutes from "./customers/routes/platformCustomer.routes.js";
import platformPlanRoutes from "./plans/routes/platformPlan.routes.js";
import platformSubscriptionRoutes from "./subscriptions/routes/platformSubscription.routes.js";
import globalCatalogRoutes from "./global-catalog/globalCatalog.routes.js";
import platformAuditLogRoutes from "./audit-logs/routes/platformAuditLog.routes.js";

const router = express.Router();

router.use("/auth", platformAuthRoutes);
router.use("/users", platformUserRoutes);
router.use("/dashboard", platformDashboardRoutes);
router.use("/customers", platformCustomerRoutes);
router.use("/plans", platformPlanRoutes);
router.use("/subscriptions", platformSubscriptionRoutes);
router.use("/global-catalog", globalCatalogRoutes);
router.use("/audit-logs", platformAuditLogRoutes);

export default router;
```

---

# 🧱 Existing ERP Business Modules

## `core/`

Core application functionality.

Includes:

```txt
auth
users
access-control
settings
health
```

Used for:

- ERP customer login
- ERP users
- ERP roles and permissions
- Health check
- User settings

---

## `organization/`

Multi-tenant organization structure.

Includes:

```txt
workspaces
companies
branches
```

Used for:

- Customer workspace
- Multiple companies
- Multiple branches

---

## `subscription/`

Customer subscription system.

Includes:

```txt
plans
subscriptions
usage
```

Used for:

- Plan definitions
- Customer subscription records
- Usage tracking
- Subscription limit checks

---

## `catalog/`

Pharmacy product catalog.

Includes:

```txt
products
medicines
categories
batches
```

Used for:

- Medicine records
- Product records
- Categories
- Batch tracking

---

## `inventory/`

Stock management.

Includes:

```txt
stock
stock-movements
expiry
```

Used for:

- Current stock
- Stock in/out
- Expiry tracking
- Batch-wise inventory

---

## `parties/`

Customer and supplier management.

Includes:

```txt
customers
suppliers
```

---

## `purchase/`

Purchase management.

Includes:

```txt
purchases
purchase-returns
```

---

## `sales/`

Sales management.

Includes:

```txt
sales
sales-returns
```

---

## `billing/`

POS and bill generation.

Includes:

```txt
pos
bills
```

---

## `invoicing/`

Invoice management.

Includes:

```txt
invoices
```

---

## `taxation/`

Tax and GST handling.

Includes:

```txt
gst
taxes
```

---

## `finance/`

Financial accounting.

Includes:

```txt
payments
transactions
ledger
expenses
income
```

---

## `orders/`

Order processing.

Includes:

```txt
orders
shipping
delivery
```

---

## `ecommerce/`

Optional online ordering features.

Includes:

```txt
cart
checkout
wishlist
coupons
```

---

## `crm/`

Customer relationship management.

Includes:

```txt
leads
followups
```

---

## `hrm/`

Human resource management.

Includes:

```txt
employees
attendance
payroll
```

---

## `reports/`

Business reports and analytics.

---

## `notifications/`

Notification system.

---

## `system/`

System utilities.

Includes:

```txt
files
logs
audit
```

---

# ⚙️ Environment Variables

Create `.env` from `.env.example`.

```env
NODE_ENV=development
PORT=5000
APP_NAME=Pharmacy ERP Backend

DB_URI=mongodb://localhost:27017/pharmacy-erp
DB_NAME=pharmacy-erp

JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

PLATFORM_JWT_SECRET=your-platform-secret-key
PLATFORM_JWT_EXPIRES_IN=7d

REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=30d

CORS_ORIGIN=http://localhost:3000
PLATFORM_CORS_ORIGIN=http://localhost:3001

API_PREFIX=/api/v1
BASE_URL=http://localhost:5000

LOG_LEVEL=info
LOG_DIR=logs

MAX_UPLOAD_SIZE=10mb
UPLOAD_DIR=uploads

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-password
MAIL_FROM=noreply@pharmacy-erp.com

REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
```

---

# ⚙️ Installation

## Requirements

- Node.js v14 or higher
- npm
- MongoDB
- Git

## Setup

```bash
git clone <repository-url>
cd erp-backend
npm install
copy .env.example .env
```

Update `.env` with your values.

---

# ▶️ Run Locally

```bash
npm run dev
```

For production:

```bash
npm start
```

---

# ✅ Verify Server

```bash
curl http://localhost:5000/api/v1/core/health
```

Expected response:

```json
{
  "success": true,
  "message": "Health check passed",
  "data": {
    "status": "OK"
  }
}
```

---

# 🛠 Core Application Flow

1. `src/server.js` loads environment variables and starts the HTTP server.
2. `src/app.js` applies middleware, parsers, security, CORS, routes, and error handlers.
3. `src/routes/index.routes.js` registers module routers.
4. Request enters correct module route.
5. Middleware validates authentication and authorization.
6. Controller receives request.
7. Service handles business logic.
8. Repository performs database operation.
9. API response is returned using `ApiResponse`.
10. Errors are handled by global error middleware.

---

# 🧩 Standard Module Pattern

Every module should follow this structure:

```txt
module-name/
├── models/
├── controllers/
├── services/
├── repositories/
├── routes/
├── validations/
├── constants/
└── module-name.module.js
```

Layer responsibility:

```txt
models        = database schema
controllers   = HTTP request/response
services      = business logic
repositories  = database queries
routes        = endpoint definitions
validations   = request validation schemas
constants     = module constants
```

---

# 🧪 Testing

Run tests:

```bash
npm test
```

Run test in watch mode:

```bash
npm run test:watch
```

Run test coverage:

```bash
npm run test:coverage
```

---

# 🧹 Code Quality

Run lint:

```bash
npm run lint
```

Auto-fix lint issues:

```bash
npm run lint:fix
```

---

# 📋 NPM Scripts

```txt
npm run dev            Start development server
npm start              Start production server
npm test               Run tests
npm run test:watch     Run tests in watch mode
npm run test:coverage  Generate test coverage
npm run lint           Run ESLint
npm run lint:fix       Fix ESLint issues
npm run seed           Seed database
npm run migrate        Run migrations
```

---

# 🔐 Security Features

- JWT authentication
- Separate ERP and platform auth
- Password hashing
- Role-based authorization
- ERP permission-based authorization
- Platform role-only authorization
- Request validation
- Rate limiting
- CORS protection
- Helmet security headers
- Audit logging
- Error handling
- Input sanitization

---

# 🧭 Recommended MVP Order

Build in this order:

```txt
1. core/auth
2. core/users
3. organization/workspaces
4. subscription/plans
5. subscription/subscriptions
6. platform/auth
7. platform/users
8. platform/dashboard
9. platform/customers
10. platform/plans
11. platform/subscriptions
12. platform/global-catalog
13. platform/audit-logs
```

---

# ✅ Current Platform MVP Modules

Minimum required platform modules:

```txt
auth
users
dashboard
customers
plans
subscriptions
```

Add after MVP:

```txt
global-catalog
audit-logs
```

Full useful platform modules:

```txt
8 modules
```

---

# 📌 Important Architecture Decisions

## ERP customer users

Use:

```txt
User
Role
Permission
Workspace
Company
Branch
```

Reason:

ERP customers may have multiple companies, branches, and staff members.

---

## Platform internal users

Use:

```txt
PlatformUser
Role
```

Reason:

Internal team is small and does not need complex permissions yet.

---

## Plans vs Subscriptions

```txt
Plan = package/template you sell
Subscription = customer purchase of that plan
```

Example:

```txt
Professional Plan
₹1999/month
10 branches
50 users
```

Customer subscription:

```txt
ABC Pharmacy subscribed to Professional Plan
Status: ACTIVE
Expires: 2026-06-01
```

---

## Global Catalog vs Customer Catalog

```txt
Global Catalog = master medicine database managed by platform team
Customer Catalog = pharmacy-specific products/medicines inside workspace
```

---

# 🚧 Future Improvements

- Swagger/OpenAPI documentation
- Admin activity timeline
- Advanced platform reporting
- Payment gateway integration
- Subscription invoices
- Usage-based billing
- Notification center
- Customer support tickets
- Platform impersonation mode
- Advanced permission system for platform team
- Microservices support
- Queue-based background jobs
- Redis caching
- Kubernetes deployment

---

# 📄 License

ISC

---

# 👥 Team

Developed for retail pharmacy ERP SaaS operations.
