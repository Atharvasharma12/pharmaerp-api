import mongoose from "mongoose";

const uomMasterSchema = new mongoose.Schema(
  {
    // UOM Name (e.g. Tablet, Capsule, Bottle, Strip)
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    // Abbreviation (e.g. TAB, CAP, BTL, STR)
    abbreviation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    // Description/Details
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    // Active Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

uomMasterSchema.methods.toSafeObject = function () {
  const uom = this.toObject();

  delete uom.__v;

  return uom;
};

// ---------------------
// Indexes
// ---------------------

uomMasterSchema.index({
  name: 1,
});

uomMasterSchema.index({
  abbreviation: 1,
});

uomMasterSchema.index({
  isActive: 1,
});

uomMasterSchema.index({
  name: "text",
  abbreviation: "text",
  description: "text",
});

const UomMaster =
  mongoose.models.UomMaster || mongoose.model("UomMaster", uomMasterSchema);

export default UomMaster;
