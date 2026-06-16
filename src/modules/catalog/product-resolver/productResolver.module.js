import productResolverService from "./services/productResolver.service.js";

/**
 * productResolver.module.js
 *
 * Single entry point for the Product Resolver module.
 *
 * This is an internal utility module — it has NO HTTP routes.
 * It is consumed directly by other service modules.
 *
 * Architecture rule (gpnotes.md):
 * All modules that need product data — Inventory, Batch, Purchase,
 * Sales, Billing, Reports — must load products ONLY through this module.
 * They must never query GlobalProduct or WorkspaceProduct collections directly.
 *
 * Usage:
 *
 *   import productResolver from "../../catalog/product-resolver/productResolver.module.js";
 *
 *   // Resolve from source + id
 *   const product = await productResolver.resolve("GLOBAL", productId);
 *
 *   // Resolve from a stored reference object
 *   const product = await productResolver.resolveRef(
 *     { productSource: "GLOBAL", productId },
 *   );
 *
 *   // Resolve multiple line items
 *   const items = await productResolver.resolveLineItems(purchaseItems, workspaceId);
 */
const productResolver = {
  resolve: productResolverService.resolve,
  resolveRef: productResolverService.resolveRef,
  tryResolve: productResolverService.tryResolve,
  resolveMany: productResolverService.resolveMany,
  resolveLineItems: productResolverService.resolveLineItems,
};

export default productResolver;
