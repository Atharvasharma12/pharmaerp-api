import mongoose from "mongoose";

const saltMasterSchema = new mongoose.Schema(
  {
    // Salt Name (e.g. Paracetamol, Amoxicillin, Caffeine)
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
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

saltMasterSchema.methods.toSafeObject = function () {
  const salt = this.toObject();

  delete salt.__v;

  return salt;
};

// ---------------------
// Indexes
// ---------------------

saltMasterSchema.index({
  name: 1,
});

saltMasterSchema.index({
  isActive: 1,
});

saltMasterSchema.index({
  name: "text",
  description: "text",
});

const SaltMaster =
  mongoose.models.SaltMaster || mongoose.model("SaltMaster", saltMasterSchema);

export default SaltMaster;
