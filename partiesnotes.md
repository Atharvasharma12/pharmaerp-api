# Parties Module Architecture

## Objective

Build a scalable Party Management System for the ERP that supports:

- Customers
- Suppliers
- Credit Management
- Outstanding Tracking
- Purchase Integration
- Sales Integration
- Accounting Integration
- Ledger Mapping

The Parties Module acts as the central source of truth for all business entities involved in buying and selling.

---

# Core Party Philosophy

There are only two core party types:

```txt
CUSTOMER
SUPPLIER
```

Every Purchase must be linked to a Supplier.

Every Sale must be linked to a Customer.

---

# Module Structure

```txt
src/modules/parties/
│
├── parties.routes.js
├── parties.module.js
│
├── customers/
│   ├── models/
│   ├── repositories/
│   ├── services/
│   ├── controllers/
│   ├── validations/
│   ├── routes/
│   ├── constants/
│   └── customer.module.js
│
└── suppliers/
    ├── models/
    ├── repositories/
    ├── services/
    ├── controllers/
    ├── validations/
    ├── routes/
    ├── constants/
    └── supplier.module.js
```

---

# Parties Hierarchy

```txt
Workspace
    ↓
Company
    ↓
Customer / Supplier
    ↓
Purchase / Sale
    ↓
Ledger
    ↓
Reports
```

---

# Customer Module

## Purpose

Manage all sales-side parties.

Examples:

```txt
Retail Customers
Wholesale Customers
Hospitals
Clinics
Medical Stores
Corporate Clients
```

---

## Customer Uses

```txt
Sales
Sales Returns
Billing
Outstanding Reports
Customer Ledger
CRM
Reports
```

---

# Customer Types

```js
export const CUSTOMER_TYPES = {
  RETAIL: "RETAIL",
  WHOLESALE: "WHOLESALE",
  HOSPITAL: "HOSPITAL",
  CLINIC: "CLINIC",
  CORPORATE: "CORPORATE",
  OTHER: "OTHER",
};
```

---

# Customer Model

```js
{
  (workspaceId,
    companyId,
    customerCode,
    customerType,
    name,
    mobile,
    alternateMobile,
    email,
    gstNumber,
    panNumber,
    drugLicenseNumber,
    billingAddress,
    shippingAddress,
    city,
    state,
    country,
    pincode,
    creditLimit,
    creditDays,
    openingBalance,
    openingBalanceType,
    ledgerAccountId,
    notes,
    status,
    createdBy);
}
```

---

# Customer Status

```txt
ACTIVE
INACTIVE
BLOCKED
```

---

# Supplier Module

## Purpose

Manage all purchase-side parties.

Examples:

```txt
Medicine Suppliers
Distributors
Manufacturers
Wholesalers
Local Vendors
```

---

## Supplier Uses

```txt
Purchases
Purchase Returns
Supplier Payments
Outstanding Reports
Supplier Ledger
Reports
```

---

# Supplier Types

```js
export const SUPPLIER_TYPES = {
  MANUFACTURER: "MANUFACTURER",
  DISTRIBUTOR: "DISTRIBUTOR",
  WHOLESALER: "WHOLESALER",
  LOCAL_VENDOR: "LOCAL_VENDOR",
  OTHER: "OTHER",
};
```

---

# Supplier Model

```js
{
  (workspaceId,
    companyId,
    supplierCode,
    supplierType,
    businessName,
    contactPerson,
    mobile,
    alternateMobile,
    email,
    gstNumber,
    panNumber,
    drugLicenseNumber,
    address,
    city,
    state,
    country,
    pincode,
    creditDays,
    openingBalance,
    openingBalanceType,
    ledgerAccountId,
    notes,
    status,
    createdBy);
}
```

---

# Supplier Status

```txt
ACTIVE
INACTIVE
BLOCKED
```

---

# Party Code Generation

Customer

```txt
CUS-000001
CUS-000002
CUS-000003
```

Supplier

```txt
SUP-000001
SUP-000002
SUP-000003
```

---

# Opening Balance System

Parties may have existing balances during ERP onboarding.

Examples:

```txt
Customer Outstanding = ₹10,000

Supplier Outstanding = ₹25,000
```

Store:

```js
{
  (openingBalance, openingBalanceType);
}
```

Types:

```txt
DR
CR
```

---

# Accounting Integration

Every party should automatically create a Ledger Account.

Customer:

```txt
Customer Created
       ↓
Create Customer Ledger
       ↓
Link ledgerAccountId
```

Supplier:

```txt
Supplier Created
       ↓
Create Supplier Ledger
       ↓
Link ledgerAccountId
```

---

# Ledger Mapping

Customer Ledger Example

```txt
Customer A/c
```

Supplier Ledger Example

```txt
Supplier A/c
```

Store:

```js
{
  ledgerAccountId;
}
```

inside party records.

---

# Credit Management

Customers

```txt
Credit Limit
Credit Days
Outstanding Amount
```

Suppliers

```txt
Credit Days
Outstanding Amount
```

---

# Outstanding Calculation Principle

Never store live outstanding balances.

Wrong:

```js
{
  outstandingAmount: 50000;
}
```

Correct:

```txt
Ledger
     ↓
Journal Entries
     ↓
Outstanding Calculation
```

Outstanding should always be calculated from accounting data.

---

# Customer APIs

## CRUD

```txt
GET    /api/v1/parties/customers
POST   /api/v1/parties/customers

GET    /api/v1/parties/customers/:id
PATCH  /api/v1/parties/customers/:id

DELETE /api/v1/parties/customers/:id
```

---

## Additional APIs

```txt
GET /api/v1/parties/customers/:id/ledger

GET /api/v1/parties/customers/:id/outstanding

GET /api/v1/parties/customers/:id/sales

GET /api/v1/parties/customers/:id/payments
```

---

# Supplier APIs

## CRUD

```txt
GET    /api/v1/parties/suppliers
POST   /api/v1/parties/suppliers

GET    /api/v1/parties/suppliers/:id
PATCH  /api/v1/parties/suppliers/:id

DELETE /api/v1/parties/suppliers/:id
```

---

## Additional APIs

```txt
GET /api/v1/parties/suppliers/:id/ledger

GET /api/v1/parties/suppliers/:id/outstanding

GET /api/v1/parties/suppliers/:id/purchases

GET /api/v1/parties/suppliers/:id/payments
```

---

# Search & Filters

Customer Filters

```txt
Name
Mobile
GST Number
Customer Code
Status
Type
```

Supplier Filters

```txt
Business Name
GST Number
Supplier Code
Status
Type
```

---

# Future Enhancements

Add later:

```txt
Customer Groups

Supplier Groups

Customer Categories

Supplier Categories

Contact Persons

Multiple Addresses

Document Uploads

KYC Documents

Credit Notes

Debit Notes

Customer Loyalty

Customer Reward Points
```

---

# Purchase Integration

```txt
Supplier
    ↓
Purchase
    ↓
Inventory
    ↓
Accounting
```

---

# Sales Integration

```txt
Customer
    ↓
Sales
    ↓
Billing
    ↓
Accounting
```

---

# Finance Integration

```txt
Customer
    ↓
Accounts Receivable Ledger

Supplier
    ↓
Accounts Payable Ledger
```

---

# Reports

Available Reports

```txt
Customer List

Supplier List

Customer Outstanding

Supplier Outstanding

Customer Ledger

Supplier Ledger

Top Customers

Top Suppliers

Credit Limit Report

Overdue Report
```

---

# Final Principle

```txt
Customer
    = Sales Party

Supplier
    = Purchase Party

Customer Ledger
    = Receivable

Supplier Ledger
    = Payable

Outstanding
    = Calculated

Ledger
    = Accounting Source Of Truth
```

The Parties Module should remain focused on managing Customers and Suppliers, while all balances, outstanding amounts, and financial calculations should originate from the Finance & Accounting system.
