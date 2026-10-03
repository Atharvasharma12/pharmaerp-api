import productSearchService from "./services/productSearch.service.js";

/**
 * productSearch.module.js
 *
 * The Product Search module is an internal utility module.
 * It has NO HTTP routes — it is consumed directly by other services.
 *
 * Consumers (from gpnotes.md):
 *   - Product Creation flow
 *   - Stock Upload flow
 *   - Purchase Import flow
 *   - Bulk Product Import flow
 *
 * Usage example:
 *
 *   import productSearchModule from "../product-search/productSearch.module.js";
 *
 *   const result = await productSearchModule.search("Dolo 650", workspaceId);
 *
 *   if (result.matched) {
 *     // Use result.productSource + result.productId
 *   } else {
 *     // Show result.suggestions or create workspace product
 *   }
 */
const productSearchModule = {
  search: productSearchService.search,
  searchGlobal: productSearchService.searchGlobal,
  searchWorkspace: productSearchService.searchWorkspace,
};

export default productSearchModule;
