import mongoose from "mongoose";

const productFormMasterSchema = new mongoose.Schema(
  {
    // Product Form Name (e.g. Tablet, Capsule, Syrup, Soap, Device)
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

productFormMasterSchema.methods.toSafeObject = function () {
  const form = this.toObject();

  delete form.__v;

  return form;
};

// ---------------------
// Indexes
// ---------------------

productFormMasterSchema.index({
  name: 1,
});

productFormMasterSchema.index({
  isActive: 1,
});

productFormMasterSchema.index({
  name: "text",
  description: "text",
});

const ProductFormMaster =
  mongoose.models.ProductFormMaster || mongoose.model("ProductFormMaster", productFormMasterSchema);

export default ProductFormMaster;
