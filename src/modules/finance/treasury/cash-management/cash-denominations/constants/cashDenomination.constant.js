// Status of a cash denomination count record
export const CASH_DENOMINATION_STATUS = {
  DRAFT: "DRAFT",         // Count in progress, not yet finalized
  CONFIRMED: "CONFIRMED", // Count finalized and verified
  CANCELLED: "CANCELLED", // Count voided
};

// Standard Indian currency denominations (notes + coins)
export const INDIAN_DENOMINATIONS = [
  500, 200, 100, 50, 20, 10, 5, 2, 1,
];
