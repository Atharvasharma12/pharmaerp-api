import mongoose from "mongoose";

const bankMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    logoUrl: {
      type: String,
      trim: true,
      default: null,
    },

    website: {
      type: String,
      trim: true,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

bankMasterSchema.methods.toSafeObject = function () {
  const bank = this.toObject();

  delete bank.__v;

  return bank;
};

// ---------------------
// Indexes
// ---------------------

bankMasterSchema.index({
  name: 1,
});

bankMasterSchema.index({
  isActive: 1,
});

bankMasterSchema.index({
  name: "text",
  website: "text",
});

const BankMaster =
  mongoose.models.BankMaster || mongoose.model("BankMaster", bankMasterSchema);

export default BankMaster;
