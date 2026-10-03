Workspace + Plans + Subscription Architecture Notes
Overall SaaS ERP Architecture
User
↓
Workspace
↓
Subscription
↓
Plan
↓
ERP Module Access
Main Module Structure
src/modules/
├── core/
│ ├── auth/
│ └── users/
│
├── organization/
│ └── workspaces/
│
└── subscription/
├── plans/
└── subscriptions/
API Root Structure
src/routes/index.js
/api/v1/core
/api/v1/organization
/api/v1/subscription
Workspace Module
Purpose

Workspace is the main SaaS tenant.

Every ERP customer owns:

1 Workspace

Examples:

Apollo Pharmacy
MediCare Clinic
HealthPlus Hospital

Everything belongs under workspace:

companies
branches
staff
products
sales
billing
inventory
subscription
Workspace Folder Structure
src/modules/organization/workspaces/
├── workspace.module.js
├── constants/
│ └── workspace.constant.js
├── controllers/
│ └── workspace.controller.js
├── models/
│ ├── workspace.model.js
│ └── workspaceMember.model.js
├── repositories/
│ └── workspace.repository.js
├── routes/
│ └── workspace.routes.js
├── services/
│ └── workspace.service.js
└── validations/
└── workspace.validation.js
Workspace Features
Workspace Creation
Owner creates workspace
Owner becomes primary workspace member
Workspace Members

Supports:

add member
remove member
suspend member
owner member
primary member
Workspace Settings

Supports:

timezone
currency
date format
time format
Workspace Middleware
workspaceContextMiddleware
src/middlewares/workspaceContext.middleware.js
Purpose

Validates:

workspace exists
workspace active
user belongs to workspace
member active

Adds:

req.workspace
req.workspaceId
req.workspaceMember
Plans Module
Purpose

Plans define:

pricing
features
allowed modules
billing cycle
Plans Folder Structure
src/modules/subscription/plans/
├── plan.module.js
├── constants/
│ └── plan.constant.js
├── controllers/
│ └── plan.controller.js
├── models/
│ └── plan.model.js
├── repositories/
│ └── plan.repository.js
├── routes/
│ └── plan.routes.js
├── services/
│ └── plan.service.js
└── validations/
└── plan.validation.js
Plan Types
STARTER
BUSINESS
ENTERPRISE
Plan Billing Cycles
MONTHLY
YEARLY
Plan Modules
INVENTORY
BILLING
POS
SALES
PURCHASE
FINANCE
REPORTS
CRM
HRM
GST
ECOMMERCE
Plan Features
companiesUnlimited
branchesUnlimited
customBranding
prioritySupport
Plan Model Stores
plan code
name
slug
type
price per user
billing cycle
modules
features
trial days
status
sort order
Subscription Module
Purpose

Subscription connects:

Workspace ↔ Plan

and controls:

access
billing
seats
expiry
renewal
upgrades
downgrades
Subscription Folder Structure
src/modules/subscription/subscriptions/
├── subscription.module.js
├── constants/
│ └── subscription.constant.js
├── controllers/
│ └── subscription.controller.js
├── models/
│ └── subscription.model.js
├── repositories/
│ └── subscription.repository.js
├── routes/
│ └── subscription.routes.js
├── services/
│ ├── subscription.service.js
│ ├── renewal.service.js
│ ├── upgrade.service.js
│ ├── downgrade.service.js
│ └── seat.service.js
└── validations/
└── subscription.validation.js
Subscription Utilities
src/utils/subscription/
├── generateSubscriptionCode.js
├── billingCycle.js
├── calculateSubscriptionExpiry.js
├── calculateSubscriptionAmount.js
├── isSubscriptionActive.js
└── checkSeatAvailability.js
Subscription Middleware
src/middlewares/subscriptionGuard.middleware.js
Subscription Features

Supports:

purchase subscription
renew subscription
upgrade subscription
downgrade subscription
change seats
cancel subscription
validate subscription
seat availability check
Subscription Status
TRIAL
ACTIVE
EXPIRED
CANCELLED
SUSPENDED
PENDING
Payment Status
PENDING
PAID
FAILED
REFUNDED
CANCELLED
Subscription Billing Cycles
MONTHLY
YEARLY
Subscription Model Stores
workspace
plan
plan snapshot
seat quantity
billing cycle
price per user
subtotal
tax
discount
total amount
status
payment status
expiry
renewal
cancellation
scheduled downgrade
settings
Seat Management

Supports:

seat quantity update
active seat sync
seat validation
seat limit checks
Plan Snapshot System

Subscription stores a copy of plan data:

plan name
plan code
features
modules
price
billing cycle

Reason:

future plan changes should not affect old subscriptions
Upgrade System

Upgrade applies immediately.

Example:

Starter → Business
Downgrade System

Downgrade applies at next billing cycle.

Example:

Business → Starter after expiry

Stored in:

nextPlanId
nextSeatQuantity
nextBillingCycle
downgradeScheduledAt
Active Subscription Validation
subscriptionGuardMiddleware

Checks:

workspace has subscription
subscription active
subscription not expired

Adds:

req.subscription
req.subscriptionId
req.subscriptionPlan
req.subscriptionModules
Current Completed SaaS Architecture
Auth
↓
Users
↓
Workspace
↓
Plans
↓
Subscriptions
↓
ERP Access
Future Modules

Next recommended modules:

companies
branches
roles
permissions
staff
customers
suppliers
products
inventory
billing
Future Subscription Enhancements

Add later:

Razorpay
Stripe
Invoices
Payments
Webhooks
Usage Tracking
Transactions
Cron Jobs
Future Optional Models

Not required currently:

subscriptionInvoice.model.js
subscriptionPayment.model.js
subscriptionUsage.model.js

Used for:

payment history
invoice history
usage analytics
billing reports
Production Notes
Transactions

Not required currently.

Add later during:

payment gateway integration
invoice generation
accounting workflows
Cron Jobs (Future)

Future folder:

src/jobs/

Jobs:

expire subscriptions
apply downgrades
send reminders
renew subscriptions
Current Architecture Status

Current system is already:

modular
scalable
multi-tenant
SaaS-ready
ERP-ready
production-structured
