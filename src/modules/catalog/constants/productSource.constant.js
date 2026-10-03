/**
 * productSource.constant.js
 *
 * Defines the two possible product sources in this ERP.
 *
 * Architecture rule (gpnotes.md):
 * Every module that references a product (Inventory, Batch,
 * Purchase, Sales, Billing) MUST use this pattern:
 *
 *   { productSource: PRODUCT_SOURCE.GLOBAL | PRODUCT_SOURCE.WORKSPACE, productId }
 *
 * Never use globalProductId or workspaceProductId directly in other modules.
 */

export const PRODUCT_SOURCE = {
  /**
   * Product exists in the Platform's Global Catalog.
   * Shared across all workspaces.
   */
  GLOBAL: "GLOBAL",

  /**
   * Product exists only within a single Workspace.
   * Created when no matching Global Product is found.
   */
  WORKSPACE: "WORKSPACE",
};

export const PRODUCT_SOURCE_LIST = Object.values(PRODUCT_SOURCE);

export default PRODUCT_SOURCE;
