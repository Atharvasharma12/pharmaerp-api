# Treasury Management Module Architecture

## Objective

Treasury Management is responsible for managing actual money movement inside the ERP.

Finance records accounting transactions.

Treasury manages:

```txt
Cash
Bank
UPI
Cheques
Deposits
Withdrawals
Fund Transfers
Cash Flow
```

---

# Finance vs Treasury

```txt
Finance
    ↓
Accounting Records

Treasury
    ↓
Money Movement
```

Examples:

```txt
Sale
    ↓
Finance Entry

Customer Payment
    ↓
Treasury Movement
    ↓
Finance Entry
```

---

# Treasury Module Structure

```txt
src/modules/treasury/
│
├── treasury.module.js
├── treasury.routes.js
│
├── bank-accounts/
│
├── cash-accounts/
│
├── fund-transfers/
│
├── bank-transactions/
│
├── cash-transactions/
│
├── cheque-management/
│
├── payment-qr/
│
├── bank-slips/
│
└── cash-denominations/
```

---

# Treasury Processing Flow

```txt
Cash / Bank Movement
          ↓
Treasury Transaction
          ↓
Journal Voucher
          ↓
Ledger
          ↓
Account Balance
```

Treasury never bypasses Finance.

All Treasury operations must generate accounting entries.

---

# Module Build Order

```txt
1. Bank Accounts
2. Cash Accounts

3. Fund Transfers

4. Bank Transactions
5. Cash Transactions

6. Payment QR

7. Cheque Management

8. Bank Slips

9. Cash Denominations
```

---

# 1. Bank Accounts

## Purpose

Store company bank accounts.

---

## Examples

```txt
HDFC Current Account

ICICI Current Account

Axis Bank

SBI Current Account
```

---

## Structure

```txt
bank-accounts/
│
├── bankAccount.module.js
│
├── constants/
│   └── bankAccount.constant.js
│
├── controllers/
│   └── bankAccount.controller.js
│
├── models/
│   └── bankAccount.model.js
│
├── repositories/
│   └── bankAccount.repository.js
│
├── routes/
│   └── bankAccount.routes.js
│
├── services/
│   └── bankAccount.service.js
│
└── validations/
    └── bankAccount.validation.js
```

---

## Bank Account Model

```js
{
  (workspaceId,
    companyId,
    branchId,
    accountName,
    accountNumber,
    ifscCode,
    bankName,
    branchName,
    accountType,
    ledgerAccountId,
    isPrimary,
    status);
}
```

---

# Integration

Every bank account should be linked with:

```txt
Finance Account
```

Example:

```txt
HDFC Current Account
       ↓
Account
       ↓
Ledger
```

---

# 2. Cash Accounts

## Purpose

Manage physical cash.

---

## Examples

```txt
Main Cash

Petty Cash

Counter Cash

Warehouse Cash
```

---

## Structure

```txt
cash-accounts/
│
├── cashAccount.module.js
│
├── constants/
│   └── cashAccount.constant.js
│
├── controllers/
│   └── cashAccount.controller.js
│
├── models/
│   └── cashAccount.model.js
│
├── repositories/
│   └── cashAccount.repository.js
│
├── routes/
│   └── cashAccount.routes.js
│
├── services/
│   └── cashAccount.service.js
│
└── validations/
    └── cashAccount.validation.js
```

---

## Cash Account Model

```js
{
  (workspaceId,
    companyId,
    branchId,
    accountName,
    ledgerAccountId,
    openingBalance,
    status);
}
```

---

# 3. Fund Transfers

## Purpose

Transfer money between treasury accounts.

---

## Examples

```txt
Cash → Bank

Bank → Cash

Bank → Bank
```

---

## Structure

```txt
fund-transfers/
│
├── fundTransfer.module.js
│
├── constants/
│   └── fundTransfer.constant.js
│
├── controllers/
│   └── fundTransfer.controller.js
│
├── models/
│   └── fundTransfer.model.js
│
├── repositories/
│   └── fundTransfer.repository.js
│
├── routes/
│   └── fundTransfer.routes.js
│
├── services/
│   └── fundTransfer.service.js
│
└── validations/
    └── fundTransfer.validation.js
```

---

## Examples

```txt
HDFC
   ↓
ICICI

₹50,000
```

---

## Accounting Entry

```txt
ICICI Bank A/c Dr

HDFC Bank A/c Cr
```

---

# 4. Bank Transactions

## Purpose

Track bank activity.

---

## Examples

```txt
Deposit

Withdrawal

Bank Charges

Interest

NEFT

RTGS

IMPS

UPI
```

---

## Accounting Example

```txt
Cash Deposit

Bank A/c Dr

Cash A/c Cr
```

---

## Structure

```txt
bank-transactions/
│
├── bankTransaction.module.js
│
├── constants/
│
├── controllers/
│
├── models/
│
├── repositories/
│
├── routes/
│
├── services/
│
└── validations/
```

---

# 5. Cash Transactions

## Purpose

Track physical cash movement.

---

## Examples

```txt
Cash In

Cash Out

Expense

Petty Cash Expense
```

---

## Accounting Example

```txt
Expense A/c Dr

Cash A/c Cr
```

---

## Structure

```txt
cash-transactions/
│
├── cashTransaction.module.js
│
├── constants/
│
├── controllers/
│
├── models/
│
├── repositories/
│
├── routes/
│
├── services/
│
└── validations/
```

---

# 6. Payment QR

## Purpose

Manage UPI QR codes.

---

## Examples

```txt
pay@upi

store@oksbi

company@okhdfcbank
```

---

## Structure

```txt
payment-qr/
│
├── paymentQr.module.js
│
├── constants/
│
├── controllers/
│
├── models/
│
├── repositories/
│
├── routes/
│
├── services/
│
└── validations/
```

---

## Model

```js
{
  (bankAccountId, upiId, qrImage, isPrimary, status);
}
```

---

# 7. Cheque Management

## Purpose

Manage issued and received cheques.

---

## Status

```txt
PENDING

DEPOSITED

CLEARED

BOUNCED

CANCELLED
```

---

## Structure

```txt
cheque-management/
│
├── cheque.module.js
│
├── constants/
│
├── controllers/
│
├── models/
│
├── repositories/
│
├── routes/
│
├── services/
│
└── validations/
```

---

## Examples

```txt
Received Cheque

Issued Cheque

Cheque Deposit

Cheque Bounce
```

---

# 8. Bank Slips

## Purpose

Track physical deposit and withdrawal slips.

---

## Examples

```txt
Cash Deposit Slip

Cash Withdrawal Slip
```

---

## Structure

```txt
bank-slips/
│
├── bankSlip.module.js
│
├── constants/
│
├── controllers/
│
├── models/
│
├── repositories/
│
├── routes/
│
├── services/
│
└── validations/
```

---

## Example

```txt
Deposit Slip

₹1,00,000
```

---

# 9. Cash Denominations

## Purpose

Manage physical currency counts.

---

## Examples

```txt
₹500 × 20

₹200 × 50

₹100 × 100

₹50 × 20
```

---

## Uses

```txt
Counter Closing

Cash Verification

Day End Closing
```

---

## Structure

```txt
cash-denominations/
│
├── cashDenomination.module.js
│
├── constants/
│
├── controllers/
│
├── models/
│
├── repositories/
│
├── routes/
│
├── services/
│
└── validations/
```

---

# Treasury Reports

Generated from Treasury + Finance.

---

## Reports

```txt
Cash Book

Bank Book

Fund Transfer Report

Cheque Report

Cash Flow Report

Bank Reconciliation

Daily Cash Summary

UPI Collection Report
```

---

# Integration With Finance

Treasury never directly changes balances.

Every treasury operation generates:

```txt
Treasury Transaction
       ↓
Journal Voucher
       ↓
Ledger Entry
       ↓
Account Balance Update
```

---

# Example Flow

## Customer Receipt Through UPI

```txt
Customer Pays ₹5,000
        ↓
Payment QR
        ↓
Bank Transaction
        ↓
Journal Voucher

Bank A/c Dr 5,000

Customer A/c Cr 5,000
        ↓
Ledger
        ↓
Account Balance
```

---

# Final Treasury Principle

```txt
Bank Accounts
      ↓

Cash Accounts
      ↓

Fund Transfers
      ↓

Bank Transactions
      ↓

Cash Transactions
      ↓

Payment QR
      ↓

Cheque Management
      ↓

Bank Slips
      ↓

Cash Denominations
      ↓

Finance
      ↓

Ledger
      ↓

Reports
```

Treasury manages actual money movement, while Finance records accounting impact. Together they provide complete cash, bank, UPI, cheque, and fund management for the Pharmacy ERP.
