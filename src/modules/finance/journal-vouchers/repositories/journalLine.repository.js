import mongoose from "mongoose";
import JournalLine from "../models/journalLine.model.js";

const findLinesByVoucherId = async (voucherId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(voucherId)) {
    return [];
  }
  return JournalLine.find({ voucherId })
    .populate("accountId", "accountName accountCode accountNature accountCategory")
    .session(options.session || null);
};

const createLines = async (linesPayloads, options = {}) => {
  return JournalLine.insertMany(linesPayloads, {
    session: options.session || null,
  });
};

const deleteLinesByVoucherId = async (voucherId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(voucherId)) {
    return null;
  }
  return JournalLine.deleteMany(
    { voucherId },
    {
      session: options.session || null,
    }
  );
};

export default {
  findLinesByVoucherId,
  createLines,
  deleteLinesByVoucherId,
};
