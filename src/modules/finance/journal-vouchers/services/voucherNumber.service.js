import voucherSequenceRepository from "../repositories/voucherSequence.repository.js";
import { VOUCHER_PREFIX } from "../constants/voucherNumber.constant.js";
import { buildVoucherNumber } from "../helpers/buildVoucherNumber.js";

const generateVoucherNumber = async (
  companyId,
  workspaceId,
  voucherType,
  options = {}
) => {
  const year = new Date().getFullYear();
  const prefix = VOUCHER_PREFIX[voucherType] || "VOUCH";

  const sequence = await voucherSequenceRepository.getNextSequenceNumber(
    companyId,
    workspaceId,
    voucherType,
    year,
    { session: options.session }
  );

  return buildVoucherNumber(prefix, year, sequence);
};

export default {
  generateVoucherNumber,
};
