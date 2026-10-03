export const buildJournalReference = (voucherType, referenceNumber) => {
  if (referenceNumber) return referenceNumber.trim();
  return `${voucherType}-${Date.now()}`;
};
