import mongoose from "mongoose";
import { PLATFORM_PRICING_STATUS } from "../constants/platformPricing.constant.js";

const platformPricingSchema = new mongoose.Schema(
  {
    // One pricing record per global product
    globalProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GlobalProduct",
      required: [true, "Global product is required"],
      index: true,
    },

    // Maximum Retail Price
    mrp: {
      type: Number,
      required: [true, "MRP is required"],
      min: 0,
    },

    // Price shown to customer
    customerPrice: {
      type: Number,
      required: [true, "Customer price is required"],
      min: 0,
    },

    // Amount paid to partner pharmacy
    partnerSettlementPrice: {
      type: Number,
      required: [true, "Partner settlement price is required"],
      min: 0,
    },

    // Auto calculated
    platformMargin: {
      type: Number,
      default: 0,
    },

    // Delivery charge
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(PLATFORM_PRICING_STATUS),
      default: PLATFORM_PRICING_STATUS.ACTIVE,
      index: true,
    },

    setBy: {
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

/**
 * Auto calculate platform margin before save
 * Mongoose v8: Don't use next()
 */
platformPricingSchema.pre("save", function () {
  this.platformMargin = Number(
    (this.customerPrice - this.partnerSettlementPrice).toFixed(2),
  );
});

/**
 * Auto calculate margin for findOneAndUpdate/updateOne
 */
platformPricingSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();

  if (!update) return;

  const customerPrice = update.customerPrice ?? update.$set?.customerPrice;

  const partnerSettlementPrice =
    update.partnerSettlementPrice ?? update.$set?.partnerSettlementPrice;

  if (customerPrice !== undefined && partnerSettlementPrice !== undefined) {
    const margin = Number((customerPrice - partnerSettlementPrice).toFixed(2));

    if (update.$set) {
      update.$set.platformMargin = margin;
    } else {
      update.platformMargin = margin;
    }
  }
});

platformPricingSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  delete obj.__v;

  return obj;
};

// Only one active pricing per global product
platformPricingSchema.index(
  { globalProductId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

platformPricingSchema.index({
  status: 1,
  isDeleted: 1,
});

const PlatformPricing =
  mongoose.models.PlatformPricing ||
  mongoose.model("PlatformPricing", platformPricingSchema);

export default PlatformPricing;
