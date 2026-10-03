import VoucherSequence from "../models/voucherSequence.model.js";

const getNextSequenceNumber = async (
  companyId,
  workspaceId,
  voucherType,
  year,
  options = {}
) => {
  const seqDoc = await VoucherSequence.findOneAndUpdate(
    { companyId, voucherType, year },
    {
      $inc: { nextSequence: 1 },
      $setOnInsert: { workspaceId },
    },
    {
      new: true,
      upsert: true,
      session: options.session || null,
    }
  );

  return seqDoc.nextSequence - 1;
};

export default {
  getNextSequenceNumber,
};
