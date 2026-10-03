import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import gstLedgerRepository from "../repositories/gstLedger.repository.js";

const getGstr1Ledger = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;

  const result = await gstLedgerRepository.getGstLedgerEntries(
    workspaceId,
    companyId,
    "GSTR-1",
    filters,
    { page, limit, sort, all: all === "true" || all === true }
  );

  return {
    entries: result.entries.map((e) => e.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getGstr2Ledger = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;

  const result = await gstLedgerRepository.getGstLedgerEntries(
    workspaceId,
    companyId,
    "GSTR-2",
    filters,
    { page, limit, sort, all: all === "true" || all === true }
  );

  return {
    entries: result.entries.map((e) => e.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const createGstr1Entry = async (workspaceId, companyId, payload) => {
  const { voucherNumber, voucherDate, taxableAmount, igst, cgst, sgst, totalAmount, narration, partyId, voucherId } = payload;

  if (!voucherNumber) {
    throw new ApiError(400, "Voucher number is required");
  }

  const calculatedTotal =
    totalAmount !== undefined
      ? Number(totalAmount)
      : Number(taxableAmount || 0) + Number(igst || 0) + Number(cgst || 0) + Number(sgst || 0);

  const entry = await gstLedgerRepository.createGstLedgerEntry({
    workspaceId,
    companyId,
    gstType: "GSTR-1",
    voucherId: voucherId || new mongoose.Types.ObjectId(),
    voucherNumber,
    voucherDate: voucherDate ? new Date(voucherDate) : new Date(),
    partyId: partyId || null,
    taxableAmount: Number(taxableAmount || 0),
    igst: Number(igst || 0),
    cgst: Number(cgst || 0),
    sgst: Number(sgst || 0),
    totalAmount: calculatedTotal,
    narration: narration || null,
  });

  return entry.toSafeObject();
};

const createGstr2Entry = async (workspaceId, companyId, payload) => {
  const { voucherNumber, voucherDate, taxableAmount, igst, cgst, sgst, totalAmount, narration, partyId, voucherId } = payload;

  if (!voucherNumber) {
    throw new ApiError(400, "Voucher number is required");
  }

  const calculatedTotal =
    totalAmount !== undefined
      ? Number(totalAmount)
      : Number(taxableAmount || 0) + Number(igst || 0) + Number(cgst || 0) + Number(sgst || 0);

  const entry = await gstLedgerRepository.createGstLedgerEntry({
    workspaceId,
    companyId,
    gstType: "GSTR-2",
    voucherId: voucherId || new mongoose.Types.ObjectId(),
    voucherNumber,
    voucherDate: voucherDate ? new Date(voucherDate) : new Date(),
    partyId: partyId || null,
    taxableAmount: Number(taxableAmount || 0),
    igst: Number(igst || 0),
    cgst: Number(cgst || 0),
    sgst: Number(sgst || 0),
    totalAmount: calculatedTotal,
    narration: narration || null,
  });

  return entry.toSafeObject();
};

export default {
  getGstr1Ledger,
  getGstr2Ledger,
  createGstr1Entry,
  createGstr2Entry,
};

