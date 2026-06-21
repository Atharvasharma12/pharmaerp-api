import JournalVoucher from "../models/journalVoucher.model.js";

const getPrefix = (voucherType) => {
  const mapping = {
    PURCHASE: "PUR",
    PURCHASE_RETURN: "PR",
    SALE: "SAL",
    SALE_RETURN: "SR",
    PAYMENT: "PAY",
    RECEIPT: "REC",
    JOURNAL: "JV",
    CONTRA: "CON",
    OPENING_BALANCE: "OB",
  };
  return mapping[voucherType] || "VOUCH";
};

const generateVoucherNumber = async (companyId, voucherType, options = {}) => {
  const prefix = getPrefix(voucherType);
  const year = new Date().getFullYear();

  // Find the latest created voucher of the same type for this company
  const lastVoucher = await JournalVoucher.findOne({
    companyId,
    voucherType,
  })
    .sort({ createdAt: -1 })
    .select("voucherNumber")
    .session(options.session || null);

  let nextSeq = 1;
  if (lastVoucher && lastVoucher.voucherNumber) {
    const parts = lastVoucher.voucherNumber.split("-");
    const lastSeqStr = parts[parts.length - 1];
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(6, "0");
  return `${prefix}-${year}-${seqStr}`;
};

export default {
  generateVoucherNumber,
};
