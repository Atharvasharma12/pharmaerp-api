# Catalog Layer — Team Integration Guide

> **Read this before touching any module that handles products.**
> This guide covers everything built in the `src/modules/catalog/` layer.
> Written for the next developer who will build Inventory, Batches, Purchase, Sales, Billing, and Reports.

---

## 1. Core Philosophy

Two product catalogs exist in this ERP:

| Catalog | Owner | Scope |
|---|---|---|
| **GlobalProduct** | Platform Admin (`/platform/global-catalog`) | Shared across ALL workspaces |
| **WorkspaceProduct** | Workspace member (`/catalog/products`) | Only within ONE workspace |

**GlobalProduct always takes priority.**
WorkspaceProducts are created ONLY when no matching GlobalProduct exists.

Every module that uses a product stores a reference like this:

```js
{ productSource: "GLOBAL" | "WORKSPACE", productId: ObjectId }
```

**Never store `globalProductId` or `workspaceProductId` directly. Always use the pair above.**

---

## 2. The Universal Product Reference Pattern

### Mongoose schema (copy this into every module that stores a product)

```js
productSource: {
  type: String,
  enum: ["GLOBAL", "WORKSPACE"],
  required: true,
  index: true,
},
productId: {
  type: mongoose.Schema.Types.ObjectId,
  required: true,
  index: true,
},
```

### Building a reference

```js
import productRefHelper from "../catalog/helpers/productReference.helper.js";

const ref = productRefHelper.buildGlobal(productId);
// → { productSource: "GLOBAL", productId: "64abc..." }

const ref = productRefHelper.buildWorkspace(productId);
// → { productSource: "WORKSPACE", productId: "64xyz..." }

// Spread directly into your document
await Batch.create({ ...ref, mrp: 120, ptr: 100, ... });
```

---

## 3. What Lives Where

```
src/modules/catalog/
│
├── constants/
│   ├── productSource.constant.js     ← PRODUCT_SOURCE.GLOBAL / WORKSPACE
│   ├── productType.constant.js       ← PRODUCT_TYPE.MEDICINE / OTC
│   └── productStatus.constant.js     ← PRODUCT_STATUS.ACTIVE / INACTIVE
│
├── helpers/
│   └── productReference.helper.js    ← build, validate, isGlobal, isWorkspace, extract
│
├── product-resolver/
│   └── productResolver.module.js     ← resolve(), resolveRef(), resolveLineItems()
│
├── product-search/
│   └── productSearch.module.js       ← search(), searchGlobal(), searchWorkspace()
│
├── products/                         ← WorkspaceProduct CRUD (workspace users)
└── global-products/                  ← GlobalProduct read-only (workspace users)
```

---

## 4. Product Resolver — Loading Product Data

```js
import productResolver from "../catalog/product-resolver/productResolver.module.js";
```

**Single product:**
```js
const product = await productResolver.resolve("GLOBAL", productId);
const product = await productResolver.resolveRef({ productSource, productId }, workspaceId);
const product = await productResolver.tryResolve("WORKSPACE", productId, workspaceId); // returns null if not found
```

**Bulk (for line items):**
```js
// Adds .product to each item object
const items = await productResolver.resolveLineItems(lineItems, workspaceId);

// Just resolve many refs into an array
const products = await productResolver.resolveMany(refs, workspaceId);
```

**Every resolved product has:**
- `productSource` attached (`"GLOBAL"` or `"WORKSPACE"`)
- `HsnMaster` populated (`{ code, gstRate, cessRate, isActive }`)

---

## 5. Product Search — Finding Products by Name

```js
import productSearch from "../catalog/product-search/productSearch.module.js";
```

```js
const result = await productSearch.search("Dolo 650", workspaceId);

// result:
// { matched: true, confidence: 97, productSource: "GLOBAL", productId, name, suggestions }
// OR
// { matched: false, confidence: 0, suggestions: [...top 5 closest matches] }
```

| Confidence | Meaning |
|---|---|
| ≥ 90 | `matched: true` — confident match, use this product |
| 50–89 | `matched: false` — show suggestions to user |
| < 50 | Filtered out |

```js
// Search only global catalog
await productSearch.searchGlobal("Paracetamol 500");

// Search only workspace products
await productSearch.searchWorkspace("Crocin", workspaceId);
```

---

## 6. Module Integration Examples

### Batches

```js
// Model — pricing belongs here, NOT on Product
const batchSchema = {
  workspaceId:   ObjectId (required),
  branchId:      ObjectId (required),
  productSource: String enum ["GLOBAL","WORKSPACE"] (required),
  productId:     ObjectId (required),
  batchNumber:   String (required),
  expiryDate:    Date (required),
  mrp:           Number (required),   // ← HERE, not on Product
  ptr:           Number,
  pts:           Number,
  purchaseRate:  Number,
  quantity:      Number,
};
```

```js
// Creating a batch — confirm product exists first
const product = await productResolver.resolve(payload.productSource, payload.productId, workspaceId);
// product.HsnMaster.gstRate is available here
await Batch.create({ ...payload });
```

```js
// Fetching a batch with product
const batch = await Batch.findById(id).lean();
const product = await productResolver.resolveRef(
  { productSource: batch.productSource, productId: batch.productId },
  workspaceId,
);
return { ...batch, product };
```

### Purchase Orders

```js
// Line item schema — same pattern
{ productSource, productId, batchId, quantity, purchaseRate, mrp }

// Resolve all line items for display
const order = await PurchaseOrder.findById(id).lean();
const items = await productResolver.resolveLineItems(order.items, workspaceId);
return { ...order, items };
```

```js
// CSV/Excel import — search before mapping
const result = await productSearch.search(row.productName, workspaceId);
if (result.matched) {
  return productRefHelper.build(result.productSource, result.productId);
} else {
  return { needsReview: true, suggestions: result.suggestions };
}
```

### Sales / Billing

```js
// Read GST at time of transaction from HsnMaster
const product = await productResolver.resolveRef({ productSource, productId }, workspaceId);
const invoiceItem = {
  ...item,
  productName: product.name,
  hsn:         product.HsnMaster?.code,
  gstRate:     product.HsnMaster?.gstRate ?? 0,  // ← from HsnMaster, never hardcoded
};
```

### Reports — Bulk

```js
const stockItems = await Stock.find({ workspaceId, branchId }).lean();
const products = await productResolver.resolveMany(stockItems, workspaceId);
const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));
return stockItems.map(s => ({ ...s, product: productMap[s.productId.toString()] }));
```

---

## 7. API Endpoints

### Workspace users

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/api/v1/catalog/products` | List workspace products |
| `GET` | `/api/v1/catalog/products/search?name=...` | Search global catalog before creating |
| `GET` | `/api/v1/catalog/products/code/:code` | Get by code |
| `GET` | `/api/v1/catalog/products/:id` | Get by ID |
| `POST` | `/api/v1/catalog/products` | Create (checks global first) |
| `POST` | `/api/v1/catalog/products` `{ force: true }` | Create, bypass global check |
| `PATCH` | `/api/v1/catalog/products/:id` | Update |
| `DELETE` | `/api/v1/catalog/products/:id` | Soft delete |
| `GET` | `/api/v1/catalog/global-products` | View global catalog (read-only) |
| `GET` | `/api/v1/catalog/global-products/:id` | View global product |
| `GET` | `/api/v1/catalog/global-products/code/:code` | View by code |

### Platform admin

| Method | Endpoint |
|---|---|
| `GET/POST/PATCH/DELETE` | `/api/v1/platform/global-catalog/products` |

---

## 8. Rules — Never Break These

```
✅ DO
  - Store products as { productSource, productId } everywhere
  - Load products ONLY through productResolver.module.js
  - Search before creating workspace products (or use force: true)
  - Read GST/HSN from product.HsnMaster at time of transaction
  - Pass workspaceId when resolving WORKSPACE products

❌ NEVER
  - Store MRP, PTR, PTS, stock qty, rack on Product → belongs in Batch/Inventory
  - Inline GST rate or HSN code on Product → use HsnMaster ref
  - Store globalProductId or workspaceProductId as separate fields
  - Query GlobalProduct or WorkspaceProduct models directly from other modules
  - Change productType after creation (immutable)
  - Create WorkspaceProduct when GlobalProduct matches (confidence ≥ 90%)
  - Access another workspace's products (resolver enforces workspaceId scope)
```

---

## 9. Quick Import Cheat Sheet

```js
import { PRODUCT_SOURCE }  from "../catalog/constants/productSource.constant.js";
import { PRODUCT_TYPE }    from "../catalog/constants/productType.constant.js";
import { PRODUCT_STATUS }  from "../catalog/constants/productStatus.constant.js";
import productRefHelper    from "../catalog/helpers/productReference.helper.js";
import productResolver     from "../catalog/product-resolver/productResolver.module.js";
import productSearch       from "../catalog/product-search/productSearch.module.js";

// Common operations
const ref     = productRefHelper.buildGlobal(productId);
const product = await productResolver.resolveRef(ref, workspaceId);
const items   = await productResolver.resolveLineItems(lineItems, workspaceId);
const result  = await productSearch.search(name, workspaceId);
```

---

*Next modules to build: `inventory/batches` → `inventory/stock` → `purchase` → `sales` → `billing`*
