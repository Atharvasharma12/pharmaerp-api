# Marketplace Module Architecture

## Objective

The Marketplace system transforms the Pharmacy ERP into a Quick Commerce platform by allowing ERP users to participate as fulfillment partners for customer orders placed through the Pahuch mobile application and website.

The system is split across two backend modules:

```txt
platform/      ← Pahuch internal management (admin-controlled)

marketplace/   ← ERP partner pharmacy operations (partner-controlled)
```

Unlike a traditional marketplace where customers directly purchase from pharmacies, Pahuch follows a **Managed Commerce Model**.

The customer always buys from **Pahuch**.

Pahuch decides which partner pharmacy or warehouse fulfills the order based on availability, delivery radius, inventory, and business rules.

---

# File & Folder Naming Convention

This project follows the same naming pattern used across all existing modules.

## Pattern

```txt
<submoduleName>.<layer>.js
```

## Naming Examples from Existing Modules

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
workspaceProduct.model.js
workspaceProduct.controller.js
workspaceProduct.service.js
workspaceProduct.repository.js
workspaceProduct.routes.js
workspaceProduct.validation.js
workspaceProduct.constant.js
workspaceProduct.module.js
```

```txt
platformPlan.controller.js
platformPlan.service.js
platformPlan.repository.js
platformPlan.routes.js
platformPlan.validation.js
platformPlan.constant.js
platformPlan.module.js
```

## Marketplace & Platform Naming Rule

```txt
Marketplace module files → marketplaceStore.model.js

Platform module files    → platformMarketplaceSettings.model.js
```

---

# Module Ownership

## Platform Module Owns

```txt
Marketplace Settings

Store Verification & Approval

Pricing Rules (Customer Price, Partner Settlement, Commission)

Availability Engine

Routing Engine

Customer Orders (Platform View)

Delivery Management

Partner Settlements

Refund Management

Coupons & Platform Offers

Marketplace Analytics & Reports
```

## Marketplace Module Owns

```txt
Marketplace Store Registration & Management

Marketplace Product Listings

Marketplace Inventory View

Fulfillment Orders (Accept, Pack, Dispatch)

Store Working Hours & Settings

Store Dashboard & Reports (Partner View)
```

---

# Marketplace Philosophy

Pahuch is **NOT** an open marketplace.

Customers never choose pharmacies.

Partner pharmacies never interact with customers.

All marketplace decisions are controlled by the platform.

Core Philosophy:

```txt
Customer
      │
      ▼
   Pahuch (Platform)
      │
      ▼
Availability Engine (Platform)
      │
      ▼
Routing Engine (Platform)
      │
      ▼
Partner Pharmacy (Marketplace)
      │
      ▼
Delivery (Platform)
```

---

# Core Marketplace Principles

## Principle 1

Customer belongs to Pahuch.

Never expose customer information to partner pharmacies unless required for fulfillment.

---

## Principle 2

Partner pharmacies never compete publicly.

Customers should never see:

- Pharmacy Name
- Pharmacy Rating
- Pharmacy Reviews
- Pharmacy Prices

The platform controls the customer experience.

---

## Principle 3

Marketplace reuses ERP data.

Do not duplicate:

- Products
- Inventory
- Companies
- Branches
- Finance
- Parties

Both Platform and Marketplace reference existing ERP modules.

---

## Principle 4

Inventory remains inside ERP.

Neither Platform nor Marketplace owns inventory.

Platform decides:

- Is this inventory sellable?
- Is this inventory reserved?
- Can this inventory fulfill the order?

Marketplace shows:

- What is my current sellable stock?
- What is my reserved stock?

---

## Principle 5

Pricing is platform controlled.

Partner pharmacies cannot set customer-facing selling prices.

Customer Price ≠ Partner Settlement Price

Example

```txt
MRP               ₹100

Customer Price    ₹95

Partner Price     ₹88

Margin            ₹7
```

---

## Principle 6

Customer Orders belong to Platform.

Fulfillment Orders belong to Marketplace.

```txt
Customer Order (Platform)
        ↓
Marketplace Fulfillment Order (Marketplace)
        ↓
Delivery (Platform)
        ↓
Accounting Documents (ERP)
```

---

## Principle 7

One Customer Order may generate multiple Fulfillment Orders.

```txt
Customer Order (Platform)

CO-0001

        │

        ├────────► FO-001 (Branch A) → Marketplace

        ├────────► FO-002 (Branch B) → Marketplace

        └────────► FO-003 (Warehouse) → Marketplace
```

---

## Principle 8

Platform and Marketplace must remain independent.

Platform integrates with Marketplace but should never tightly couple them.

---

# Module Structure

```txt
src/modules/

├── platform/
│   ├── platform.module.js
│   ├── platform.routes.js
│   │
│   ├── marketplace-settings/
│   ├── store-verification/
│   ├── pricing/
│   ├── commission/
│   ├── availability-engine/
│   ├── routing-engine/
│   ├── customer-orders/
│   ├── delivery/
│   ├── settlements/
│   ├── refunds/
│   ├── coupons/
│   └── marketplace-analytics/
│
└── marketplace/
    ├── marketplace.module.js
    ├── marketplace.routes.js
    │
    ├── stores/
    ├── products/
    ├── inventory/
    ├── fulfillment-orders/
    ├── pricing/
    └── dashboard/
```

---

# Full Processing Flow

```txt
Customer
      │
      ▼
Search Products (Platform)
      │
      ▼
Add To Cart (Platform)
      │
      ▼
Checkout (Platform)
      │
      ▼
Customer Order Created (Platform)
      │
      ▼
Availability Engine (Platform)
      │
      ▼
Routing Engine (Platform)
      │
      ▼
Marketplace Store Selected (Platform)
      │
      ▼
Inventory Reserved (Platform)
      │
      ▼
Fulfillment Order Sent to Partner (Marketplace)
      │
      ▼
Store Accepts Order (Marketplace)
      │
      ▼
Packing (Marketplace)
      │
      ▼
Ready for Pickup (Marketplace)
      │
      ▼
Pickup (Platform - Delivery)
      │
      ▼
Delivery (Platform - Delivery)
      │
      ▼
Proof of Delivery (Platform)
      │
      ▼
Settlement (Platform)
      │
      ▼
Order Completed
```

---

# Module Responsibility Matrix

| Module                     | Owner       | Responsibility                     |
| -------------------------- | ----------- | ---------------------------------- |
| marketplace-settings       | Platform    | Global platform configuration      |
| store-verification         | Platform    | Approve / reject partner stores    |
| pricing                    | Platform    | Customer price, margin, settlement |
| commission                 | Platform    | Commission % and settlement rules  |
| availability-engine        | Platform    | Who CAN fulfill                    |
| routing-engine             | Platform    | Who SHOULD fulfill                 |
| customer-orders            | Platform    | All orders, Pahuch view            |
| delivery                   | Platform    | Drivers, tracking, POD             |
| settlements                | Platform    | Partner payout management          |
| refunds                    | Platform    | Customer refund management         |
| coupons                    | Platform    | Platform-wide offers & coupons     |
| marketplace-analytics      | Platform    | Pahuch business intelligence       |
| stores                     | Marketplace | Partner store registration & ops   |
| products                   | Marketplace | Partner product listing control    |
| inventory                  | Marketplace | Partner sellable stock view        |
| fulfillment-orders         | Marketplace | Partner order acceptance & packing |
| pricing (view only)        | Marketplace | Partner settlement price view only |
| dashboard                  | Marketplace | Partner performance view           |

---

# Marketplace Store Module

## Module: `marketplace/stores`

## Objective

The Marketplace Store module allows ERP branch partners to register their branch as a Pahuch Marketplace Store.

A Marketplace Store is an extension of an existing ERP Branch.

Every Marketplace Store has a one-to-one relationship with a Branch.

```txt
Branch (ERP)
    │
    ▼
Marketplace Store (marketplace/stores)
```

---

# Store Lifecycle

```txt
Branch Created (ERP)
        ↓
Marketplace Store Registered (marketplace/stores)
        ↓
Verification Submitted (marketplace/stores)
        ↓
Platform Reviews (platform/store-verification)
        ↓
Store Approved (platform/store-verification)
        ↓
Store Goes Online (marketplace/stores)
        ↓
Receives Fulfillment Orders (marketplace/fulfillment-orders)
        ↓
Temporary Offline (marketplace/stores)
        ↓
Suspended (platform/store-verification)
        ↓
Closed
```

---

# Marketplace Store Model

```js
{
    workspaceId: ObjectId,

    companyId: ObjectId,

    branchId: ObjectId,

    storeCode: String,             // e.g. MPS-000001

    storeName: String,

    verificationStatus: String,    // Set by platform/store-verification

    marketplaceStatus: String,     // ONLINE | OFFLINE | BUSY | PAUSED

    onboardingStatus: String,      // NOT_STARTED | IN_PROGRESS | COMPLETED

    deliveryRadius: Number,        // in KM

    minimumOrderAmount: Number,

    maximumOrderAmount: Number,

    estimatedPreparationTime: Number,  // in minutes

    acceptsScheduledOrders: Boolean,

    autoAcceptOrders: Boolean,

    autoRejectTimeout: Number,         // in seconds

    isOnline: Boolean,

    status: String,                    // ACTIVE | INACTIVE | SUSPENDED | CLOSED

    approvedAt: Date,

    approvedBy: ObjectId,              // Platform admin

    rejectedReason: String,

    createdBy: ObjectId
}
```

---

# Store Status Constants

```txt
ACTIVE

INACTIVE

SUSPENDED

CLOSED
```

---

# Marketplace Status Constants

```txt
ONLINE

OFFLINE

BUSY

PAUSED
```

---

# Verification Status Constants

Set exclusively by `platform/store-verification`.

```txt
PENDING

UNDER_REVIEW

APPROVED

REJECTED
```

---

# Onboarding Status Constants

```txt
NOT_STARTED

IN_PROGRESS

COMPLETED
```

---

# Folder & File Structure

```txt
src/modules/marketplace/stores/
│
├── models/
│   └── marketplaceStore.model.js
│
├── controllers/
│   └── marketplaceStore.controller.js
│
├── services/
│   └── marketplaceStore.service.js
│
├── repositories/
│   └── marketplaceStore.repository.js
│
├── routes/
│   └── marketplaceStore.routes.js
│
├── validations/
│   └── marketplaceStore.validation.js
│
├── constants/
│   └── marketplaceStore.constant.js
│
└── marketplaceStore.module.js
```

---

# Store APIs

## CRUD (marketplace/stores)

```http
GET    /api/v1/marketplace/stores

POST   /api/v1/marketplace/stores

GET    /api/v1/marketplace/stores/:id

PATCH  /api/v1/marketplace/stores/:id

DELETE /api/v1/marketplace/stores/:id
```

## Store Operations (marketplace/stores)

```http
PATCH /api/v1/marketplace/stores/:id/go-online

PATCH /api/v1/marketplace/stores/:id/go-offline

PATCH /api/v1/marketplace/stores/:id/pause

PATCH /api/v1/marketplace/stores/:id/resume
```

## Verification APIs (platform/store-verification)

```http
PATCH /api/v1/platform/stores/:id/approve

PATCH /api/v1/platform/stores/:id/reject

PATCH /api/v1/platform/stores/:id/suspend
```

## Store Dashboard APIs (marketplace/dashboard)

```http
GET /api/v1/marketplace/stores/:id/dashboard

GET /api/v1/marketplace/stores/:id/fulfillment-orders

GET /api/v1/marketplace/stores/:id/products
```

## Platform Store Management (platform)

```http
GET /api/v1/platform/stores

GET /api/v1/platform/stores/:id

GET /api/v1/platform/stores/pending-verification
```

---

# Store Verification Module

## Module: `platform/store-verification`

## Objective

Pahuch reviews and approves store registration requests before stores can receive orders.

Documents verified:

```txt
Drug License

GST

PAN

Branch Address

Authorized Person

Bank Details
```

---

# Store Verification Model

```js
{
    workspaceId: ObjectId,

    companyId: ObjectId,

    branchId: ObjectId,

    marketplaceStoreId: ObjectId,

    drugLicenseNumber: String,

    drugLicenseDocument: String,     // file URL

    gstNumber: String,

    gstDocument: String,

    panNumber: String,

    panDocument: String,

    bankAccountNumber: String,

    bankIfscCode: String,

    bankAccountName: String,

    verificationStatus: String,      // PENDING | UNDER_REVIEW | APPROVED | REJECTED

    reviewedBy: ObjectId,            // Platform admin

    reviewedAt: Date,

    rejectionReason: String,

    createdBy: ObjectId
}
```

---

# Folder & File Structure

```txt
src/modules/platform/store-verification/
│
├── models/
│   └── platformStoreVerification.model.js
│
├── controllers/
│   └── platformStoreVerification.controller.js
│
├── services/
│   └── platformStoreVerification.service.js
│
├── repositories/
│   └── platformStoreVerification.repository.js
│
├── routes/
│   └── platformStoreVerification.routes.js
│
├── validations/
│   └── platformStoreVerification.validation.js
│
├── constants/
│   └── platformStoreVerification.constant.js
│
└── platformStoreVerification.module.js
```

---

# Marketplace Settings Module

## Module: `platform/marketplace-settings`

## Objective

Configures global Marketplace settings for the entire platform.

Controlled exclusively by the Pahuch admin team.

---

# Marketplace Settings Model

```js
{
    isMarketplaceEnabled: Boolean,

    defaultDeliveryRadius: Number,       // in KM

    defaultPreparationTime: Number,      // in minutes

    defaultCommissionPercent: Number,

    safetyStockBuffer: Number,

    nearExpiryDaysThreshold: Number,

    autoRejectTimeoutSeconds: Number,

    minimumOrderAmount: Number,

    freeDeliveryThreshold: Number,

    defaultDeliveryCharge: Number,

    cancellationWindowMinutes: Number,

    returnWindowDays: Number,

    updatedBy: ObjectId
}
```

---

# Folder & File Structure

```txt
src/modules/platform/marketplace-settings/
│
├── models/
│   └── platformMarketplaceSettings.model.js
│
├── controllers/
│   └── platformMarketplaceSettings.controller.js
│
├── services/
│   └── platformMarketplaceSettings.service.js
│
├── repositories/
│   └── platformMarketplaceSettings.repository.js
│
├── routes/
│   └── platformMarketplaceSettings.routes.js
│
├── validations/
│   └── platformMarketplaceSettings.validation.js
│
├── constants/
│   └── platformMarketplaceSettings.constant.js
│
└── platformMarketplaceSettings.module.js
```

---

# Marketplace Products Module

## Module: `marketplace/products`

## Objective

The Marketplace Products module allows ERP branch partners to control which of their ERP products are available for sale on the Pahuch Marketplace.

Marketplace Products always reference existing ERP Products.

The Marketplace never owns product master data.

---

# Product Philosophy

The ERP Product Catalog remains the single source of truth.

Marketplace Products simply decide:

- Can this product be sold online?
- Is this product visible?
- Is this product currently available?

Marketplace never duplicates:

- Product Name
- Composition
- Manufacturer
- HSN
- Product Type
- Drug Schedule
- Images

Those remain inside the Product Catalog (ERP).

---

# Marketplace Product Model

```js
{
    workspaceId: ObjectId,

    companyId: ObjectId,

    branchId: ObjectId,

    marketplaceStoreId: ObjectId,

    workspaceProductId: ObjectId,      // References ERP Product

    isMarketplaceEnabled: Boolean,

    isVisible: Boolean,

    isFeatured: Boolean,

    requiresPrescription: Boolean,

    allowsSubstitution: Boolean,

    priority: Number,

    displayOrder: Number,

    marketplaceStatus: String,         // ACTIVE | INACTIVE | DISCONTINUED | BLOCKED

    status: String,

    createdBy: ObjectId
}
```

---

# Product Status Constants

```txt
ACTIVE

INACTIVE

DISCONTINUED

BLOCKED
```

---

# Product Availability Rule

Product is eligible for ordering only when:

```txt
Marketplace Enabled = true

AND Store Online = true

AND Inventory > 0

AND Product Status = ACTIVE

AND Product Visible = true
```

---

# Folder & File Structure

```txt
src/modules/marketplace/products/
│
├── models/
│   └── marketplaceProduct.model.js
│
├── controllers/
│   └── marketplaceProduct.controller.js
│
├── services/
│   └── marketplaceProduct.service.js
│
├── repositories/
│   └── marketplaceProduct.repository.js
│
├── routes/
│   └── marketplaceProduct.routes.js
│
├── validations/
│   └── marketplaceProduct.validation.js
│
├── constants/
│   └── marketplaceProduct.constant.js
│
└── marketplaceProduct.module.js
```

---

# Product APIs

## CRUD (marketplace/products)

```http
GET    /api/v1/marketplace/products

POST   /api/v1/marketplace/products

GET    /api/v1/marketplace/products/:id

PATCH  /api/v1/marketplace/products/:id

DELETE /api/v1/marketplace/products/:id
```

## Product Operations (marketplace/products)

```http
PATCH /api/v1/marketplace/products/:id/enable

PATCH /api/v1/marketplace/products/:id/disable

PATCH /api/v1/marketplace/products/:id/show

PATCH /api/v1/marketplace/products/:id/hide

PATCH /api/v1/marketplace/products/:id/feature

PATCH /api/v1/marketplace/products/:id/unfeature
```

## Platform Product Block (platform)

```http
PATCH /api/v1/platform/products/:id/block

PATCH /api/v1/platform/products/:id/unblock
```

---

# Marketplace Pricing Module

## Module: `platform/pricing` (write) + `marketplace/pricing` (read-only)

## Objective

The Marketplace Pricing module is owned by the Platform.

Partner pharmacies never control customer-facing prices.

Partners can only view their settlement price through `marketplace/pricing`.

---

# Pricing Model

```js
{
    workspaceId: ObjectId,

    companyId: ObjectId,

    branchId: ObjectId,

    marketplaceStoreId: ObjectId,

    marketplaceProductId: ObjectId,

    mrp: Number,

    sellingPrice: Number,              // Set by platform — shown to customer

    partnerSettlementPrice: Number,    // Set by platform — paid to partner

    platformMargin: Number,            // Set by platform — Pahuch earnings

    deliveryCharge: Number,            // Set by platform

    offerDiscount: Number,             // Set by platform

    couponDiscount: Number,            // Set by platform

    taxAmount: Number,

    finalPrice: Number,

    pricingStatus: String,             // ACTIVE | INACTIVE | EXPIRED | SCHEDULED

    effectiveFrom: Date,

    effectiveTo: Date,

    createdBy: ObjectId                // Platform admin only
}
```

---

# Pricing Constants

```txt
ACTIVE

INACTIVE

EXPIRED

SCHEDULED
```

---

# Pricing Flow

```txt
MRP
        ↓
Marketplace Selling Price (Platform sets)
        ↓
Apply Offer (Platform)
        ↓
Apply Coupon (Platform)
        ↓
Apply Delivery Charges (Platform)
        ↓
Apply Taxes (ERP HSN)
        ↓
Final Checkout Amount
```

---

# Folder & File Structure

## Platform (write)

```txt
src/modules/platform/pricing/
│
├── models/
│   └── platformMarketplacePricing.model.js
│
├── controllers/
│   └── platformMarketplacePricing.controller.js
│
├── services/
│   └── platformMarketplacePricing.service.js
│
├── repositories/
│   └── platformMarketplacePricing.repository.js
│
├── routes/
│   └── platformMarketplacePricing.routes.js
│
├── validations/
│   └── platformMarketplacePricing.validation.js
│
├── constants/
│   └── platformMarketplacePricing.constant.js
│
└── platformMarketplacePricing.module.js
```

## Marketplace (read-only view for partners)

```txt
src/modules/marketplace/pricing/
│
├── controllers/
│   └── marketplacePricing.controller.js
│
├── services/
│   └── marketplacePricing.service.js
│
├── routes/
│   └── marketplacePricing.routes.js
│
└── marketplacePricing.module.js
```

Note: No model in marketplace/pricing. Partners read from platform pricing model.

---

# Pricing APIs

## Platform Pricing Management

```http
GET    /api/v1/platform/pricing

POST   /api/v1/platform/pricing

GET    /api/v1/platform/pricing/:id

PATCH  /api/v1/platform/pricing/:id

DELETE /api/v1/platform/pricing/:id

PATCH  /api/v1/platform/pricing/:id/activate

PATCH  /api/v1/platform/pricing/:id/deactivate

POST   /api/v1/platform/pricing/bulk-update
```

## Partner Pricing View

```http
GET /api/v1/marketplace/pricing

GET /api/v1/marketplace/pricing/:productId
```

---

# Marketplace Inventory Module

## Module: `marketplace/inventory`

## Objective

Gives ERP partner pharmacies a read-only view of their real-time sellable inventory.

The ERP Inventory module remains the single source of truth.

Platform engines (Availability Engine, Routing Engine) consume ERP inventory data directly.

Marketplace Inventory module serves as a read-only view for partner pharmacies.

---

# Inventory Model

```js
{
    workspaceId: ObjectId,

    companyId: ObjectId,

    branchId: ObjectId,

    marketplaceStoreId: ObjectId,

    marketplaceProductId: ObjectId,

    inventoryId: ObjectId,             // References ERP Inventory

    batchId: ObjectId,                 // References ERP Batch

    totalQuantity: Number,

    reservedQuantity: Number,          // Reserved by platform engines

    availableQuantity: Number,

    damagedQuantity: Number,

    blockedQuantity: Number,

    expiredQuantity: Number,

    sellableQuantity: Number,          // = available - safety stock

    inventoryStatus: String,           // IN_STOCK | LOW_STOCK | OUT_OF_STOCK | BLOCKED | EXPIRED

    lastSyncedAt: Date
}
```

---

# Inventory Status Constants

```txt
IN_STOCK

LOW_STOCK

OUT_OF_STOCK

BLOCKED

EXPIRED
```

---

# Inventory Calculation

```txt
Available Quantity = Total - Reserved - Blocked - Damaged - Expired

Sellable Quantity  = Available - Safety Stock
```

Safety stock buffer is configured in `platform/marketplace-settings`.

---

# Inventory Reservation

Reservation is managed exclusively by the Platform.

Partners see reserved quantity as read-only.

```txt
Customer Checkout (Platform)
        ↓
Reserve Inventory (Platform - Availability Engine)
        ↓
Store Accepts (Marketplace - Fulfillment Orders)
        ↓
Reduce Actual Inventory (ERP)
```

Reservation Status:

```txt
RESERVED

RELEASED

CONSUMED

EXPIRED
```

---

# Folder & File Structure

```txt
src/modules/marketplace/inventory/
│
├── models/
│   └── marketplaceInventory.model.js
│
├── controllers/
│   └── marketplaceInventory.controller.js
│
├── services/
│   └── marketplaceInventory.service.js
│
├── repositories/
│   └── marketplaceInventory.repository.js
│
├── routes/
│   └── marketplaceInventory.routes.js
│
├── constants/
│   └── marketplaceInventory.constant.js
│
└── marketplaceInventory.module.js
```

---

# Inventory APIs

## Partner Inventory View (read-only)

```http
GET /api/v1/marketplace/inventory

GET /api/v1/marketplace/inventory/:id
```

## Platform Reservation APIs

```http
POST /api/v1/platform/inventory/reserve

POST /api/v1/platform/inventory/release

POST /api/v1/platform/inventory/consume
```

## Platform Synchronization

```http
POST /api/v1/platform/inventory/sync

POST /api/v1/platform/inventory/recalculate
```

---

# Availability Engine Module

## Module: `platform/availability-engine`

## Objective

The Availability Engine is fully owned and controlled by the Platform.

Partner pharmacies have no access to this module.

It determines whether a customer's order can be fulfilled and identifies all eligible Marketplace Stores.

---

# Availability Engine Responsibilities

```txt
Inventory Validation

Store Validation

Delivery Radius Validation

Working Hours Validation

Product Availability

Batch Validation

Sellable Quantity

Capacity Validation

Estimated Delivery Time

Candidate Store Generation
```

Not responsible for:

```txt
Order Assignment  → Routing Engine

Inventory Deduction → ERP

Settlement → platform/settlements

Delivery → platform/delivery

Fulfillment → marketplace/fulfillment-orders
```

---

# Availability Engine Position

```txt
Customer Checkout (Platform)
        ↓
Availability Engine (Platform)
        ↓
Eligible Stores List
        ↓
Routing Engine (Platform)
        ↓
Selected Store
        ↓
Inventory Reservation (Platform)
        ↓
Fulfillment Order → Partner (Marketplace)
```

---

# Availability Inputs

```js
{
    customerLocation,
    deliveryAddress,
    cartItems,
    deliveryType,
    requestedDeliveryTime
}
```

---

# Availability Output

```js
{
    success: true,

    candidateStores: [
        {
            storeId,
            branchId,
            score,
            estimatedDeliveryTime,
            availableProducts
        }
    ]
}
```

---

# Validation Pipeline

```txt
Store Active → Store Online → Working Hours → Delivery Radius
→ Marketplace Product → Inventory → Batch → Expiry
→ Reservation → Capacity → Success
```

If any validation fails → Store removed from candidates.

---

# Availability Score

```txt
Inventory          40%

Distance           20%

Preparation Time   20%

Capacity           10%

Reliability        10%
```

---

# Estimated Delivery Time

```txt
Preparation Time + Pickup Time + Travel Time = Estimated Delivery
```

---

# Performance Requirement

```txt
< 300 ms response time
```

---

# Folder & File Structure

```txt
src/modules/platform/availability-engine/
│
├── controllers/
│   └── platformAvailabilityEngine.controller.js
│
├── services/
│   └── platformAvailabilityEngine.service.js
│
├── repositories/
│   └── platformAvailabilityEngine.repository.js
│
├── routes/
│   └── platformAvailabilityEngine.routes.js
│
├── constants/
│   └── platformAvailabilityEngine.constant.js
│
└── platformAvailabilityEngine.module.js
```

Note: No model. Availability Engine is a computational service that reads from other module models.

---

# Availability Engine APIs

## Internal APIs

```http
POST /internal/platform/availability/check

POST /internal/platform/availability/cart

POST /internal/platform/availability/store
```

## Admin APIs

```http
GET /api/v1/platform/availability/logs

GET /api/v1/platform/availability/statistics
```

---

# Routing Engine Module

## Module: `platform/routing-engine`

## Objective

The Routing Engine selects the single best fulfillment store from the candidate list provided by the Availability Engine.

Fully owned and controlled by the Platform.

---

# Routing Factors

```txt
Distance

Inventory Level

Preparation Time

Store Load

Estimated Delivery Time

Store Rating / Reliability Score
```

---

# Folder & File Structure

```txt
src/modules/platform/routing-engine/
│
├── controllers/
│   └── platformRoutingEngine.controller.js
│
├── services/
│   └── platformRoutingEngine.service.js
│
├── routes/
│   └── platformRoutingEngine.routes.js
│
├── constants/
│   └── platformRoutingEngine.constant.js
│
└── platformRoutingEngine.module.js
```

Note: No model and no repository. Routing Engine is a pure decision service.

---

# Customer Orders Module

## Module: `platform/customer-orders`

## Objective

Pahuch stores and manages all customer orders.

Partners receive only a fulfillment task — they never see the full customer order.

---

# Customer Order Model

```js
{
    orderNumber: String,           // e.g. CO-000001

    customerId: ObjectId,          // Pahuch customer

    customerLocation: {
        coordinates: [Number]
    },

    deliveryAddress: {
        addressLine: String,
        city: String,
        pincode: String,
        coordinates: [Number]
    },

    items: [
        {
            workspaceProductId: ObjectId,
            quantity: Number,
            mrp: Number,
            sellingPrice: Number
        }
    ],

    subtotal: Number,

    discountAmount: Number,

    deliveryCharge: Number,

    taxAmount: Number,

    totalAmount: Number,

    paymentStatus: String,         // PENDING | PAID | FAILED | REFUNDED

    paymentMethod: String,

    orderStatus: String,           // PLACED | PROCESSING | FULFILLED | DELIVERED | CANCELLED

    couponCode: String,

    couponDiscount: Number,

    selectedStoreId: ObjectId,     // Set by Routing Engine

    createdAt: Date
}
```

---

# Order Status Constants

```txt
PLACED

PROCESSING

FULFILLED

OUT_FOR_DELIVERY

DELIVERED

CANCELLED

REFUNDED
```

---

# Folder & File Structure

```txt
src/modules/platform/customer-orders/
│
├── models/
│   └── platformCustomerOrder.model.js
│
├── controllers/
│   └── platformCustomerOrder.controller.js
│
├── services/
│   └── platformCustomerOrder.service.js
│
├── repositories/
│   └── platformCustomerOrder.repository.js
│
├── routes/
│   └── platformCustomerOrder.routes.js
│
├── validations/
│   └── platformCustomerOrder.validation.js
│
├── constants/
│   └── platformCustomerOrder.constant.js
│
└── platformCustomerOrder.module.js
```

---

# Fulfillment Orders Module

## Module: `marketplace/fulfillment-orders`

## Objective

Pahuch splits customer orders and sends fulfillment tasks to partner pharmacies.

Partners accept, pack, and dispatch through this module.

Partners see only:

- Their fulfillment task
- Product names and quantities
- Delivery details (no customer personal info beyond delivery address)

---

# Fulfillment Order Model

```js
{
    fulfillmentOrderNumber: String,   // e.g. FO-000001

    customerOrderId: ObjectId,        // References platform/customer-orders

    workspaceId: ObjectId,

    companyId: ObjectId,

    branchId: ObjectId,

    marketplaceStoreId: ObjectId,

    items: [
        {
            workspaceProductId: ObjectId,
            marketplaceProductId: ObjectId,
            batchId: ObjectId,
            quantity: Number,
            settlementPrice: Number
        }
    ],

    settlementAmount: Number,

    fulfillmentStatus: String,        // PENDING | ACCEPTED | PACKING | READY_FOR_PICKUP | DISPATCHED | CANCELLED

    acceptedAt: Date,

    packedAt: Date,

    readyAt: Date,

    dispatchedAt: Date,

    autoRejectAt: Date,

    rejectionReason: String,

    createdAt: Date
}
```

---

# Fulfillment Status Constants

```txt
PENDING

ACCEPTED

PACKING

READY_FOR_PICKUP

DISPATCHED

CANCELLED
```

---

# Folder & File Structure

```txt
src/modules/marketplace/fulfillment-orders/
│
├── models/
│   └── marketplaceFulfillmentOrder.model.js
│
├── controllers/
│   └── marketplaceFulfillmentOrder.controller.js
│
├── services/
│   └── marketplaceFulfillmentOrder.service.js
│
├── repositories/
│   └── marketplaceFulfillmentOrder.repository.js
│
├── routes/
│   └── marketplaceFulfillmentOrder.routes.js
│
├── validations/
│   └── marketplaceFulfillmentOrder.validation.js
│
├── constants/
│   └── marketplaceFulfillmentOrder.constant.js
│
└── marketplaceFulfillmentOrder.module.js
```

---

# Fulfillment Order APIs

## Partner APIs (marketplace/fulfillment-orders)

```http
GET    /api/v1/marketplace/fulfillment-orders

GET    /api/v1/marketplace/fulfillment-orders/:id

PATCH  /api/v1/marketplace/fulfillment-orders/:id/accept

PATCH  /api/v1/marketplace/fulfillment-orders/:id/reject

PATCH  /api/v1/marketplace/fulfillment-orders/:id/start-packing

PATCH  /api/v1/marketplace/fulfillment-orders/:id/ready-for-pickup

PATCH  /api/v1/marketplace/fulfillment-orders/:id/dispatch
```

## Platform APIs (platform/customer-orders)

```http
GET /api/v1/platform/fulfillment-orders

GET /api/v1/platform/fulfillment-orders/:id
```

---

# Delivery Module

## Module: `platform/delivery`

## Objective

Pahuch manages all delivery operations.

Partners only mark orders as Ready for Pickup.

---

# Delivery Model

```js
{
    fulfillmentOrderId: ObjectId,

    customerOrderId: ObjectId,

    driverName: String,

    driverPhone: String,

    vehicleNumber: String,

    deliveryPartner: String,          // SELF | THIRD_PARTY

    deliveryStatus: String,           // ASSIGNED | PICKED_UP | ON_THE_WAY | DELIVERED | FAILED

    pickupTime: Date,

    estimatedDeliveryTime: Date,

    actualDeliveryTime: Date,

    proofOfDelivery: {
        otpVerified: Boolean,
        photo: String,
        signature: String,
        gpsCoordinates: [Number],
        deliveredAt: Date
    },

    failureReason: String,

    createdAt: Date
}
```

---

# Delivery Status Constants

```txt
ASSIGNED

PICKED_UP

ON_THE_WAY

DELIVERED

FAILED
```

---

# Folder & File Structure

```txt
src/modules/platform/delivery/
│
├── models/
│   └── platformDelivery.model.js
│
├── controllers/
│   └── platformDelivery.controller.js
│
├── services/
│   └── platformDelivery.service.js
│
├── repositories/
│   └── platformDelivery.repository.js
│
├── routes/
│   └── platformDelivery.routes.js
│
├── validations/
│   └── platformDelivery.validation.js
│
├── constants/
│   └── platformDelivery.constant.js
│
└── platformDelivery.module.js
```

---

# Settlements Module

## Module: `platform/settlements`

## Objective

Pahuch calculates and pays out settlement amounts to partner pharmacies.

---

# Settlement Model

```js
{
    settlementNumber: String,      // e.g. SET-000001

    workspaceId: ObjectId,

    companyId: ObjectId,

    branchId: ObjectId,

    marketplaceStoreId: ObjectId,

    settlementPeriodFrom: Date,

    settlementPeriodTo: Date,

    totalOrders: Number,

    totalSalesAmount: Number,

    totalCommission: Number,

    totalDeliveryCharge: Number,

    totalRefunds: Number,

    netSettlementAmount: Number,

    settlementStatus: String,      // PENDING | PROCESSED | PAID | FAILED

    paidAt: Date,

    paymentReference: String,

    createdBy: ObjectId
}
```

---

# Settlement Status Constants

```txt
PENDING

PROCESSED

PAID

FAILED
```

---

# Folder & File Structure

```txt
src/modules/platform/settlements/
│
├── models/
│   └── platformSettlement.model.js
│
├── controllers/
│   └── platformSettlement.controller.js
│
├── services/
│   └── platformSettlement.service.js
│
├── repositories/
│   └── platformSettlement.repository.js
│
├── routes/
│   └── platformSettlement.routes.js
│
├── validations/
│   └── platformSettlement.validation.js
│
├── constants/
│   └── platformSettlement.constant.js
│
└── platformSettlement.module.js
```

---

# Commission Module

## Module: `platform/commission`

## Objective

Pahuch maintains commission rules and rates applied during settlement.

---

# Commission Model

```js
{
    workspaceId: ObjectId,           // null if global rule

    companyId: ObjectId,             // null if global rule

    marketplaceStoreId: ObjectId,    // null if global rule

    commissionType: String,          // PERCENTAGE | FLAT

    commissionValue: Number,

    appliesTo: String,               // ALL | CATEGORY | PRODUCT

    categoryId: ObjectId,            // if appliesTo = CATEGORY

    productId: ObjectId,             // if appliesTo = PRODUCT

    effectiveFrom: Date,

    effectiveTo: Date,

    status: String,                  // ACTIVE | INACTIVE

    createdBy: ObjectId
}
```

---

# Folder & File Structure

```txt
src/modules/platform/commission/
│
├── models/
│   └── platformCommission.model.js
│
├── controllers/
│   └── platformCommission.controller.js
│
├── services/
│   └── platformCommission.service.js
│
├── repositories/
│   └── platformCommission.repository.js
│
├── routes/
│   └── platformCommission.routes.js
│
├── validations/
│   └── platformCommission.validation.js
│
├── constants/
│   └── platformCommission.constant.js
│
└── platformCommission.module.js
```

---

# Refunds Module

## Module: `platform/refunds`

## Objective

Pahuch manages customer refunds for cancelled, returned, or failed orders.

---

# Refund Model

```js
{
    refundNumber: String,          // e.g. REF-000001

    customerOrderId: ObjectId,

    fulfillmentOrderId: ObjectId,

    customerId: ObjectId,

    refundReason: String,

    refundType: String,            // FULL | PARTIAL

    refundAmount: Number,

    refundStatus: String,          // INITIATED | PROCESSING | COMPLETED | FAILED

    refundMethod: String,          // ORIGINAL_PAYMENT | WALLET | BANK

    settlementAdjustment: Boolean,

    adjustedSettlementId: ObjectId,

    processedAt: Date,

    createdBy: ObjectId
}
```

---

# Refund Status Constants

```txt
INITIATED

PROCESSING

COMPLETED

FAILED
```

---

# Folder & File Structure

```txt
src/modules/platform/refunds/
│
├── models/
│   └── platformRefund.model.js
│
├── controllers/
│   └── platformRefund.controller.js
│
├── services/
│   └── platformRefund.service.js
│
├── repositories/
│   └── platformRefund.repository.js
│
├── routes/
│   └── platformRefund.routes.js
│
├── validations/
│   └── platformRefund.validation.js
│
├── constants/
│   └── platformRefund.constant.js
│
└── platformRefund.module.js
```

---

# Marketplace Analytics Module

## Module: `platform/marketplace-analytics`

## Objective

Pahuch-side business intelligence. No partner access.

Provides:

```txt
Store Performance

Product Performance

Revenue Trends

Settlement Summary

Order Analytics

Cancellation Report

Delivery Analytics

Commission Report

Inventory Health
```

---

# Folder & File Structure

```txt
src/modules/platform/marketplace-analytics/
│
├── controllers/
│   └── platformMarketplaceAnalytics.controller.js
│
├── services/
│   └── platformMarketplaceAnalytics.service.js
│
├── repositories/
│   └── platformMarketplaceAnalytics.repository.js
│
├── routes/
│   └── platformMarketplaceAnalytics.routes.js
│
├── constants/
│   └── platformMarketplaceAnalytics.constant.js
│
└── platformMarketplaceAnalytics.module.js
```

Note: No model. Analytics reads from all other module models.

---

# Store Dashboard Module

## Module: `marketplace/dashboard`

## Objective

Gives each partner pharmacy a view of their own store performance.

Partners see only their own data.

```txt
Today's Orders

Pending Orders

Packed Orders

Delivered Orders

Cancelled Orders

Revenue

Preparation Time

Acceptance Rate

Inventory Alerts
```

---

# Folder & File Structure

```txt
src/modules/marketplace/dashboard/
│
├── controllers/
│   └── marketplaceDashboard.controller.js
│
├── services/
│   └── marketplaceDashboard.service.js
│
├── routes/
│   └── marketplaceDashboard.routes.js
│
├── constants/
│   └── marketplaceDashboard.constant.js
│
└── marketplaceDashboard.module.js
```

Note: No model and no repository. Dashboard reads from stores, products, inventory, and fulfillment-orders models.

---

# Complete File Structure Summary

```txt
src/modules/

├── platform/
│   ├── platform.module.js
│   ├── platform.routes.js
│   │
│   ├── marketplace-settings/
│   │   ├── models/
│   │   │   └── platformMarketplaceSettings.model.js
│   │   ├── controllers/
│   │   │   └── platformMarketplaceSettings.controller.js
│   │   ├── services/
│   │   │   └── platformMarketplaceSettings.service.js
│   │   ├── repositories/
│   │   │   └── platformMarketplaceSettings.repository.js
│   │   ├── routes/
│   │   │   └── platformMarketplaceSettings.routes.js
│   │   ├── validations/
│   │   │   └── platformMarketplaceSettings.validation.js
│   │   ├── constants/
│   │   │   └── platformMarketplaceSettings.constant.js
│   │   └── platformMarketplaceSettings.module.js
│   │
│   ├── store-verification/
│   │   ├── models/
│   │   │   └── platformStoreVerification.model.js
│   │   ├── controllers/
│   │   │   └── platformStoreVerification.controller.js
│   │   ├── services/
│   │   │   └── platformStoreVerification.service.js
│   │   ├── repositories/
│   │   │   └── platformStoreVerification.repository.js
│   │   ├── routes/
│   │   │   └── platformStoreVerification.routes.js
│   │   ├── validations/
│   │   │   └── platformStoreVerification.validation.js
│   │   ├── constants/
│   │   │   └── platformStoreVerification.constant.js
│   │   └── platformStoreVerification.module.js
│   │
│   ├── pricing/
│   │   ├── models/
│   │   │   └── platformMarketplacePricing.model.js
│   │   ├── controllers/
│   │   │   └── platformMarketplacePricing.controller.js
│   │   ├── services/
│   │   │   └── platformMarketplacePricing.service.js
│   │   ├── repositories/
│   │   │   └── platformMarketplacePricing.repository.js
│   │   ├── routes/
│   │   │   └── platformMarketplacePricing.routes.js
│   │   ├── validations/
│   │   │   └── platformMarketplacePricing.validation.js
│   │   ├── constants/
│   │   │   └── platformMarketplacePricing.constant.js
│   │   └── platformMarketplacePricing.module.js
│   │
│   ├── commission/
│   │   ├── models/
│   │   │   └── platformCommission.model.js
│   │   ├── controllers/
│   │   │   └── platformCommission.controller.js
│   │   ├── services/
│   │   │   └── platformCommission.service.js
│   │   ├── repositories/
│   │   │   └── platformCommission.repository.js
│   │   ├── routes/
│   │   │   └── platformCommission.routes.js
│   │   ├── validations/
│   │   │   └── platformCommission.validation.js
│   │   ├── constants/
│   │   │   └── platformCommission.constant.js
│   │   └── platformCommission.module.js
│   │
│   ├── availability-engine/
│   │   ├── controllers/
│   │   │   └── platformAvailabilityEngine.controller.js
│   │   ├── services/
│   │   │   └── platformAvailabilityEngine.service.js
│   │   ├── repositories/
│   │   │   └── platformAvailabilityEngine.repository.js
│   │   ├── routes/
│   │   │   └── platformAvailabilityEngine.routes.js
│   │   ├── constants/
│   │   │   └── platformAvailabilityEngine.constant.js
│   │   └── platformAvailabilityEngine.module.js
│   │
│   ├── routing-engine/
│   │   ├── controllers/
│   │   │   └── platformRoutingEngine.controller.js
│   │   ├── services/
│   │   │   └── platformRoutingEngine.service.js
│   │   ├── routes/
│   │   │   └── platformRoutingEngine.routes.js
│   │   ├── constants/
│   │   │   └── platformRoutingEngine.constant.js
│   │   └── platformRoutingEngine.module.js
│   │
│   ├── customer-orders/
│   │   ├── models/
│   │   │   └── platformCustomerOrder.model.js
│   │   ├── controllers/
│   │   │   └── platformCustomerOrder.controller.js
│   │   ├── services/
│   │   │   └── platformCustomerOrder.service.js
│   │   ├── repositories/
│   │   │   └── platformCustomerOrder.repository.js
│   │   ├── routes/
│   │   │   └── platformCustomerOrder.routes.js
│   │   ├── validations/
│   │   │   └── platformCustomerOrder.validation.js
│   │   ├── constants/
│   │   │   └── platformCustomerOrder.constant.js
│   │   └── platformCustomerOrder.module.js
│   │
│   ├── delivery/
│   │   ├── models/
│   │   │   └── platformDelivery.model.js
│   │   ├── controllers/
│   │   │   └── platformDelivery.controller.js
│   │   ├── services/
│   │   │   └── platformDelivery.service.js
│   │   ├── repositories/
│   │   │   └── platformDelivery.repository.js
│   │   ├── routes/
│   │   │   └── platformDelivery.routes.js
│   │   ├── validations/
│   │   │   └── platformDelivery.validation.js
│   │   ├── constants/
│   │   │   └── platformDelivery.constant.js
│   │   └── platformDelivery.module.js
│   │
│   ├── settlements/
│   │   ├── models/
│   │   │   └── platformSettlement.model.js
│   │   ├── controllers/
│   │   │   └── platformSettlement.controller.js
│   │   ├── services/
│   │   │   └── platformSettlement.service.js
│   │   ├── repositories/
│   │   │   └── platformSettlement.repository.js
│   │   ├── routes/
│   │   │   └── platformSettlement.routes.js
│   │   ├── validations/
│   │   │   └── platformSettlement.validation.js
│   │   ├── constants/
│   │   │   └── platformSettlement.constant.js
│   │   └── platformSettlement.module.js
│   │
│   ├── refunds/
│   │   ├── models/
│   │   │   └── platformRefund.model.js
│   │   ├── controllers/
│   │   │   └── platformRefund.controller.js
│   │   ├── services/
│   │   │   └── platformRefund.service.js
│   │   ├── repositories/
│   │   │   └── platformRefund.repository.js
│   │   ├── routes/
│   │   │   └── platformRefund.routes.js
│   │   ├── validations/
│   │   │   └── platformRefund.validation.js
│   │   ├── constants/
│   │   │   └── platformRefund.constant.js
│   │   └── platformRefund.module.js
│   │
│   ├── coupons/
│   │   ├── models/
│   │   │   └── platformCoupon.model.js
│   │   ├── controllers/
│   │   │   └── platformCoupon.controller.js
│   │   ├── services/
│   │   │   └── platformCoupon.service.js
│   │   ├── repositories/
│   │   │   └── platformCoupon.repository.js
│   │   ├── routes/
│   │   │   └── platformCoupon.routes.js
│   │   ├── validations/
│   │   │   └── platformCoupon.validation.js
│   │   ├── constants/
│   │   │   └── platformCoupon.constant.js
│   │   └── platformCoupon.module.js
│   │
│   └── marketplace-analytics/
│       ├── controllers/
│       │   └── platformMarketplaceAnalytics.controller.js
│       ├── services/
│       │   └── platformMarketplaceAnalytics.service.js
│       ├── repositories/
│       │   └── platformMarketplaceAnalytics.repository.js
│       ├── routes/
│       │   └── platformMarketplaceAnalytics.routes.js
│       ├── constants/
│       │   └── platformMarketplaceAnalytics.constant.js
│       └── platformMarketplaceAnalytics.module.js
│
└── marketplace/
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

# Design Principles

```txt
Availability Engine (Platform)
    Determines WHO Can Fulfill

Routing Engine (Platform)
    Determines WHO Should Fulfill

Inventory Module (ERP)
    Determines WHAT Is Available

Store Module (marketplace/stores)
    Determines WHERE Order Can Be Fulfilled

Pricing Module (platform/pricing)
    Determines HOW MUCH Customer Pays

Together These Modules Enable Real-time Quick Commerce
```
