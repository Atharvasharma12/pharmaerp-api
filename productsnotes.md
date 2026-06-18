# Pharmacy ERP Product Architecture

## Objective

Build a scalable multi-tenant Pharmacy ERP where:

- Platform manages a centralized Global Product Catalog
- Workspaces can create custom products when needed
- Inventory, Batch, Purchase, Sales, Billing, and Reports can work with both Global and Workspace products
- Product references remain consistent across the entire ERP

---

# Core Product Philosophy

There are only two product sources:

```txt
GLOBAL PRODUCT
WORKSPACE PRODUCT
```

Most products should come from the Global Catalog.

Workspace Products should only exist when no matching Global Product can be found.

---

# Product Types

## GlobalProduct

Owned by Platform.

Purpose:

Provide a standardized master medicine catalog.

Examples:

- Dolo 650
- Crocin Advance
- Azithromycin 500
- Paracetamol 500mg

Global products are shared across all workspaces.

---

## WorkspaceProduct

Owned by Workspace.

Purpose:

Store products that do not exist in the Global Catalog.

Examples:

- Local Herbal Powder
- Ayurvedic Mix
- Store Specific Product

Workspace products belong only to one workspace.

---

# Product Creation Flow

```txt
User Creates Product
         ↓
Search Global Catalog
         ↓

Found?
├─ YES
│
│ Use Global Product
│
└─ NO
    ↓
Create Workspace Product
```

Rules:

- Never duplicate Global Products inside Workspace Products.
- Global Product always takes priority.
- Workspace Product is an exception.

---

# Stock Upload Flow

```txt
Upload File
      ↓
Read Product Name
      ↓
Search Global Catalog
      ↓

Found?
├─ YES
│
│ Link Global Product
│
└─ NO
    ↓
Suggest Matches
    ↓
Create Workspace Product
```

Example:

Uploaded:

```txt
Dolo 650
Crocin
Paracetamol
Herbal Powder
```

Result:

```txt
Global Products
--------------
Dolo 650
Crocin
Paracetamol

Workspace Products
------------------
Herbal Powder
```

---

# GlobalProduct Responsibilities

GlobalProduct stores master product information.

Example fields:

```js
{
  (name,
    productType,
    marketer,
    manufacturerDetails,
    manufacturerAddress,
    countryOfOrigin,
    packagingDetail,
    pack,
    qty,
    productForm,
    imageUrl,
    medicineDetails,
    otcDetails,
    hsnMasterId,
    views,
    isActive);
}
```

---

# GlobalProduct Must NOT Store

```txt
MRP
PTR
PTS
Margin
Purchase Rate
Selling Rate
Rack
Stock Quantity
Branch Data
Inventory Data
```

These belong to Inventory and Batch.

---

# HsnMaster

Purpose:

Single source of truth for tax information.

Example:

```js
{
  (code, description, gstRate, cessRate, isActive);
}
```

GlobalProduct references:

```js
{
  hsnMasterId;
}
```

Do not duplicate GST or HSN information inside Product records.

---

# WorkspaceProduct Responsibilities

Stores custom workspace-specific products.

Example:

```js
{
  (workspaceId,
    name,
    manufacturer,
    pack,
    qty,
    productForm,
    hsnMasterId,
    notes,
    isActive,
    createdBy);
}
```

---

# WorkspaceProduct Must NOT Store

```txt
Medicine Descriptions
Drug Interactions
Safety Advice
Manufacturer Address
Country Of Origin
OTC Information
Regulatory Data
```

These belong to GlobalProduct.

---

# Universal Product Reference Pattern

Every module must use the same reference format.

```js
{
  productSource: "GLOBAL" | "WORKSPACE",
  productId: ObjectId
}
```

Never use:

```js
{
  globalProductId;
}
```

or

```js
{
  workspaceProductId;
}
```

inside Inventory, Batch, Purchase, or Sales.

---

# Product Search Module

Folder:

```txt
catalog/product-search/
```

Purpose:

Search and match products.

Used by:

- Product Creation
- Stock Upload
- Purchase Import
- Bulk Product Import

---

## normalizeProductName.js

Converts product names into standard format.

Example:

```txt
DOLO-650
dolo 650
DOLO 650
```

becomes:

```txt
dolo 650
```

---

## generateSearchTokens.js

Generates searchable keywords.

Example:

```txt
Paracetamol 500mg Tablet
```

becomes:

```txt
[
  "paracetamol",
  "500mg",
  "tablet"
]
```

---

## productSimilarity.js

Calculates match percentage.

Example:

```txt
Paracitamol
Paracetamol
```

Result:

```txt
95%
```

---

## searchGlobalProduct.js

Searches GlobalProduct collection.

---

## searchWorkspaceProduct.js

Searches WorkspaceProduct collection.

---

## calculateSimilarity.js

Performs detailed similarity comparison.

---

## suggestMatches.js

Provides product suggestions.

Example:

```txt
PARACITAMOL
```

Suggestions:

```txt
Paracetamol 500
Paracetamol 650
Paracetamol Syrup
```

---

## productSearch.service.js

Main orchestrator.

Flow:

```txt
Normalize
   ↓
Search
   ↓
Similarity Check
   ↓
Suggestions
```

Returns:

```js
{
  matched: true,
  confidence: 97,
  productId
}
```

---

# Product Resolver Module

Folder:

```txt
catalog/product-resolver/
```

Purpose:

Load actual products from references.

Used by:

- Inventory
- Batch
- Purchase
- Sales
- Billing
- Reports

---

## resolveGlobalProduct.js

Loads GlobalProduct.

---

## resolveWorkspaceProduct.js

Loads WorkspaceProduct.

---

## resolveProductReference.js

Decides which resolver to use.

Input:

```js
{
  (productSource, productId);
}
```

---

## productResolver.service.js

Single entry point.

Example:

```js
productResolver.resolve(productSource, productId);
```

---

# Catalog Helper Functions

Folder:

```txt
catalog/helpers/
```

---

## buildProductReference.js

Creates standard product reference.

Input:

```js
GLOBAL;
123;
```

Output:

```js
{
  productSource: "GLOBAL",
  productId: "123"
}
```

---

## validateProductSource.js

Validates:

```txt
GLOBAL
WORKSPACE
```

Rejects invalid sources.

---

## isGlobalProduct.js

Checks whether reference points to Global Product.

---

## isWorkspaceProduct.js

Checks whether reference points to Workspace Product.

---

## productReference.helper.js

Common product reference utilities.

---

# Inventory Design

Future Inventory Module

```js
{
  (workspaceId,
    companyId,
    branchId,
    productSource,
    productId,
    rack,
    availableQty,
    reservedQty,
    damagedQty);
}
```

Rack belongs here.

---

# Batch Design

Future Batch Module

```js
{
  (batchNo,
    productSource,
    productId,
    expiryDate,
    mrp,
    ptr,
    pts,
    purchaseRate,
    availableQty);
}
```

---

# Why Pricing Belongs To Batch

Example:

```txt
Dolo 650

Batch A
MRP = 32

Batch B
MRP = 35
```

Pricing varies by batch.

Therefore:

```txt
MRP
PTR
PTS
Purchase Rate
```

belong to Batch.

Not Product.

---

# Future Modules Using Products

```txt
inventory/
├── inventory/
├── batches/
├── stock-movements/

purchase/
├── purchases/
├── purchase-returns/

sales/
├── sales/
├── sales-returns/

billing/
├── pos/
├── bills/

reports/
```

All of them must use:

```js
{
  (productSource, productId);
}
```

and load products through:

```txt
catalog/product-resolver/
```

---

# Final Principle

```txt
GlobalProduct
    = Master Catalog

WorkspaceProduct
    = Custom Product

HsnMaster
    = Tax Source

Product Search
    = Find Products

Product Resolver
    = Load Products

Inventory
    = Stock Information

Batch
    = Pricing + Expiry

Transactions
    = Product References
```

This architecture keeps products standardized, prevents duplication, supports multi-workspace operation, and scales cleanly into Inventory, Purchase, Sales, Billing, and Reporting modules.
