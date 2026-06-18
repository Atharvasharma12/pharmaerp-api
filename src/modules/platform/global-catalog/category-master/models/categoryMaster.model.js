import mongoose from "mongoose";

const categoryMasterSchema = new mongoose.Schema(
  {
    // Category Name (e.g. Baby Care, Cardiology)
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    // URL-friendly lowercase name (e.g. baby-care, cardiology)
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Reference to parent category for hierarchical nested structure
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryMaster",
      default: null,
    },

    // Nesting level (0 for top level, 1 for child, 2 for sub-child)
    level: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Description/Details
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    // Optional icon or category image
    imageUrl: {
      type: String,
      trim: true,
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

categoryMasterSchema.methods.toSafeObject = function () {
  const category = this.toObject();

  delete category.__v;

  return category;
};

// ---------------------
// Indexes
// ---------------------

categoryMasterSchema.index({
  name: 1,
});

categoryMasterSchema.index({
  slug: 1,
});

categoryMasterSchema.index({
  parentCategory: 1,
});

categoryMasterSchema.index({
  isActive: 1,
});

categoryMasterSchema.index({
  name: "text",
  slug: "text",
  description: "text",
});

const CategoryMaster =
  mongoose.models.CategoryMaster ||
  mongoose.model("CategoryMaster", categoryMasterSchema);

export default CategoryMaster;
