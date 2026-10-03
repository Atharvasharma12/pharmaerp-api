# Pharmacy ERP Development Roadmap & Module Build Order

## Objective

Build a scalable, multi-tenant Pharmacy ERP in the correct dependency order so that every module integrates naturally with Finance, Inventory, Purchases, Sales, and Reporting.

The principle is:

```txt
Master Data
      ↓
Accounting Foundation
      ↓
Inventory
      ↓
Purchases
      ↓
Sales
      ↓
Payments
      ↓
GST
      ↓
Reports
```

---

# Phase 1 — Parties Module

## Purpose

Create all business parties that participate in transactions.

These parties will later be linked with:

```txt
Sales
Purchases
Receipts
Payments
Ledgers
Reports
```

---

## Customer Module

Purpose:

```txt
Manage all sales-side parties.
```

Examples:

```txt
Retail Customers
Wholesale Customers
Hospitals
Clinics
Corporate Customers
```

Used By:

```txt
Sales
Sales Returns
Billing
Customer Ledger
Receipts
Reports
```

---

## Supplier Module

Purpose:

```txt
Manage all purchase-side parties.
```

Examples:

```txt
Distributors
Manufacturers
Wholesalers
Local Vendors
```

Used By:

```txt
Purchases
Purchase Returns
Payments
Supplier Ledger
Reports
```

---

# Why Parties First

Because:

```txt
Sales need Customers

Purchases need Suppliers

Finance needs Customer Accounts

Finance needs Supplier Accounts
```

Without parties, no transactions can exist.

---

# Phase 2 — Finance Foundation

## Purpose

Create the accounting engine of the ERP.

Everything in ERP eventually becomes accounting.

Examples:

```txt
Sale
Purchase
Payment
Receipt
Expense
Income
Adjustment
```

All of these generate accounting entries.

---

# Finance Module Structure

```txt
finance/

├── chart-of-accounts/
│
├── account-balances/
│
├── journal-vouchers/
│
└── ledger/
```

---

# Step 1 — Account Groups

Purpose:

Create accounting hierarchy.

Examples:

```txt
Assets

Liabilities

Income

Expenses

Equity
```

---

## Example Tree

```txt
Assets
│
├── Cash
├── Bank
├── Inventory
└── Accounts Receivable
```

```txt
Liabilities
│
├── Accounts Payable
├── GST Payable
└── Loans
```

---

# Step 2 — Accounts

Purpose:

Create actual accounting accounts.

Examples:

```txt
Cash In Hand

HDFC Bank

Inventory

Purchase Account

Sales Account

Input GST

Output GST

ABC Medical

XYZ Distributor
```

---

# Step 3 — Account Balances

Purpose:

Maintain live balances.

Example:

```js
{
  debitTotal: 100000,

  creditTotal: 40000,

  balance: 60000,

  balanceType: "DR"
}
```

Used By:

```txt
Customer List

Supplier List

Dashboard

Reports
```

---

# Step 4 — Journal Vouchers

Purpose:

Store accounting transactions.

Examples:

```txt
Purchase Voucher

Sale Voucher

Receipt Voucher

Payment Voucher

Journal Voucher
```

---

# Step 5 — Journal Lines

Purpose:

Store debit and credit entries.

Example:

```txt
Customer Dr 10,000
     To Sales Cr 10,000
```

Every voucher must satisfy:

```txt
Debit = Credit
```

---

# Step 6 — Ledger

Purpose:

Store permanent accounting history.

Example:

```txt
ABC Medical Ledger

01 Jan
Sale
Dr 10,000

05 Jan
Receipt
Cr 4,000
```

Ledger is the accounting source of truth.

---

# Why Finance Before Inventory

Because:

```txt
Purchases generate accounting

Sales generate accounting

Payments generate accounting
```

Finance must already exist.

---

# Phase 3 — Inventory Foundation

## Purpose

Manage stock.

Inventory is the heart of Pharmacy ERP.

---

# Inventory Module Structure

```txt
inventory/

├── inventory/
├── batches/
└── stock-movements/
```

---

# Inventory Module

Stores:

```txt
Current Stock

Available Quantity

Reserved Quantity

Damaged Quantity
```

---

# Batch Module

Stores:

```txt
Batch Number

MRP

PTR

PTS

Purchase Rate

Expiry Date
```

Important:

```txt
Pricing belongs to Batch

Not Product
```

---

# Stock Movement Module

Tracks:

```txt
Purchase

Sale

Return

Transfer

Adjustment

Opening Stock
```

Provides complete stock history.

---

# Phase 4 — Purchase Module

## Purpose

Manage procurement.

---

# Structure

```txt
purchase/

├── purchases/
├── purchase-items/
└── purchase-returns/
```

---

# Purchase Flow

```txt
Supplier
      ↓
Purchase
      ↓
Batch Creation
      ↓
Stock Increase
      ↓
Journal Voucher
```

---

# Accounting Entry

```txt
Inventory A/c Dr
      ↓
Supplier A/c Cr
```

---

# Phase 5 — Sales Module

## Purpose

Manage customer billing and sales.

---

# Structure

```txt
sales/

├── sales/
├── sale-items/
└── sales-returns/
```

---

# Sales Flow

```txt
Customer
      ↓
Sale
      ↓
Stock Reduction
      ↓
Journal Voucher
```

---

# Accounting Entry

```txt
Customer A/c Dr
      ↓
Sales A/c Cr
```

---

# Phase 6 — Payments & Receipts

## Purpose

Manage money movement.

---

# Receipts

Customer Payments.

Example:

```txt
Bank A/c Dr
      ↓
Customer A/c Cr
```

---

# Payments

Supplier Payments.

Example:

```txt
Supplier A/c Dr
      ↓
Bank A/c Cr
```

---

# Benefits

```txt
Outstanding Tracking

Cash Flow

Bank Reconciliation

Ledger Updates
```

---

# Phase 7 — GST Module

## Purpose

Manage tax compliance.

---

# Structure

```txt
gst/

├── tax-rates/
├── gst-returns/
└── gst-reports/
```

---

# Handles

```txt
CGST

SGST

IGST

GST Payable

GST Input Credit
```

---

# Depends On

```txt
Purchases

Sales

Finance
```

---

# Phase 8 — Reports Module

## Purpose

Generate business insights.

---

# Inventory Reports

```txt
Stock Report

Expiry Report

Batch Report

Stock Movement Report
```

---

# Purchase Reports

```txt
Purchase Register

Supplier Report

Purchase Return Report
```

---

# Sales Reports

```txt
Sales Register

Customer Report

Sales Return Report
```

---

# Finance Reports

```txt
Trial Balance

Profit & Loss

Balance Sheet

Cash Book

Bank Book

General Ledger
```

---

# Final Development Order

```txt
PHASE 1

1. Customers
2. Suppliers

----------------

PHASE 2

3. Account Groups
4. Accounts
5. Account Balances
6. Journal Vouchers
7. Journal Lines
8. Ledger

----------------

PHASE 3

9. Inventory
10. Batches
11. Stock Movements

----------------

PHASE 4

12. Purchases
13. Purchase Returns

----------------

PHASE 5

14. Sales
15. Sales Returns

----------------

PHASE 6

16. Receipts
17. Payments

----------------

PHASE 7

18. GST

----------------

PHASE 8

19. Reports
```

---

# Final ERP Principle

```txt
Customers & Suppliers
          ↓

Chart Of Accounts
          ↓

Journal Vouchers
          ↓

Ledger
          ↓

Account Balances
          ↓

Inventory
          ↓

Purchases
          ↓

Sales
          ↓

Payments
          ↓

GST
          ↓

Reports
```

This roadmap ensures that every module is built on top of a stable foundation, avoids future redesigns, and follows the architecture used by modern ERP and accounting systems.
