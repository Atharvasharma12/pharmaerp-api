import mongoose from "mongoose";

import {
  WORKSPACE_PRODUCT_STATUS,
  WORKSPACE_PRODUCT_TYPE,
  WORKSPACE_PRODUCT_SOURCE,
  WORKSPACE_PRODUCT_CODE_PREFIX,
} from "../constants/workspaceProduct.constant.js";

const compositionSchema = new mongoose.Schema(
  {
    salt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaltMaster",
      required: true,
    },

    strength: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
      enum: ["mg", "g", "mcg", "ml", "%", "IU"],
    },
  },
  {
    _id: false,
  },
);

const workspaceProductSchema = new mongoose.Schema(
  {
    workspaceProductCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: Object.values(WORKSPACE_PRODUCT_SOURCE),
      default: WORKSPACE_PRODUCT_SOURCE.WORKSPACE,
      required: true,
    },

    productType: {
      type: String,
      enum: Object.values(WORKSPACE_PRODUCT_TYPE),
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    manufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ManufacturerMaster",
      default: null,
    },

    pack: {
      type: String,
      trim: true,
    },

    // Example:
    // [
    //   {
    //     salt: ObjectId("..."),
    //     strength: 500,
    //     unit: "mg"
    //   },
    //   {
    //     salt: ObjectId("..."),
    //     strength: 30,
    //     unit: "mg"
    //   }
    // ]
    composition: {
      type: [compositionSchema],
      default: [],
    },

    uom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UomMaster",
      default: null,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryMaster",
      default: null,
    },

    productForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductFormMaster",
      default: null,
    },

    HsnMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HsnMaster",
      default: null,
    },

    hsn: {
      type: Number,
      default: null,
    },

    hsnTaxpercent: {
      type: Number,
      default: null,
    },

    // ----------------------------------------------------
    // Pricing & Margins (Legacy Alignment)
    // ----------------------------------------------------
    mrp: { type: Number, min: 0, default: null },
    ptr: { type: Number, min: 0, default: null },
    pts: { type: Number, min: 0, default: null },

    rateAPercentage: { type: Number, default: 0 },
    rateBPercentage: { type: Number, default: 0 },
    rateCPercentage: { type: Number, default: 0 },
    rateDPercentage: { type: Number, default: 0 },
    rateEPercentage: { type: Number, default: 0 },

    rateA: { type: Number, default: 0 },
    rateB: { type: Number, default: 0 },
    rateC: { type: Number, default: 0 },
    rateD: { type: Number, default: 0 },
    rateE: { type: Number, default: 0 },

    finalRateA: { type: Number, default: null },
    finalRateB: { type: Number, default: null },
    finalRateC: { type: Number, default: null },

    stockistMarginPercent: { type: Number, default: null },
    retailerMarginPercent: { type: Number, default: null },
    rateBExtraPct: { type: Number, default: null },
    rateAExtraPct: { type: Number, default: null },

    rack: { type: String, trim: true, default: "" },

    // ----------------------------------------------------
    // Legacy Product Details & Marketing
    // ----------------------------------------------------
    marketer: { type: String, trim: true, maxlength: 300, default: "" },
    packagingDetail: { type: String, trim: true, default: "" },
    qty: { type: String, trim: true, default: "" },
    manufacturerAddress: { type: String, default: "" },
    countryOfOrigin: { type: String, trim: true, default: "" },
    manufacturerDetails: { type: String, default: "" },
    marketerDetails: { type: String, default: "" },
    imageUrl: { type: String, trim: true, default: "" },

    // ----------------------------------------------------
    // Category Details (Medicine & OTC)
    // ----------------------------------------------------
    medicineDetails: {
      composition: { type: String, trim: true },
      medicineType: { type: String, trim: true, lowercase: true },
      introduction: { type: String },
      description: { type: String },
      howToUse: { type: String },
      safetyAdvice: { type: String },
      missedDose: { type: String },
      prescriptionRequired: { type: String, trim: true },
      factBox: { type: String },
      primaryUse: { type: String },
      storage: { type: String },
      commonSideEffect: { type: String },
      interactions: {
        alcohol: { type: String, trim: true },
        pregnancy: { type: String, trim: true },
        lactation: { type: String, trim: true },
        driving: { type: String, trim: true },
        kidney: { type: String, trim: true },
        liver: { type: String, trim: true },
        general: { type: String },
      },
      howItWorks: { type: String },
      qa: { type: String, trim: true },
    },

    otcDetails: {
      category: { type: String, trim: true },
      marketingCompany: { type: String, trim: true },
      type: { type: String, trim: true, lowercase: true },
      productHighlights: { type: String },
      information: { type: String },
      keyIngredients: { type: String },
      keyBenefits: { type: String },
      directionsForUse: { type: String },
      safetyInformation: { type: String },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: Object.values(WORKSPACE_PRODUCT_STATUS),
      default: WORKSPACE_PRODUCT_STATUS.ACTIVE,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const generateWorkspaceProductCode = async () => {
  const WorkspaceProduct = mongoose.models.WorkspaceProduct;

  while (true) {
    const code = `${WORKSPACE_PRODUCT_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await WorkspaceProduct.exists({
      workspaceProductCode: code,
      isDeleted: false,
    });

    if (!exists) {
      return code;
    }
  }
};

workspaceProductSchema.pre("validate", async function () {
  if (!this.workspaceProductCode) {
    this.workspaceProductCode = await generateWorkspaceProductCode();
  }
});

workspaceProductSchema.methods.toSafeObject = function () {
  const product = this.toObject();

  delete product.__v;

  return product;
};

// ----------------------------------------------------
// Indexes
// ----------------------------------------------------

workspaceProductSchema.index(
  {
    workspaceProductCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

workspaceProductSchema.index(
  {
    workspaceId: 1,
    name: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

workspaceProductSchema.index({
  workspaceId: 1,
  status: 1,
  isDeleted: 1,
});

workspaceProductSchema.index({
  workspaceId: 1,
  productType: 1,
});

workspaceProductSchema.index({
  workspaceId: 1,
  createdBy: 1,
});

// Search by salt
workspaceProductSchema.index({
  "composition.salt": 1,
});

const WorkspaceProduct =
  mongoose.models.WorkspaceProduct ||
  mongoose.model("WorkspaceProduct", workspaceProductSchema);

export default WorkspaceProduct;
