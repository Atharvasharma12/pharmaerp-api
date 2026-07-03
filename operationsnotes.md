# Operations Module Architecture Notes

## Objective

The Operations Module is the business engine of the ERP.

It manages all physical trade activity:

```txt
Inventory   → Stock tracking, warehouse management, batch/expiry
Purchases   → Procuring goods from suppliers
Sales       → Selling goods to customers
```

Every operation in this module:

1. Updates **Stock** (Inventory Ledger + Balances)
2. Creates **Journal Vouchers** (Finance double-entry)
3. Updates **Account Balances** (Supplier / Customer outstanding)

Operations is the bridge between physical trade and financial records.

---

# Finance vs Operations

```txt
Finance    → Accounting records, ledger, reports
Operations → Physical trade: buying, selling, stocking
```

Example:

```txt
Purchase Invoice Posted
        ↓
Inventory Stock IN (batch, expiry)
        ↓
Journal Voucher (PURCHASE)
  Inventory A/c Dr
  Input GST A/c Dr
      Supplier A/c Cr
        ↓
Supplier Account Balance Updated
```

```txt
Sales Invoice Posted
        ↓
Inventory Stock OUT (batch selected)
        ↓
Journal Voucher (SALE)
  Customer A/c Dr
      Sales A/c Cr
      Output GST A/c Cr
        ↓
Customer Account Balance Updated
```

---

# Operations Module Structure

```txt
src/modules/operations/
│
├── operations.module.js
├── operations.routes.js
│
├── inventory/
│   ├── inventory.module.js
│   ├── inventory.routes.js
│   │
│   ├── warehouses/
│   ├── stock-entries/
│   ├── stock-ledger/
│   └── stock-balances/
│
├── purchases/
│   ├── purchases.module.js
│   ├── purchases.routes.js
│   │
│   ├── purchase-orders/
│   ├── goods-receipt-notes/
│   ├── purchase-invoices/
│   ├── purchase-returns/
│   └── debit-notes/
│
└── sales/
    ├── sales.module.js
    ├── sales.routes.js
    │
    ├── quotations/
    ├── sales-orders/
    ├── sales-invoices/
    ├── sales-returns/
    └── credit-notes/
```

---

# All Submodules Overview

## Inventory (4 submodules)

```txt
warehouses/       → Define physical storage locations
stock-entries/    → Stock IN / Stock OUT / Manual adjustments / Opening stock
stock-ledger/     → Permanent running stock history per product per batch
stock-balances/   → Current stock on hand snapshot (fast lookup)
```

## Purchases (5 submodules)

```txt
purchase-orders/       → PO raised to supplier (commitment, no stock/finance impact)
goods-receipt-notes/   → GRN — physical stock received from supplier (stock IN)
purchase-invoices/     → Supplier tax invoice / bill (Finance JV created)
purchase-returns/      → Goods returned to supplier (stock OUT + Finance JV)
debit-notes/           → Financial debit note to supplier (Finance JV only, no stock)
```

## Sales (5 submodules)

```txt
quotations/      → Price quote sent to customer (no stock/finance impact)
sales-orders/    → Confirmed order from customer (no stock/finance impact)
sales-invoices/  → Tax invoice issued to customer (stock OUT + Finance JV)
sales-returns/   → Goods returned by customer (stock IN + Finance JV)
credit-notes/    → Financial credit note to customer (Finance JV only, no stock)
```

---

# Operations Processing Flow

```txt
                    PURCHASE SIDE
                         │
             Supplier → Purchase Order (no impact)
                         │
                   Goods Receipt Note (GRN)
                         │
                     Stock IN only
                         │
                   Purchase Invoice
                         │
                    Finance JV (PURCHASE)
                         │
              Supplier Balance Updated

              If goods returned:
                   Purchase Return → Stock OUT + Finance JV
              If financial adjustment only:
                   Debit Note → Finance JV only


                    SALES SIDE
                         │
              Customer → Quotation (no impact)
                         │
                   Sales Order (no impact)
                         │
                   Sales Invoice
                         │
              ┌──────────┴──────────┐
              │                     │
        Stock OUT             Finance JV (SALE)
              │                     │
        Stock Ledger       Customer Balance Updated
        Stock Balance

              If goods returned:
                   Sales Return → Stock IN + Finance JV
              If financial adjustment only:
                   Credit Note → Finance JV only
```

---

# Build Order

```txt
── INVENTORY ─────────────────────────────────────────
 1. Warehouses           ← Storage locations (foundation)
 2. Stock Balances       ← Fast stock lookup (internal)
 3. Stock Ledger         ← Permanent stock history (internal + GET)
 4. Stock Entries        ← Manual adjustments & opening stock

── PURCHASES ─────────────────────────────────────────
 5. Purchase Orders      ← PO to supplier
 6. Goods Receipt Notes  ← GRN: stock IN from supplier
 7. Purchase Invoices    ← Supplier bill → Finance JV
 8. Purchase Returns     ← Return to supplier → stock OUT + Finance JV
 9. Debit Notes          ← Financial debit to supplier → Finance JV only

── SALES ─────────────────────────────────────────────
10. Quotations           ← Price quote to customer
11. Sales Orders         ← Confirmed customer order
12. Sales Invoices       ← Customer bill → stock OUT + Finance JV
13. Sales Returns        ← Customer return → stock IN + Finance JV
14. Credit Notes         ← Financial credit to customer → Finance JV only
```

---

# Registration in App

```txt
src/routes/index.routes.js
  ↓
import operationsModule from "../modules/operations/operations.module.js"
router.use(API_PREFIX + operationsModule.path, operationsModule.router)

operationsModule.path = "/operations"
```

All API routes:

```txt
/api/v1/operations/inventory/warehouses
/api/v1/operations/inventory/stock-entries
/api/v1/operations/inventory/stock-ledger
/api/v1/operations/purchases/purchase-orders
/api/v1/operations/purchases/grn
/api/v1/operations/purchases/invoices
/api/v1/operations/purchases/returns
/api/v1/operations/purchases/debit-notes
/api/v1/operations/sales/quotations
/api/v1/operations/sales/orders
/api/v1/operations/sales/invoices
/api/v1/operations/sales/returns
/api/v1/operations/sales/credit-notes
```

---

# INVENTORY

## Purpose

Manage physical stock. Every product movement (IN or OUT) is recorded permanently.
Inventory is the stock equivalent of Finance's Ledger.

---

## 1. Warehouses

**Purpose:** Define physical storage locations. Every stock entry is tied to a warehouse.

### Structure

```txt
warehouses/
│
├── controllers/
│   └── warehouse.controller.js
│
├── models/
│   └── warehouse.model.js
│
├── repositories/
│   └── warehouse.repository.js
│
├── routes/
│   └── warehouse.routes.js
│
├── services/
│   └── warehouse.service.js
│
└── validations/
    └── warehouse.validation.js
```

### warehouse.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  warehouseCode: String,       // Auto-generated: WH-000001
  warehouseName: String,
  address: {
    addressLine1: String,
    city: String,
    state: String,
    pincode: String
  },
  contactPerson: String,
  phone: String,
  isDefault: Boolean,
  status: String,              // ACTIVE | INACTIVE
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  createdBy: ObjectId
}
```

### Endpoints

```txt
POST   /inventory/warehouses         → Create warehouse
GET    /inventory/warehouses         → List warehouses
GET    /inventory/warehouses/:id     → Get single
PUT    /inventory/warehouses/:id     → Update
DELETE /inventory/warehouses/:id     → Soft delete
```

---

## 2. Stock Balances

**Purpose:** Fast current stock snapshot per product per batch per warehouse.
The stock equivalent of AccountBalance in Finance. No direct public API — internal only.

### Structure

```txt
stock-balances/
│
├── models/
│   └── stockBalance.model.js
│
├── repositories/
│   └── stockBalance.repository.js
│
└── services/
    └── stockBalance.service.js
```

### stockBalance.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  warehouseId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  quantityIn: Number,        // Cumulative IN (only increases)
  quantityOut: Number,       // Cumulative OUT (only increases)
  closingQty: Number,        // quantityIn - quantityOut
  avgCostPrice: Number,      // Weighted average cost
  mrp: Number,
  lastMovementAt: Date
}
```

### Key Rule

```txt
closingQty = quantityIn - quantityOut
avgCostPrice recalculated on every IN using weighted average formula:
  newAvg = (oldAvg * oldQty + newCost * newQty) / (oldQty + newQty)
```

---

## 3. Stock Ledger

**Purpose:** Permanent history of every stock movement. Never deleted.
The stock equivalent of the Finance Ledger.

### Structure

```txt
stock-ledger/
│
├── models/
│   └── stockLedger.model.js
│
├── repositories/
│   └── stockLedger.repository.js
│
├── services/
│   └── stockLedger.service.js
│
├── controllers/
│   └── stockLedger.controller.js
│
├── routes/
│   └── stockLedger.routes.js
│
└── validations/
    └── stockLedger.validation.js
```

### stockLedger.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  warehouseId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  referenceType: String,    // OPENING | PURCHASE | SALE | PURCHASE_RETURN | SALE_RETURN | ADJUSTMENT_IN | ADJUSTMENT_OUT
  referenceId: ObjectId,    // ID of the source document
  referenceNumber: String,  // e.g. GRN-2026-00001
  movementType: String,     // IN | OUT
  quantity: Number,
  costPrice: Number,
  salePrice: Number,
  runningQty: Number,       // Running balance after this entry
  narration: String
}
```

### Endpoints

```txt
GET /inventory/stock-ledger   → List stock movements (filter: product, warehouse, batch, date)
```

---

## 4. Stock Entries

**Purpose:** Manual stock adjustments and opening stock initialization.

### Structure

```txt
stock-entries/
│
├── constants/
│   ├── stockEntry.constant.js
│   └── stockEntryNumber.constant.js
│
├── controllers/
│   └── stockEntry.controller.js
│
├── models/
│   ├── stockEntry.model.js
│   └── stockEntryLine.model.js
│
├── repositories/
│   ├── stockEntry.repository.js
│   └── stockEntryLine.repository.js
│
├── routes/
│   └── stockEntry.routes.js
│
├── services/
│   ├── stockEntry.service.js
│   └── stockEntryPosting.service.js
│
└── validations/
    └── stockEntry.validation.js
```

### stockEntry.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  warehouseId: ObjectId,
  entryNumber: String,        // SE-YYYY-NNNNN
  entryDate: Date,
  entryType: String,          // OPENING | ADJUSTMENT_IN | ADJUSTMENT_OUT
  status: String,             // DRAFT | POSTED | CANCELLED
  narration: String,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### stockEntryLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  stockEntryId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  quantity: Number,
  costPrice: Number,
  mrp: Number
}
```

### Entry Types

```txt
OPENING        → Initialize stock when setting up the company
ADJUSTMENT_IN  → Add stock (found extra, returned stock, replaced goods)
ADJUSTMENT_OUT → Remove stock (damaged, expired, sample, theft)
```

### On POST

```txt
Stock Entry (Status: DRAFT)
        ↓
For each line:
  Stock Ledger Entry (IN or OUT)
  Stock Balance updated
        ↓
Stock Entry (Status: POSTED)
```

### Endpoints

```txt
POST   /inventory/stock-entries              → Create (DRAFT)
GET    /inventory/stock-entries              → List
GET    /inventory/stock-entries/:id          → Get single
POST   /inventory/stock-entries/:id/post     → Post → update stock
POST   /inventory/stock-entries/:id/cancel   → Cancel
```

---

# PURCHASES

## Purpose

Manage procurement from suppliers. Every purchase ultimately:
1. Increases stock (at GRN stage)
2. Creates a supplier liability in Finance (at Invoice stage)

---

## 5. Purchase Orders

**Purpose:** Record intent to purchase from supplier before goods arrive.
No stock or Finance impact. Reference document only.

### Structure

```txt
purchase-orders/
│
├── constants/
│   └── purchaseOrderNumber.constant.js
│
├── controllers/
│   └── purchaseOrder.controller.js
│
├── models/
│   ├── purchaseOrder.model.js
│   └── purchaseOrderLine.model.js
│
├── repositories/
│   ├── purchaseOrder.repository.js
│   └── purchaseOrderLine.repository.js
│
├── routes/
│   └── purchaseOrder.routes.js
│
├── services/
│   └── purchaseOrder.service.js
│
└── validations/
    └── purchaseOrder.validation.js
```

### purchaseOrder.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  poNumber: String,              // PO-YYYY-NNNNN
  poDate: Date,
  expectedDeliveryDate: Date,
  supplierId: ObjectId,
  status: String,                // DRAFT | CONFIRMED | PARTIALLY_RECEIVED | RECEIVED | CANCELLED
  subtotal: Number,
  totalDiscount: Number,
  totalTax: Number,
  grandTotal: Number,
  narration: String,
  createdBy: ObjectId
}
```

### purchaseOrderLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  purchaseOrderId: ObjectId,
  productId: ObjectId,
  hsnCode: String,
  orderedQty: Number,
  receivedQty: Number,           // Updated when GRN is posted
  unitPrice: Number,
  discountPct: Number,
  discountAmt: Number,
  taxableAmount: Number,
  gstPct: Number,
  cgstAmt: Number,
  sgstAmt: Number,
  igstAmt: Number,
  lineTotal: Number
}
```

### No Finance / Stock Impact

```txt
PO → No journal voucher, no stock entry
PO is reference only — links to GRN and Purchase Invoice
```

### Endpoints

```txt
POST   /purchases/purchase-orders              → Create PO
GET    /purchases/purchase-orders              → List POs
GET    /purchases/purchase-orders/:id          → Get PO
PUT    /purchases/purchase-orders/:id          → Update PO
POST   /purchases/purchase-orders/:id/confirm  → Confirm PO
POST   /purchases/purchase-orders/:id/cancel   → Cancel PO
```

---

## 6. Goods Receipt Notes (GRN)

**Purpose:** Record physical arrival of goods from supplier.
GRN creates stock entries. No Finance JV at this stage.

### Structure

```txt
goods-receipt-notes/
│
├── constants/
│   └── grnNumber.constant.js
│
├── controllers/
│   └── grn.controller.js
│
├── models/
│   ├── grn.model.js
│   └── grnLine.model.js
│
├── repositories/
│   ├── grn.repository.js
│   └── grnLine.repository.js
│
├── routes/
│   └── grn.routes.js
│
├── services/
│   ├── grn.service.js
│   └── grnPosting.service.js
│
└── validations/
    └── grn.validation.js
```

### grn.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  warehouseId: ObjectId,
  grnNumber: String,              // GRN-YYYY-NNNNN
  grnDate: Date,
  purchaseOrderId: ObjectId,      // nullable
  supplierId: ObjectId,
  supplierInvoiceNumber: String,
  status: String,                 // DRAFT | POSTED | CANCELLED
  narration: String,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### grnLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  grnId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  receivedQty: Number,
  freeQty: Number,            // Free samples / bonus units
  costPrice: Number,
  mrp: Number,
  hsnCode: String
}
```

### On POST

```txt
GRN (Status: DRAFT)
        ↓
For each line:
  Stock Ledger Entry (IN)
  Stock Balance updated
  PO receivedQty updated (if linked)
        ↓
GRN (Status: POSTED)
```

> Finance JV is created at Purchase Invoice stage, NOT at GRN.

### Endpoints

```txt
POST   /purchases/grn              → Create GRN (DRAFT)
GET    /purchases/grn              → List GRNs
GET    /purchases/grn/:id          → Get GRN
POST   /purchases/grn/:id/post     → Post → stock IN
POST   /purchases/grn/:id/cancel   → Cancel
```

---

## 7. Purchase Invoices

**Purpose:** Supplier tax invoice (bill). This is the financial event.
Creates Journal Voucher. Stock already handled at GRN.

### Structure

```txt
purchase-invoices/
│
├── constants/
│   └── purchaseInvoiceNumber.constant.js
│
├── controllers/
│   └── purchaseInvoice.controller.js
│
├── models/
│   ├── purchaseInvoice.model.js
│   └── purchaseInvoiceLine.model.js
│
├── repositories/
│   ├── purchaseInvoice.repository.js
│   └── purchaseInvoiceLine.repository.js
│
├── routes/
│   └── purchaseInvoice.routes.js
│
├── services/
│   ├── purchaseInvoice.service.js
│   └── purchaseInvoicePosting.service.js
│
└── validations/
    └── purchaseInvoice.validation.js
```

### purchaseInvoice.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  invoiceNumber: String,           // PI-YYYY-NNNNN (internal)
  supplierInvoiceNumber: String,   // Supplier's own invoice number
  invoiceDate: Date,
  dueDate: Date,
  supplierId: ObjectId,
  supplierAccountId: ObjectId,
  grnId: ObjectId,                 // Linked GRN (nullable)
  purchaseOrderId: ObjectId,       // Linked PO (nullable)
  status: String,                  // DRAFT | POSTED | PAID | PARTIALLY_PAID | CANCELLED
  subtotal: Number,
  totalDiscount: Number,
  totalTaxableAmount: Number,
  totalCGST: Number,
  totalSGST: Number,
  totalIGST: Number,
  totalTax: Number,
  grandTotal: Number,
  paidAmount: Number,
  balanceDue: Number,
  journalVoucherId: ObjectId,
  narration: String,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### purchaseInvoiceLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  purchaseInvoiceId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  hsnCode: String,
  quantity: Number,
  unitPrice: Number,
  discountAmt: Number,
  taxableAmount: Number,
  gstPct: Number,
  cgstAmt: Number,
  sgstAmt: Number,
  igstAmt: Number,
  lineTotal: Number
}
```

### On POST (Posting Purchase Invoice)

```txt
Purchase Invoice (Status: DRAFT)
              ↓
Journal Voucher (PURCHASE):
  Inventory A/c       Dr   (totalTaxableAmount)
  Input CGST A/c      Dr   (totalCGST)
  Input SGST A/c      Dr   (totalSGST)
      Supplier A/c        Cr   (grandTotal)
              ↓
Ledger Entries Created
Supplier Account Balance Updated
              ↓
Purchase Invoice (Status: POSTED)
```

### Endpoints

```txt
POST   /purchases/invoices              → Create invoice (DRAFT)
GET    /purchases/invoices              → List invoices
GET    /purchases/invoices/:id          → Get invoice
POST   /purchases/invoices/:id/post     → Post → Finance JV created
POST   /purchases/invoices/:id/cancel   → Cancel
```

---

## 8. Purchase Returns

**Purpose:** Return goods to supplier. Reverses stock and creates Finance JV.

### Structure

```txt
purchase-returns/
│
├── constants/
│   └── purchaseReturnNumber.constant.js
│
├── controllers/
│   └── purchaseReturn.controller.js
│
├── models/
│   ├── purchaseReturn.model.js
│   └── purchaseReturnLine.model.js
│
├── repositories/
│   ├── purchaseReturn.repository.js
│   └── purchaseReturnLine.repository.js
│
├── routes/
│   └── purchaseReturn.routes.js
│
├── services/
│   ├── purchaseReturn.service.js
│   └── purchaseReturnPosting.service.js
│
└── validations/
    └── purchaseReturn.validation.js
```

### purchaseReturn.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  warehouseId: ObjectId,
  returnNumber: String,          // PR-YYYY-NNNNN
  returnDate: Date,
  supplierId: ObjectId,
  supplierAccountId: ObjectId,
  purchaseInvoiceId: ObjectId,   // Linked original invoice
  status: String,                // DRAFT | POSTED | CANCELLED
  totalTaxableAmount: Number,
  totalCGST: Number,
  totalSGST: Number,
  totalIGST: Number,
  grandTotal: Number,
  reason: String,
  journalVoucherId: ObjectId,
  narration: String,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### purchaseReturnLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  purchaseReturnId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  hsnCode: String,
  quantity: Number,
  unitPrice: Number,
  taxableAmount: Number,
  gstPct: Number,
  cgstAmt: Number,
  sgstAmt: Number,
  igstAmt: Number,
  lineTotal: Number
}
```

### On POST

```txt
Purchase Return (Status: DRAFT)
              ↓
For each line:
  Stock Ledger Entry (OUT)
  Stock Balance updated (decrease)
              ↓
Journal Voucher (PURCHASE_RETURN):
  Supplier A/c        Dr   (grandTotal)
      Inventory A/c       Cr   (taxableAmount)
      Input CGST A/c      Cr
      Input SGST A/c      Cr
              ↓
Purchase Return (Status: POSTED)
```

### Endpoints

```txt
POST   /purchases/returns              → Create return (DRAFT)
GET    /purchases/returns              → List returns
GET    /purchases/returns/:id          → Get return
POST   /purchases/returns/:id/post     → Post → stock OUT + Finance JV
POST   /purchases/returns/:id/cancel   → Cancel
```

---

## 9. Debit Notes

**Purpose:** Financial-only debit to supplier. No physical stock movement.
Used when supplier overcharged, discount received after invoice, or any financial correction.

### Structure

```txt
debit-notes/
│
├── constants/
│   └── debitNoteNumber.constant.js
│
├── controllers/
│   └── debitNote.controller.js
│
├── models/
│   └── debitNote.model.js
│
├── repositories/
│   └── debitNote.repository.js
│
├── routes/
│   └── debitNote.routes.js
│
├── services/
│   ├── debitNote.service.js
│   └── debitNotePosting.service.js
│
└── validations/
    └── debitNote.validation.js
```

### debitNote.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  noteNumber: String,            // DN-YYYY-NNNNN
  noteDate: Date,
  supplierId: ObjectId,
  supplierAccountId: ObjectId,
  purchaseInvoiceId: ObjectId,   // Linked invoice (nullable)
  status: String,                // DRAFT | POSTED | CANCELLED
  amount: Number,
  reason: String,                // OVERCHARGE | DISCOUNT | QUALITY_ISSUE | OTHER
  narration: String,
  journalVoucherId: ObjectId,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### On POST (Finance JV only — no stock movement)

```txt
Debit Note (Status: DRAFT)
              ↓
Journal Voucher (JOURNAL):
  Supplier A/c    Dr   (amount)
      Expense/Purchase A/c  Cr   (amount)
              ↓
Supplier Account Balance Updated (decreases payable)
              ↓
Debit Note (Status: POSTED)
```

### Endpoints

```txt
POST   /purchases/debit-notes              → Create debit note (DRAFT)
GET    /purchases/debit-notes              → List
GET    /purchases/debit-notes/:id          → Get single
POST   /purchases/debit-notes/:id/post     → Post → Finance JV only
POST   /purchases/debit-notes/:id/cancel   → Cancel
```

---

# SALES

## Purpose

Manage selling goods to customers. Every sale:
1. Decreases stock (OUT from warehouse)
2. Creates Journal Voucher → Customer receivable increases

---

## 10. Quotations

**Purpose:** Price quote sent to customer before confirmation.
No stock or Finance impact. Reference / proposal document only.

### Structure

```txt
quotations/
│
├── constants/
│   └── quotationNumber.constant.js
│
├── controllers/
│   └── quotation.controller.js
│
├── models/
│   ├── quotation.model.js
│   └── quotationLine.model.js
│
├── repositories/
│   ├── quotation.repository.js
│   └── quotationLine.repository.js
│
├── routes/
│   └── quotation.routes.js
│
├── services/
│   └── quotation.service.js
│
└── validations/
    └── quotation.validation.js
```

### quotation.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  quotationNumber: String,       // QT-YYYY-NNNNN
  quotationDate: Date,
  validUntil: Date,
  customerId: ObjectId,
  status: String,                // DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | CONVERTED
  subtotal: Number,
  totalDiscount: Number,
  totalTax: Number,
  grandTotal: Number,
  termsAndConditions: String,
  narration: String,
  convertedToSalesOrderId: ObjectId,  // If converted to SO
  convertedToInvoiceId: ObjectId,     // If directly converted to Invoice
  createdBy: ObjectId
}
```

### quotationLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  quotationId: ObjectId,
  productId: ObjectId,
  hsnCode: String,
  quantity: Number,
  mrp: Number,
  salePrice: Number,
  discountPct: Number,
  discountAmt: Number,
  taxableAmount: Number,
  gstPct: Number,
  cgstAmt: Number,
  sgstAmt: Number,
  igstAmt: Number,
  lineTotal: Number
}
```

### No Finance / Stock Impact

```txt
Quotation → No journal voucher, no stock entry
Quotation can be converted to Sales Order or directly to Sales Invoice
```

### Endpoints

```txt
POST   /sales/quotations                           → Create quotation
GET    /sales/quotations                           → List
GET    /sales/quotations/:id                       → Get single
PUT    /sales/quotations/:id                       → Update
POST   /sales/quotations/:id/convert-to-order      → Convert to Sales Order
POST   /sales/quotations/:id/convert-to-invoice    → Convert to Sales Invoice
POST   /sales/quotations/:id/cancel                → Cancel
```

---

## 11. Sales Orders

**Purpose:** Confirmed order from customer after quotation acceptance.
No stock or Finance impact. Commitment document before invoicing.

### Structure

```txt
sales-orders/
│
├── constants/
│   └── salesOrderNumber.constant.js
│
├── controllers/
│   └── salesOrder.controller.js
│
├── models/
│   ├── salesOrder.model.js
│   └── salesOrderLine.model.js
│
├── repositories/
│   ├── salesOrder.repository.js
│   └── salesOrderLine.repository.js
│
├── routes/
│   └── salesOrder.routes.js
│
├── services/
│   └── salesOrder.service.js
│
└── validations/
    └── salesOrder.validation.js
```

### salesOrder.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  orderNumber: String,          // SO-YYYY-NNNNN
  orderDate: Date,
  deliveryDate: Date,
  customerId: ObjectId,
  quotationId: ObjectId,        // Linked quotation (nullable)
  status: String,               // DRAFT | CONFIRMED | PARTIALLY_INVOICED | INVOICED | CANCELLED
  subtotal: Number,
  totalDiscount: Number,
  totalTax: Number,
  grandTotal: Number,
  narration: String,
  createdBy: ObjectId
}
```

### salesOrderLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  salesOrderId: ObjectId,
  productId: ObjectId,
  hsnCode: String,
  orderedQty: Number,
  invoicedQty: Number,          // Updated when invoice is posted
  mrp: Number,
  salePrice: Number,
  discountPct: Number,
  discountAmt: Number,
  taxableAmount: Number,
  gstPct: Number,
  cgstAmt: Number,
  sgstAmt: Number,
  igstAmt: Number,
  lineTotal: Number
}
```

### No Finance / Stock Impact

```txt
Sales Order → No journal voucher, no stock entry
Sales Order can be converted to Sales Invoice
```

### Endpoints

```txt
POST   /sales/orders                           → Create order
GET    /sales/orders                           → List
GET    /sales/orders/:id                       → Get single
PUT    /sales/orders/:id                       → Update
POST   /sales/orders/:id/confirm               → Confirm order
POST   /sales/orders/:id/convert-to-invoice    → Convert to Sales Invoice
POST   /sales/orders/:id/cancel                → Cancel
```

---

## 12. Sales Invoices

**Purpose:** Primary revenue document. Tax invoice issued to customer.
This is the most important document in the sales cycle.

### Structure

```txt
sales-invoices/
│
├── constants/
│   └── salesInvoiceNumber.constant.js
│
├── controllers/
│   └── salesInvoice.controller.js
│
├── models/
│   ├── salesInvoice.model.js
│   └── salesInvoiceLine.model.js
│
├── repositories/
│   ├── salesInvoice.repository.js
│   └── salesInvoiceLine.repository.js
│
├── routes/
│   └── salesInvoice.routes.js
│
├── services/
│   ├── salesInvoice.service.js
│   └── salesInvoicePosting.service.js
│
└── validations/
    └── salesInvoice.validation.js
```

### salesInvoice.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  warehouseId: ObjectId,
  invoiceNumber: String,         // SI-YYYY-NNNNN
  invoiceDate: Date,
  dueDate: Date,
  customerId: ObjectId,
  customerAccountId: ObjectId,
  salesOrderId: ObjectId,        // Linked SO (nullable)
  quotationId: ObjectId,         // Linked quotation (nullable)
  status: String,                // DRAFT | POSTED | PAID | PARTIALLY_PAID | CANCELLED
  paymentMode: String,           // CASH | CREDIT | UPI | CARD | CHEQUE
  subtotal: Number,
  totalDiscount: Number,
  totalTaxableAmount: Number,
  totalCGST: Number,
  totalSGST: Number,
  totalIGST: Number,
  totalTax: Number,
  grandTotal: Number,
  paidAmount: Number,
  balanceDue: Number,
  journalVoucherId: ObjectId,
  narration: String,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### salesInvoiceLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  salesInvoiceId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  hsnCode: String,
  quantity: Number,
  mrp: Number,
  salePrice: Number,
  discountPct: Number,
  discountAmt: Number,
  taxableAmount: Number,
  gstPct: Number,
  cgstAmt: Number,
  sgstAmt: Number,
  igstAmt: Number,
  lineTotal: Number,
  costPrice: Number             // For margin tracking
}
```

### Payment Modes

```txt
CASH    → Paid at counter (cash)
CREDIT  → Sell on credit, balance due
UPI     → Digital payment
CARD    → POS card payment
CHEQUE  → Post-dated / immediate cheque
```

### On POST (Posting Sales Invoice)

```txt
Sales Invoice (Status: DRAFT)
              ↓
For each line:
  Stock Ledger Entry (OUT)
  Stock Balance updated (decrease)
  SO invoicedQty updated (if linked)
              ↓
Journal Voucher (SALE):
  Customer A/c        Dr   (grandTotal)
      Sales A/c           Cr   (totalTaxableAmount)
      Output CGST A/c     Cr   (totalCGST)
      Output SGST A/c     Cr   (totalSGST)
              ↓
Customer Account Balance Updated
              ↓
Sales Invoice (Status: POSTED)
```

### Endpoints

```txt
POST   /sales/invoices              → Create invoice (DRAFT)
GET    /sales/invoices              → List invoices
GET    /sales/invoices/:id          → Get invoice
POST   /sales/invoices/:id/post     → Post → stock OUT + Finance JV
POST   /sales/invoices/:id/cancel   → Cancel
```

---

## 13. Sales Returns

**Purpose:** Customer returns goods. Reverses stock and creates Finance JV.

### Structure

```txt
sales-returns/
│
├── constants/
│   └── salesReturnNumber.constant.js
│
├── controllers/
│   └── salesReturn.controller.js
│
├── models/
│   ├── salesReturn.model.js
│   └── salesReturnLine.model.js
│
├── repositories/
│   ├── salesReturn.repository.js
│   └── salesReturnLine.repository.js
│
├── routes/
│   └── salesReturn.routes.js
│
├── services/
│   ├── salesReturn.service.js
│   └── salesReturnPosting.service.js
│
└── validations/
    └── salesReturn.validation.js
```

### salesReturn.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  warehouseId: ObjectId,
  returnNumber: String,          // SR-YYYY-NNNNN
  returnDate: Date,
  customerId: ObjectId,
  customerAccountId: ObjectId,
  salesInvoiceId: ObjectId,      // Linked original invoice
  status: String,                // DRAFT | POSTED | CANCELLED
  totalTaxableAmount: Number,
  totalCGST: Number,
  totalSGST: Number,
  totalIGST: Number,
  grandTotal: Number,
  reason: String,
  journalVoucherId: ObjectId,
  narration: String,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### salesReturnLine.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  salesReturnId: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  expiryDate: Date,
  hsnCode: String,
  quantity: Number,
  salePrice: Number,
  taxableAmount: Number,
  gstPct: Number,
  cgstAmt: Number,
  sgstAmt: Number,
  igstAmt: Number,
  lineTotal: Number
}
```

### On POST

```txt
Sales Return (Status: DRAFT)
              ↓
For each line:
  Stock Ledger Entry (IN) — goods come back
  Stock Balance updated (increase)
              ↓
Journal Voucher (SALE_RETURN):
  Sales A/c           Dr   (taxableAmount)
  Output CGST A/c     Dr
  Output SGST A/c     Dr
      Customer A/c        Cr   (grandTotal)
              ↓
Sales Return (Status: POSTED)
```

### Endpoints

```txt
POST   /sales/returns              → Create return (DRAFT)
GET    /sales/returns              → List returns
GET    /sales/returns/:id          → Get return
POST   /sales/returns/:id/post     → Post → stock IN + Finance JV
POST   /sales/returns/:id/cancel   → Cancel
```

---

## 14. Credit Notes

**Purpose:** Financial-only credit to customer. No physical stock movement.
Used when customer was overcharged, discount given after invoice, or any financial correction.

### Structure

```txt
credit-notes/
│
├── constants/
│   └── creditNoteNumber.constant.js
│
├── controllers/
│   └── creditNote.controller.js
│
├── models/
│   └── creditNote.model.js
│
├── repositories/
│   └── creditNote.repository.js
│
├── routes/
│   └── creditNote.routes.js
│
├── services/
│   ├── creditNote.service.js
│   └── creditNotePosting.service.js
│
└── validations/
    └── creditNote.validation.js
```

### creditNote.model.js

```js
{
  workspaceId: ObjectId,
  companyId: ObjectId,
  branchId: ObjectId,
  noteNumber: String,            // CN-YYYY-NNNNN
  noteDate: Date,
  customerId: ObjectId,
  customerAccountId: ObjectId,
  salesInvoiceId: ObjectId,      // Linked invoice (nullable)
  status: String,                // DRAFT | POSTED | CANCELLED
  amount: Number,
  reason: String,                // OVERCHARGE | DISCOUNT | QUALITY_ISSUE | OTHER
  narration: String,
  journalVoucherId: ObjectId,
  createdBy: ObjectId,
  postedBy: ObjectId,
  postedAt: Date,
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

### On POST (Finance JV only — no stock movement)

```txt
Credit Note (Status: DRAFT)
              ↓
Journal Voucher (JOURNAL):
  Sales A/c / Income A/c  Dr   (amount)
      Customer A/c             Cr   (amount)
              ↓
Customer Account Balance Updated (decreases receivable)
              ↓
Credit Note (Status: POSTED)
```

### Endpoints

```txt
POST   /sales/credit-notes              → Create credit note (DRAFT)
GET    /sales/credit-notes              → List
GET    /sales/credit-notes/:id          → Get single
POST   /sales/credit-notes/:id/post     → Post → Finance JV only
POST   /sales/credit-notes/:id/cancel   → Cancel
```

---

# Finance Integration Summary

Every financial event in Operations auto-creates a Journal Voucher:

```txt
Event                    Voucher Type      Debit                      Credit
────────────────────────────────────────────────────────────────────────────────
Purchase Invoice POST    PURCHASE          Inventory + Input GST       Supplier
Purchase Return POST     PURCHASE_RETURN   Supplier                    Inventory + Input GST
Debit Note POST          JOURNAL           Supplier                    Expense / Purchase A/c
Sales Invoice POST       SALE              Customer                    Sales + Output GST
Sales Return POST        SALE_RETURN       Sales + Output GST          Customer
Credit Note POST         JOURNAL           Sales / Income A/c          Customer
```

---

# Number Series

```txt
WH    → WH-000001           (warehouses)
SE    → SE-YYYY-NNNNN       (stock entries)
PO    → PO-YYYY-NNNNN       (purchase orders)
GRN   → GRN-YYYY-NNNNN      (goods receipt notes)
PI    → PI-YYYY-NNNNN       (purchase invoices)
PR    → PR-YYYY-NNNNN       (purchase returns)
DN    → DN-YYYY-NNNNN       (debit notes)
QT    → QT-YYYY-NNNNN       (quotations)
SO    → SO-YYYY-NNNNN       (sales orders)
SI    → SI-YYYY-NNNNN       (sales invoices)
SR    → SR-YYYY-NNNNN       (sales returns)
CN    → CN-YYYY-NNNNN       (credit notes)
```

---

# Stock Ledger Reference Types

```txt
OPENING          → Stock Entry (OPENING)
ADJUSTMENT_IN    → Stock Entry (ADJUSTMENT_IN)
ADJUSTMENT_OUT   → Stock Entry (ADJUSTMENT_OUT)
PURCHASE         → GRN posting
SALE             → Sales Invoice posting
PURCHASE_RETURN  → Purchase Return posting
SALE_RETURN      → Sales Return posting
```

---

# Design Rules

```txt
1.  DRAFT → POST → CANCELLED  (no editing after POST)
2.  GRN POST     → stock IN only   (no Finance JV)
3.  PI POST      → Finance JV only (stock done at GRN)
4.  SI POST      → stock OUT + Finance JV (both together)
5.  PR POST      → stock OUT + Finance JV
6.  SR POST      → stock IN  + Finance JV
7.  DN POST      → Finance JV only (no stock)
8.  CN POST      → Finance JV only (no stock)
9.  QT / SO      → no stock, no Finance impact (reference only)
10. batchNumber + expiryDate required for all pharma products
11. hsnCode required on every invoice line for GST
12. All Finance JVs use existing COA accounts:
      INVENTORY category  → Inventory A/c
      GST category        → Input/Output CGST, SGST
      SUPPLIER category   → Supplier A/c
      CUSTOMER category   → Customer A/c
      SALES category      → Sales A/c
13. cancellation reverses all stock + JV effects
14. avgCostPrice recalculated with weighted average on every stock IN
```
