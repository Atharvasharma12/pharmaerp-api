import mongoose from "mongoose";

import {
  GLOBAL_PRODUCT_STATUS,
  GLOBAL_PRODUCT_TYPE,
  GLOBAL_PRODUCT_DATA_SOURCE,
  GLOBAL_PRODUCT_CODE_PREFIX,
} from "../constants/globalProduct.constant.js";

const generateGlobalProductCode = async () => {
  const GlobalProduct = mongoose.models.GlobalProduct;

  while (true) {
    const code = `${GLOBAL_PRODUCT_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await GlobalProduct.exists({
      globalProductCode: code,
      isDeleted: false,
    });

    if (!exists) {
      return code;
    }
  }
};

const globalProductSchema = new mongoose.Schema(
  {
    // ---------------------
    // Identity
    // ---------------------
    globalProductCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    externalProductId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    // ---------------------
    // Common
    // ---------------------
    productType: {
      type: String,
      required: true,
      enum: Object.values(GLOBAL_PRODUCT_TYPE),
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

    marketer: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    packagingDetail: {
      type: String,
      trim: true,
    },

    pack: {
      type: String,
      trim: true,
    },

    qty: {
      type: String,
      trim: true,
    },

    productForm: {
      type: String,
      trim: true,
    },

    manufacturerAddress: {
      type: String,
      default: null,
    },

    countryOfOrigin: {
      type: String,
      trim: true,
    },

    manufacturerDetails: {
      type: String,
      default: null,
    },

    marketerDetails: {
      type: String,
      default: null,
    },

    // ---------------------
    // Product Image
    // ---------------------
    imageUrl: {
      type: String,
      trim: true,
    },

    // ---------------------
    // Medicine-only details
    // ---------------------
    medicineDetails: {
      composition: {
        type: String,
        trim: true,
      },

      medicineType: {
        type: String,
        trim: true,
        lowercase: true,
      },

      introduction: String,

      description: String,

      howToUse: String,

      safetyAdvice: String,

      missedDose: String,

      prescriptionRequired: {
        type: String,
        trim: true,
      },

      factBox: String,

      primaryUse: String,

      storage: String,

      commonSideEffect: String,

      interactions: {
        alcohol: {
          type: String,
          trim: true,
        },

        pregnancy: {
          type: String,
          trim: true,
        },

        lactation: {
          type: String,
          trim: true,
        },

        driving: {
          type: String,
          trim: true,
        },

        kidney: {
          type: String,
          trim: true,
        },

        liver: {
          type: String,
          trim: true,
        },

        general: String,
      },

      howItWorks: String,

      qa: {
        type: String,
        trim: true,
      },
    },

    // ---------------------
    // OTC-only details
    // ---------------------
    otcDetails: {
      category: {
        type: String,
        trim: true,
      },

      marketingCompany: {
        type: String,
        trim: true,
      },

      type: {
        type: String,
        trim: true,
        lowercase: true,
      },

      productHighlights: String,

      information: String,

      keyIngredients: String,

      keyBenefits: String,

      directionsForUse: String,

      safetyInformation: String,
    },

    // ---------------------
    // HSN
    // ---------------------
    HsnMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HsnMaster",
      default: null,
    },

    // ---------------------
    // Platform Controls
    // ---------------------
    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(GLOBAL_PRODUCT_STATUS),
      default: GLOBAL_PRODUCT_STATUS.ACTIVE,
      index: true,
    },

    dataSource: {
      type: String,
      enum: Object.values(GLOBAL_PRODUCT_DATA_SOURCE),
      default: GLOBAL_PRODUCT_DATA_SOURCE.MANUAL,
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
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
      ref: "PlatformUser",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

globalProductSchema.pre("validate", async function () {
  if (!this.globalProductCode) {
    this.globalProductCode = await generateGlobalProductCode();
  }
});

globalProductSchema.methods.toSafeObject = function () {
  const product = this.toObject();

  delete product.__v;

  return product;
};

// ---------------------
// Indexes
// ---------------------

globalProductSchema.index(
  { globalProductCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

globalProductSchema.index({
  dataSource: 1,
  externalProductId: 1,
});

globalProductSchema.index({
  status: 1,
  isDeleted: 1,
});

globalProductSchema.index({
  createdBy: 1,
});

globalProductSchema.index({
  updatedBy: 1,
});

globalProductSchema.index({
  deletedBy: 1,
});

globalProductSchema.index({
  views: -1,
});

globalProductSchema.index({
  name: "text",
  marketer: "text",
  "medicineDetails.composition": "text",
  "otcDetails.keyIngredients": "text",
  "otcDetails.category": "text",
});

const GlobalProduct =
  mongoose.models.GlobalProduct ||
  mongoose.model("GlobalProduct", globalProductSchema);

export default GlobalProduct;
