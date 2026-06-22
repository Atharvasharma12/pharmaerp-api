# PHASE 4 - Treasury Management

## Step 1 — Bank Accounts

Module:

```txt
finance/
└── treasury/
    └── bank-management/
        └── bank-accounts/
```

Purpose:

```txt
Create all company bank accounts.

HDFC Current Account
ICICI Current Account
SBI Current Account
```

Important:

Every bank account creates and links to:

```txt
Account
    ↓
ledgerAccountId
```

Example:

```txt
HDFC Current Account

linked to

Account:
HDFC Current Account
```

Build:

```txt
Bank Account CRUD
Primary Bank Account
Activate / Deactivate
Multiple Bank Accounts
```

---

## Step 2 — Payment Methods

Module:

```txt
finance/
└── treasury/
    └── payment-management/
        └── payment-methods/
```

Create master records:

```txt
Cash
UPI
PhonePe
Google Pay
Paytm
Card
Cheque
Bank Transfer
```

Build:

```txt
Payment Method CRUD
Active/Inactive
Default Payment Method
```

---

## Step 3 — QR Codes

Module:

```txt
finance/
└── treasury/
    └── payment-management/
        └── qr-codes/
```

Examples:

```txt
Main Counter QR

Wholesale Counter QR

Counter 2 QR
```

Relation:

```txt
QR Code
     ↓
Bank Account
```

Build:

```txt
QR CRUD
Link QR to Bank Account
Activate / Deactivate QR
```

---

## Step 4 — Cash Registers

Module:

```txt
finance/
└── treasury/
    └── cash-management/
        └── cash-registers/
```

Examples:

```txt
Main Counter

Counter 1

Counter 2

Wholesale Counter
```

Each Register linked to:

```txt
Cash Account
```

Example:

```txt
Main Counter Cash

ledgerAccountId
```

Build:

```txt
Cash Register CRUD
Opening Float
Status
```

---

## Step 5 — Cash Balances

Module:

```txt
cash-balances/
```

Purpose:

Track denomination-wise cash.

Example:

```txt
500 × 20

100 × 10

50 × 5
```

Build:

```txt
Running Balance

Reserved Balance

Bank Deposit Balance
```

---

## Step 6 — Denomination Counts

Module:

```txt
denomination-counts/
```

Purpose:

Store exact notes.

Example:

```txt
₹500 × 20

₹200 × 15

₹100 × 5
```

Used By:

```txt
Cash Collection

Day Closing

Bank Deposit
```

---

## Step 7 — Cash Transactions

Module:

```txt
cash-transactions/
```

Examples:

```txt
Cash Sale

Cash Refund

Cash Adjustment

Cash Transfer

Cash Deposit
```

IMPORTANT:

Creates:

```txt
Cash Transaction
       +
Journal Voucher
```

Never cash transaction alone.

---

## Step 8 — Payment Collections

Module:

```txt
payment-collections/
```

Examples:

```txt
UPI Collection

Card Collection

Wallet Collection
```

Flow:

```txt
Payment Collection
         ↓
Receipt Voucher
         ↓
Journal Voucher
```

---

## Step 9 — Bank Slips

Module:

```txt
bank-slips/
```

Purpose:

Cash packing for deposit.

Example:

```txt
500 × 20

100 × 10
```

Total:

```txt
₹11,000
```

Build:

```txt
Create Slip
Cancel Slip
Approve Slip
Deposit Slip
```

---

## Step 10 — Bank Deposits

Module:

```txt
bank-deposits/
```

Flow:

```txt
Bank Slip
      ↓
Bank Deposit
      ↓
Contra Voucher
      ↓
Journal Voucher
```

Accounting:

```txt
Bank A/c Dr

    To Cash A/c Cr
```

---

## Step 11 — Bank Transactions

Module:

```txt
bank-transactions/
```

Examples:

```txt
NEFT

RTGS

IMPS

Cheque

Interest

Bank Charges
```

Store:

```txt
UTR

Reference Number

Settlement Reference
```

---

## Step 12 — Settlements

Module:

```txt
settlements/
```

Purpose:

UPI/Card Settlement Tracking.

Example:

```txt
Collected = ₹50,000

Settled = ₹45,000

Pending = ₹5,000
```

---

## Step 13 — Day Closing

Module:

```txt
day-closing/
```

Example:

```txt
Expected Cash

vs

Actual Cash
```

System:

```txt
Expected = ₹50,000

Actual = ₹49,900

Difference = -100
```

---

## Step 14 — Shift Closing

Module:

```txt
shift-closing/
```

Examples:

```txt
Morning Shift

Evening Shift
```

Track:

```txt
Cashier Collection

UPI Collection

Card Collection
```

---

## Step 15 — Reconciliation

Modules:

```txt
bank-reconciliation/

payment-reconciliation/
```

Purpose:

```txt
Bank Statement

vs

ERP Ledger
```

and

```txt
PhonePe Settlement

vs

ERP Collection
```

For your production-ready Pharmacy ERP, I would make Phase 4 - Treasury Management consist of these modules:

PHASE 4 - Treasury Management

1. Bank Management
   ├── Bank Accounts
   ├── Bank Transactions
   ├── Bank Slips
   ├── Bank Deposits
   └── Bank Reconciliation

2. Cash Management
   ├── Cash Registers
   ├── Cash Balances
   ├── Cash Transactions
   ├── Denomination Counts
   ├── Day Closing
   └── Shift Closing

3. Payment Management
   ├── Payment Methods
   ├── QR Codes
   ├── Payment Collections
   ├── Settlements
   └── Payment Reconciliation

4. Receipts

5. Payments

6. Contra Vouchers

So the actual implementation order would be:

PHASE 4

1. Bank Accounts

2. Payment Methods

3. QR Codes

4. Cash Registers

5. Cash Balances

6. Denomination Counts

7. Cash Transactions

8. Payment Collections

9. Bank Slips

10. Bank Deposits

11. Bank Transactions

12. Settlements

13. Receipts

14. Payments

15. Contra Vouchers

16. Day Closing

17. Shift Closing

18. Bank Reconciliation

19. Payment Reconciliation
    Treasury Flow
    Cash / UPI / Card Collection
    ↓

Payment Collection
↓

Receipt Voucher
↓

Journal Voucher
↓

Ledger
↓

Account Balance

---

Cash Deposit
↓

Bank Slip
↓

Bank Deposit
↓

Contra Voucher
↓

Journal Voucher
↓

Ledger

---

Supplier Payment
↓

Payment Voucher
↓

Journal Voucher
↓

Ledger
