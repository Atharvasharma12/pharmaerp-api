import normalizeProductName from "../../src/modules/catalog/product-search/helpers/normalizeProductName.js";
import generateSearchTokens from "../../src/modules/catalog/product-search/helpers/generateSearchTokens.js";
import productSimilarity from "../../src/modules/catalog/product-search/helpers/productSimilarity.js";
import suggestMatches from "../../src/modules/catalog/product-search/helpers/suggestMatches.js";

describe("Product Search Helpers", () => {
  describe("normalizeProductName", () => {
    it("should normalize product names correctly", () => {
      expect(normalizeProductName("DOLO-650")).toBe("dolo 650");
      expect(normalizeProductName("dolo  650")).toBe("dolo 650");
      expect(normalizeProductName("Paracetamol 500mg Tab.")).toBe("paracetamol 500mg tab");
    });
  });

  describe("generateSearchTokens", () => {
    it("should split transitions between letters and numbers", () => {
      expect(generateSearchTokens("dolo650")).toEqual(["dolo", "650"]);
      expect(generateSearchTokens("paracetamol500")).toEqual(["paracetamol", "500"]);
    });

    it("should filter out stopwords and short tokens", () => {
      // "tab" is a stopword and is removed by default
      expect(generateSearchTokens("Paracetamol 500mg tab")).toEqual(["paracetamol", "500", "mg"]);
    });
  });

  describe("productSimilarity", () => {
    it("should return 100 for exact match after normalization", () => {
      expect(productSimilarity("Dolo 650", "dolo 650")).toBe(100);
    });

    it("should return 98 for exact match after removing all spaces", () => {
      expect(productSimilarity("dolo650", "dolo 650")).toBe(98);
      expect(productSimilarity("dolo 650", "dolo650")).toBe(98);
    });

    it("should return 98 for exact match after stripping stopwords", () => {
      expect(productSimilarity("Dolo 650 Tablet", "Dolo 650")).toBe(98);
      expect(productSimilarity("Dolo 650", "Dolo 650 Tablet")).toBe(98);
      expect(productSimilarity("Azithral 500 Tabs", "Azithral 500 Tablet")).toBe(98);
      expect(productSimilarity("Azithral 500 Tab", "Azithral 500 Tablet")).toBe(98);
    });

    it("should return high score for minor typo matches", () => {
      const score = productSimilarity("paracitamol", "paracetamol");
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it("should return low score for different products", () => {
      const score = productSimilarity("Dolo 650", "Crocin 500");
      expect(score).toBeLessThan(50);
    });
  });

  describe("suggestMatches", () => {
    it("should sort suggestions by confidence descending", () => {
      const globalCandidates = [
        { _id: "1", name: "Paracetamol 500", productType: "medicine" },
        { _id: "2", name: "Paracetamol 650", productType: "medicine" },
      ];
      const workspaceCandidates = [
        { _id: "3", name: "Paracitamol Syrup", productType: "medicine" },
      ];

      const results = suggestMatches(
        "paracitamol",
        globalCandidates,
        workspaceCandidates,
        { minConfidence: 50, topN: 5 }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain("Paracitamol");
      expect(results[0].confidence).toBeGreaterThanOrEqual(50);
    });
  });
});
