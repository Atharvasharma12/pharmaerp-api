# ERP Backend

A modular backend for a retail pharmacy ERP platform built on top of the **Pahuch** ecosystem. The project is built with Node.js, Express, MongoDB, JWT-based authentication, and a feature-driven module structure that separates platform operations, organization management, subscription handling, catalog management, and a Quick Commerce marketplace layer.

---

## Overview

This backend supports three main product areas:

1. **ERP customer side** — for pharmacy/workspace users managing their business
2. **Platform/admin side** — for Pahuch internal team (subscription management, store verification, marketplace operations)
3. **Marketplace side** — for ERP partner pharmacies participating in the Pahuch Quick Commerce platform

The API is served under the base prefix:

```txt
/api/v1
```

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (ERP users) and platform JWT (Pahuch internal)
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
- Pharmacy finance, accounting, and treasury management
- Partner and customer (parties) management
- Marketplace store registration and partner fulfillment operations
- Platform-controlled marketplace commerce (availability, routing, orders, delivery, settlements)
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
│   │   ├── branchContext.middleware.js
│   │   ├── companyContext.middleware.js
│   │   ├── error.middleware.js
│   │   ├── notFound.middleware.js
│   │   ├── permission.middleware.js
│   │   ├── platformAuth.middleware.js
│   │   ├── platformRole.middleware.js
│   │   ├── requestLogger.middleware.js
│   │   ├── subscriptionGuard.middleware.js
│   │   ├── validate.middleware.js
│   │   └── workspaceContext.middleware.js
│   ├── modules/
│   │   ├── core/
│   │   ├── organization/
│   │   ├── platform/
│   │   ├── subscription/
│   │   ├── catalog/
│   │   ├── finance/
│   │   ├── parties/
│   │   └── marketplace/
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

All routes are mounted from `src/routes/index.routes.js`:

```txt
/api/v1/core/*
/api/v1/platform/*
/api/v1/organization/*
/api/v1/subscription/*
/api/v1/catalog/*
/api/v1/finance/*
/api/v1/parties/*
/api/v1/marketplace/*
```

---

## Module Breakdown

### 1. `core/`

Purpose: common auth, user profile, health checks, and access control.

Mounted at: `/api/v1/core`

Included areas:

- `/health` — server health check
- `/auth` — register, login, forgot/reset password, OTP flows, logout
- `/users` — me/profile, avatar, email/phone updates, account deletion
- `/access-control` — role and permission management

---

### 2. `organization/`

Purpose: workspace, company, and branch management for ERP tenants.

Mounted at: `/api/v1/organization`

Included areas:

- `/workspaces` — create, update, invite, manage workspace members
- `/companies` — workspace company CRUD
- `/branches` — company branch CRUD and workspace-level branch listing

These APIs are built around workspace/company/branch context and are intended for ERP customer-side operations.

---

### 3. `platform/`

Purpose: admin/internal operations for the Pahuch platform team.

Mounted at: `/api/v1/platform`

#### Existing Platform Modules

- `/auth` — platform login/logout/me
- `/users` — platform user CRUD
- `/dashboard` — platform analytics overview
- `/customers` — ERP customer workspace management
- `/plans` — subscription plan management
- `/subscriptions` — subscription lifecycle management
- `/global-catalog` — platform-wide catalog masters and products
- `/audit-logs` — platform admin action tracking

#### New Marketplace Platform Modules

- `/marketplace-settings` — global marketplace configuration
- `/store-verification` — approve/reject partner store registrations
- `/pricing` — customer pricing, partner settlement prices, platform margin
- `/commission` — commission rules and rates
- `/availability-engine` — determine which stores can fulfill an order
- `/routing-engine` — select the best fulfillment store
- `/customer-orders` — all customer orders, Pahuch view
- `/delivery` — delivery partners, tracking, proof of delivery
- `/settlements` — partner payout management
- `/refunds` — customer refund management
- `/coupons` — platform-wide offers and coupons
- `/marketplace-analytics` — Pahuch marketplace business intelligence

---

### 4. `subscription/`

Purpose: customer-facing subscription operations for workspaces.

Mounted at: `/api/v1/subscription`

Included areas:

- `/plans` — active and available plan retrieval
- `/subscriptions` — purchase, trial, renew, upgrade, downgrade, cancel

---

### 5. `catalog/`

Purpose: workspace-level catalog and product management for ERP users.

Mounted at: `/api/v1/catalog`

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

### 6. `finance/`

Purpose: financial accounting and treasury operations for ERP workspaces.

Mounted at: `/api/v1/finance`

Included areas:

- `/chart-of-accounts` — chart of accounts management
- `/journal-vouchers` — journal entry management
- `/ledger` — ledger view and reporting
- `/account-balances` — account balance tracking
- `/opening-balances` — opening balance setup
- `/financial-periods` — financial period management
- `/treasury` — treasury and payment tracking
- `/reports` — financial reports

---

### 7. `parties/`

Purpose: customer and supplier management for ERP workspaces.

Mounted at: `/api/v1/parties`

Included areas:

- `/customers` — pharmacy customer CRUD and ledger
- `/suppliers` — supplier CRUD and ledger

---

### 8. `marketplace/`

Purpose: ERP partner pharmacy operations for the Pahuch Marketplace.

Mounted at: `/api/v1/marketplace`

Partner pharmacies (ERP users) use this module to manage their online store participation.

Included areas:

- `/stores` — partner store registration, online/offline management
- `/products` — enable/disable ERP products for online selling
- `/inventory` — read-only view of sellable stock
- `/fulfillment-orders` — accept, pack, and dispatch fulfillment tasks from Pahuch
- `/pricing` — read-only view of partner settlement pricing
- `/dashboard` — partner store performance dashboard

---

## Platform vs Marketplace Split

The Pahuch system introduces a clear two-layer commerce architecture on top of the ERP:

```txt
ERP (Source of Truth)
│   Products, Inventory, Finance, Customers, Branches
│
├── platform/                   ← Pahuch Internal Management
│   │   Marketplace Settings, Store Verification, Pricing,
│   │   Commission, Availability Engine, Routing Engine,
│   │   Customer Orders, Delivery, Settlements, Refunds,
│   │   Coupons, Marketplace Analytics
│
└── marketplace/                ← Partner Pharmacy Operations
        Stores, Products, Inventory (View), Fulfillment Orders,
        Pricing (View), Store Dashboard
```

### Who controls what

| Concern | Owner |
| ------------------------------------------------- | ----------- |
| Customer-facing price | Platform |
| Partner settlement price | Platform |
| Store approval / rejection | Platform |
| Commission rules | Platform |
| Routing and availability decisions | Platform |
| Customer orders | Platform |
| Delivery management | Platform |
| Refund processing | Platform |
| Partner settlement payout | Platform |
| Store online/offline toggle | Marketplace |
| Product enabled/disabled for online selling | Marketplace |
| Order acceptance and packing | Marketplace |
| Store working hours | Marketplace |
| Store dashboard and reports | Marketplace |

---

## File & Folder Naming Convention

Every module follows the same naming pattern:

```txt
<submoduleName>.<layer>.js
```

### Examples

```txt
company.model.js
company.controller.js
company.service.js
company.repository.js
company.routes.js
company.validation.js
company.constant.js
company.module.js
```

```txt
platformPlan.controller.js
platformPlan.service.js
platformPlan.routes.js
platformPlan.validation.js
platformPlan.constant.js
platformPlan.module.js
```

```txt
marketplaceStore.model.js
marketplaceStore.controller.js
marketplaceStore.service.js
marketplaceStore.repository.js
marketplaceStore.routes.js
marketplaceStore.validation.js
marketplaceStore.constant.js
marketplaceStore.module.js
```

### Naming Rules

```txt
Platform module files    →  platformXxx.layer.js
Marketplace module files →  marketplaceXxx.layer.js
ERP module files         →  entityName.layer.js
```

---

## Standard Module Pattern

Every module follows this folder structure:

```txt
module-name/
├── models/
│   └── moduleName.model.js
├── controllers/
│   └── moduleName.controller.js
├── services/
│   └── moduleName.service.js
├── repositories/
│   └── moduleName.repository.js
├── routes/
│   └── moduleName.routes.js
├── validations/
│   └── moduleName.validation.js
├── constants/
│   └── moduleName.constant.js
└── moduleName.module.js
```

Layer responsibility:

```txt
models        → database schema definition
controllers   → HTTP request/response handling
services      → business logic
repositories  → database queries
routes        → endpoint definitions
validations   → Joi request validation schemas
constants     → module-level constants and enums
```

Note: Some modules (e.g. engines, dashboards, analytics) skip `models/` and/or `repositories/` because they are computational/read-only services.

---

## Authentication Model

### ERP User Authentication

- JWT-based login for customer/workspace users
- Authenticated routes use middleware to validate the token and context
- User context includes workspace/company/branch awareness where needed

### Platform Authentication

- Separate JWT flow for Pahuch internal users
- Platform routes use dedicated platform auth middleware

---

## Platform Role Constants

```js
// src/constants/platformRoles.constant.js

SUPER_ADMIN
ADMIN
SUPPORT
BILLING_MANAGER
CATALOG_MANAGER
READ_ONLY
```

---

## Middleware Layer

```txt
requestLogger          → logs request details
authMiddleware         → validates ERP user tokens
platformAuthMiddleware → validates platform (Pahuch) tokens
workspaceContextMiddleware → sets workspace context
companyContextMiddleware   → sets company context
branchContextMiddleware    → sets branch context
subscriptionGuard      → validates subscription state
validate               → validates request payloads using Joi schemas
error.middleware       → global error handling
notFound.middleware    → 404 responses
```

---

## Platform Module — Full Structure

```txt
src/modules/platform/
│
├── platform.module.js
├── platform.routes.js
│
├── auth/
├── users/
├── dashboard/
├── customers/
├── plans/
├── subscriptions/
├── global-catalog/
├── audit-logs/
│
├── marketplace-settings/
│   ├── models/
│   │   └── platformMarketplaceSettings.model.js
│   ├── controllers/
│   │   └── platformMarketplaceSettings.controller.js
│   ├── services/
│   │   └── platformMarketplaceSettings.service.js
│   ├── repositories/
│   │   └── platformMarketplaceSettings.repository.js
│   ├── routes/
│   │   └── platformMarketplaceSettings.routes.js
│   ├── validations/
│   │   └── platformMarketplaceSettings.validation.js
│   ├── constants/
│   │   └── platformMarketplaceSettings.constant.js
│   └── platformMarketplaceSettings.module.js
│
├── store-verification/
│   ├── models/
│   │   └── platformStoreVerification.model.js
│   ├── controllers/
│   │   └── platformStoreVerification.controller.js
│   ├── services/
│   │   └── platformStoreVerification.service.js
│   ├── repositories/
│   │   └── platformStoreVerification.repository.js
│   ├── routes/
│   │   └── platformStoreVerification.routes.js
│   ├── validations/
│   │   └── platformStoreVerification.validation.js
│   ├── constants/
│   │   └── platformStoreVerification.constant.js
│   └── platformStoreVerification.module.js
│
├── pricing/
│   ├── models/
│   │   └── platformMarketplacePricing.model.js
│   ├── controllers/
│   │   └── platformMarketplacePricing.controller.js
│   ├── services/
│   │   └── platformMarketplacePricing.service.js
│   ├── repositories/
│   │   └── platformMarketplacePricing.repository.js
│   ├── routes/
│   │   └── platformMarketplacePricing.routes.js
│   ├── validations/
│   │   └── platformMarketplacePricing.validation.js
│   ├── constants/
│   │   └── platformMarketplacePricing.constant.js
│   └── platformMarketplacePricing.module.js
│
├── commission/
│   ├── models/
│   │   └── platformCommission.model.js
│   ├── controllers/
│   │   └── platformCommission.controller.js
│   ├── services/
│   │   └── platformCommission.service.js
│   ├── repositories/
│   │   └── platformCommission.repository.js
│   ├── routes/
│   │   └── platformCommission.routes.js
│   ├── validations/
│   │   └── platformCommission.validation.js
│   ├── constants/
│   │   └── platformCommission.constant.js
│   └── platformCommission.module.js
│
├── availability-engine/
│   ├── controllers/
│   │   └── platformAvailabilityEngine.controller.js
│   ├── services/
│   │   └── platformAvailabilityEngine.service.js
│   ├── repositories/
│   │   └── platformAvailabilityEngine.repository.js
│   ├── routes/
│   │   └── platformAvailabilityEngine.routes.js
│   ├── constants/
│   │   └── platformAvailabilityEngine.constant.js
│   └── platformAvailabilityEngine.module.js
│
├── routing-engine/
│   ├── controllers/
│   │   └── platformRoutingEngine.controller.js
│   ├── services/
│   │   └── platformRoutingEngine.service.js
│   ├── routes/
│   │   └── platformRoutingEngine.routes.js
│   ├── constants/
│   │   └── platformRoutingEngine.constant.js
│   └── platformRoutingEngine.module.js
│
├── customer-orders/
│   ├── models/
│   │   └── platformCustomerOrder.model.js
│   ├── controllers/
│   │   └── platformCustomerOrder.controller.js
│   ├── services/
│   │   └── platformCustomerOrder.service.js
│   ├── repositories/
│   │   └── platformCustomerOrder.repository.js
│   ├── routes/
│   │   └── platformCustomerOrder.routes.js
│   ├── validations/
│   │   └── platformCustomerOrder.validation.js
│   ├── constants/
│   │   └── platformCustomerOrder.constant.js
│   └── platformCustomerOrder.module.js
│
├── delivery/
│   ├── models/
│   │   └── platformDelivery.model.js
│   ├── controllers/
│   │   └── platformDelivery.controller.js
│   ├── services/
│   │   └── platformDelivery.service.js
│   ├── repositories/
│   │   └── platformDelivery.repository.js
│   ├── routes/
│   │   └── platformDelivery.routes.js
│   ├── validations/
│   │   └── platformDelivery.validation.js
│   ├── constants/
│   │   └── platformDelivery.constant.js
│   └── platformDelivery.module.js
│
├── settlements/
│   ├── models/
│   │   └── platformSettlement.model.js
│   ├── controllers/
│   │   └── platformSettlement.controller.js
│   ├── services/
│   │   └── platformSettlement.service.js
│   ├── repositories/
│   │   └── platformSettlement.repository.js
│   ├── routes/
│   │   └── platformSettlement.routes.js
│   ├── validations/
│   │   └── platformSettlement.validation.js
│   ├── constants/
│   │   └── platformSettlement.constant.js
│   └── platformSettlement.module.js
│
├── refunds/
│   ├── models/
│   │   └── platformRefund.model.js
│   ├── controllers/
│   │   └── platformRefund.controller.js
│   ├── services/
│   │   └── platformRefund.service.js
│   ├── repositories/
│   │   └── platformRefund.repository.js
│   ├── routes/
│   │   └── platformRefund.routes.js
│   ├── validations/
│   │   └── platformRefund.validation.js
│   ├── constants/
│   │   └── platformRefund.constant.js
│   └── platformRefund.module.js
│
├── coupons/
│   ├── models/
│   │   └── platformCoupon.model.js
│   ├── controllers/
│   │   └── platformCoupon.controller.js
│   ├── services/
│   │   └── platformCoupon.service.js
│   ├── repositories/
│   │   └── platformCoupon.repository.js
│   ├── routes/
│   │   └── platformCoupon.routes.js
│   ├── validations/
│   │   └── platformCoupon.validation.js
│   ├── constants/
│   │   └── platformCoupon.constant.js
│   └── platformCoupon.module.js
│
└── marketplace-analytics/
    ├── controllers/
    │   └── platformMarketplaceAnalytics.controller.js
    ├── services/
    │   └── platformMarketplaceAnalytics.service.js
    ├── repositories/
    │   └── platformMarketplaceAnalytics.repository.js
    ├── routes/
    │   └── platformMarketplaceAnalytics.routes.js
    ├── constants/
    │   └── platformMarketplaceAnalytics.constant.js
    └── platformMarketplaceAnalytics.module.js
```

---

## Marketplace Module — Full Structure

```txt
src/modules/marketplace/
│
├── marketplace.module.js
├── marketplace.routes.js
│
├── stores/
│   ├── models/
│   │   └── marketplaceStore.model.js
│   ├── controllers/
│   │   └── marketplaceStore.controller.js
│   ├── services/
│   │   └── marketplaceStore.service.js
│   ├── repositories/
│   │   └── marketplaceStore.repository.js
│   ├── routes/
│   │   └── marketplaceStore.routes.js
│   ├── validations/
│   │   └── marketplaceStore.validation.js
│   ├── constants/
│   │   └── marketplaceStore.constant.js
│   └── marketplaceStore.module.js
│
├── products/
│   ├── models/
│   │   └── marketplaceProduct.model.js
│   ├── controllers/
│   │   └── marketplaceProduct.controller.js
│   ├── services/
│   │   └── marketplaceProduct.service.js
│   ├── repositories/
│   │   └── marketplaceProduct.repository.js
│   ├── routes/
│   │   └── marketplaceProduct.routes.js
│   ├── validations/
│   │   └── marketplaceProduct.validation.js
│   ├── constants/
│   │   └── marketplaceProduct.constant.js
│   └── marketplaceProduct.module.js
│
├── inventory/
│   ├── models/
│   │   └── marketplaceInventory.model.js
│   ├── controllers/
│   │   └── marketplaceInventory.controller.js
│   ├── services/
│   │   └── marketplaceInventory.service.js
│   ├── repositories/
│   │   └── marketplaceInventory.repository.js
│   ├── routes/
│   │   └── marketplaceInventory.routes.js
│   ├── constants/
│   │   └── marketplaceInventory.constant.js
│   └── marketplaceInventory.module.js
│
├── fulfillment-orders/
│   ├── models/
│   │   └── marketplaceFulfillmentOrder.model.js
│   ├── controllers/
│   │   └── marketplaceFulfillmentOrder.controller.js
│   ├── services/
│   │   └── marketplaceFulfillmentOrder.service.js
│   ├── repositories/
│   │   └── marketplaceFulfillmentOrder.repository.js
│   ├── routes/
│   │   └── marketplaceFulfillmentOrder.routes.js
│   ├── validations/
│   │   └── marketplaceFulfillmentOrder.validation.js
│   ├── constants/
│   │   └── marketplaceFulfillmentOrder.constant.js
│   └── marketplaceFulfillmentOrder.module.js
│
├── pricing/
│   ├── controllers/
│   │   └── marketplacePricing.controller.js
│   ├── services/
│   │   └── marketplacePricing.service.js
│   ├── routes/
│   │   └── marketplacePricing.routes.js
│   └── marketplacePricing.module.js
│
└── dashboard/
    ├── controllers/
    │   └── marketplaceDashboard.controller.js
    ├── services/
    │   └── marketplaceDashboard.service.js
    ├── routes/
    │   └── marketplaceDashboard.routes.js
    ├── constants/
    │   └── marketplaceDashboard.constant.js
    └── marketplaceDashboard.module.js
```

---

## Core Application Flow

1. `src/server.js` loads environment variables and starts the HTTP server.
2. `src/app.js` applies middleware, parsers, security, CORS, routes, and error handlers.
3. `src/routes/index.routes.js` registers module routers.
4. Request enters the correct module route.
5. Middleware validates authentication and authorization.
6. Controller receives the request.
7. Service handles business logic.
8. Repository performs the database operation.
9. API response is returned using `ApiResponse`.
10. Errors are handled by the global error middleware.

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

## Installation

Requirements:

- Node.js v14 or higher
- npm
- MongoDB
- Git

Setup:

```bash
git clone <repository-url>
cd erp-backend
npm install
copy .env.example .env
```

Update `.env` with your values.

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

## Verify Server

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

## NPM Scripts

```txt
npm run dev              Start development server
npm start                Start production server
npm test                 Run tests
npm run test:watch       Run tests in watch mode
npm run test:coverage    Generate test coverage
npm run lint             Run ESLint
npm run lint:fix         Fix ESLint issues
npm run seed             Seed database
npm run seed:platform-user  Seed a platform admin user
```

---

## Security Features

- JWT authentication (separate for ERP and platform)
- Password hashing
- Role-based authorization
- ERP permission-based authorization
- Platform role-only authorization
- Request validation via Joi
- Rate limiting
- CORS protection
- Helmet security headers
- Audit logging
- Global error handling
- Input sanitization

---

## Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

Tests live under:

```txt
tests/
├── api/
└── unit/
```

---

## Important Architecture Decisions

### ERP customer users

Uses: `User`, `Role`, `Permission`, `Workspace`, `Company`, `Branch`

ERP customers may have multiple companies, branches, and staff members.

### Platform internal users

Uses: `PlatformUser`, `Role`

Internal Pahuch team is managed separately from ERP users.

### Plans vs Subscriptions

```txt
Plan         = package/template you sell (e.g. Professional ₹1999/month)
Subscription = customer's active purchase of that plan
```

### Global Catalog vs Customer Catalog

```txt
Global Catalog   = master medicine database managed by platform team
Customer Catalog = pharmacy-specific products/medicines inside workspace
```

### ERP vs Platform vs Marketplace

```txt
ERP          = operational backbone (products, inventory, finance, accounting)
Platform     = commerce brain (pricing, routing, orders, delivery, settlements)
Marketplace  = partner interface (store, products, fulfillment, dashboard)
```

---

## Build Order Reference

### ERP MVP

```txt
1. core/auth
2. core/users
3. organization/workspaces
4. organization/companies
5. organization/branches
6. subscription/plans
7. subscription/subscriptions
8. platform/auth
9. platform/users
10. platform/dashboard
11. platform/customers
12. platform/plans
13. platform/subscriptions
14. platform/global-catalog
15. platform/audit-logs
16. catalog/products
17. finance/chart-of-accounts
18. finance/journal-vouchers
19. finance/ledger
20. parties/customers
21. parties/suppliers
```

### Marketplace Build Order

```txt
PHASE 1 — FOUNDATION
1. platform/marketplace-settings
2. marketplace/stores
3. platform/store-verification

PHASE 2 — CATALOG
4. marketplace/products
5. platform/pricing
6. marketplace/inventory

PHASE 3 — INTELLIGENCE
7. platform/availability-engine
8. platform/routing-engine
9. platform/availability-engine (inventory reservation)

PHASE 4 — OPERATIONS
10. platform/customer-orders
11. marketplace/fulfillment-orders
12. marketplace/fulfillment-orders (packing & dispatch)

PHASE 5 — DELIVERY
13. platform/delivery (delivery partners)
14. platform/delivery (tracking)
15. platform/delivery (proof of delivery)

PHASE 6 — FINANCE
16. platform/settlements
17. platform/commission
18. platform/refunds

PHASE 7 — ANALYTICS
19. platform/marketplace-analytics
20. marketplace/dashboard
21. platform/marketplace-analytics (reports)
```

---

## Future Improvements

- Swagger/OpenAPI documentation
- Admin activity timeline
- Advanced platform reporting
- Payment gateway integration (Razorpay)
- Subscription invoices
- Usage-based billing
- Notification center
- Customer support tickets
- Platform impersonation mode
- Advanced permission system for platform team
- AI-based routing and availability scoring
- Dark store and warehouse support
- Multi-city marketplace expansion
- Microservices support
- Queue-based background jobs (Bull/BullMQ)
- Redis caching
- Kubernetes deployment

---

## License

ISC

---

## Team

Developed for retail pharmacy ERP SaaS operations — powering the Pahuch Quick Commerce ecosystem.
