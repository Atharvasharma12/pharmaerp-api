/**
 * productType.constant.js
 *
 * Defines the product types supported in this ERP.
 *
 * Applies to both GlobalProduct and WorkspaceProduct.
 * productType is IMMUTABLE after creation on both models.
 *
 * - medicine: Prescription / OTC medicines, pharma products
 * - otc:      Over-the-counter consumer healthcare products
 */

export const PRODUCT_TYPE = {
  MEDICINE: "medicine",
  OTC: "otc",
};

export const PRODUCT_TYPE_LIST = Object.values(PRODUCT_TYPE);

export default PRODUCT_TYPE;
