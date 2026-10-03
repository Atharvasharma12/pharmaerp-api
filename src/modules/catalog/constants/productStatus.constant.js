/**
 * productStatus.constant.js
 *
 * Defines the product status values shared across
 * GlobalProduct and WorkspaceProduct.
 *
 * - active:   Product is available for use in inventory, purchase, sales
 * - inactive: Product is hidden/disabled; existing references remain valid
 *             but new transactions should not use inactive products
 */

export const PRODUCT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const PRODUCT_STATUS_LIST = Object.values(PRODUCT_STATUS);

export default PRODUCT_STATUS;
