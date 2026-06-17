import mongoose from "mongoose";

import { GST_RATE_VALUES } from "../constants/gstRates.constant.js";

const hsnMasterSchema = new mongoose.Schema(
  {
    // HSN / SAC Code
    code: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 0,
    },

    // GST Classification Description
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    // GST Rate
    gstRate: {
      type: Number,
      enum: GST_RATE_VALUES,
      default: null,
    },

    // Active Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

hsnMasterSchema.methods.toSafeObject = function () {
  const hsnMaster = this.toObject();

  delete hsnMaster.__v;

  return hsnMaster;
};

// ---------------------
// Indexes
// ---------------------

hsnMasterSchema.index({
  code: 1,
});

hsnMasterSchema.index({
  isActive: 1,
});

hsnMasterSchema.index({
  gstRate: 1,
});

hsnMasterSchema.index({
  description: "text",
});

const HsnMaster =
  mongoose.models.HsnMaster || mongoose.model("HsnMaster", hsnMasterSchema);

export default HsnMaster;
