# HSN Mapping Strategy

## Problem

The Platform Global Catalog may be imported from third-party medicine databases containing:

```txt
5,00,000+ Products

Name
Manufacturer
Pack
Product Form
Composition
Description
Image
Category
```

Many product datasets may not include:

```txt
HSN Code
GST Information
Tax Classification
```

Therefore the Global Catalog import process must NOT require HSN information.

---

# Global Product Import Rule

GlobalProduct should allow:

```js
{
  hsnMasterId: null,

  isHsnMapped: false
}
```

during import.

This allows large product catalogs to be imported immediately.

Example:

```txt
Imported Products
-----------------

Paracetamol 500
Dolo 650
Crocin Advance
Azithromycin 500

HSN Missing
```

All products should still be imported successfully.

---

# HSN Mapping Pipeline

After import, a separate HSN Mapping process should run.

Purpose:

```txt
Map Products
      ↓
Assign HSN
      ↓
Mark Product As Tax Ready
```

---

# Level 1 - Category Based Mapping

Create category rules.

Example:

```js
{
  category: "Medicine",
  hsnCode: "30049099"
}
```

Then:

```txt
Medicine
    ↓
30049099
```

All products in that category can be mapped automatically.

---

# Level 2 - Product Type Mapping

Create mappings based on product type.

Examples:

```txt
Tablet
Capsule
Syrup
Injection
Device
Surgical
Ayurvedic
Cosmetic
```

Rules:

```txt
Medicine
    ↓
30049099

Ayurvedic
    ↓
30039011

Medical Device
    ↓
90189099

Cosmetic
    ↓
33049990
```

---

# Level 3 - Keyword Based Mapping

Create keyword rules.

Example:

```js
HsnKeywordRule;
{
  (keyword, hsnMasterId, priority);
}
```

Examples:

```txt
syringe
    ↓
90183100

glucometer
    ↓
90278990

sanitizer
    ↓
38089400

mask
    ↓
63079090
```

When product names contain these keywords, HSN can be assigned automatically.

---

# Level 4 - Similar Product Mapping

Use existing mapped products.

Example:

```txt
Paracetamol 500
    ↓
HSN 30049099
```

New Product:

```txt
Paracetamol 650
```

Similarity:

```txt
96%
```

System suggests:

```txt
HSN 30049099
```

This greatly reduces manual work.

---

# Level 5 - Manual Review Queue

Products that cannot be mapped automatically are sent for review.

Dashboard:

```txt
Total Products: 500,000

Mapped:
490,000

Pending:
10,000
```

Review Screen:

```txt
Product Name

Suggested HSN

Confidence

Approve
Change
Ignore
```

Only exceptional products require manual intervention.

---

# HSN Mapping Support Tables

## HsnMaster

```js
{
  (code, description, gstRate, cessRate, isActive);
}
```

---

## HsnCategoryRule

```js
{
  (category, hsnMasterId, isActive);
}
```

Maps categories to HSN.

---

## HsnKeywordRule

```js
{
  (keyword, hsnMasterId, priority, isActive);
}
```

Maps keywords to HSN.

---

# GlobalProduct HSN Fields

```js
{
  hsnMasterId: {
    type: ObjectId,
    ref: "HsnMaster",
    default: null
  },

  isHsnMapped: {
    type: Boolean,
    default: false
  }
}
```

---

# HSN Mapping Principle

```txt
Import Products First
        ↓
Do Not Block Import
        ↓
Run HSN Mapping Pipeline
        ↓
Auto Map Most Products
        ↓
Review Remaining Exceptions
```

The Platform Global Catalog should never reject product imports because HSN information is missing. HSN assignment is a separate enrichment process that runs after product import.
