# Commerce Module Architecture

> **Module:** Commerce
>
> **Version:** 1.0
>
> **Project:** Pahuch ERP & Quick Commerce Platform
>
> **Architecture:** Modular Monolith (Future Microservice Ready)
>
> **Technology Stack:** Node.js • Express.js • MongoDB • Mongoose

---

# Table of Contents

- Overview
- Purpose
- Goals
- Design Philosophy
- High Level Architecture
- Commerce Module Responsibilities
- Folder Structure
- Module Ownership
- Module Communication
- Commerce Processing Flow
- Design Principles
- Why Commerce Module Exists
- Integration with Other Modules
- Future Scalability

---

# Overview

The **Commerce Module** is responsible for powering the entire customer shopping experience of the Pahuch Quick Commerce Platform.

It acts as the bridge between the **Customer Application** and the **ERP Marketplace**, ensuring that customers receive accurate product availability, pricing, inventory, delivery estimates, and order processing.

Unlike the ERP Marketplace module, which is used by partner pharmacies, the Commerce module is completely focused on customer-facing commerce operations.

This module contains two major components:

```
Commerce
│
├── Consumer
│
└── Commerce Engine
```

These two components work together to deliver a seamless ordering experience.

---

# Purpose

The Commerce Module exists to separate customer commerce logic from ERP operations.

Instead of allowing the customer application to directly communicate with inventory, pharmacy, pricing, or routing systems, every request flows through the Commerce module.

This creates:

- Better scalability
- Cleaner architecture
- Easier maintenance
- Centralized business rules
- Future microservice compatibility

---

# Goals

The Commerce Module is designed with the following goals.

## Primary Goals

- Customer-first architecture
- High performance
- Clean separation of concerns
- Independent business logic
- Reusable APIs
- Enterprise scalability
- Multi-vendor support
- Future warehouse support
- Future dark store support
- Future AI recommendation support

---

## Business Goals

The Commerce module should allow customers to

- Browse products
- Search medicines
- Upload prescriptions
- Add items to cart
- Place orders
- Track deliveries
- Manage addresses
- Receive notifications
- View previous orders
- Complete secure payments

without exposing any ERP complexity.

---

# Design Philosophy

The Commerce module follows a strict layered architecture.

```
Customer

↓

Consumer APIs

↓

Commerce Engine

↓

ERP Marketplace

↓

Inventory

↓

Delivery
```

The customer never communicates directly with ERP modules.

Instead,

Consumer APIs communicate with the Commerce Engine.

The Commerce Engine communicates with internal modules.

This creates a secure and maintainable architecture.

---

# High Level Architecture

```
                          CUSTOMER APP
                               │
                               │
                               ▼
                     Commerce Consumer APIs
                               │
                               ▼
                    Commerce Engine Layer
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
    Marketplace            Platform              Catalog
        │                      │                      │
        └──────────────┬───────┴──────────────┬───────┘
                       ▼                      ▼
                  Inventory              Finance
                       │
                       ▼
                 Delivery Partners
                       │
                       ▼
                    Customer
```

---

# Commerce Module Responsibilities

The Commerce module is responsible for

- Customer authentication
- Customer profile
- Address management
- Search
- Product discovery
- Cart management
- Wishlist
- Checkout
- Payment processing
- Order placement
- Order tracking
- Delivery estimation
- Prescription uploads
- Promotions
- Coupons
- Notifications

It is NOT responsible for

- ERP inventory management
- ERP purchase flow
- ERP sales
- ERP accounting
- Pharmacy management

Those remain inside their dedicated ERP modules.

---

# Folder Structure

```
src/
└── modules/
    └── commerce/
        │
        ├── consumer/
        │
        └── commerce-engine/
```

---

# Consumer Module

The Consumer module exposes APIs used directly by

- Mobile Application
- Website
- Customer Portal

The Consumer module should never contain heavy business logic.

Its responsibility is

- Authentication
- Validation
- Request transformation
- Response formatting

Complex logic should always be delegated to the Commerce Engine.

---

# Commerce Engine

The Commerce Engine is the brain of Quick Commerce.

It contains

- Business rules
- Availability calculation
- Pricing calculation
- Delivery routing
- Inventory synchronization
- Order orchestration

No client application communicates with it directly.

Only internal modules use it.

---

# Module Ownership

```
Commerce
│
├── Consumer
│      │
│      ├── Customer APIs
│      ├── Customer Authentication
│      ├── Customer Experience
│      └── API Responses
│
└── Commerce Engine
       │
       ├── Pricing
       ├── Availability
       ├── Routing
       ├── Promotions
       ├── Delivery
       └── Order Processing
```

---

# Commerce Processing Flow

```
Customer

↓

Consumer Module

↓

Authentication

↓

Commerce Engine

↓

Pricing Engine

↓

Availability Engine

↓

Routing Engine

↓

Marketplace

↓

Inventory

↓

Delivery

↓

Customer
```

---

# Internal Module Communication

The Commerce Module communicates with several ERP modules.

```
Commerce

↓

Marketplace

↓

Platform

↓

Catalog

↓

Finance

↓

Delivery
```

Each module owns its own business logic.

The Commerce module never directly modifies another module's data.

Instead, it communicates through service layers.

---

# Design Principles

## Single Responsibility

Each submodule should own only one responsibility.

Example

Cart should only manage carts.

Pricing should only calculate pricing.

Availability should only determine stock.

---

## Separation of Concerns

Customer APIs should never contain business rules.

Business rules belong inside the Commerce Engine.

---

## Stateless APIs

Every API should remain stateless.

No request should depend on previous requests.

---

## Modular Design

Every folder should be independently maintainable.

Future developers should be able to replace one module without affecting others.

---

## Enterprise Scalability

The architecture should support

- 10 stores
- 100 stores
- 1,000 stores
- 10,000 stores

without changing module responsibilities.

---

## Microservice Ready

Although the project currently uses a Modular Monolith architecture,

each submodule should be designed so that it can later become an independent microservice.

---

# Why Commerce Module Exists

Without a dedicated Commerce module, the customer application would need to communicate with multiple ERP modules directly.

Example

```
Customer

↓

Inventory

↓

Pricing

↓

Marketplace

↓

Finance

↓

Delivery
```

This creates tight coupling.

Instead,

```
Customer

↓

Consumer

↓

Commerce Engine

↓

Internal Modules
```

This provides

- Loose coupling
- Better security
- Easier maintenance
- Centralized business rules

---

# Integration with Other Modules

The Commerce Module integrates with

## Catalog

Product information

Medicine information

Categories

Brands

Search

---

## Marketplace

Partner pharmacies

Store availability

Store inventory

Order fulfillment

---

## Platform

Business settings

Commission

Taxes

Platform configuration

---

## Finance

Payment records

Invoices

Refunds

Settlement

---

## Delivery

Delivery partners

Tracking

Estimated delivery time

Proof of delivery

---

# Future Scalability

The Commerce module has been designed to support future features without major architectural changes.

Future planned capabilities include

- Dark stores
- Warehouses
- AI recommendations
- Dynamic pricing
- Subscription medicine orders
- Scheduled delivery
- Express delivery
- Multiple payment gateways
- Loyalty programs
- Reward points
- Referral system
- Voice search
- Multi-language support
- Hyperlocal routing
- Drone delivery support (future)
- Regional pricing
- International expansion

---

# Summary

The Commerce Module acts as the central commerce layer of the Pahuch ecosystem.

It provides a clean separation between customer-facing APIs and complex business logic.

By dividing the module into **Consumer** and **Commerce Engine**, the platform remains scalable, maintainable, secure, and ready for future enterprise growth.

---

# Consumer Module Architecture

---

# Overview

The **Consumer Module** is the public-facing layer of the Commerce Module.

It exposes all APIs required by the customer applications including

- Mobile App
- Website
- Progressive Web App (PWA)
- Future Customer Portal

The Consumer module acts as the entry point for every customer request.

It is responsible for

- Authentication
- Request Validation
- Customer Context
- API Responses
- Calling Commerce Engine Services

The Consumer module **must never contain heavy business logic**.

Instead, it delegates complex operations to the **Commerce Engine**.

---

# Responsibilities

The Consumer Module is responsible for

- Customer Registration
- Customer Login
- OTP Verification
- Profile Management
- Address Management
- Home Screen APIs
- Search APIs
- Cart Management
- Wishlist Management
- Checkout
- Orders
- Order Tracking
- Prescription Upload
- Payments
- Notifications
- Customer Support
- Reviews & Ratings

---

# Folder Structure

```text
consumer/
│
├── auth/
│
├── profile/
│
├── addresses/
│
├── home/
│
├── search/
│
├── cart/
│
├── wishlist/
│
├── checkout/
│
├── orders/
│
├── tracking/
│
├── prescriptions/
│
├── payments/
│
├── notifications/
│
├── support/
│
└── reviews/
```

---

# Consumer Request Flow

```
Customer

↓

API Request

↓

Consumer Module

↓

Validation

↓

Authentication

↓

Commerce Engine

↓

Response

↓

Customer
```

---

# Consumer Layer Responsibilities

The Consumer layer should only

- Validate Request

- Authenticate Customer

- Parse Request

- Call Services

- Format Response

It should never

- Calculate Pricing

- Check Inventory

- Reserve Stock

- Select Pharmacy

- Calculate Delivery Charges

- Generate Business Rules

Those responsibilities belong to the Commerce Engine.

---

# Standard Module Structure

Every Consumer feature should follow the same structure.

```text
feature/

├── controllers/

├── routes/

├── services/

├── validators/

├── middleware/

├── dto/

├── utils/

├── constants/

```

---

# Why Consistent Structure?

Every feature should look identical.

Example

```
cart/

orders/

wishlist/

payments/
```

should all follow the same architecture.

Benefits

- Easy maintenance

- Predictable codebase

- Faster onboarding

- Reusable components

---

# Auth Module

## Purpose

Responsible for customer authentication.

Supported methods

- OTP Login

- Mobile Login

- Email Login (Future)

- Social Login (Future)

---

## Folder Structure

```text
auth/

├── controllers/

├── routes/

├── services/

├── validators/

├── middleware/

├── utils/

```

---

## Responsibilities

- Send OTP

- Verify OTP

- Login

- Logout

- Refresh Token

- Customer Session

---

## APIs

```
POST /auth/send-otp

POST /auth/verify-otp

POST /auth/logout

POST /auth/refresh-token

GET /auth/me
```

---

# Profile Module

## Purpose

Manage customer profile.

---

## Responsibilities

- View Profile

- Update Profile

- Upload Avatar

- Delete Account

---

## APIs

```
GET /profile

PUT /profile

PATCH /profile/avatar

DELETE /profile
```

---

# Address Module

## Purpose

Store customer delivery addresses.

---

## Responsibilities

- Add Address

- Update Address

- Delete Address

- Default Address

- Geo Coordinates

---

## APIs

```
GET /addresses

POST /addresses

PUT /addresses/:id

DELETE /addresses/:id

PATCH /addresses/default
```

---

# Home Module

## Purpose

Power the Home Screen.

This module should never directly query ERP.

Instead

```
Home

↓

Commerce Engine

↓

Catalog

↓

Marketplace

↓

Response
```

---

## Responsibilities

- Banners

- Categories

- Featured Products

- Trending Products

- Offers

- Recently Viewed

- Recommended

---

## APIs

```
GET /home

GET /home/banners

GET /home/categories

GET /home/trending

GET /home/recommended
```

---

# Search Module

## Purpose

Allow customers to search medicines quickly.

---

## Responsibilities

- Keyword Search

- Voice Search (Future)

- Barcode Search (Future)

- Search Suggestions

- Recent Searches

---

## APIs

```
GET /search

GET /search/suggestions

GET /search/recent
```

---

# Cart Module

## Purpose

Manage shopping cart.

Cart should never calculate

- Price

- Taxes

- Discounts

Those values always come from Commerce Engine.

---

## Responsibilities

- Add Item

- Remove Item

- Update Quantity

- View Cart

- Empty Cart

---

## APIs

```
GET /cart

POST /cart/items

PATCH /cart/items/:id

DELETE /cart/items/:id

DELETE /cart
```

---

# Wishlist Module

## Responsibilities

- Add Wishlist Item

- Remove Item

- View Wishlist

- Move to Cart

---

## APIs

```
GET /wishlist

POST /wishlist

DELETE /wishlist/:id

POST /wishlist/move-to-cart
```

---

# Checkout Module

Checkout is only responsible for collecting customer information.

Actual processing happens inside

Commerce Engine.

---

## Responsibilities

- Address Selection

- Delivery Slot

- Payment Method

- Order Summary

- Place Order

---

## APIs

```
GET /checkout

POST /checkout

POST /checkout/place-order
```

---

# Orders Module

Responsible for customer orders.

---

## Responsibilities

- Order History

- Order Details

- Cancel Order

- Reorder

---

## APIs

```
GET /orders

GET /orders/:id

PATCH /orders/:id/cancel

POST /orders/:id/reorder
```

---

# Tracking Module

Responsible for live order tracking.

---

## APIs

```
GET /tracking/:orderId

GET /tracking/:orderId/timeline
```

---

# Prescription Module

Supports prescription medicine ordering.

---

## Responsibilities

- Upload Prescription

- Replace Prescription

- View Prescription

---

## APIs

```
POST /prescriptions

GET /prescriptions

DELETE /prescriptions/:id
```

---

# Payments Module

Handles payment initiation.

Payment verification should happen through Commerce Engine.

---

## APIs

```
POST /payments/create-order

POST /payments/verify

GET /payments/history
```

---

# Notifications Module

Responsible for customer notifications.

---

## Types

- Push

- SMS

- Email

- In-App

---

## APIs

```
GET /notifications

PATCH /notifications/read

DELETE /notifications/:id
```

---

# Support Module

Customer support system.

---

## Responsibilities

- Raise Ticket

- Chat Support (Future)

- FAQs

- Contact Us

---

## APIs

```
POST /support/tickets

GET /support/tickets

GET /support/faqs
```

---

# Reviews Module

Allows customers to review products.

---

## Responsibilities

- Product Rating

- Product Review

- Pharmacy Feedback (Future)

---

## APIs

```
POST /reviews

GET /reviews/:productId

DELETE /reviews/:id
```

---

# Consumer Authentication Flow

```
Customer

↓

Login

↓

OTP Verification

↓

JWT Token

↓

Protected APIs

↓

Commerce Engine
```

---

# Authorization

Consumer APIs should support

- Guest APIs

- Authenticated APIs

- Premium APIs (Future)

Every protected API must verify

- JWT

- Customer Status

- Account State

before processing.

---

# Error Handling

Every API should return a standard response.

Example

```json
{
  "success": true,
  "message": "Cart updated successfully",
  "data": {}
}
```

Error

```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

---

# Design Principles

The Consumer Module should remain

- Thin

- Stateless

- Secure

- Reusable

- Lightweight

Heavy business logic should always be delegated to the Commerce Engine.

---

# Summary

The Consumer Module serves as the public API layer for the Pahuch Quick Commerce platform. It focuses on delivering a clean, secure, and consistent customer experience while keeping business logic isolated within the Commerce Engine. This separation makes the system easier to maintain, scale, and evolve as new customer-facing features are introduced.

---

# Commerce Engine Architecture

---

# Overview

The **Commerce Engine** is the heart of the Pahuch Quick Commerce Platform.

It contains all the business logic required to power the customer shopping experience.

Unlike the **Consumer Module**, which exposes APIs, the Commerce Engine is an internal orchestration layer responsible for coordinating multiple ERP modules and ensuring every order is processed accurately and efficiently.

The Commerce Engine is never accessed directly by customers.

Instead, every request flows through the Consumer Module before reaching the Commerce Engine.

---

# Responsibilities

The Commerce Engine is responsible for

- Product Catalog Aggregation
- Product Pricing
- Stock Availability
- Inventory Synchronization
- Pharmacy Selection
- Order Orchestration
- Delivery Calculation
- Promotions
- Coupons
- Recommendations
- Payment Verification
- Order Status Management
- Business Rules

---

# Folder Structure

```text
commerce-engine/
│
├── catalog/
│
├── pricing/
│
├── availability/
│
├── routing/
│
├── inventory-sync/
│
├── order-orchestrator/
│
├── delivery/
│
├── promotions/
│
├── coupons/
│
├── recommendations/
│
├── analytics/
│
└── shared/
```

---

# High Level Flow

```
Consumer Module

↓

Commerce Engine

↓

Catalog

↓

Availability

↓

Pricing

↓

Routing

↓

Marketplace

↓

Finance

↓

Delivery

↓

Response
```

---

# Commerce Engine Workflow

Every customer request follows the same lifecycle.

```
Request

↓

Validate

↓

Load Product

↓

Calculate Pricing

↓

Check Availability

↓

Select Pharmacy

↓

Reserve Inventory

↓

Create Order

↓

Payment

↓

Delivery

↓

Complete
```

---

# Standard Module Structure

Every Commerce Engine feature should follow the same folder structure.

```text
feature/

├── services/

├── strategies/

├── helpers/

├── validators/

├── constants/

├── events/

├── utils/

└── index.js
```

---

# Catalog Module

## Purpose

The Catalog module provides customer-ready product information.

It combines

- Global Product Catalog
- Workspace Products
- Product Images
- Medicine Details
- Categories
- Brands

into a unified response.

---

## Responsibilities

- Product Details

- Product Search

- Product Variants

- Related Products

- Product Categories

- Featured Products

---

## Never Responsible For

- Pricing

- Inventory

- Availability

- Delivery

Those belong to other modules.

---

# Pricing Module

## Purpose

Calculate the final selling price for the customer.

---

## Responsibilities

- MRP

- Selling Price

- Discounts

- Platform Charges

- Delivery Charges

- Taxes

- Coupon Discount

- Offer Discount

- Final Payable Amount

---

## Pricing Flow

```
Product

↓

MRP

↓

Store Price

↓

Discount

↓

Coupon

↓

Tax

↓

Delivery

↓

Final Amount
```

---

# Availability Module

## Purpose

Determine whether a product can be purchased.

---

## Responsibilities

- Check Inventory

- Check Store Status

- Check Warehouse

- Check Delivery Area

- Check Prescription Requirement

---

## Availability Flow

```
Customer

↓

Product

↓

Marketplace

↓

Inventory

↓

Stock Found?

↓

Yes

↓

Available
```

---

# Routing Module

## Purpose

Select the best fulfillment source.

Routing is one of the most important modules in the Commerce Engine.

---

## Responsibilities

- Choose Pharmacy

- Choose Warehouse

- Delivery Radius

- Estimated Delivery Time

- Distance Calculation

- Store Priority

---

## Routing Priority

```
Warehouse

↓

Preferred Partner Pharmacy

↓

Nearest Pharmacy

↓

Regional Warehouse

↓

Out Of Stock
```

---

# Inventory Sync Module

## Purpose

Keep customer inventory synchronized with ERP inventory.

---

## Responsibilities

- Live Inventory

- Reserved Quantity

- Available Quantity

- Stock Updates

- Inventory Events

---

## Flow

```
ERP Inventory

↓

Inventory Sync

↓

Commerce Engine

↓

Customer
```

---

# Order Orchestrator

## Purpose

Manage the complete order lifecycle.

This module coordinates every service involved in order processing.

---

## Responsibilities

- Create Order

- Reserve Stock

- Verify Payment

- Notify Marketplace

- Notify Delivery

- Update Status

- Complete Order

---

## Order Flow

```
Place Order

↓

Validate

↓

Reserve Inventory

↓

Generate Order

↓

Payment

↓

Assign Pharmacy

↓

Assign Delivery

↓

Dispatch

↓

Delivered
```

---

# Delivery Module

## Purpose

Handle delivery calculations and partner coordination.

---

## Responsibilities

- Delivery Charges

- Delivery Time

- Delivery Partner

- Delivery Tracking

- Delivery Status

---

## Future Features

- Hyperlocal Delivery

- Express Delivery

- Scheduled Delivery

- Warehouse Delivery

- Dark Store Delivery

---

# Promotions Module

## Responsibilities

- Flash Sales

- Product Offers

- Category Offers

- Buy One Get One

- Festival Offers

- Campaign Management

---

# Coupons Module

## Responsibilities

- Validate Coupon

- Apply Coupon

- Remove Coupon

- Coupon Rules

- Coupon Expiry

---

# Recommendations Module

## Purpose

Improve customer shopping experience.

---

## Future Features

- Frequently Bought Together

- Similar Products

- Trending Medicines

- Seasonal Recommendations

- AI Recommendations

---

# Analytics Module

## Responsibilities

- Search Analytics

- Product Views

- Conversion Rate

- Popular Medicines

- Customer Behavior

- Revenue Metrics

---

# Shared Module

Shared utilities used across Commerce Engine.

Examples

- Constants

- Enums

- Error Classes

- Helpers

- Event Emitters

- Logger

---

# Module Communication

```
Commerce Engine

├── Catalog

├── Pricing

├── Availability

├── Routing

├── Marketplace

├── Finance

├── Delivery

└── Notifications
```

Every module communicates through services instead of directly modifying another module's data.

---

# External Dependencies

The Commerce Engine integrates with

## Catalog Module

Product Information

---

## Marketplace Module

Partner Pharmacies

---

## Platform Module

Business Rules

---

## Finance Module

Payments

Invoices

Refunds

---

## Delivery Module

Delivery Partners

Tracking

---

# Error Handling

Every internal service should return a standardized response.

Example

```javascript
{
    success: true,
    data: {},
    message: "Pricing calculated successfully"
}
```

Example Error

```javascript
{
    success: false,
    error: "PRODUCT_OUT_OF_STOCK"
}
```

---

# Event Driven Design

The Commerce Engine should publish internal events.

Examples

```
ORDER_CREATED

ORDER_CONFIRMED

PAYMENT_COMPLETED

INVENTORY_RESERVED

ORDER_DISPATCHED

ORDER_DELIVERED

ORDER_CANCELLED
```

These events allow other modules to react without tight coupling.

---

# Design Principles

The Commerce Engine should be

- Modular

- Stateless

- Reusable

- Scalable

- Event Driven

- Business Focused

- Independent

Every business rule should live inside the Commerce Engine instead of controllers.

---

# Future Scalability

The Commerce Engine has been designed to support

- Multiple Warehouses

- Multiple Dark Stores

- Multiple Cities

- Multiple Delivery Partners

- Dynamic Pricing

- AI-Based Routing

- AI Recommendations

- Subscription Orders

- Scheduled Deliveries

- International Expansion

without requiring architectural changes.

---

# Summary

The Commerce Engine is the central decision-making layer of the Pahuch Quick Commerce platform. It orchestrates pricing, inventory, routing, order processing, promotions, delivery, and integrations with ERP modules while keeping the Consumer Module lightweight. This separation of responsibilities enables a clean, scalable, and enterprise-ready architecture capable of supporting future growth.

---

# Complete Order Lifecycle

---

# Overview

The order lifecycle represents the complete journey of a customer order, starting from browsing products and ending with successful delivery.

The Commerce Module orchestrates every step while coordinating with multiple ERP modules.

```
Customer

↓

Consumer Module

↓

Commerce Engine

↓

ERP Modules

↓

Delivery

↓

Customer
```

---

# Complete Order Journey

```
Customer Opens App

↓

Browse Products

↓

Search Medicine

↓

View Product Details

↓

Add Product To Cart

↓

Proceed To Checkout

↓

Select Address

↓

Choose Payment Method

↓

Place Order

↓

Commerce Engine Starts Processing

↓

Pricing Validation

↓

Availability Validation

↓

Route Selection

↓

Inventory Reservation

↓

Order Creation

↓

Payment Verification

↓

Marketplace Notification

↓

Delivery Assignment

↓

Order Packed

↓

Out For Delivery

↓

Delivered

↓

Order Completed
```

---

# Step 1 - Browse Products

Customer opens the application.

Consumer module requests

```
Consumer

↓

Commerce Engine

↓

Catalog

↓

Marketplace

↓

Customer
```

Returned information

- Categories

- Featured Products

- Trending Products

- Offers

- Recommendations

---

# Step 2 - Search Products

Customer searches

```
Paracetamol
```

Consumer sends search request

↓

Commerce Engine

↓

Catalog

↓

Search Result

The customer never searches ERP directly.

---

# Step 3 - Product Details

Commerce Engine gathers information from

- Catalog

- Pricing

- Availability

- Promotions

Final response includes

- Product

- Images

- Price

- Discount

- Delivery Time

- Available Quantity

---

# Step 4 - Add To Cart

Customer adds product.

Cart stores

- Product ID

- Quantity

- Customer ID

No pricing is permanently stored inside the cart.

Every checkout recalculates pricing.

---

# Step 5 - Checkout

Customer selects

- Address

- Payment Method

- Delivery Option

Consumer validates

↓

Commerce Engine

---

# Step 6 - Pricing Validation

Pricing module recalculates

- Product Price

- Offer

- Coupon

- GST

- Delivery Charges

- Platform Charges

- Final Amount

Nothing is trusted from the client.

---

# Step 7 - Availability Validation

Availability module checks

- Product Exists

- Inventory Exists

- Store Online

- Deliverable Area

- Prescription Requirement

If validation fails

↓

Customer receives proper error message.

---

# Step 8 - Routing

Routing Engine selects

Priority

```
Warehouse

↓

Preferred Pharmacy

↓

Nearest Pharmacy

↓

Regional Warehouse

↓

Unavailable
```

The customer never selects a pharmacy manually.

---

# Step 9 - Inventory Reservation

Inventory Sync reserves stock.

Example

```
Available

50

↓

Reserved

2

↓

Available

48
```

This prevents overselling.

---

# Step 10 - Order Creation

Order Orchestrator creates

- Order

- Order Items

- Timeline

- Initial Status

Initial Status

```
Pending
```

---

# Step 11 - Payment

Supported

- COD

- UPI

- Credit Card

- Debit Card

- Wallet

Future

- EMI

- Subscription Billing

Payment verification happens before confirmation.

---

# Step 12 - Marketplace Notification

Commerce Engine informs

Marketplace Module

↓

Selected Pharmacy

↓

Accept Order

↓

Prepare Order

---

# Step 13 - Delivery Assignment

Delivery module selects

- Internal Rider

OR

- Delivery Partner

Delivery ETA is generated.

---

# Step 14 - Dispatch

Timeline

```
Pending

↓

Confirmed

↓

Packed

↓

Dispatched
```

Customer receives notifications.

---

# Step 15 - Delivery

Customer receives

- Live Tracking

- Rider Details

- ETA

- Delivery OTP (Future)

---

# Step 16 - Completion

Timeline

```
Delivered

↓

Payment Completed

↓

Inventory Updated

↓

Analytics Updated

↓

Order Closed
```

---

# Order Status Lifecycle

```
Pending

↓

Confirmed

↓

Preparing

↓

Packed

↓

Ready For Pickup

↓

Out For Delivery

↓

Delivered
```

Alternative Flow

```
Pending

↓

Cancelled
```

---

# Return Flow (Future)

```
Return Requested

↓

Review

↓

Pickup

↓

Inspection

↓

Refund

↓

Completed
```

---

# Refund Flow

```
Refund Initiated

↓

Finance

↓

Payment Gateway

↓

Completed
```

---

# Integration with ERP Modules

The Commerce Module communicates with multiple ERP modules.

---

# Catalog

Purpose

Provide product information.

Consumes

- Product

- Images

- Categories

Returns

Customer-ready catalog.

---

# Marketplace

Purpose

Partner Pharmacy Management.

Commerce Engine requests

- Inventory

- Store Status

- Fulfillment

Marketplace responds

- Accepted

OR

- Rejected

---

# Platform

Purpose

Business configuration.

Provides

- Commission

- Tax Rules

- Delivery Rules

- Radius

- Store Priority

---

# Finance

Purpose

Financial Processing.

Responsible for

- Payments

- Refunds

- Settlements

- Invoices

- Ledger

---

# Delivery

Responsible for

- Rider Assignment

- Delivery Tracking

- ETA

- Delivery Completion

---

# Security Architecture

Every request passes through

```
Customer

↓

Authentication

↓

Authorization

↓

Validation

↓

Business Rules

↓

Response
```

---

# Authentication

Supported

- JWT

- Refresh Tokens

Future

- OAuth

- Google Login

- Apple Login

---

# Authorization

Every protected endpoint verifies

- Customer

- Token

- Status

- Permissions

---

# Validation

Every request must validate

- Payload

- Required Fields

- Address

- Product

- Payment

- Coupon

before processing.

---

# Error Handling

Every response should follow

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {}
}
```

Example Error

```json
{
  "success": false,
  "message": "Product out of stock"
}
```

---

# Logging

Important events should be logged.

Examples

- Login

- Order Created

- Order Cancelled

- Payment Failed

- Refund

- Delivery Completed

---

# Event Flow

```
ORDER_CREATED

↓

PAYMENT_SUCCESS

↓

ORDER_CONFIRMED

↓

INVENTORY_RESERVED

↓

ORDER_PACKED

↓

ORDER_DISPATCHED

↓

ORDER_DELIVERED
```

Modules subscribe to these events independently.

---

# Best Practices

## Keep Controllers Thin

Controllers should

- Validate

- Call Services

- Return Responses

Nothing else.

---

## Keep Business Logic Inside Commerce Engine

Never calculate

- Pricing

- Delivery

- Inventory

inside controllers.

---

## Reuse Services

Avoid duplicate logic.

If pricing exists,

reuse Pricing Service.

---

## Follow Single Responsibility

Each module owns one responsibility.

Examples

Pricing

↓

Only Pricing

Routing

↓

Only Routing

Delivery

↓

Only Delivery

---

## Avoid Direct Database Access Between Modules

Wrong

```
Consumer

↓

Marketplace Database
```

Correct

```
Consumer

↓

Commerce Engine

↓

Marketplace Service
```

---

# Future Roadmap

The Commerce Module has been designed for long-term scalability.

Planned enhancements include

- Multi-City Support

- Multi-State Support

- Dark Stores

- Warehouses

- AI Search

- AI Recommendations

- Dynamic Pricing

- Loyalty Program

- Membership Plans

- Medicine Subscription

- Scheduled Delivery

- Express Delivery

- Voice Search

- Barcode Scan

- International Expansion

---

# Commerce Module Summary

The Commerce Module is the customer commerce layer of the Pahuch ecosystem.

It separates customer-facing APIs from enterprise business logic by dividing responsibilities into two major components:

```
Commerce

├── Consumer

└── Commerce Engine
```

The **Consumer Module** focuses on customer interaction, request validation, and API exposure.

The **Commerce Engine** acts as the intelligent orchestration layer that coordinates pricing, inventory, routing, fulfillment, delivery, and ERP integrations.

This architecture provides:

- Clear separation of responsibilities

- Enterprise scalability

- High maintainability

- Loose coupling

- Future microservice compatibility

- Easy integration with ERP modules

- Support for future warehouses, dark stores, AI features, and multi-city expansion

By following this architecture, the Pahuch platform remains clean, modular, and capable of scaling from a single pharmacy to a nationwide quick-commerce ecosystem without requiring fundamental architectural changes.

---

**End of Commerce Module Architecture**
