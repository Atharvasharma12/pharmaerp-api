# Treasury Management Module Architecture

## Objective

Treasury Management is responsible for managing actual money movement inside the ERP.

Finance records accounting transactions.

Treasury manages physical money and bank accounts:

```txt
Cash
Bank
UPI
Cheques
Deposits
Withdrawals
Fund Transfers
Cash Flow
Physical Note Denomination Quantities
```

---

# Finance vs Treasury

```txt
Finance  → Accounting Records (Source of Truth)
Treasury → Money Movement & Physical cash/bank tracking
```

Examples:

```txt
Sale
  ↓
Finance Entry (Sales A/c Cr, Customer A/c Dr)

Customer Payment
  ↓
Treasury Movement (UPI / Cash / Cheque)
  ↓
Finance Entry (Cash/Bank A/c Dr, Customer A/c Cr)
```

---

# Treasury Module Structure

All treasury submodules are located inside the Finance module directory at `src/modules/finance/treasury/`.

```txt
src/modules/finance/treasury/
│
├── treasury.module.js
├── treasury.routes.js
│
├── bank-management/
│   ├── bank-accounts/
│   ├── bank-slips/
│   └── bank-transactions/
│
├── cash-management/
│   ├── cash-accounts/
│   ├── cash-denomination-balances/
│   ├── cash-denominations/
│   └── cash-transactions/
│
├── cheque-management/
│
├── fund-transfers/
│
└── payment-qr/
```

---

# Treasury Processing Flow

All Treasury operations must generate accounting entries. Treasury never bypasses Finance.

```txt
Cash / Bank Movement
          ↓
Treasury Transaction Record (e.g. Bank slip, Cheque clearance)
          ↓
Journal Voucher (Auto-created and posted)
          ↓
Ledger Entry
          ↓
Account Balance Updated
```

---

# Submodules

## 1. Bank Accounts

Manage company-owned bank accounts.

- **Location**: `bank-management/bank-accounts/`
- **Bank Account Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    branchId: ObjectId,
    accountName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branchName: String,
    accountType: String, // CURRENT, SAVINGS, OVERDRAFT, etc.
    ledgerAccountId: ObjectId, // Linked Chart of Accounts account
    isPrimary: Boolean,
    status: String
  }
  ```

---

## 2. Cash Accounts

Manage physical cash points (e.g., cash counters, safes, petty cash drawers).

- **Location**: `cash-management/cash-accounts/`
- **Cash Account Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    branchId: ObjectId,
    accountName: String,
    description: String,
    ledgerAccountId: ObjectId, // Linked cash ledger account
    isPrimary: Boolean,
    status: String
  }
  ```

---

## 3. Cash Denomination Balances

Tracks the exact physical count and running quantities of cash notes (e.g., ₹500, ₹200, ₹100, etc.) currently in a cash account. Updated atomically during cash transactions, opening balances, or transfers.

- **Location**: `cash-management/cash-denomination-balances/`
- **Cash Denomination Balance Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    cashAccountId: ObjectId,
    totalBalance: Number, // Sum of all denomination subtotals
    denominations: [
      {
        denomination: Number, // e.g. 500
        quantity: Number,     // e.g. 14
        subtotal: Number      // e.g. 7000
      }
    ],
    lastUpdatedAt: Date,
    lastUpdatedBy: ObjectId
  }
  ```

---

## 4. Cash Denominations (Counts & Reconciliation)

Tracks physical cash verification counts. Enables checking for cash variances (`physicalTotal - expectedBalance`) and creating adjustment journal entries for any short/excess cash.

- **Location**: `cash-management/cash-denominations/`
- **Cash Denomination Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    cashAccountId: ObjectId,
    branchId: ObjectId,
    countNumber: String, // e.g. CD-YYYY-NNNNN
    countDate: Date,
    denominations: [
      { denomination: Number, quantity: Number, subtotal: Number }
    ],
    physicalTotal: Number,
    expectedBalance: Number,
    variance: Number, // physicalTotal - expectedBalance
    narration: String,
    status: String, // DRAFT, CONFIRMED, CANCELLED
    confirmedAt: Date,
    confirmedBy: ObjectId,
    adjustmentJournalVoucherId: ObjectId // Linked journal voucher for variance adjustment
  }
  ```

---

## 5. Fund Transfers

Used to transfer funds between treasury accounts (Cash → Bank, Bank → Cash, Bank → Bank).

- **Location**: `fund-transfers/`
- **Fund Transfer Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    transferNumber: String,
    transferDate: Date,
    fromAccountType: String, // BANK or CASH
    fromAccountId: ObjectId,
    toAccountType: String,   // BANK or CASH
    toAccountId: ObjectId,
    amount: Number,
    narration: String,
    status: String // DRAFT, POSTED, CANCELLED
  }
  ```
- **Accounting entry** (e.g. Cash Deposit):
  ```txt
  To-Bank A/c Dr
  From-Cash A/c Cr
  ```

---

## 6. Bank Transactions

Maintains the record of all bank transaction entries.

- **Location**: `bank-management/bank-transactions/`
- **Bank Transaction Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    transactionNumber: String,
    transactionDate: Date,
    bankAccountId: ObjectId,
    transactionType: String, // DEPOSIT, WITHDRAWAL, BANK_CHARGES, etc.
    direction: String,       // INFLOW, OUTFLOW
    amount: Number,
    referenceNumber: String, // UTR, Cheque number
    narration: String,
    counterpartyAccountId: ObjectId,
    journalVoucherId: ObjectId,
    status: String
  }
  ```

---

## 7. Cash Transactions

Maintains the record of all cash transactions.

- **Location**: `cash-management/cash-transactions/`
- **Cash Transaction Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    transactionNumber: String,
    transactionDate: Date,
    cashAccountId: ObjectId,
    transactionType: String, // CASH_IN, CASH_OUT
    direction: String,       // INFLOW, OUTFLOW
    amount: Number,
    referenceNumber: String,
    narration: String,
    counterpartyAccountId: ObjectId,
    journalVoucherId: ObjectId,
    cashDenominationId: ObjectId, // Linked physical denomination count sheet
    status: String
  }
  ```

---

## 8. Payment QR

Manages company UPI QR codes linked directly to primary bank accounts.

- **Location**: `payment-qr/`
- **Payment QR Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    bankAccountId: ObjectId,
    upiId: String,
    qrImage: String,
    isPrimary: Boolean,
    status: String
  }
  ```

---

## 9. Cheque Management

Manages physical cheque lifecycle (both issued to suppliers and received from customers).

- **Location**: `cheque-management/`
- **Cheque Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    chequeNumber: String,
    chequeDate: Date,
    amount: Number,
    chequeType: String, // RECEIPT, PAYMENT
    bankName: String,
    partyId: ObjectId,
    status: String // PENDING, DEPOSITED, CLEARED, BOUNCED, CANCELLED
  }
  ```

---

## 10. Bank Slips

Manages bank slips (deposit slips / withdrawal slips). Confirming a bank slip updates the bank balance by posting a Bank Transaction and generating a corresponding Journal Voucher.

- **Location**: `bank-management/bank-slips/`
- **Bank Slip Model**:
  ```js
  {
    workspaceId: ObjectId,
    companyId: ObjectId,
    slipNumber: String, // BS-YYYY-NNNNN
    bankAccountId: ObjectId,
    slipType: String, // DEPOSIT, WITHDRAWAL
    bankSlipReference: String,
    slipDate: Date,
    amount: Number,
    narration: String,
    status: String, // PENDING, CONFIRMED, REJECTED, CANCELLED
    bankTransactionId: ObjectId,
    journalVoucherId: ObjectId
  }
  ```

---

# Treasury Reports

Generated by querying both Treasury records and Finance ledgers:

- **Cash Book** & **Bank Book**
- **Fund Transfer Report**
- **Cheque Register**
- **Cash Flow Report**
- **Bank Reconciliation Statement**
- **Daily Cash Summary** (Physical vs Expected)
- **UPI Collection Report**
