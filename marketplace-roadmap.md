# Marketplace Development Roadmap & Module Build Order

## Objective

Build a scalable, enterprise-grade Marketplace that integrates seamlessly with the Pharmacy ERP while following the correct dependency order.

The Marketplace system is split across two backend modules:

```txt
platform/      ← Pahuch internal management (admin-controlled)

marketplace/   ← ERP partner pharmacy operations (partner-controlled)
```

Unlike the ERP, neither the Platform nor the Marketplace owns business data.

They consume ERP modules to provide Quick Commerce capabilities.

---

# Module Ownership Philosophy

## Platform Module

The `platform` module is owned and operated by **Pahuch**.

It handles everything that the Pahuch team controls internally.

```txt
Store Verification & Approval

Commission & Pricing Rules

Customer Orders (Platform View)

Partner Settlements

Refund Management

Routing Engine

Availability Engine

Delivery Management

Coupons & Platform Offers

Marketplace Analytics
```

## Marketplace Module

The `marketplace` module is used by **ERP users (partner pharmacies)**.

It handles everything the pharmacy/branch partner manages themselves.

```txt
Marketplace Stores (Register & Manage)

Marketplace Products (Enable / Disable for Online Selling)

Marketplace Inventory (View Sellable Stock)

Fulfillment Orders (Accept, Pack, Dispatch)

Store Working Hours & Settings

Store Dashboard & Reports
```

---

# Architecture Overview

```txt
ERP (Source of Truth)
│
│   Products, Inventory, Finance, Customers
│   Companies, Branches, Suppliers
│
├── platform/                           ← Pahuch Admin Layer
│   │
│   ├── marketplace-settings/           ← Global platform config
│   ├── store-verification/             ← Approve / reject partner stores
│   ├── commission/                     ← Platform commission rules
│   ├── availability-engine/            ← Who CAN fulfill
│   ├── routing-engine/                 ← Who SHOULD fulfill
│   ├── customer-orders/                ← All orders, platform view
│   ├── delivery/                       ← Delivery partners & tracking
│   ├── settlements/                    ← Pay out to partner pharmacies
│   ├── refunds/                        ← Customer refund management
│   ├── coupons/                        ← Platform-wide coupons & offers
│   └── marketplace-analytics/          ← Pahuch business intelligence
│
└── marketplace/                        ← Partner Pharmacy Layer
    │
    ├── stores/                         ← Partner registers & manages store
    ├── products/                       ← Partner enables products online
    ├── inventory/                      ← Partner views sellable stock
    ├── fulfillment-orders/             ← Partner accepts, packs, dispatches
    ├── pricing/                        ← Partner views settlement pricing
    └── dashboard/                      ← Partner store performance
```

---

# File & Folder Naming Convention

This project follows the same naming pattern used across all existing modules.

## Pattern

```txt
<submoduleName>.<layer>.js
```

## Examples from existing modules

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

## Marketplace Naming Rule

```txt
Marketplace module files   → marketplaceStore.model.js
Platform module files      → platformMarketplaceSettings.model.js
```

---

# Development Principle

```txt
Marketplace Foundation
        ↓
Marketplace Catalog
        ↓
Marketplace Intelligence (Platform)
        ↓
Marketplace Operations
        ↓
Delivery & Logistics (Platform)
        ↓
Marketplace Finance (Platform)
        ↓
Analytics & Reports
```

---

# Phase 1 — Marketplace Foundation

## Purpose

Prepare ERP branches to participate as Pahuch Marketplace partners.

Without stores, no marketplace operations can exist.

---

# Step 1 — Marketplace Settings

## Module: `platform/marketplace-settings`

## Purpose

Configure global Marketplace settings for the entire platform.

Controlled exclusively by the Pahuch admin team.

```txt
Marketplace Enabled

Default Delivery Radius

Default Preparation Time

Default Commission %

Business Hours Policy

Cancellation Policies

Return Policies

Near-Expiry Rules

Safety Stock Rules
```

## Folder & File Structure

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

# Step 2 — Marketplace Stores

## Module: `marketplace/stores`

## Purpose

ERP branch partners register their branch as a Marketplace Store.

Marketplace Store is an extension of an existing ERP Branch.

One Branch = One Marketplace Store.

Partner-managed: Online Status, Delivery Radius, Preparation Time, Working Hours.

## Folder & File Structure

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

# Step 3 — Store Verification

## Module: `platform/store-verification`

## Purpose

Pahuch verifies and approves stores before they can receive orders.

```txt
Drug License

GST

PAN

Bank Account

Store Approval / Rejection / Suspension
```

## Folder & File Structure

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

# Phase 2 — Marketplace Catalog

## Purpose

Expose ERP products for online selling.

Marketplace never creates products. It references ERP products.

---

# Step 4 — Marketplace Products

## Module: `marketplace/products`

## Purpose

Partner manages which ERP products are enabled for online selling.

```txt
Enable Products

Disable Products

Set Visibility

Prescription Rules

Featured Products
```

## Folder & File Structure

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

# Step 5 — Marketplace Pricing

## Module: `platform/pricing`

## Purpose

Platform controls all customer-facing prices and partner settlement prices.

```txt
Customer Selling Price

Partner Settlement Price

Platform Margin

Discounts

Coupons

Delivery Charges
```

Partners cannot modify pricing. They can only view their settlement amount.

## Folder & File Structure

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

## Partner Pricing View

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

Note: No model in partner pricing — partner only reads platform pricing data.

---

# Step 6 — Marketplace Inventory

## Module: `marketplace/inventory`

## Purpose

Partner views their real-time sellable inventory.

Inventory is owned by ERP. Platform engines reserve it. Partner only reads it.

```txt
Sellable Quantity

Reserved Quantity

Available Quantity

Inventory Status
```

## Folder & File Structure

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

# Phase 3 — Marketplace Intelligence

## Module: `platform`

## Purpose

Pahuch-controlled engines determine whether orders can be fulfilled and from where.

Partner pharmacies have no access to these modules.

---

# Step 7 — Availability Engine

## Module: `platform/availability-engine`

## Purpose

Checks stores against inventory, hours, radius, capacity, and batch rules.

Returns eligible candidate stores.

## Folder & File Structure

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

Note: No model — availability engine is a computational service, not a data store.

---

# Step 8 — Routing Engine

## Module: `platform/routing-engine`

## Purpose

Selects the best fulfillment store from the candidate list provided by the Availability Engine.

```txt
Factors: Distance, Inventory, Preparation Time, Store Load,
         Estimated Delivery, Store Rating
```

## Folder & File Structure

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

---

# Step 9 — Inventory Reservation

Part of `platform/availability-engine`.

Reservation is a sub-function of the Availability Engine.

```txt
Reserve → Store Accepts → Deduct from ERP
Release → If order fails
```

Reservation model lives inside `marketplaceInventory.model.js`.

---

# Phase 4 — Marketplace Operations

## Purpose

Handle customer ordering and partner fulfillment workflow.

---

# Step 10 — Customer Orders

## Module: `platform/customer-orders`

## Purpose

Pahuch stores and manages all customer orders.

Partners never see customer personal information directly.

## Folder & File Structure

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

# Step 11 — Fulfillment Orders

## Module: `marketplace/fulfillment-orders`

## Purpose

Pahuch splits customer orders into fulfillment tasks and sends them to partner pharmacies.

Partners accept, pack, and dispatch through this module.

## Folder & File Structure

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

# Step 12 — Packing & Dispatch

Part of `marketplace/fulfillment-orders`.

Packing and Dispatch are workflow status transitions within Fulfillment Orders.

No separate module needed.

```txt
PENDING → ACCEPTED → PACKING → READY_FOR_PICKUP → DISPATCHED
```

These states live in `marketplaceFulfillmentOrder.constant.js`.

---

# Phase 5 — Delivery & Logistics

## Module: `platform/delivery`

## Purpose

Pahuch manages all delivery operations.

Partners only mark orders as Ready for Pickup.

---

# Step 13 — Delivery Partners

## Step 14 — Delivery Tracking

## Step 15 — Proof Of Delivery

All three belong to `platform/delivery`.

## Folder & File Structure

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

# Phase 6 — Marketplace Finance

## Module: `platform`

## Purpose

Pahuch handles all marketplace financial operations.

---

# Step 16 — Partner Settlements

## Module: `platform/settlements`

## Folder & File Structure

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

# Step 17 — Marketplace Commission

## Module: `platform/commission`

## Folder & File Structure

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

# Step 18 — Refunds

## Module: `platform/refunds`

## Folder & File Structure

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

# Phase 7 — Analytics & Reports

---

# Marketplace Analytics (Pahuch)

## Module: `platform/marketplace-analytics`

## Folder & File Structure

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

Note: No model — analytics reads from other module models.

---

# Store Dashboard (Partner)

## Module: `marketplace/dashboard`

## Folder & File Structure

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

Note: No model — dashboard reads from stores, products, and fulfillment-orders models.

---

# Complete Module File Structure

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

# Final Build Order

```txt
PHASE 1 — FOUNDATION

1. Marketplace Settings               → platform/marketplace-settings
2. Marketplace Stores                 → marketplace/stores
3. Store Verification                 → platform/store-verification

------------------------------------

PHASE 2 — CATALOG

4. Marketplace Products               → marketplace/products
5. Marketplace Pricing                → platform/pricing
6. Marketplace Inventory              → marketplace/inventory

------------------------------------

PHASE 3 — INTELLIGENCE

7. Availability Engine                → platform/availability-engine
8. Routing Engine                     → platform/routing-engine
9. Inventory Reservation              → platform/availability-engine

------------------------------------

PHASE 4 — OPERATIONS

10. Customer Orders                   → platform/customer-orders
11. Fulfillment Orders                → marketplace/fulfillment-orders
12. Packing & Dispatch                → marketplace/fulfillment-orders

------------------------------------

PHASE 5 — DELIVERY

13. Delivery Partners                 → platform/delivery
14. Delivery Tracking                 → platform/delivery
15. Proof Of Delivery                 → platform/delivery

------------------------------------

PHASE 6 — FINANCE

16. Partner Settlements               → platform/settlements
17. Marketplace Commission            → platform/commission
18. Refund Management                 → platform/refunds

------------------------------------

PHASE 7 — ANALYTICS

19. Marketplace Dashboard (Pahuch)    → platform/marketplace-analytics
20. Store Dashboard (Partner)         → marketplace/dashboard
21. Marketplace Reports               → platform/marketplace-analytics
```

---

# Final Principle

```txt
ERP remains the operational and accounting backbone.

Platform (Pahuch) is the commerce brain.
    → Controls pricing, routing, orders, delivery, settlements.

Marketplace (Partner Interface) gives pharmacies visibility and operational control.
    → Store registration, product listings, fulfillment, own dashboard only.

Partners cannot access platform logic.
Platform cannot be manipulated by partners.
ERP data remains the single source of truth.
Customer experience is fully Pahuch-controlled.
```
