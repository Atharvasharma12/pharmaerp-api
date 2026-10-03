export const buildVoucherNumber = (prefix, year, sequence) => {
  const seqStr = String(sequence).padStart(6, "0");
  return `${prefix}-${year}-${seqStr}`;
};

export default buildVoucherNumber;
