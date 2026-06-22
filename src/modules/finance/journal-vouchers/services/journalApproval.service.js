import ApiError from "../../../../utils/ApiError.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import { VOUCHER_STATUS } from "../constants/voucherStatus.constant.js";

const submitForApproval = async (voucherId, companyId, workspaceId, userId) => {
  const voucher = await journalVoucherRepository.findVoucherByIdCompanyAndWorkspace(
    voucherId,
    companyId,
    workspaceId
  );

  if (!voucher) {
    throw new ApiError(404, "Journal Voucher not found");
  }

  if (voucher.status !== VOUCHER_STATUS.DRAFT) {
    throw new ApiError(400, "Only draft vouchers can be submitted for approval");
  }

  voucher.status = VOUCHER_STATUS.PENDING_APPROVAL;
  await voucher.save();

  return voucher.toSafeObject();
};

const approveJournalVoucher = async (voucherId, companyId, workspaceId, userId) => {
  const voucher = await journalVoucherRepository.findVoucherByIdCompanyAndWorkspace(
    voucherId,
    companyId,
    workspaceId
  );

  if (!voucher) {
    throw new ApiError(404, "Journal Voucher not found");
  }

  if (voucher.status !== VOUCHER_STATUS.PENDING_APPROVAL) {
    throw new ApiError(400, "Only vouchers pending approval can be approved");
  }

  voucher.status = VOUCHER_STATUS.APPROVED;
  await voucher.save();

  return voucher.toSafeObject();
};

export default {
  submitForApproval,
  approveJournalVoucher,
};
