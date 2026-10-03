import mongoose from "mongoose";

const manufacturerMasterSchema = new mongoose.Schema(
  {
    // Manufacturer Name (unique name indexing or check is done at service level)
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

manufacturerMasterSchema.methods.toSafeObject = function () {
  const manufacturer = this.toObject();

  delete manufacturer.__v;

  return manufacturer;
};

// ---------------------
// Indexes
// ---------------------

manufacturerMasterSchema.index({
  name: 1,
});

manufacturerMasterSchema.index({
  isActive: 1,
});

manufacturerMasterSchema.index({
  name: "text",
  description: "text",
});

const ManufacturerMaster =
  mongoose.models.ManufacturerMaster ||
  mongoose.model("ManufacturerMaster", manufacturerMasterSchema);

export default ManufacturerMaster;
