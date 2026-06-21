# Finance & Accounting Module Architecture (Updated)

## Objective

Build a scalable, double-entry accounting system that integrates with:

- Customers
- Suppliers
- Inventory
- Purchases
- Sales
- Payments
- GST
- Reports

The Finance Module becomes the single source of truth for all financial transactions inside the ERP.

---

# Core Accounting Philosophy

Every financial transaction must generate accounting entries.

Examples:

```txt
Purchase
Sale
Payment
Receipt
Expense
Income
Opening Balance
Adjustment
```

All accounting starts with Journal Vouchers.

---

# Double Entry Accounting Rule

Every transaction must satisfy:

```txt
Total Debit
=
Total Credit
```

Example:

```txt
Purchase ₹10,000

Inventory A/c Dr      10,000
    To Supplier A/c   10,000
```

---

# Finance Module Structure

```txt
src/modules/finance/
│
├── finance.module.js
├── finance.routes.js
│
├── chart-of-accounts/
├── journal-vouchers/
├── ledger/
├── account-balances/
├── financial-periods/
└── reports/
```

---

# Finance Processing Flow

```txt
Transaction
      ↓
Journal Voucher
      ↓
Journal Lines
      ↓
Ledger Entries
      ↓
Account Balance Update
      ↓
Reports
```

---

# Module Build Order

```txt
1. Account Groups
2. Accounts
3. Account Balances
4. Journal Vouchers
5. Journal Lines
6. Ledger
7. Financial Periods
8. Reports
```

---

# 1. Chart Of Accounts

Purpose:

Store accounting hierarchy and accounts.

---

## Structure

```txt
chart-of-accounts/
│
├── chartOfAccounts.module.js
│
├── constants/
│   ├── account.constant.js
│   └── accountGroup.constant.js
│
├── controllers/
│   ├── account.controller.js
│   └── accountGroup.controller.js
│
├── models/
│   ├── account.model.js
│   └── accountGroup.model.js
│
├── repositories/
│   ├── account.repository.js
│   └── accountGroup.repository.js
│
├── routes/
│   ├── account.routes.js
│   └── accountGroup.routes.js
│
├── services/
│   ├── account.service.js
│   └── accountGroup.service.js
│
└── validations/
    ├── account.validation.js
    └── accountGroup.validation.js
```

---

# Account Groups

Examples:

```txt
Assets

Liabilities

Income

Expenses

Equity
```

---

# Example Hierarchy

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

# Account Categories

```txt
CUSTOMER

SUPPLIER

BANK

CASH

INVENTORY

PURCHASE

SALES

GST

EXPENSE

INCOME

FIXED_ASSET

LIABILITY

EQUITY
```

---

# Customer & Supplier Integration

Customer Created

```txt
Customer
      ↓
Create Account
      ↓
Link ledgerAccountId
```

Supplier Created

```txt
Supplier
      ↓
Create Account
      ↓
Link ledgerAccountId
```

---

# 2. Account Balances

Purpose:

Fast balance lookup.

---

# Why Needed

Suppose:

```txt
5000 Customers

10,00,000 Ledger Entries
```

Customer List:

```txt
Customer Name
Balance
Credit Limit
```

Calculating balance from Ledger every page load is expensive.

---

# Solution

Maintain Account Balance Summary.

---

## accountBalance.model.js

```js
{
  (accountId, debitTotal, creditTotal, balance, balanceType, lastTransactionAt);
}
```

---

# Example

```txt
Debit Total = 100000

Credit Total = 40000

Balance = 60000 DR
```

---

# Important Rule

These are cumulative totals.

```txt
debitTotal
only increases

creditTotal
only increases
```

Balance is recalculated.

Formula:

```txt
balance = debitTotal - creditTotal
```

---

# 3. Journal Vouchers

Purpose:

Store accounting transactions.

Every accounting entry starts here.

---

## Structure

```txt
journal-vouchers/
│
├── journalVoucher.module.js
│
├── constants/
│   └── journalVoucher.constant.js
│
├── controllers/
│   └── journalVoucher.controller.js
│
├── models/
│   ├── journalVoucher.model.js
│   └── journalLine.model.js
│
├── repositories/
│   ├── journalVoucher.repository.js
│   └── journalLine.repository.js
│
├── routes/
│   └── journalVoucher.routes.js
│
├── services/
│   ├── journalVoucher.service.js
│   ├── journalPosting.service.js
│   ├── journalValidation.service.js
│   ├── journalNumber.service.js
│   └── openingBalance.service.js
│
├── validations/
│   └── journalVoucher.validation.js
│
└── helpers/
    ├── calculateJournalTotals.js
    ├── validateDebitCreditBalance.js
    └── buildJournalReference.js
```

---

# Journal Voucher

Stores voucher header.

Example:

```txt
JV000001
```

Fields:

```js
{
  (voucherNumber,
    voucherDate,
    voucherType,
    referenceNumber,
    narration,
    totalDebit,
    totalCredit,
    status);
}
```

---

# Voucher Types

```txt
PURCHASE

PURCHASE_RETURN

SALE

SALE_RETURN

PAYMENT

RECEIPT

JOURNAL

CONTRA

OPENING_BALANCE
```

---

# Journal Lines

Stores debit and credit entries.

Example:

```txt
Sale ₹10,000

Customer A/c Dr 10,000
Sales A/c Cr    10,000
```

Stored as:

```js
{
  (voucherId, accountId, debit, credit, narration);
}
```

---

# Journal Validation

Responsible for:

```txt
Debit = Credit

Account Exists

Period Open

Voucher Date Valid
```

Reject invalid vouchers.

---

# Journal Posting

Most important finance service.

Flow:

```txt
Journal Voucher
       ↓
Post
       ↓
Create Ledger Entries
       ↓
Update Account Balances
```

---

# Opening Balance Service

Used for:

```txt
Customer Opening Balance

Supplier Opening Balance

Account Opening Balance
```

Example:

```txt
ABC Medical

Opening Balance
50,000 DR
```

Creates Opening Balance Journal.

---

# 4. Ledger Module

Purpose:

Permanent accounting history.

---

## Structure

```txt
ledger/
│
├── ledger.module.js
│
├── controllers/
│   └── ledger.controller.js
│
├── models/
│   └── ledger.model.js
│
├── repositories/
│   └── ledger.repository.js
│
├── routes/
│   └── ledger.routes.js
│
├── services/
│   └── ledger.service.js
│
└── validations/
```

---

## ledger.model.js

```js
{
  (accountId,
    voucherId,
    voucherNumber,
    voucherDate,
    debit,
    credit,
    runningBalance,
    narration);
}
```

---

# Example

```txt
ABC Medical

Sale
Dr 10,000

Receipt
Cr 4,000

Balance 6,000
```

---

# 5. Financial Periods

Purpose:

Manage accounting years.

---

## Structure

```txt
financial-periods/
│
├── financialPeriod.module.js
│
├── constants/
│   └── financialPeriod.constant.js
│
├── controllers/
│   └── financialPeriod.controller.js
│
├── models/
│   └── financialPeriod.model.js
│
├── repositories/
│   └── financialPeriod.repository.js
│
├── routes/
│   └── financialPeriod.routes.js
│
├── services/
│   └── financialPeriod.service.js
│
└── validations/
    └── financialPeriod.validation.js
```

---

# Why Financial Periods Instead Of Financial Years

Supports future:

```txt
YEAR

QUARTER

MONTH

ADJUSTMENT PERIOD
```

Current ERP can use:

```txt
periodType = YEAR
```

only.

---

# Financial Period Model

```js
{
  (periodCode, periodType, startDate, endDate, isCurrent, status);
}
```

---

# Status

```txt
OPEN

CLOSED

LOCKED
```

---

# 6. Reports

Generated from:

```txt
Ledger

Account Balances
```

---

# Reports

```txt
Trial Balance

Profit & Loss

Balance Sheet

General Ledger

Customer Ledger

Supplier Ledger

Cash Book

Bank Book

GST Reports
```

---

# Purchase Accounting Flow

```txt
Purchase
      ↓
Inventory A/c Dr
      ↓
Supplier A/c Cr
      ↓
Journal Voucher
      ↓
Ledger
      ↓
Account Balance
```

---

# Sales Accounting Flow

```txt
Sale
      ↓
Customer A/c Dr
      ↓
Sales A/c Cr
      ↓
Journal Voucher
      ↓
Ledger
      ↓
Account Balance
```

---

# Payment Flow

```txt
Supplier Payment

Supplier A/c Dr
      ↓
Bank A/c Cr
```

---

# Receipt Flow

```txt
Customer Receipt

Bank A/c Dr
      ↓
Customer A/c Cr
```

---

# Final Finance Principle

```txt
Chart Of Accounts
        ↓
Journal Voucher
        ↓
Journal Lines
        ↓
Ledger
        ↓
Account Balance
        ↓
Reports
```

And:

```txt
Customer
     ↓
Account

Supplier
     ↓
Account

Journal
     ↓
Ledger

Ledger
     ↓
Account Balance

Account Balance
     ↓
Reports
```

This architecture is scalable, ERP-ready, multi-company ready, pharmacy ERP ready, and follows the same accounting lifecycle used by Tally, Busy, Zoho Books, QuickBooks, SAP Business One, and Oracle NetSuite.
